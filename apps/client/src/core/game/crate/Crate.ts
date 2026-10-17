import { Assets, Sprite, type Container, type Texture } from "pixi.js";
import crateTextureUrl from "../../../assets/sprites/environment/crate.png";
import { CrateFireController } from "./CrateFireController";
import { CRATE_FIRE } from "./CrateFireDefinition";
import { CrateDestructionController } from "./CrateDestructionController";
import { evaluateCrateImpact, type CrateCollisionSeverity } from "./CrateImpactEvaluator";
import type { CrateDestructionCause } from "./CrateDestructionDefinition";
import type { DynamicCollidableImpact } from "../physics/DynamicCollidable";
import { CRATE_DEFINITION } from "./CrateDefinition";
import { createCrateCollisionDefinition } from "./CratePhysicsDefinition";
import { CratePhysicsController } from "./CratePhysicsController";
import { applyCrateWindImpulse } from "./CrateWindController";
import type { LocalWindSystem } from "../environment/LocalWindSystem";
import type { DynamicRectangleObstacleDefinition } from "../config/ObstacleDefinition";
import type { DynamicCollidable } from "../physics/DynamicCollidable";
import type { RuntimeObjectOfType } from "../level/LevelRuntimeDefinition";

/** C2: level-authored movable crate participating in the shared rigid-body solver. */
export class Crate implements DynamicCollidable {
    public readonly id: string;
    private readonly definition: DynamicRectangleObstacleDefinition;
    public readonly physics: CratePhysicsController;
    private sprite: Sprite | null = null;
    private destroyed = false;
    public readonly destruction = new CrateDestructionController();
    public readonly fire = new CrateFireController();
    public ignite(): boolean { return !this.destroyed && this.fire.ignite(); }
    public updateBurn(dt: number): boolean {
        if (this.destroyed || this.fire.status !== "burning") return false;
        const complete = this.fire.update(dt);
        if (this.sprite) {
            const t=this.fire.charProgress, target=CRATE_FIRE.charColor;
            const channel=(v:number)=>Math.round(255*(1-t)+v*t);
            this.sprite.tint=(channel((target>>16)&255)<<16)|(channel((target>>8)&255)<<8)|channel(target&255);
            this.sprite.alpha=this.fire.opacity;
        }
        return complete;
    }
    public onDestructionRequested: ((crate: Crate, cause: CrateDestructionCause) => void) | null = null;
    public beginDestruction(cause: CrateDestructionCause): boolean {
        if (!this.destruction.begin(cause)) return false;
        this.destroyed = true;
        this.sprite?.destroy();
        this.sprite = null;
        this.onDestructionRequested?.(this,cause);
        return true;
    }
    public notifyCollisionSeverity(source: "other" | "wall", impact: CrateCollisionSeverity): void {
        const cause = evaluateCrateImpact(source,impact);
        if (cause) this.beginDestruction(cause);
    }
    public notifyExternalImpact(impact: DynamicCollidableImpact): void {
        if (impact.sourceKind !== "ball") return;
        const cause = evaluateCrateImpact("ball",{
            closingNormalSpeed: impact.closingNormalSpeed ?? 0,
            effectiveMass: impact.effectiveMass ?? 0,
            normalImpulseMagnitude: impact.normalImpulseMagnitude ?? 0,
        });
        if (cause) this.beginDestruction(cause);
    }

    constructor(placement: RuntimeObjectOfType<"crate">) {
        this.id = placement.id;
        this.definition = createCrateCollisionDefinition(this.id, placement.x, placement.y);
        this.physics = new CratePhysicsController(this.definition);
    }
    public get x(): number { return this.physics.x; }
    public get y(): number { return this.physics.y; }
    public get isDestroyed(): boolean { return this.destroyed; }
    /** C8: only active crates are eligible for robot perception. */
    public get isRobotTargetable(): boolean { return !this.destroyed && this.destruction.state === "active"; }
    public get hasSprite(): boolean { return this.sprite !== null; }
    public getDefinition(): DynamicRectangleObstacleDefinition { return this.definition; }
    public getX(): number { return this.x; }
    public getY(): number { return this.y; }
    public getRotationRadians(): number { return this.physics.rotation; }
    public getVelocityX(): number { return this.physics.body.getVelocityX(); }
    public getVelocityY(): number { return this.physics.body.getVelocityY(); }
    public getAngularVelocity(): number { return this.physics.body.getAngularVelocity(); }
    public getInverseMass(): number { return this.physics.body.getInverseMass(); }
    public getInverseMomentOfInertia(): number { return this.physics.body.getInverseMomentOfInertia(); }
    public translate(dx: number, dy: number): void { this.physics.translate(dx, dy); this.syncSprite(); }
    public applyImpulseAtWorldPoint(ix: number, iy: number, cx: number, cy: number): void {
        if (!this.destroyed) this.physics.applyImpulse(ix, iy, cx, cy);
    }
    /** CB4: reuse the crate rigid body for belt forces and contact torque. */
    public applyConveyorImpulse(ix: number, iy: number, cx: number, cy: number): void {
        if (!this.destroyed) this.physics.applyConveyorImpulse(ix, iy, cx, cy);
    }
    /** C3: one authoritative wind application, with off-center torque. */
    public applyLocalWindImpulse(
        impulseX: number, impulseY: number, wind: LocalWindSystem,
        sourceIds: readonly string[], deltaTime: number,
    ): void {
        if (!this.destroyed) applyCrateWindImpulse(this, wind, sourceIds, impulseX, impulseY, deltaTime);
    }
    public update(dt: number): void {
        if (this.destroyed) return;
        this.physics.update(dt);
        this.syncSprite();
    }
    private syncSprite(): void {
        if (!this.sprite) return;
        this.sprite.position.set(this.x, this.y);
        this.sprite.rotation = this.physics.rotation;
    }
    public static async loadTexture(): Promise<Texture> { return Assets.load<Texture>(crateTextureUrl); }
    public attach(parent: Container, texture: Texture): void {
        if (this.destroyed || parent.destroyed || this.sprite) return;
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.position.set(this.x, this.y);
        sprite.width = CRATE_DEFINITION.size;
        sprite.height = CRATE_DEFINITION.size * CRATE_DEFINITION.sourceHeight / CRATE_DEFINITION.sourceWidth;
        sprite.eventMode = "none";
        parent.addChild(sprite);
        this.sprite = sprite;
        this.syncSprite();
    }
    public destroy(): void {
        if (this.destruction.state === "removed") return;
        this.destroyed = true;
        this.destruction.finish();
        this.sprite?.destroy();
        this.sprite = null;
    }
}

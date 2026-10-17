import { Assets, Sprite, type Container, type Texture } from "pixi.js";
import bushTextureUrl from "../../../assets/sprites/environment/bush.png";
import { BushFireController } from "./BushFireController";
import { BUSH_FIRE } from "./BushFireDefinition";
import { BUSH_DEFINITION } from "./BushDefinition";
import { BushGeometry } from "./BushGeometry";
import { BUSH_OBJECT_COLLISION } from "./BushObjectCollisionDefinition";
import type { FixedCircleCollisionShape } from "../physics/DynamicCollidableCollision";
import type { BushPoint } from "./BushGeometryDefinition";
import type { RuntimeObjectOfType } from "../level/LevelRuntimeDefinition";

/** One level-authored bush. B1 deliberately has no physics or gameplay behavior. */
export class Bush {
    public readonly id: string;
    public readonly x: number;
    public readonly y: number;
    public readonly geometry: BushGeometry;
    private sprite: Sprite | null = null;
    private destroyed = false;
    public readonly fire = new BushFireController();

    public constructor(placement: RuntimeObjectOfType<"bush">) {
        this.id = placement.id;
        this.x = placement.x;
        this.y = placement.y;
        this.geometry = new BushGeometry({ x: this.x, y: this.y });
    }

    public get isDestroyed(): boolean { return this.destroyed; }

    /** B8: destroyed foliage no longer absorbs water. */
    public containsWaterFoliage(x:number,y:number):boolean { return !this.destroyed && this.geometry.containsFoliageWorld(x,y); }

    /** Static navigation/collision approximation; ball is explicitly excluded. */
    public getObjectCollisionShape(): FixedCircleCollisionShape {
        return {
            id: `bush-object-${this.id}`, shape: "circle",
            positionX: this.x, positionY: this.y,
            radius: BUSH_OBJECT_COLLISION.radius,
            material: { restitution: 0, friction: BUSH_OBJECT_COLLISION.friction },
        };
    }


    /** B4 foreground sprite remains opaque; only the ball silhouette is translucent. */
    public get hasFoliageSprite(): boolean { return this.sprite !== null; }

    public traversalCoverage(center: BushPoint, radius: number): number {
        return this.destroyed ? 0 : this.geometry.circleCoverage(center, radius, BUSH_DEFINITION.traversalInset);
    }

    public concealmentCoverage(center: BushPoint, radius: number): number {
        return this.destroyed ? 0 : this.geometry.circleCoverage(center, radius, BUSH_DEFINITION.concealmentInset);
    }

    public static async loadTexture(): Promise<Texture> {
        return Assets.load<Texture>(bushTextureUrl);
    }

    public attach(parent: Container, texture: Texture): void {
        if (this.destroyed || parent.destroyed) return;
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.position.set(this.x, this.y);
        sprite.width = BUSH_DEFINITION.size;
        sprite.height = BUSH_DEFINITION.size;
        sprite.eventMode = "none";
        parent.addChild(sprite);
        this.sprite = sprite;
    }

    public ignite(): boolean { return !this.destroyed && this.fire.ignite(); }
    public updateBurn(dt: number): boolean {
        if (this.destroyed) return false;
        const finished = this.fire.update(dt);
        if (this.sprite && this.fire.status === "burning") {
            const charProgress = this.fire.charProgress;
            const channel = (target: number): number => Math.round(255 * (1 - charProgress) + target * charProgress);
            const target = BUSH_FIRE.charColor;
            const r = channel((target >> 16) & 255);
            const g = channel((target >> 8) & 255);
            const b = channel(target & 255);
            this.sprite.tint = (r << 16) | (g << 8) | b;
            this.sprite.alpha = this.fire.opacity;
        }
        return finished;
    }
    public destroy(): void {
        this.destroyed = true;
        this.sprite?.destroy();
        this.sprite = null;
    }
}

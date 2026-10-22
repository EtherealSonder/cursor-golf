import { Assets, Sprite, type Container, type Texture } from "pixi.js";
import fireTextureUrl from "../../../assets/sprites/environment/fire_marble.png";
import waterTextureUrl from "../../../assets/sprites/environment/water_marble.png";
import type { DynamicCollidable } from "../physics/DynamicCollidable";
import { createElementalMarbleDefinition, ELEMENTAL_MARBLE_PHYSICS, type ElementalMarbleKind } from "./ElementalMarbleDefinition";
import { ElementalMarblePhysicsController } from "./ElementalMarblePhysicsController";
/** M1 physical marble; arming, elemental effects and destruction are deferred. */
export class ElementalMarble implements DynamicCollidable {
    public readonly physics: ElementalMarblePhysicsController;
    private readonly definition;
    private sprite: Sprite | null = null;
    private disposed = false;
    private removing = false;
    private visualScale = 1;
    constructor(public readonly id: string, public readonly kind: ElementalMarbleKind, x: number, y: number) {
        this.definition = createElementalMarbleDefinition(id, x, y);
        this.physics = new ElementalMarblePhysicsController(this.definition);
    }
    public static async loadTextures(): Promise<{ fire: Texture; water: Texture }> {
        const [fire, water] = await Promise.all([Assets.load<Texture>(fireTextureUrl), Assets.load<Texture>(waterTextureUrl)]);
        return { fire, water };
    }
    public attach(parent: Container, texture: Texture): void {
        if (this.disposed || this.sprite) return;
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.width = ELEMENTAL_MARBLE_PHYSICS.radius * 2;
        sprite.height = ELEMENTAL_MARBLE_PHYSICS.radius * 2;
        parent.addChild(sprite);
        this.sprite = sprite;
        this.syncSprite();
    }
    public update(dt: number): void { if (!this.disposed && !this.removing) { this.physics.update(dt); this.syncSprite(); } }
    public syncSprite(): void { if (this.sprite) { this.sprite.position.set(this.physics.x, this.physics.y); this.sprite.rotation = this.physics.rotation; this.sprite.scale.set(this.visualScale * (ELEMENTAL_MARBLE_PHYSICS.radius * 2 / this.sprite.texture.width), this.visualScale * (ELEMENTAL_MARBLE_PHYSICS.radius * 2 / this.sprite.texture.height)); } }
    public beginRemoval(): boolean { if (this.disposed || this.removing) return false; this.removing = true; return true; }
    public isRemoving(): boolean { return this.removing || this.disposed; }
    public setRemovalScale(scale: number): void { this.visualScale = Math.max(0, Math.min(1, scale)); this.syncSprite(); }
    public destroy(): void { this.disposed = true; this.sprite?.destroy(); this.sprite = null; }
    public getDefinition() { return this.definition; }
    public getX(): number { return this.physics.x; }
    public getY(): number { return this.physics.y; }
    public getRotationRadians(): number { return this.physics.rotation; }
    public getVelocityX(): number { return this.physics.body.getVelocityX(); }
    public getVelocityY(): number { return this.physics.body.getVelocityY(); }
    public getAngularVelocity(): number { return this.physics.body.getAngularVelocity(); }
    public getInverseMass(): number { return this.physics.body.getInverseMass(); }
    public getInverseMomentOfInertia(): number { return this.physics.body.getInverseMomentOfInertia(); }
    public applyImpulseAtWorldPoint(ix: number, iy: number, cx: number, cy: number): void { if (!this.disposed && !this.removing) this.physics.applyImpulse(ix, iy, cx, cy); }
    public translate(dx: number, dy: number): void { if (!this.disposed && !this.removing) { this.physics.translate(dx, dy); this.syncSprite(); } }
}

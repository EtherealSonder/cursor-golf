import { Sprite, Texture } from "pixi.js";

export enum WaterImpactPrimitiveType {
    SplashLobe = "splash-lobe",
    SecondaryDroplet = "secondary-droplet",
    SurfaceDisturbance = "surface-disturbance",
    Ripple = "ripple",
}

export interface WaterImpactParticleActivation {
    readonly type: WaterImpactPrimitiveType;
    readonly texture: Texture;
    readonly x: number;
    readonly y: number;
    readonly velocityX?: number;
    readonly velocityY?: number;
    readonly gravityY?: number;
    readonly dragPerSecond?: number;
    readonly lifetime: number;
    readonly startScaleX: number;
    readonly startScaleY: number;
    readonly endScaleX: number;
    readonly endScaleY: number;
    readonly maximumAlpha: number;
    readonly fadeStartFraction?: number;
    readonly rotation?: number;
    readonly angularVelocity?: number;
    readonly tint?: number;
}

/** Presentation-only pooled primitive used by shared Water impact VFX. */
export class WaterImpactVfxParticle {
    private readonly sprite: Sprite;
    private active = false;
    private type = WaterImpactPrimitiveType.SecondaryDroplet;
    private age = 0;
    private lifetime = 1;
    private velocityX = 0;
    private velocityY = 0;
    private gravityY = 0;
    private dragPerSecond = 0;
    private angularVelocity = 0;
    private startScaleX = 1;
    private startScaleY = 1;
    private endScaleX = 1;
    private endScaleY = 1;
    private maximumAlpha = 1;
    private fadeStartFraction = 0.65;

    public constructor(texture: Texture) {
        this.sprite = new Sprite(texture);
        this.sprite.anchor.set(0.5);
        this.sprite.visible = false;
    }

    public getSprite(): Sprite { return this.sprite; }
    public isActive(): boolean { return this.active; }
    public getType(): WaterImpactPrimitiveType { return this.type; }

    public activate(a: WaterImpactParticleActivation): void {
        this.active = true;
        this.type = a.type;
        this.age = 0;
        this.lifetime = Math.max(0.001, a.lifetime);
        this.velocityX = a.velocityX ?? 0;
        this.velocityY = a.velocityY ?? 0;
        this.gravityY = a.gravityY ?? 0;
        this.dragPerSecond = Math.max(0, a.dragPerSecond ?? 0);
        this.angularVelocity = a.angularVelocity ?? 0;
        this.startScaleX = Math.max(0.001, a.startScaleX);
        this.startScaleY = Math.max(0.001, a.startScaleY);
        this.endScaleX = Math.max(0.001, a.endScaleX);
        this.endScaleY = Math.max(0.001, a.endScaleY);
        this.maximumAlpha = this.clamp01(a.maximumAlpha);
        this.fadeStartFraction = this.clamp01(a.fadeStartFraction ?? 0.65);

        this.sprite.texture = a.texture;
        this.sprite.position.set(a.x, a.y);
        this.sprite.rotation = a.rotation ?? 0;
        this.sprite.scale.set(this.startScaleX, this.startScaleY);
        this.sprite.alpha = this.maximumAlpha;
        this.sprite.tint = a.tint ?? 0xffffff;
        this.sprite.visible = true;
    }

    public update(dt: number): boolean {
        if (!this.active) return false;
        if (!Number.isFinite(dt) || dt <= 0) return true;

        this.age += dt;
        if (this.age >= this.lifetime) {
            this.deactivate();
            return false;
        }

        if (this.gravityY !== 0) this.velocityY += this.gravityY * dt;
        if (this.dragPerSecond > 0) {
            const drag = Math.exp(-this.dragPerSecond * dt);
            this.velocityX *= drag; this.velocityY *= drag;
        }
        if (this.velocityX !== 0 || this.velocityY !== 0) {
            this.sprite.x += this.velocityX * dt; this.sprite.y += this.velocityY * dt;
        }
        if (this.angularVelocity !== 0) this.sprite.rotation += this.angularVelocity * dt;

        const t = this.clamp01(this.age / this.lifetime);
        this.sprite.scale.set(
            this.lerp(this.startScaleX, this.endScaleX, t),
            this.lerp(this.startScaleY, this.endScaleY, t),
        );
        const fadeT = this.clamp01((t - this.fadeStartFraction) / Math.max(0.001, 1 - this.fadeStartFraction));
        this.sprite.alpha = this.maximumAlpha * (1 - this.smoothStep(fadeT));
        return true;
    }

    public deactivate(): void {
        this.active = false;
        this.sprite.visible = false;
        this.sprite.alpha = 0;
        this.sprite.tint = 0xffffff;
        this.sprite.scale.set(0.001);
        this.velocityX = 0;
        this.velocityY = 0;
    }

    public destroy(): void { this.sprite.destroy({ texture: false }); }

    private lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
    private clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }
    private smoothStep(v: number): number { const t = this.clamp01(v); return t * t * (3 - 2 * t); }
}

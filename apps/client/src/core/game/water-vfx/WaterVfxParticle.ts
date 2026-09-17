import {
    Sprite,
    Texture,
} from "pixi.js";

export interface WaterVfxParticleActivation {
    readonly x: number;
    readonly y: number;
    readonly velocityX: number;
    readonly velocityY: number;
    readonly lifetime: number;

    readonly startScaleX: number;
    readonly startScaleY: number;
    readonly endScaleX: number;
    readonly endScaleY: number;

    readonly maximumAlpha: number;
    readonly rotation?: number;
    readonly angularVelocity?: number;
    readonly orientToVelocity?: boolean;
    readonly orientationOffset?: number;

    readonly gravityX?: number;
    readonly gravityY?: number;
    readonly dragPerSecond?: number;
    readonly fadeStartFraction?: number;
    readonly tint?: number;
}

/**
 * Presentation-only reusable Water particle.
 *
 * It intentionally owns no Water quantity, collision, moisture, pressure,
 * source timing, Fire suppression, or Ball response.
 */
export class WaterVfxParticle {
    private readonly sprite: Sprite;

    private active = false;
    private age = 0;
    private lifetime = 1;

    private velocityX = 0;
    private velocityY = 0;
    private gravityX = 0;
    private gravityY = 0;
    private dragPerSecond = 0;

    private startScaleX = 1;
    private startScaleY = 1;
    private endScaleX = 1;
    private endScaleY = 1;
    private maximumAlpha = 1;
    private fadeStartFraction = 0.72;

    private angularVelocity = 0;
    private orientToVelocity = false;
    private orientationOffset = 0;

    public constructor(texture: Texture) {
        this.sprite = new Sprite(texture);
        this.sprite.anchor.set(0.5);
        this.sprite.blendMode = "normal";
        this.sprite.visible = false;
    }

    public getSprite(): Sprite {
        return this.sprite;
    }

    public isActive(): boolean {
        return this.active;
    }

    public activate(
        texture: Texture,
        activation: WaterVfxParticleActivation,
    ): void {
        this.active = true;
        this.age = 0;
        this.lifetime = Math.max(0.001, activation.lifetime);

        this.velocityX = activation.velocityX;
        this.velocityY = activation.velocityY;
        this.gravityX = Number.isFinite(activation.gravityX) ? activation.gravityX ?? 0 : 0;
        this.gravityY = Number.isFinite(activation.gravityY) ? activation.gravityY ?? 0 : 0;
        this.dragPerSecond = Math.max(
            0,
            Number.isFinite(activation.dragPerSecond) ? activation.dragPerSecond ?? 0 : 0,
        );

        this.startScaleX = Math.max(0.001, activation.startScaleX);
        this.startScaleY = Math.max(0.001, activation.startScaleY);
        this.endScaleX = Math.max(0.001, activation.endScaleX);
        this.endScaleY = Math.max(0.001, activation.endScaleY);
        this.maximumAlpha = this.clamp01(activation.maximumAlpha);
        this.fadeStartFraction = this.clamp01(
            Number.isFinite(activation.fadeStartFraction)
                ? activation.fadeStartFraction ?? 0.72
                : 0.72,
        );

        this.angularVelocity = Number.isFinite(activation.angularVelocity)
            ? activation.angularVelocity ?? 0
            : 0;
        this.orientToVelocity = activation.orientToVelocity ?? false;
        this.orientationOffset = Number.isFinite(activation.orientationOffset)
            ? activation.orientationOffset ?? 0
            : 0;

        this.sprite.texture = texture;
        this.sprite.tint = activation.tint ?? 0xffffff;
        this.sprite.position.set(activation.x, activation.y);
        this.sprite.rotation = activation.rotation ?? 0;
        this.sprite.scale.set(this.startScaleX, this.startScaleY);
        this.sprite.alpha = this.maximumAlpha;
        this.sprite.visible = true;

        if (this.orientToVelocity) {
            this.applyVelocityOrientation();
        }
    }

    public update(deltaTime: number): boolean {
        if (!this.active) {
            return false;
        }

        if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
            return true;
        }

        this.age += deltaTime;

        if (this.age >= this.lifetime) {
            this.deactivate();
            return false;
        }

        this.velocityX += this.gravityX * deltaTime;
        this.velocityY += this.gravityY * deltaTime;

        const dragMultiplier = Math.exp(-this.dragPerSecond * deltaTime);
        this.velocityX *= dragMultiplier;
        this.velocityY *= dragMultiplier;

        this.sprite.x += this.velocityX * deltaTime;
        this.sprite.y += this.velocityY * deltaTime;

        if (this.orientToVelocity) {
            this.applyVelocityOrientation();
        } else {
            this.sprite.rotation += this.angularVelocity * deltaTime;
        }

        const t = this.clamp01(this.age / this.lifetime);
        this.sprite.scale.set(
            this.lerp(this.startScaleX, this.endScaleX, t),
            this.lerp(this.startScaleY, this.endScaleY, t),
        );

        const fadeDenominator = Math.max(0.001, 1 - this.fadeStartFraction);
        const fadeProgress = this.clamp01(
            (t - this.fadeStartFraction) / fadeDenominator,
        );
        this.sprite.alpha = this.maximumAlpha * (1 - this.smoothStep(fadeProgress));

        return true;
    }

    public deactivate(): void {
        this.active = false;
        this.sprite.visible = false;
        this.sprite.alpha = 0;
        this.sprite.scale.set(0.001, 0.001);
        this.velocityX = 0;
        this.velocityY = 0;
        this.gravityX = 0;
        this.gravityY = 0;
    }

    public destroy(): void {
        this.sprite.destroy({
            texture: false,
        });
    }

    private applyVelocityOrientation(): void {
        const speedSquared =
            this.velocityX * this.velocityX +
            this.velocityY * this.velocityY;

        if (speedSquared <= 0.0001) {
            return;
        }

        this.sprite.rotation =
            Math.atan2(this.velocityY, this.velocityX) +
            this.orientationOffset;
    }

    private lerp(start: number, end: number, amount: number): number {
        return start + (end - start) * amount;
    }

    private smoothStep(value: number): number {
        const t = this.clamp01(value);
        return t * t * (3 - 2 * t);
    }

    private clamp01(value: number): number {
        return Math.max(0, Math.min(1, value));
    }
}

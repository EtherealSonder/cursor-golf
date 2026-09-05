import type { Texture } from "pixi.js";
import type { Camera } from "../camera/Camera";
import type { WindVfxDefinition } from "../config/WindVfxDefinition";
import type { WindManager } from "../environment/WindManager";
import type { WindVfxParticle } from "./WindVfxParticle";
import type { WindVfxPool } from "./WindVfxPool";

export class GlobalWindEmitter {
    private readonly particles: WindVfxParticle[] = [];

    public constructor(
        private readonly windManager: WindManager,
        private readonly camera: Camera,
        private readonly pool: WindVfxPool,
        private readonly textures: readonly Texture[],
        private readonly definition: WindVfxDefinition,
    ) { }

    public update(deltaTime: number): void {
        const safeDeltaTime = Number.isFinite(deltaTime) ? Math.max(0, deltaTime) : 0;
        const state = this.windManager.getState();
        const strength = state.normalizedStrength;
        const targetCount = strength <= 0
            ? 0
            : Math.round(this.lerp(
                this.definition.global.minimumParticleCount,
                this.definition.global.maximumParticleCount,
                strength,
            ));

        while (this.particles.length < targetCount) {
            const particle = this.pool.acquire();
            if (!particle) break;
            this.particles.push(particle);
            this.recycle(particle, true);
        }
        while (this.particles.length > targetCount) {
            const particle = this.particles.pop();
            if (particle) this.pool.release(particle);
        }

        const directionX = state.normalizedDirection.x;
        const directionY = state.normalizedDirection.y;
        const rotation = state.directionRadians;
        const bounds = this.getBounds();

        for (const particle of this.particles) {
            particle.age += safeDeltaTime;
            particle.positionX += directionX * particle.speed * safeDeltaTime;
            particle.positionY += directionY * particle.speed * safeDeltaTime;

            if (
                particle.positionX < bounds.minimumX ||
                particle.positionX > bounds.maximumX ||
                particle.positionY < bounds.minimumY ||
                particle.positionY > bounds.maximumY ||
                particle.age >= particle.lifetime
            ) {
                this.recycle(particle, false);
            }

            particle.sprite.position.set(particle.positionX, particle.positionY);
            particle.sprite.rotation = rotation;
            particle.sprite.width = particle.length;
            particle.sprite.height = particle.width;
            const life = particle.lifetime > 0 ? particle.age / particle.lifetime : 1;
            const fade = Math.min(1, life / 0.12, (1 - life) / 0.18);
            particle.sprite.alpha = particle.opacity * Math.max(0, fade);
        }
    }

    public reset(): void {
        for (const particle of this.particles) this.pool.release(particle);
        this.particles.length = 0;
    }

    private recycle(particle: WindVfxParticle, anywhere: boolean): void {
        const state = this.windManager.getState();
        const bounds = this.getBounds();
        const directionX = state.normalizedDirection.x;
        const directionY = state.normalizedDirection.y;
        const perpendicularX = -directionY;
        const perpendicularY = directionX;
        const centerX = (bounds.minimumX + bounds.maximumX) * 0.5;
        const centerY = (bounds.minimumY + bounds.maximumY) * 0.5;
        const halfDiagonal = Math.hypot(
            bounds.maximumX - bounds.minimumX,
            bounds.maximumY - bounds.minimumY,
        ) * 0.55;
        const lateral = this.random(-halfDiagonal, halfDiagonal);
        const along = anywhere ? this.random(-halfDiagonal, halfDiagonal) : -halfDiagonal;

        particle.positionX = centerX + directionX * along + perpendicularX * lateral;
        particle.positionY = centerY + directionY * along + perpendicularY * lateral;
        particle.speed = this.random(this.definition.global.minimumSpeed, this.definition.global.maximumSpeed);
        particle.length = this.random(this.definition.global.minimumLength, this.definition.global.maximumLength);
        particle.width = this.random(this.definition.global.minimumWidth, this.definition.global.maximumWidth);
        particle.opacity = this.random(this.definition.global.minimumOpacity, this.definition.global.maximumOpacity);
        particle.age = 0;
        particle.lifetime = Math.max(1.2, (halfDiagonal * 2.2) / particle.speed);
        particle.applyTexture(this.textures[Math.floor(Math.random() * this.textures.length)]!);
        particle.sprite.visible = true;
    }

    private getBounds() {
        const padding = this.definition.global.spawnPadding;
        return {
            minimumX: this.camera.getPositionX() - padding,
            maximumX: this.camera.getPositionX() + this.camera.getVisibleWorldWidth() + padding,
            minimumY: this.camera.getPositionY() - padding,
            maximumY: this.camera.getPositionY() + this.camera.getVisibleWorldHeight() + padding,
        };
    }

    private lerp(a: number, b: number, t: number): number { return a + (b - a) * Math.max(0, Math.min(1, t)); }
    private random(a: number, b: number): number { return a + Math.random() * (b - a); }
}

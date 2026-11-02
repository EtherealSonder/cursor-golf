import type { Texture } from "pixi.js";
import type { Camera } from "../camera/Camera";
import type { WindVfxDefinition } from "../config/WindVfxDefinition";
import type { WindManager } from "../environment/WindManager";
import type { WindVfxParticle } from "./WindVfxParticle";
import type { WindVfxPool } from "./WindVfxPool";

export class GlobalWindEmitter {
    private performanceSpawnAttempts = 0;
    private performanceSpawned = 0;

    public beginPerformanceFrame(): void {
        this.performanceSpawnAttempts = 0;
        this.performanceSpawned = 0;
    }

    public getPerformanceDetails() {
        return {
            spawnAttempts: this.performanceSpawnAttempts,
            spawned: this.performanceSpawned,
        };
    }

    private readonly particles: WindVfxParticle[] = [];
    private galeForcePresentationEnabled = false;

    public setGaleForcePresentationEnabled(enabled: boolean): void {
        if (this.galeForcePresentationEnabled === enabled) return;
        this.galeForcePresentationEnabled = enabled;
        // Reconfigure the existing pooled particles without allocating a second emitter.
        for (const particle of this.particles) this.recycle(particle, true);
    }

    private getEmitterDefinition() {
        return this.galeForcePresentationEnabled ? this.definition.galeForce : this.definition.global;
    }

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
        const preset = this.getEmitterDefinition();
        const targetCount = strength <= 0
            ? 0
            : Math.round(this.lerp(
                preset.minimumParticleCount,
                preset.maximumParticleCount,
                strength,
            ));

        while (this.particles.length < targetCount) {
            this.performanceSpawnAttempts += 1;
            const particle = this.pool.acquire();
            if (!particle) break;
            this.performanceSpawned += 1;
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
        const visible = this.getVisibleBounds();

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

            // Culling is presentation-only: invisible particles still advance and recycle.
            const extent = Math.max(particle.length, particle.width) * 0.5;
            const onCamera = particle.positionX + extent >= visible.minimumX &&
                particle.positionX - extent <= visible.maximumX &&
                particle.positionY + extent >= visible.minimumY &&
                particle.positionY - extent <= visible.maximumY;
            particle.sprite.visible = onCamera;
            if (!onCamera) continue;
            particle.sprite.position.set(particle.positionX, particle.positionY);
            particle.sprite.rotation = rotation;
            // The authored 512px masks have wide transparent margins. Compensate
            // for their alpha footprint, as the local wind emitter already does.
            particle.setRenderedSize(
                this.galeForcePresentationEnabled ? 2.0 : 1.12,
                this.galeForcePresentationEnabled ? 3.0 : 2.0,
            );
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
        const visible = this.getVisibleBounds();
        const directionX = state.normalizedDirection.x;
        const directionY = state.normalizedDirection.y;
        const preset = this.getEmitterDefinition();

        // Seed the viewport on activation, instead of placing almost all
        // particles in a large diagonal off-camera spawn region.
        if (anywhere || (Math.abs(directionX) + Math.abs(directionY) < 0.001)) {
            particle.positionX = this.random(visible.minimumX, visible.maximumX);
            particle.positionY = this.random(visible.minimumY, visible.maximumY);
        } else {
            // Pick a point along the upstream edge of the camera rectangle.
            // Every recycled streak therefore travels into the visible area,
            // including diagonal winds. No particles are created or destroyed.
            const padding = Math.max(8, Math.min(32, preset.spawnPadding * 0.2));
            const horizontalWeight = Math.abs(directionX) * (visible.maximumY - visible.minimumY);
            const verticalWeight = Math.abs(directionY) * (visible.maximumX - visible.minimumX);
            const fromHorizontalEdge = Math.random() * (horizontalWeight + verticalWeight) < horizontalWeight;
            if (fromHorizontalEdge && Math.abs(directionX) > 0.001) {
                particle.positionX = directionX > 0 ? visible.minimumX - padding : visible.maximumX + padding;
                particle.positionY = this.random(visible.minimumY, visible.maximumY);
            } else if (Math.abs(directionY) > 0.001) {
                particle.positionY = directionY > 0 ? visible.minimumY - padding : visible.maximumY + padding;
                particle.positionX = this.random(visible.minimumX, visible.maximumX);
            } else {
                particle.positionX = directionX > 0 ? visible.minimumX - padding : visible.maximumX + padding;
                particle.positionY = this.random(visible.minimumY, visible.maximumY);
            }
        }

        particle.speed = this.random(preset.minimumSpeed, preset.maximumSpeed);
        particle.length = this.random(preset.minimumLength, preset.maximumLength);
        particle.width = this.random(preset.minimumWidth, preset.maximumWidth);
        particle.opacity = this.random(preset.minimumOpacity, preset.maximumOpacity);
        // Stagger ages for initially seeded particles, avoiding a synchronized
        // fade-in or a simultaneous recycle wave.
        particle.lifetime = Math.max(1.5, Math.hypot(
            visible.maximumX - visible.minimumX,
            visible.maximumY - visible.minimumY,
        ) / particle.speed * 1.8);
        particle.age = anywhere ? this.random(0.12, 0.5) * particle.lifetime : 0;
        particle.applyTexture(this.textures[Math.floor(Math.random() * this.textures.length)]!);
        particle.sprite.visible = true;
    }

    private getBounds() {
        const padding = this.getEmitterDefinition().spawnPadding;
        return {
            minimumX: this.camera.getPositionX() - padding,
            maximumX: this.camera.getPositionX() + this.camera.getVisibleWorldWidth() + padding,
            minimumY: this.camera.getPositionY() - padding,
            maximumY: this.camera.getPositionY() + this.camera.getVisibleWorldHeight() + padding,
        };
    }

    private getVisibleBounds() {
        return {
            minimumX: this.camera.getPositionX(),
            maximumX: this.camera.getPositionX() + this.camera.getVisibleWorldWidth(),
            minimumY: this.camera.getPositionY(),
            maximumY: this.camera.getPositionY() + this.camera.getVisibleWorldHeight(),
        };
    }

    private lerp(a: number, b: number, t: number): number { return a + (b - a) * Math.max(0, Math.min(1, t)); }
    private random(a: number, b: number): number { return a + Math.random() * (b - a); }
}

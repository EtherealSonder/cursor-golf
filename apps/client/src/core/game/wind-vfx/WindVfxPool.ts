import { Container, Texture } from "pixi.js";
import { WindVfxParticle } from "./WindVfxParticle";

export class WindVfxPool {
    private performanceAcquireAttempts = 0;
    private performanceAcquireSuccesses = 0;
    private performanceReleases = 0;

    public beginPerformanceFrame(): void {
        this.performanceAcquireAttempts = 0;
        this.performanceAcquireSuccesses = 0;
        this.performanceReleases = 0;
    }

    public getPerformanceDetails() {
        return {
            activeParticles: this.getActiveCount(),
            particleCapacity: this.getCapacity(),
            acquireAttempts: this.performanceAcquireAttempts,
            acquireSuccesses: this.performanceAcquireSuccesses,
            releases: this.performanceReleases,
        };
    }

    private readonly particles: WindVfxParticle[] = [];
    private readonly freeParticles: WindVfxParticle[] = [];

    public constructor(
        container: Container,
        textures: readonly Texture[],
        capacity: number,
        tint: number,
    ) {
        if (textures.length === 0) {
            throw new Error("WindVfxPool requires at least one texture.");
        }

        for (let index = 0; index < capacity; index += 1) {
            const particle = new WindVfxParticle(textures[index % textures.length]!);
            particle.sprite.tint = tint;
            container.addChild(particle.sprite);
            this.particles.push(particle);
            this.freeParticles.push(particle);
        }
    }

    public acquire(): WindVfxParticle | null {
        this.performanceAcquireAttempts += 1;
        const particle = this.freeParticles.pop() ?? null;
        if (!particle) {
            return null;
        }
        this.performanceAcquireSuccesses += 1;
        particle.active = true;
        particle.sprite.visible = true;
        return particle;
    }

    public release(particle: WindVfxParticle): void {
        this.performanceReleases += 1;
        if (!particle.active) {
            return;
        }
        particle.reset();
        this.freeParticles.push(particle);
    }

    public getActiveCount(): number {
        return (
            this.particles.length -
            this.freeParticles.length
        );
    }

    public getCapacity(): number {
        return this.particles.length;
    }

    public reset(): void {
        this.freeParticles.length = 0;
        for (const particle of this.particles) {
            particle.reset();
            this.freeParticles.push(particle);
        }
    }

    public destroy(): void {
        for (const particle of this.particles) {
            particle.destroy();
        }
        this.particles.length = 0;
        this.freeParticles.length = 0;
    }
}

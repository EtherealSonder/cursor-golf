import { Container, Texture } from "pixi.js";
import { WindVfxParticle } from "./WindVfxParticle";

export class WindVfxPool {
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
        const particle = this.freeParticles.pop() ?? null;
        if (!particle) {
            return null;
        }
        particle.active = true;
        particle.sprite.visible = true;
        return particle;
    }

    public release(particle: WindVfxParticle): void {
        if (!particle.active) {
            return;
        }
        particle.reset();
        this.freeParticles.push(particle);
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

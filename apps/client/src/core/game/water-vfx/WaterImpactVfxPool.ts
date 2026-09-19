import { Container, Texture } from "pixi.js";
import { WaterImpactVfxParticle, type WaterImpactParticleActivation } from "./WaterImpactVfxParticle";

/** Hard-bounded pool. It never allocates beyond maximumCapacity at runtime. */
export class WaterImpactVfxPool {
    private readonly container = new Container();
    private readonly particles: WaterImpactVfxParticle[] = [];

    public constructor(
        fallbackTexture: Texture,
        initialCapacity: number,
        private readonly maximumCapacity: number,
    ) {
        const initial = Math.max(0, Math.min(Math.floor(initialCapacity), Math.floor(maximumCapacity)));
        for (let i = 0; i < initial; i += 1) this.createParticle(fallbackTexture);
    }

    public getContainer(): Container { return this.container; }

    public acquire(a: WaterImpactParticleActivation): WaterImpactVfxParticle | null {
        let particle = this.particles.find((candidate) => !candidate.isActive()) ?? null;
        if (!particle && this.particles.length < this.maximumCapacity) {
            particle = this.createParticle(a.texture);
        }
        if (!particle) return null;
        particle.activate(a);
        return particle;
    }

    public update(dt: number): void {
        if (!Number.isFinite(dt) || dt <= 0) return;
        for (const particle of this.particles) if (particle.isActive()) particle.update(dt);
    }

    public reset(): void { for (const particle of this.particles) particle.deactivate(); }
    public getActiveCount(): number { return this.particles.reduce((n, p) => n + (p.isActive() ? 1 : 0), 0); }
    public getCapacity(): number { return this.particles.length; }
    public getMaximumCapacity(): number { return this.maximumCapacity; }
    public getInactiveCount(): number { return this.particles.reduce((n,p)=>n+(!p.isActive()?1:0),0); }
    public getAvailableCapacity(): number {
        return this.getInactiveCount()+Math.max(0,this.maximumCapacity-this.particles.length);
    }
    public getActiveFraction(): number {
        return this.maximumCapacity>0?this.getActiveCount()/this.maximumCapacity:0;
    }

    public destroy(): void {
        for (const particle of this.particles) particle.destroy();
        this.particles.length = 0;
        this.container.destroy({ children: false });
    }

    private createParticle(texture: Texture): WaterImpactVfxParticle {
        const particle = new WaterImpactVfxParticle(texture);
        this.particles.push(particle);
        this.container.addChild(particle.getSprite());
        return particle;
    }
}

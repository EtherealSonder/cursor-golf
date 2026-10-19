import { Container, Texture } from "pixi.js";
import { WaterImpactVfxParticle, type WaterImpactParticleActivation } from "./WaterImpactVfxParticle";

/** Hard-bounded pool. It never allocates beyond maximumCapacity at runtime. */
export class WaterImpactVfxPool {
    private readonly container = new Container();
    private readonly particles: WaterImpactVfxParticle[] = [];
    private activeParticleCount = 0;
    private readonly activeParticles: WaterImpactVfxParticle[] = [];
    // Min-heap of inactive indices: reuse the lowest pool slot as before.
    private readonly freeIndices: number[] = [];
    private readonly particleIndices = new WeakMap<WaterImpactVfxParticle, number>();

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
        const freeIndex = this.takeFreeIndex();
        const particle = freeIndex !== null
            ? this.particles[freeIndex]
            : this.particles.length < this.maximumCapacity
                ? this.createAndAcquireSlot(a.texture)
                : null;
        if (!particle) return null;
        particle.activate(a);
        this.activeParticleCount += 1;
        this.activeParticles.push(particle);
        return particle;
    }

    public update(dt: number): void {
        if (!Number.isFinite(dt) || dt <= 0) return;
        // Stable compaction retains particle update order without splice().
        let write = 0;
        const count = this.activeParticles.length;
        for (let read = 0; read < count; read += 1) {
            const particle = this.activeParticles[read];
            particle.update(dt);
            if (particle.isActive()) {
                this.activeParticles[write++] = particle;
            } else {
                this.releaseIndex(this.particleIndices.get(particle)!);
            }
        }
        this.activeParticles.length = write;
        this.activeParticleCount = write;
    }

    public reset(): void {
        for (const particle of this.particles) particle.deactivate();
        this.activeParticleCount = 0;
        this.activeParticles.length = 0;
        this.freeIndices.length = 0;
        for (let index = 0; index < this.particles.length; index += 1) this.releaseIndex(index);
    }
    public getActiveCount(): number { return this.activeParticleCount; }
    public getCapacity(): number { return this.particles.length; }
    public getMaximumCapacity(): number { return this.maximumCapacity; }
    public getInactiveCount(): number { return this.particles.length - this.activeParticleCount; }
    public getAvailableCapacity(): number {
        return this.getInactiveCount()+Math.max(0,this.maximumCapacity-this.particles.length);
    }
    public getActiveFraction(): number {
        return this.maximumCapacity>0?this.getActiveCount()/this.maximumCapacity:0;
    }

    public destroy(): void {
        for (const particle of this.particles) particle.destroy();
        this.particles.length = 0;
        this.activeParticleCount = 0;
        this.activeParticles.length = 0;
        this.freeIndices.length = 0;
        this.container.destroy({ children: false });
    }


    private createAndAcquireSlot(texture: Texture): WaterImpactVfxParticle {
        const particle = this.createParticle(texture);
        this.takeFreeIndex();
        return particle;
    }

    private releaseIndex(index: number): void {
        const heap = this.freeIndices;
        let pos = heap.length;
        heap.push(index);
        while (pos > 0) {
            const parent = (pos - 1) >> 1;
            if (heap[parent] <= index) break;
            heap[pos] = heap[parent];
            pos = parent;
        }
        heap[pos] = index;
    }

    private takeFreeIndex(): number | null {
        const heap = this.freeIndices;
        if (heap.length === 0) return null;
        const first = heap[0];
        const last = heap.pop()!;
        if (heap.length > 0) {
            let pos = 0;
            while (true) {
                const left = pos * 2 + 1;
                if (left >= heap.length) break;
                const right = left + 1;
                const child = right < heap.length && heap[right] < heap[left] ? right : left;
                if (heap[child] >= last) break;
                heap[pos] = heap[child];
                pos = child;
            }
            heap[pos] = last;
        }
        return first;
    }

    private createParticle(texture: Texture): WaterImpactVfxParticle {
        const particle = new WaterImpactVfxParticle(texture);
        this.particleIndices.set(particle, this.particles.length);
        this.particles.push(particle);
        this.releaseIndex(this.particles.length - 1);
        this.container.addChild(particle.getSprite());
        return particle;
    }
}

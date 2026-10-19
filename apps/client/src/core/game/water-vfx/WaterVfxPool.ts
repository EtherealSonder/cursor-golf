import {
    Container,
    Texture,
} from "pixi.js";

import {
    WaterVfxParticle,
} from "./WaterVfxParticle";

import type {
    WaterVfxParticleActivation,
} from "./WaterVfxParticle";

import type {
    WaterVfxPoolDefinition,
} from "../config/WaterVfxDefinition";

/**
 * Allocation-bounded pool for secondary Water presentation particles.
 */
export class WaterVfxPool {
    private readonly container = new Container();
    private readonly particles: WaterVfxParticle[] = [];
    /** Maintained on emission, expiry and reset; avoids repeated full-pool counts. */
    private activeParticleCount = 0;
    private readonly activeParticles: WaterVfxParticle[] = [];
    // Min-heap of inactive indices: reuse the lowest pool slot as before.
    private readonly freeIndices: number[] = [];
    private readonly particleIndices = new WeakMap<WaterVfxParticle, number>();

    private readonly initialCapacity: number;
    private readonly maximumCapacity: number;

    public constructor(
        fallbackTexture: Texture,
        definition: WaterVfxPoolDefinition,
    ) {
        this.initialCapacity = Math.max(
            0,
            Math.floor(definition.initialCapacity),
        );

        this.maximumCapacity = Math.max(
            this.initialCapacity,
            Math.floor(definition.maximumCapacity),
        );

        for (let index = 0; index < this.initialCapacity; index += 1) {
            this.createParticle(fallbackTexture);
        }
    }

    public getContainer(): Container {
        return this.container;
    }

    public acquire(
        texture: Texture,
        activation: WaterVfxParticleActivation,
    ): WaterVfxParticle | null {
        const freeIndex = this.takeFreeIndex();
        const particle = freeIndex !== null
            ? this.particles[freeIndex]
            : this.particles.length < this.maximumCapacity
                ? this.createAndAcquireSlot(texture)
                : null;
        if (!particle) return null;

        particle.activate(texture, activation);
        this.activeParticleCount += 1;
        this.activeParticles.push(particle);
        return particle;
    }

    public update(deltaTime: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
            return;
        }

        // Stable, in-place compaction: no per-expiration array shifting.
        let write = 0;
        const count = this.activeParticles.length;
        for (let read = 0; read < count; read += 1) {
            const particle = this.activeParticles[read];
            particle.update(deltaTime);
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
        this.activeParticleCount = 0;
        this.activeParticles.length = 0;
        this.freeIndices.length = 0;
        for (let index = 0; index < this.particles.length; index += 1) {
            this.particles[index].deactivate();
            this.releaseIndex(index);
        }
    }

    public getActiveCount(): number {
        return this.activeParticleCount;
    }

    public getCapacity(): number {
        return this.particles.length;
    }

    public destroy(): void {
        for (let index = 0; index < this.particles.length; index += 1) {
            this.particles[index].destroy();
        }

        this.particles.length = 0;
        this.activeParticles.length = 0;
        this.freeIndices.length = 0;
        this.activeParticleCount = 0;

        this.container.destroy({
            children: false,
        });
    }


    private createAndAcquireSlot(texture: Texture): WaterVfxParticle {
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

    private createParticle(texture: Texture): WaterVfxParticle {
        const particle = new WaterVfxParticle(texture);

        this.particleIndices.set(particle, this.particles.length);
        this.particles.push(particle);
        this.releaseIndex(this.particles.length - 1);
        this.container.addChild(particle.getSprite());

        return particle;
    }
}

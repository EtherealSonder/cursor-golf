import {
    Container,
    Texture,
} from "pixi.js";

import {
    FireVfxParticle,
} from "./FireVfxParticle";

import type {
    FireVfxParticleActivation,
} from "./FireVfxParticle";

import type {
    DirectionalFirePresentationRegion,
} from "./DirectionalFirePresentationRegion";

import {
    DEFAULT_GROUND_FIRE_VFX_DEFINITION,
} from "../config/GroundFireVfxDefinition";

import type {
    FireParticleCollisionField,
} from "./FireParticleCollisionField";

export interface FireVfxPoolDefinition {
    readonly initialCapacity: number;
    readonly maximumCapacity: number;
}

/**
 * Reusable Fire-particle pool.
 *
 * Particles are created only when pool capacity grows. Normal emission
 * reuses inactive particles instead of allocating/destroying Sprites.
 */
export class FireVfxPool {
    private performanceAcquireAttempts = 0;
    private performanceAcquireSuccesses = 0;
    private performanceReusedParticles = 0;
    private performanceCreatedParticles = 0;

    public beginPerformanceFrame(): void {
        this.performanceAcquireAttempts = 0;
        this.performanceAcquireSuccesses = 0;
        this.performanceReusedParticles = 0;
        this.performanceCreatedParticles = 0;
    }

    public getPerformanceDetails() {
        let activeGroundParticles = 0;
        let activeDirectionalParticles = 0;
        for (const particle of this.activeParticles) {
            if (!particle.isActive()) continue;
            if (particle.getPresentationOrigin() === "ground") activeGroundParticles += 1;
            if (particle.getPresentationOrigin() === "directional") activeDirectionalParticles += 1;
        }
        return {
            activeGroundParticles,
            activeDirectionalParticles,
            activeParticles: activeGroundParticles + activeDirectionalParticles,
            particleCapacity: this.particles.length,
            acquireAttempts: this.performanceAcquireAttempts,
            acquireSuccesses: this.performanceAcquireSuccesses,
            reusedParticles: this.performanceReusedParticles,
            createdParticles: this.performanceCreatedParticles,
        };
    }

    private readonly container =
        new Container();

    /** Ground-origin flames are rendered beneath portal artwork. */
    private readonly groundContainer = new Container();

    private readonly particles:
        FireVfxParticle[] = [];

    // Inactive particles are recycled in O(1) rather than scanning the pool per emission.
    private readonly availableParticles: FireVfxParticle[] = [];
    // Active-only traversal; insertion order is stable and deactivation removes entries.
    private readonly activeParticles = new Set<FireVfxParticle>();
    private activeGroundCount = 0;

    private readonly initialCapacity:
        number;

    private readonly maximumCapacity:
        number;

    private readonly maximumActiveGroundParticles:
        number;

    public constructor(
        fallbackTexture: Texture,
        definition:
            FireVfxPoolDefinition,
        private readonly collisionField?:
            FireParticleCollisionField,
    ) {
        this.initialCapacity =
            Math.max(
                0,
                Math.floor(
                    definition.initialCapacity,
                ),
            );

        this.maximumCapacity =
            Math.max(
                this.initialCapacity,
                Math.floor(
                    definition.maximumCapacity,
                ),
            );

        this.maximumActiveGroundParticles =
            Math.max(
                0,
                Math.floor(
                    DEFAULT_GROUND_FIRE_VFX_DEFINITION
                        .maximumActivePresentationParticles,
                ),
            );

        for (
            let index = 0;
            index <
            this.initialCapacity;
            index += 1
        ) {
            this.createParticle(
                fallbackTexture,
            );
        }
    }

    public getContainer():
        Container {

        return this.container;
    }

    public getGroundContainer(): Container { return this.groundContainer; }

    public acquire(
        texture: Texture,
        activation:
            FireVfxParticleActivation,
    ): FireVfxParticle | null {
        this.performanceAcquireAttempts += 1;

        if (
            activation.presentationOrigin ===
                "ground" &&
            this.activeGroundCount >=
                this.maximumActiveGroundParticles
        ) {
            return null;
        }

        let particle = this.availableParticles.pop() ?? null;
        if (particle) {
            this.performanceReusedParticles += 1;
        } else if (this.particles.length < this.maximumCapacity) {
            this.performanceCreatedParticles += 1;
            particle = this.createParticle(texture);
            // Newly created particles are inactive until activate().
            this.availableParticles.pop();
        }

        if (!particle) {
            return null;
        }

        this.performanceAcquireSuccesses += 1;
        if (activation.presentationOrigin === "ground") {
            this.activeGroundCount += 1;
        }

        // A pooled particle can switch between ground and directional ownership.
        // Reparent before activation so its visible sprite follows that ownership.
        const targetContainer = activation.presentationOrigin === "ground"
            ? this.groundContainer : this.container;
        if (particle.getSprite().parent !== targetContainer) {
            targetContainer.addChild(particle.getSprite());
        }

        particle.activate(
            texture,
            (
                activation.presentationOrigin ===
                    "directional" ||
                activation.presentationOrigin ===
                    "ground"
            ) &&
            this.collisionField
                ? {
                    ...activation,
                    collisionField:
                        activation.collisionField ??
                        this.collisionField,
                }
                : activation,
        );

        if (particle.isActive()) {
            this.activeParticles.add(particle);
        } else {
            // Defensive: activation may reject invalid presentation data.
            if (activation.presentationOrigin === "ground") this.activeGroundCount -= 1;
            this.availableParticles.push(particle);
        }

        return particle;
    }


    /**
     * F-2 runtime presentation ownership pass.
     *
     * Ground particles may have been emitted before a Directional Fire
     * footprint reached them. Because Ground and Directional particles share
     * this pool, remove only Ground presentation particles that currently
     * occupy Directional presentation-owned space.
     *
     * This mutates presentation state only.
     */
    public suppressGroundParticlesInDirectionalRegion(
        region:
            DirectionalFirePresentationRegion,
    ): number {

        let suppressedCount =
            0;

        if (this.activeGroundCount === 0) return 0;

        for (const particle of this.activeParticles) {
            if (particle.getPresentationOrigin() !== "ground") continue;
            if (region.containsPoint(particle.getWorldX(), particle.getWorldY())) {
                particle.deactivate();
                this.activeParticles.delete(particle);
                this.activeGroundCount -= 1;
                this.availableParticles.push(particle);
                suppressedCount += 1;
            }
        }

        return suppressedCount;
    }

    /** CB6: presentation-only ground flame occlusion; directional flames remain visible. */
    public applyGroundOcclusion(isCovered: (x: number, y: number) => boolean): void {
        for (const particle of this.activeParticles) {
            if (!particle.isActive()) continue;
            if (particle.getPresentationOrigin() === "ground") {
                particle.getSprite().visible = !isCovered(particle.getWorldX(), particle.getWorldY());
            }
        }
    }

    public update(
        deltaTime: number,
    ): void {

        if (
            !Number.isFinite(
                deltaTime,
            ) ||
            deltaTime <= 0
        ) {
            return;
        }

        for (const particle of this.activeParticles) {
            const wasGround = particle.getPresentationOrigin() === "ground";
            particle.update(deltaTime);
            if (!particle.isActive()) {
                this.activeParticles.delete(particle);
                if (wasGround) this.activeGroundCount -= 1;
                this.availableParticles.push(particle);
            }
        }
    }

    public reset():
        void {
        this.availableParticles.length = 0;
        this.activeParticles.clear();
        this.activeGroundCount = 0;

        for (
            let index = 0;
            index <
            this.particles.length;
            index += 1
        ) {
            this.particles[index]
                .deactivate();
            this.availableParticles.push(this.particles[index]);
        }
    }

    public getActiveCount():
        number {

        return this.activeParticles.size;
    }

    public hasActiveGroundParticles(): boolean {
        return this.activeGroundCount > 0;
    }

    public getCapacity():
        number {

        return this.particles.length;
    }

    public destroy():
        void {

        for (
            let index = 0;
            index <
            this.particles.length;
            index += 1
        ) {
            this.particles[index]
                .destroy();
        }

        this.particles.length =
            0;
        this.availableParticles.length = 0;
        this.activeParticles.clear();
        this.activeGroundCount = 0;

        this.container.destroy({ children: false });
        this.groundContainer.destroy({ children: false });
    }

    private createParticle(
        texture: Texture,
    ): FireVfxParticle {

        const particle =
            new FireVfxParticle(
                texture,
            );

        this.particles.push(
            particle,
        );
        this.availableParticles.push(particle);

        this.container.addChild(
            particle.getSprite(),
        );

        return particle;
    }
}

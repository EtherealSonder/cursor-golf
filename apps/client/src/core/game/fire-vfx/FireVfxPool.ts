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
    private readonly container =
        new Container();

    private readonly particles:
        FireVfxParticle[] = [];

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

    public acquire(
        texture: Texture,
        activation:
            FireVfxParticleActivation,
    ): FireVfxParticle | null {

        if (
            activation.presentationOrigin ===
                "ground" &&
            this.getActiveGroundCount() >=
                this.maximumActiveGroundParticles
        ) {
            return null;
        }

        let particle:
            FireVfxParticle | null =
            null;

        for (
            let index = 0;
            index <
            this.particles.length;
            index += 1
        ) {
            const candidate =
                this.particles[index];

            if (
                !candidate.isActive()
            ) {
                particle =
                    candidate;

                break;
            }
        }

        if (
            !particle &&
            this.particles.length <
            this.maximumCapacity
        ) {
            particle =
                this.createParticle(
                    texture,
                );
        }

        if (!particle) {
            return null;
        }

        particle.activate(
            texture,
            activation,
        );

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

        for (
            let index = 0;
            index <
            this.particles.length;
            index += 1
        ) {
            const particle =
                this.particles[index];

            if (
                !particle.isActive() ||
                particle.getPresentationOrigin() !==
                    "ground"
            ) {
                continue;
            }

            if (
                region.containsPoint(
                    particle.getWorldX(),
                    particle.getWorldY(),
                )
            ) {
                particle.deactivate();

                suppressedCount +=
                    1;
            }
        }

        return suppressedCount;
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

        for (
            let index = 0;
            index <
            this.particles.length;
            index += 1
        ) {
            const particle =
                this.particles[index];

            if (
                particle.isActive()
            ) {
                particle.update(
                    deltaTime,
                );
            }
        }
    }

    public reset():
        void {

        for (
            let index = 0;
            index <
            this.particles.length;
            index += 1
        ) {
            this.particles[index]
                .deactivate();
        }
    }

    public getActiveCount():
        number {

        let activeCount =
            0;

        for (
            let index = 0;
            index <
            this.particles.length;
            index += 1
        ) {
            if (
                this.particles[index]
                    .isActive()
            ) {
                activeCount +=
                    1;
            }
        }

        return activeCount;
    }

    public getCapacity():
        number {

        return this.particles.length;
    }

    private getActiveGroundCount():
        number {

        let activeGroundCount =
            0;

        for (
            let index = 0;
            index <
            this.particles.length;
            index += 1
        ) {
            const particle =
                this.particles[index];

            if (
                particle.isActive() &&
                particle.getPresentationOrigin() ===
                    "ground"
            ) {
                activeGroundCount +=
                    1;
            }
        }

        return activeGroundCount;
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

        this.container.destroy({
            children: false,
        });
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

        this.container.addChild(
            particle.getSprite(),
        );

        return particle;
    }
}

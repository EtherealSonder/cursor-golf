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

import {
    Container,
    Texture,
} from "pixi.js";

import {
    DEFAULT_FIRE_PARTICLE_VFX_DEFINITION,
} from "../config/FireParticleVfxDefinition";

import {
    FireVfxPool,
} from "./FireVfxPool";

import type {
    FireVfxParticleActivation,
} from "./FireVfxParticle";

import {
    FireVfxTextureFactory,
} from "./FireVfxTextureFactory";

import type {
    FireVfxTextures,
} from "./FireVfxTextureFactory";

import {
    FireTestEmitter,
} from "./FireTestEmitter";

export type FireVfxTextureVariant =
    | "body"
    | "core"
    | "accent"
    | "ember";

/**
 * FIRE-VFX-1 presentation-only Fire coordinator.
 *
 * Current scope:
 * - textured pooled Pixi Sprites
 * - fixed isolated development emitter
 * - no FireManager dependency
 * - no FireCell rendering
 * - no Wind
 * - no FireSource jet rendering
 * - no shader
 *
 * The old GroundFireBaseRenderer is intentionally retired from the active
 * runtime path.
 */
export class FireVfxSystem {
    private readonly container =
        new Container();

    private readonly textures:
        FireVfxTextures;

    private readonly pool:
        FireVfxPool;

    private readonly testEmitter:
        FireTestEmitter;

    public constructor() {
        this.textures =
            FireVfxTextureFactory.create();

        this.pool =
            new FireVfxPool(
                this.textures.body,
                {
                    initialCapacity:
                        DEFAULT_FIRE_PARTICLE_VFX_DEFINITION
                            .pool
                            .initialCapacity,

                    maximumCapacity:
                        DEFAULT_FIRE_PARTICLE_VFX_DEFINITION
                            .pool
                            .maximumCapacity,
                },
            );

        this.testEmitter =
            new FireTestEmitter(
                DEFAULT_FIRE_PARTICLE_VFX_DEFINITION,
                (
                    variant,
                    activation,
                ): boolean => {

                    return this.emitParticle(
                        variant,
                        activation,
                    );
                },
            );

        this.container.addChild(
            this.pool.getContainer(),
        );
    }

    public getContainer():
        Container {

        return this.container;
    }

    public emitParticle(
        variant:
            FireVfxTextureVariant,
        activation:
            FireVfxParticleActivation,
    ): boolean {

        return (
            this.pool.acquire(
                this.getTexture(
                    variant,
                ),
                activation,
            ) !== null
        );
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

        this.testEmitter.update(
            deltaTime,
        );

        this.pool.update(
            deltaTime,
        );
    }

    public reset():
        void {

        this.testEmitter.reset();

        this.pool.reset();
    }

    public getActiveParticleCount():
        number {

        return this.pool
            .getActiveCount();
    }

    public getParticleCapacity():
        number {

        return this.pool
            .getCapacity();
    }

    public destroy():
        void {

        this.testEmitter.destroy();

        this.pool.destroy();

        FireVfxTextureFactory.destroy(
            this.textures,
        );

        this.container.destroy({
            children:
                false,
        });
    }

    private getTexture(
        variant:
            FireVfxTextureVariant,
    ): Texture {

        switch (variant) {
            case "core":
                return this.textures.core;

            case "accent":
                return this.textures.accent;

            case "ember":
                return this.textures.ember;

            case "body":
            default:
                return this.textures.body;
        }
    }
}

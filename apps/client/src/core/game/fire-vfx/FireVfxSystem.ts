import {
    Container,
    Texture,
} from "pixi.js";

import {
    DEFAULT_FIRE_PARTICLE_VFX_DEFINITION,
} from "../config/FireParticleVfxDefinition";

import type {
    FireParticleMaterialLayer,
} from "../config/FireParticleVfxDefinition";

import type {
    FireManager,
} from "../environment/FireManager";

import type {
    EnvironmentField,
} from "../environment/EnvironmentField";

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

import {
    GroundFireEmitter,
} from "./GroundFireEmitter";

import {
    ScorchRenderer,
} from "./ScorchRenderer";

export type FireVfxTextureVariant =
    | "body"
    | "core"
    | "accent"
    | "ember";

/**
 * FIRE-VFX-3A presentation-only Fire coordinator.
 *
 * Normal runtime path:
 *
 * FireManager
 *     ↓
 * GroundFireEmitter
 *     ↓
 * FireVfxPool
 *     ↓
 * FireVfxParticle Sprite
 *
 * FireCells remain invisible simulation records. They are never represented
 * by one circle, one stamp or one persistent visible cell object.
 *
 * FireTestEmitter is deliberately retained as an isolated VFX diagnostic,
 * but is not updated during normal FIRE-VFX-3A runtime.
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

    private readonly groundFireEmitter:
        GroundFireEmitter;

    private readonly scorchRenderer:
        ScorchRenderer;

    public constructor(
        fireManager:
            FireManager,

        environmentField:
            EnvironmentField,
    ) {

        this.textures =
            FireVfxTextureFactory.create();

        this.pool =
            new FireVfxPool(
                this.textures.main.body,
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

        /*
         * Retained only as an isolated diagnostic tool.
         *
         * FIRE-VFX-3A does not call testEmitter.update(), so the old fixed
         * world-position test flame no longer appears during normal play.
         */
        this.testEmitter =
            new FireTestEmitter(
                DEFAULT_FIRE_PARTICLE_VFX_DEFINITION,
                (
                    variant,
                    materialLayer,
                    activation,
                ): boolean => {

                    return this.emitParticle(
                        variant,
                        materialLayer,
                        activation,
                    );
                },
            );

        this.scorchRenderer =
            new ScorchRenderer(
                environmentField,
            );

        this.groundFireEmitter =
            new GroundFireEmitter(
                fireManager,
                (
                    variant,
                    materialLayer,
                    activation,
                ): boolean => {

                    return this.emitParticle(
                        variant,
                        materialLayer,
                        activation,
                    );
                },
            );

        /*
         * Scorch sits below active flame particles.
         */
        this.container.addChild(
            this.scorchRenderer
                .getContainer(),
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

        materialLayer:
            FireParticleMaterialLayer,

        activation:
            FireVfxParticleActivation,
    ): boolean {

        return (
            this.pool.acquire(
                this.getTexture(
                    variant,
                    materialLayer,
                ),

                activation,
            ) !== null
        );
    }

    public update(
        deltaTime:
            number,
    ): void {

        if (
            !Number.isFinite(
                deltaTime,
            ) ||
            deltaTime <=
            0
        ) {
            return;
        }

        /*
         * FIRE-VFX-3A normal runtime path.
         *
         * The isolated FireTestEmitter is intentionally not updated.
         */
        this.scorchRenderer
            .update(
                deltaTime,
            );

        this.groundFireEmitter
            .update(
                deltaTime,
            );

        this.pool.update(
            deltaTime,
        );
    }

    public reset():
        void {

        this.testEmitter.reset();

        this.groundFireEmitter
            .reset();

        this.scorchRenderer
            .reset();

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

        this.groundFireEmitter
            .destroy();

        this.scorchRenderer
            .destroy();

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

        materialLayer:
            FireParticleMaterialLayer,
    ): Texture {

        if (
            variant ===
            "ember"
        ) {
            return this.textures
                .ember;
        }

        if (
            materialLayer ===
            "detail"
        ) {
            return this.getRandomDetailTexture(
                variant,
            );
        }

        return this.getMainTexture(
            variant,
        );
    }

    private getMainTexture(
        variant:
            FireVfxTextureVariant,
    ): Texture {

        switch (
        variant
        ) {
            case "core":
                return this.textures
                    .main
                    .hot;

            case "accent":
                return this.textures
                    .main
                    .cool;

            case "body":
            default:
                return this.textures
                    .main
                    .body;
        }
    }

    private getRandomDetailTexture(
        variant:
            FireVfxTextureVariant,
    ): Texture {

        switch (
        variant
        ) {
            case "core":
                return this.pickRandomTexture(
                    this.textures
                        .detail
                        .hot,
                );

            case "accent":
                return this.pickRandomTexture(
                    this.textures
                        .detail
                        .cool,
                );

            case "body":
            default:
                return this.pickRandomTexture(
                    this.textures
                        .detail
                        .body,
                );
        }
    }

    private pickRandomTexture(
        textures:
            readonly Texture[],
    ): Texture {

        if (
            textures.length ===
            0
        ) {
            return this.textures
                .main
                .body;
        }

        if (
            textures.length ===
            1
        ) {
            return textures[0];
        }

        const index =
            Math.floor(
                Math.random() *
                textures.length,
            );

        return textures[
            index
        ];
    }
}

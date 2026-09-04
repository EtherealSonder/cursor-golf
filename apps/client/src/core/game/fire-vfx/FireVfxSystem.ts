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

import type {
    LocalWindSystem,
} from "../environment/LocalWindSystem";

import type {
    FireSourceSystem,
} from "../environment/FireSourceSystem";

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
    JetFireEmitter,
} from "./JetFireEmitter";

import {
    ScorchRenderer,
} from "./ScorchRenderer";

export type FireVfxTextureVariant =
    | "body"
    | "core"
    | "accent"
    | "ember";

/**
 * FIRE-VFX-5 presentation-only Fire coordinator.
 *
 * GroundFireEmitter and JetFireEmitter intentionally converge on the same
 * FireVfxPool, FireVfxParticle class and texture material set.
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
 * FireTestEmitter is retained only as an optional isolated diagnostic.
 * It is disabled by default through FireParticleVfxDefinition and is never
 * part of the normal runtime Fire presentation path.
 */
export class FireVfxSystem {

    private readonly container =
        new Container();

    private readonly textures:
        FireVfxTextures;

    private readonly pool:
        FireVfxPool;

    private readonly testEmitter:
        FireTestEmitter | null;

    private readonly groundFireEmitter:
        GroundFireEmitter;

    private readonly jetFireEmitter:
        JetFireEmitter;

    private readonly scorchRenderer:
        ScorchRenderer;

    public constructor(
        fireManager:
            FireManager,

        fireSourceSystem:
            FireSourceSystem,

        environmentField:
            EnvironmentField,

        localWindSystem:
            LocalWindSystem,
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
         * Isolated diagnostic emitter.
         *
         * Normal gameplay never needs this emitter. It is only constructed
         * when explicitly enabled in FireParticleVfxDefinition.
         */
        this.testEmitter =
            DEFAULT_FIRE_PARTICLE_VFX_DEFINITION
                .testEmitter
                .enabled
                ? new FireTestEmitter(
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
                )
                : null;

        this.scorchRenderer =
            new ScorchRenderer(
                environmentField,
            );

        this.groundFireEmitter =
            new GroundFireEmitter(
                fireManager,
                localWindSystem,
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

        this.jetFireEmitter =
            new JetFireEmitter(
                fireSourceSystem,
                localWindSystem,
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
         * FIRE-VFX-3D normal runtime path.
         *
         * The diagnostic FireTestEmitter is deliberately excluded from
         * normal gameplay updates.
         */
        this.scorchRenderer
            .update(
                deltaTime,
            );

        this.groundFireEmitter
            .update(
                deltaTime,
            );

        this.jetFireEmitter
            .update(
                deltaTime,
            );

        this.pool.update(
            deltaTime,
        );
    }

    public reset():
        void {

        this.testEmitter
            ?.reset();

        this.groundFireEmitter
            .reset();

        this.jetFireEmitter
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

        this.testEmitter
            ?.destroy();

        this.groundFireEmitter
            .destroy();

        this.jetFireEmitter
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

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

import {
    DIRECTIONAL_FIRE_PRESENTATION_CONTRACT,
    GROUND_FIRE_PRESENTATION_CONTRACT,
} from "./FirePresentationContract";

import {
    FirePresentationContractValidation,
} from "../debug/FirePresentationContractValidation";

import {
    DirectionalFirePresentationOwnershipValidation,
} from "../debug/DirectionalFirePresentationOwnershipValidation";
import {
    FireArtDirectionValidation,
} from "../debug/FireArtDirectionValidation";


import {
    DirectionalFirePresentationRegion,
} from "./DirectionalFirePresentationRegion";

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
 * Phase 8F-4 keeps that shared pool architecture. JetFireEmitter attaches an
 * optional live directional-travel constraint to its activations, while
 * Ground Fire activations remain unconstrained. The generic pool therefore
 * needs no source-specific ownership or update path.
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

    public static readonly groundPresentationContract =
        GROUND_FIRE_PRESENTATION_CONTRACT;

    public static readonly directionalPresentationContract =
        DIRECTIONAL_FIRE_PRESENTATION_CONTRACT;

    private readonly groundContainer =
        new Container();

    private readonly airborneContainer =
        new Container();

    private readonly textures:
        FireVfxTextures;

    private readonly pool:
        FireVfxPool;

    private readonly testEmitter:
        FireTestEmitter | null;

    private readonly directionalPresentationRegion:
        DirectionalFirePresentationRegion;

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

        FirePresentationContractValidation.run();
        DirectionalFirePresentationOwnershipValidation.run();
        FireArtDirectionValidation.run();

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

        this.directionalPresentationRegion =
            new DirectionalFirePresentationRegion(
                fireSourceSystem,
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
                this.directionalPresentationRegion,
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
                this.directionalPresentationRegion,
            );

        /*
         * Scorch sits below active flame particles.
         */
        this.groundContainer.addChild(
            this.scorchRenderer
                .getContainer(),
        );

        this.airborneContainer.addChild(
            this.pool.getContainer(),
        );
    }

    public getGroundContainer():
        Container {

        return this.groundContainer;
    }

    public getAirborneContainer():
        Container {

        return this.airborneContainer;
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

        // F-2: refresh current Directional presentation ownership before
        // Ground Fire decides which active cells should emit particles.
        this.directionalPresentationRegion
            .update();

        /*
         * F-2 runtime ownership:
         *
         * New Ground emission is blocked by GroundFireEmitter, while this
         * pass removes Ground particles that were already alive before the
         * Directional presentation footprint reached them.
         */
        this.pool
            .suppressGroundParticlesInDirectionalRegion(
                this.directionalPresentationRegion,
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

    /**
     * Full presentation reset. Used when the Fire environment itself is
     * reset, so persistent scorch is cleared together with authoritative
     * EnvironmentField burn state.
     */
    public reset():
        void {

        this.resetActiveFireOnly();

        this.scorchRenderer
            .reset();
    }

    /**
     * Clears only active flame presentation. Historical scorch deliberately
     * remains untouched because EnvironmentField burn also persists during
     * an active-Fire-only reset.
     */
    public resetActiveFireOnly():
        void {

        this.testEmitter
            ?.reset();

        this.directionalPresentationRegion
            .reset();

        this.groundFireEmitter
            .reset();

        this.jetFireEmitter
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

        this.groundContainer.destroy({
            children:
                false,
        });

        this.airborneContainer.destroy({
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

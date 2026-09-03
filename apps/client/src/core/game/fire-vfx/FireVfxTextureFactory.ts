import {
    Texture,
} from "pixi.js";

import {
    DEFAULT_FIRE_PARTICLE_VFX_DEFINITION,
} from "../config/FireParticleVfxDefinition";

import type {
    FireParticleMaterialVariantDefinition,
} from "../config/FireParticleVfxDefinition";

import {
    AssetLoader,
} from "../../rendering/AssetLoader";

import {
    FireParticleTextureGenerator,
} from "./FireParticleTextureGenerator";

export interface FireVfxMainTextures {
    readonly hot:
    Texture;

    readonly body:
    Texture;

    readonly cool:
    Texture;
}

export interface FireVfxDetailTextures {
    readonly hot:
    readonly Texture[];

    readonly body:
    readonly Texture[];

    readonly cool:
    readonly Texture[];
}

export interface FireVfxTextures {
    readonly main:
    FireVfxMainTextures;

    readonly detail:
    FireVfxDetailTextures;

    readonly ember:
    Texture;
}

/**
 * FIRE-VFX-2B hybrid texture factory.
 *
 * Important test condition:
 *
 * fireGradientSoft is intentionally excluded from all active Fire particle
 * mappings.
 *
 * Main Fire:
 *     HOT  -> fireGlowRound
 *     BODY -> fireGlowSoft
 *     COOL -> fireGlowSoft
 *
 * Detail Fire:
 *     generated only from fireGlowRound / fireGlowSoft + noise
 */
export class FireVfxTextureFactory {

    public static create():
        FireVfxTextures {

        const material =
            DEFAULT_FIRE_PARTICLE_VFX_DEFINITION
                .material;

        const main:
            FireVfxMainTextures = {

            hot:
                AssetLoader.getTexture(
                    "fireGlowRound",
                ),

            body:
                AssetLoader.getTexture(
                    "fireGlowSoft",
                ),

            /*
             * Deliberately use the compact soft mask instead of
             * fireGradientSoft so cooling particles do not inherit the
             * vertical capsule/tube silhouette.
             */
            cool:
                AssetLoader.getTexture(
                    "fireGlowSoft",
                ),
        };

        const detail:
            FireVfxDetailTextures = {

            hot:
                this.generateVariants(
                    material.hot,
                    material.outputSize,
                ),

            body:
                this.generateVariants(
                    material.body,
                    material.outputSize,
                ),

            cool:
                this.generateVariants(
                    material.cool,
                    material.outputSize,
                ),
        };

        if (
            detail.hot.length ===
            0 ||
            detail.body.length ===
            0 ||
            detail.cool.length ===
            0
        ) {
            throw new Error(
                "FireVfxTextureFactory requires at least one HOT, BODY and COOL detail texture.",
            );
        }

        console.log(
            "FIRE-VFX-2B no-gradient materials ready.",
            {
                mainHot:
                    "fireGlowRound",

                mainBody:
                    "fireGlowSoft",

                mainCool:
                    "fireGlowSoft",

                detailHot:
                    detail.hot.length,

                detailBody:
                    detail.body.length,

                detailCool:
                    detail.cool.length,

                detailChance:
                    material.detailParticleChance,

                generatedOutputSize:
                    material.outputSize,
            },
        );

        return {
            main,
            detail,

            ember:
                AssetLoader.getTexture(
                    "fireGlowRound",
                ),
        };
    }

    public static destroy(
        textures:
            FireVfxTextures,
    ): void {

        /*
         * Only generated detail textures belong to this factory.
         * Main masks and ember are shared AssetLoader textures.
         */
        this.destroyGeneratedTextures(
            textures.detail.hot,
        );

        this.destroyGeneratedTextures(
            textures.detail.body,
        );

        this.destroyGeneratedTextures(
            textures.detail.cool,
        );
    }

    private static generateVariants(
        definitions:
            readonly FireParticleMaterialVariantDefinition[],

        outputSize:
            number,
    ): Texture[] {

        const textures:
            Texture[] = [];

        for (
            const definition
            of definitions
        ) {
            const maskTexture =
                AssetLoader.getTexture(
                    definition.maskTextureKey,
                );

            const noiseTexture =
                AssetLoader.getTexture(
                    definition.noiseTextureKey,
                );

            textures.push(
                FireParticleTextureGenerator
                    .generate(
                        maskTexture,
                        noiseTexture,
                        {
                            outputSize,

                            noiseScale:
                                definition.noiseScale,

                            breakupStrength:
                                definition.breakupStrength,

                            edgeBreakupStrength:
                                definition.edgeBreakupStrength,

                            noiseOffsetX:
                                definition.noiseOffsetX,

                            noiseOffsetY:
                                definition.noiseOffsetY,
                        },
                    ),
            );
        }

        return textures;
    }

    private static destroyGeneratedTextures(
        textures:
            readonly Texture[],
    ): void {

        for (
            const texture
            of textures
        ) {
            texture.destroy(
                true,
            );
        }
    }
}

import {
    Texture,
} from "pixi.js";

import {
    AssetLoader,
} from "../../rendering/AssetLoader";

export interface FireVfxTextures {
    readonly body: Texture;
    readonly core: Texture;
    readonly accent: Texture;
    readonly ember: Texture;
}

/**
 * FIRE-VFX-1 texture provider.
 *
 * The previous implementation generated solid vector flame tongues through
 * Pixi Graphics. That presentation path is intentionally retired.
 *
 * FIRE-VFX-1 instead uses preloaded grayscale VFX masks as reusable Sprite
 * textures. Particle tint, additive overlap, motion and lifecycle create the
 * visible Fire material.
 *
 * Noise textures and custom shaders are deliberately deferred to later
 * phases.
 */
export class FireVfxTextureFactory {
    public static create():
        FireVfxTextures {

        const glowSoft =
            AssetLoader.getTexture(
                "fireGlowSoft",
            );

        const glowRound =
            AssetLoader.getTexture(
                "fireGlowRound",
            );

        /*
         * body:
         * broad soft fragment used by most particles.
         *
         * core:
         * tighter radial glow used for hotter particles.
         *
         * accent:
         * reuses the broad mask but receives a cooler red tint.
         *
         * ember:
         * compatibility texture for archived emitters. FIRE-VFX-1 does not
         * actively emit embers.
         */
        return {
            body:
                glowSoft,

            core:
                glowRound,

            accent:
                glowSoft,

            ember:
                glowRound,
        };
    }

    /**
     * AssetLoader owns these textures.
     *
     * They must not be destroyed by the Fire VFX system because the same
     * loaded Texture references may be shared elsewhere during the game
     * session.
     */
    public static destroy(
        _textures:
            FireVfxTextures,
    ): void {
        // Intentionally empty.
    }
}

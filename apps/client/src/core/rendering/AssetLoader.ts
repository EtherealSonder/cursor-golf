import {
    Assets,
    Texture,
} from "pixi.js";

import golfClubTexture from "../../assets/sprites/golf/golf_club_temp.png";
import grassTexture from "../../assets/textures/terrain/grass-texture.png";
import sandTexture from "../../assets/textures/terrain/sand-texture.png";

import fireGlowRoundTexture from "../../assets/textures/fire/masks/fire_glow_round.png";
import fireGlowSoftTexture from "../../assets/textures/fire/masks/fire_glow_soft.png";
import fireGradientSoftTexture from "../../assets/textures/fire/masks/fire_gradient_soft.png";

export class AssetLoader {

    private static initialized =
        false;

    private static textures =
        new Map<string, Texture>();

    // -------------------------------------------------------
    // Initialization
    // -------------------------------------------------------

    public static async initialize():
        Promise<void> {

        if (this.initialized) {
            return;
        }

        console.log(
            "========== ASSET LOADER ==========",
        );

        await this.loadTexture(
            "golfClub",
            golfClubTexture,
        );

        await this.loadTexture(
            "grassTerrain",
            grassTexture,
        );

        await this.loadTexture(
            "sandTerrain",
            sandTexture,
        );

        // ---------------------------------------------------
        // FIRE-VFX-1
        // Transparent particle masks
        // ---------------------------------------------------

        await this.loadTexture(
            "fireGlowRound",
            fireGlowRoundTexture,
        );

        await this.loadTexture(
            "fireGlowSoft",
            fireGlowSoftTexture,
        );

        await this.loadTexture(
            "fireGradientSoft",
            fireGradientSoftTexture,
        );

        this.initialized =
            true;

        console.log(
            "All assets loaded.",
        );

        console.log(
            "==================================",
        );
    }

    // -------------------------------------------------------
    // Texture Loading
    // -------------------------------------------------------

    private static async loadTexture(
        key: string,
        assetPath: string,
    ): Promise<void> {

        if (
            key.trim()
                .length ===
            0
        ) {
            throw new Error(
                "AssetLoader texture key cannot be empty.",
            );
        }

        if (
            assetPath.trim()
                .length ===
            0
        ) {
            throw new Error(
                `AssetLoader texture path for '${key}' cannot be empty.`,
            );
        }

        if (
            this.textures.has(
                key,
            )
        ) {
            throw new Error(
                `AssetLoader texture key '${key}' has already been registered.`,
            );
        }

        const texture =
            await Assets.load<Texture>(
                assetPath,
            );

        this.textures.set(
            key,
            texture,
        );

        console.log(
            `Loaded Texture: ${key} (${texture.width} x ${texture.height})`,
        );
    }

    // -------------------------------------------------------
    // Texture Queries
    // -------------------------------------------------------

    public static getTexture(
        key: string,
    ): Texture {

        const texture =
            this.textures.get(
                key,
            );

        if (!texture) {
            throw new Error(
                `Texture '${key}' has not been loaded.`,
            );
        }

        return texture;
    }

    public static hasTexture(
        key: string,
    ): boolean {

        return this.textures.has(
            key,
        );
    }
}
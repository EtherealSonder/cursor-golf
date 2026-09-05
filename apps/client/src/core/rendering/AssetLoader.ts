import {
    Assets,
    Texture,
} from "pixi.js";

import golfClubTexture from "../../assets/sprites/golf/golf_club_temp.png";
import golfBallTexture from "../../assets/sprites/golf/golf_ball.png";
import golfBallDimplesTexture from "../../assets/textures/golf/golf_ball_dimples.png";
import fanBodyTexture from "../../assets/sprites/mechanisms/fan_body.png";
import fanRotorTexture from "../../assets/sprites/mechanisms/fan_rotator.png";
import fireTubeTexture from "../../assets/sprites/mechanisms/fire_tube.png";
import grassTexture from "../../assets/textures/terrain/grass-texture.png";
import sandTexture from "../../assets/textures/terrain/sand-texture.png";

import fireGlowRoundTexture from "../../assets/textures/fire/masks/fire_glow_round.png";
import fireGlowSoftTexture from "../../assets/textures/fire/masks/fire_glow_soft.png";
import fireGradientSoftTexture from "../../assets/textures/fire/masks/fire_gradient_soft.png";

import fireNoiseCloudTexture from "../../assets/textures/fire/noise/fire_noise_cloud.png";
import fireNoisePerlinTexture from "../../assets/textures/fire/noise/fire_noise_perlin.png";
import fireNoiseFineTexture from "../../assets/textures/fire/noise/fire_noise_02.PNG";

import windStreak01Texture from "../../assets/textures/wind/masks/wind_streak_01.png";
import windStreak02Texture from "../../assets/textures/wind/masks/wind_streak_02.png";
import windStreak03Texture from "../../assets/textures/wind/masks/wind_streak_03.png";
import windStreak04Texture from "../../assets/textures/wind/masks/wind_streak_04.png";

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
            "golfBall",
            golfBallTexture,
        );

        await this.loadTexture(
            "golfBallDimples",
            golfBallDimplesTexture,
        );

        await this.loadTexture(
            "fanBody",
            fanBodyTexture,
        );

        await this.loadTexture(
            "fanRotor",
            fanRotorTexture,
        );

        await this.loadTexture(
            "fireTube",
            fireTubeTexture,
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

        // ---------------------------------------------------
        // FIRE-VFX-2A
        // Source noise textures
        // ---------------------------------------------------

        /*
         * These textures are loaded as grayscale data sources only.
         *
         * FIRE-VFX-2B will use them during one-time particle-variant
         * generation. They are not rendered directly as Fire particles in
         * FIRE-VFX-2A, so this phase should produce no visual change.
         */
        await this.loadTexture(
            "fireNoiseCloud",
            fireNoiseCloudTexture,
        );

        await this.loadTexture(
            "fireNoisePerlin",
            fireNoisePerlinTexture,
        );

        await this.loadTexture(
            "fireNoiseFine",
            fireNoiseFineTexture,
        );

        // ---------------------------------------------------
        // WIND-VFX-2
        // Transparent pooled Sprite masks
        // ---------------------------------------------------

        await this.loadTexture(
            "windStreak01",
            windStreak01Texture,
        );

        await this.loadTexture(
            "windStreak02",
            windStreak02Texture,
        );

        await this.loadTexture(
            "windStreak03",
            windStreak03Texture,
        );

        await this.loadTexture(
            "windStreak04",
            windStreak04Texture,
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

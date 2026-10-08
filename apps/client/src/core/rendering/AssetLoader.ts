import {
    Assets,
    Texture,
} from "pixi.js";

import golfClubTexture from "../../assets/sprites/golf/golf_club_temp.png";
import golfBallTexture from "../../assets/sprites/golf/golf_ball.png";
import golfBallDimplesTexture from "../../assets/textures/golf/golf_ball_dimples.png";
import ballUiTexture from "../../assets/sprites/ui/ball_ui.png";
import ballLivesHolderTexture from "../../assets/sprites/ui/ball_lives_holder.png";
import debuffHolderTexture from "../../assets/sprites/ui/debuff_holder.png";
import debuffFire1Texture from "../../assets/sprites/ui/debuff_fire_1.png";
import debuffFire2Texture from "../../assets/sprites/ui/debuff_fire_2.png";
import debuffFire3Texture from "../../assets/sprites/ui/debuff_fire_3.png";
import debuffFireOutlineTexture from "../../assets/sprites/ui/debuff_fire_outline.png";
import debuffDeathTexture from "../../assets/sprites/ui/debuff_death.png";
import debuffNegativeTexture from "../../assets/sprites/ui/debuff_negative.png";
import debuffPositiveTexture from "../../assets/sprites/ui/debuff_positive.png";
import debuffWaterTexture from "../../assets/sprites/ui/debuff_water.png";
import fanBodyTexture from "../../assets/sprites/mechanisms/fan_body.png";
import fanRotorTexture from "../../assets/sprites/mechanisms/fan_rotator.png";
import fireTubeTexture from "../../assets/sprites/mechanisms/fire_tube.png";
import fireHydrantTexture from "../../assets/sprites/mechanisms/fire_hydrant.png";
import fireHydrantDamagedTexture from "../../assets/sprites/mechanisms/fire_hydrant_damaged.png";
import fireHydrantBrokenTexture from "../../assets/sprites/mechanisms/fire_hydrant_broken.png";
import waterSprinklerTexture from "../../assets/sprites/mechanisms/water_sprinkler.png";
import proximityMineTexture from "../../assets/sprites/mechanisms/proximity_mine.png";
import radialBumperTexture from "../../assets/sprites/mechanisms/radial_bumper.png";
import directionalBumperTexture from "../../assets/sprites/mechanisms/directional_bumper.png";
import directionalBumperInnerTexture from "../../assets/sprites/mechanisms/directional_bumper_inner.png";
import rotatingPaddleClockwiseTexture from "../../assets/sprites/mechanisms/rotate_paddle_clockwise.png";
import rotatingPaddleCounterClockwiseTexture from "../../assets/sprites/mechanisms/rotate_paddle_anticlockwise.png";
import fireRobotBodyTexture from "../../assets/sprites/robots/fire_robot_body.png";
import fireRobotLeg1Texture from "../../assets/sprites/robots/fire_robot_leg1.png";
import fireRobotLeg2Texture from "../../assets/sprites/robots/fire_robot_leg2.png";
import waterRobotBodyTexture from "../../assets/sprites/robots/water_robot_body.png";
import waterRobotLeg1Texture from "../../assets/sprites/robots/water_robot_leg1.png";
import waterRobotLeg2Texture from "../../assets/sprites/robots/water_robot_leg2.png";
import windRobotBodyTexture from "../../assets/sprites/robots/wind_robot_body.png";
import windRobotLeg1Texture from "../../assets/sprites/robots/wind_robot_leg1.png";
import windRobotLeg2Texture from "../../assets/sprites/robots/wind_robot_leg2.png";
import grassTexture from "../../assets/textures/terrain/grass-texture.png";
import sandTexture from "../../assets/textures/terrain/sand-texture.png";
import metalTilingTexture from "../../assets/textures/environment/metal_tiling_texture.png";

import fireGlowRoundTexture from "../../assets/textures/fire/masks/fire_glow_round.png";
import fireGlowSoftTexture from "../../assets/textures/fire/masks/fire_glow_soft.png";
import fireGradientSoftTexture from "../../assets/textures/fire/masks/fire_gradient_soft.png";

import fireFlameBroadTexture from "../../assets/textures/fire/masks/fire_flame_broad.png";
import fireFlameTallTexture from "../../assets/textures/fire/masks/fire_flame_tall.png";
import fireFlameCurveLeftTexture from "../../assets/textures/fire/masks/fire_flame_curve_left.png";
import fireFlameCurveRightTexture from "../../assets/textures/fire/masks/fire_flame_curve_right.png";
import fireFlameForkTexture from "../../assets/textures/fire/masks/fire_flame_fork.png";
import fireFlameSmallTexture from "../../assets/textures/fire/masks/fire_flame_small.png";
import fireFlameTongueNarrowTexture from "../../assets/textures/fire/masks/fire_flame_tongue_narrow.png";
import fireFlameTongueCurveLeftTexture from "../../assets/textures/fire/masks/fire_flame_tongue_curve_left.png";
import fireFlameTongueCurveRightTexture from "../../assets/textures/fire/masks/fire_flame_tongue_curve_right.png";
import fireTopdownLobe01Texture from "../../assets/textures/fire/masks/topdown/fire_topdown_lobe_01.png";
import fireTopdownLobe02Texture from "../../assets/textures/fire/masks/topdown/fire_topdown_lobe_02.png";
import fireTopdownLobe03Texture from "../../assets/textures/fire/masks/topdown/fire_topdown_lobe_03.png";
import fireTopdownCurl01Texture from "../../assets/textures/fire/masks/topdown/fire_topdown_curl_01.png";
import fireTopdownCurl02Texture from "../../assets/textures/fire/masks/topdown/fire_topdown_curl_02.png";
import fireTopdownHook01Texture from "../../assets/textures/fire/masks/topdown/fire_topdown_hook_01.png";
import fireTopdownCrescent01Texture from "../../assets/textures/fire/masks/topdown/fire_topdown_crescent_01.png";
import fireTopdownFragment01Texture from "../../assets/textures/fire/masks/topdown/fire_topdown_fragment_01.png";
import fireTopdownFragment02Texture from "../../assets/textures/fire/masks/topdown/fire_topdown_fragment_02.png";
import fireTopdownFragment03Texture from "../../assets/textures/fire/masks/topdown/fire_topdown_fragment_03.png";

import fireNoiseCloudTexture from "../../assets/textures/fire/noise/fire_noise_cloud.png";
import fireNoisePerlinTexture from "../../assets/textures/fire/noise/fire_noise_perlin.png";
import fireNoiseFineTexture from "../../assets/textures/fire/noise/fire_noise_02.PNG?url";

import windStreak01Texture from "../../assets/textures/wind/masks/wind_streak_01.png";
import windStreak02Texture from "../../assets/textures/wind/masks/wind_streak_02.png";
import windStreak03Texture from "../../assets/textures/wind/masks/wind_streak_03.png";
import windStreak04Texture from "../../assets/textures/wind/masks/wind_streak_04.png";

import explosionBlastRingA from "../../assets/textures/explosion/explosion_blast_ring_a.png";
import explosionBlastRingB from "../../assets/textures/explosion/explosion_blast_ring_b.png";
import explosionBlastRingC from "../../assets/textures/explosion/explosion_blast_ring_c.png";
import explosionPressureRing from "../../assets/textures/explosion/explosion_pressure_ring.png";
import explosionIgnition from "../../assets/textures/explosion/explosion_ignition.png";
import explosionFireBody from "../../assets/textures/explosion/explosion_fire_body.png";
import explosionFlameFragment from "../../assets/textures/explosion/explosion_flame_fragment.png";
import explosionEmber from "../../assets/textures/explosion/explosion_ember.png";
import explosionBreakupNoise from "../../assets/textures/explosion/explosion_breakup_noise.png";

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
            "ballUi",
            ballUiTexture,
        );

        await this.loadTexture(
            "ballLivesHolder",
            ballLivesHolderTexture,
        );

        await this.loadTexture("debuffHolder", debuffHolderTexture);
        await this.loadTexture("debuffFire1", debuffFire1Texture);
        await this.loadTexture("debuffFire2", debuffFire2Texture);
        await this.loadTexture("debuffFire3", debuffFire3Texture);
        await this.loadTexture("debuffFireOutline", debuffFireOutlineTexture);
        await this.loadTexture("debuffDeath", debuffDeathTexture);
        await this.loadTexture("debuffNegative", debuffNegativeTexture);
        await this.loadTexture("debuffPositive", debuffPositiveTexture);
        await this.loadTexture("debuffWater", debuffWaterTexture);

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
            "fireHydrant",
            fireHydrantTexture,
        );

        await this.loadTexture(
            "fireHydrantDamaged",
            fireHydrantDamagedTexture,
        );

        await this.loadTexture(
            "fireHydrantBroken",
            fireHydrantBrokenTexture,
        );

        await this.loadTexture(
            "waterSprinkler",
            waterSprinklerTexture,
        );

        await this.loadTexture(
            "proximityMine",
            proximityMineTexture,
        );

        await this.loadTexture(
            "radialBumper",
            radialBumperTexture,
        );

        await this.loadTexture(
            "directionalBumper",
            directionalBumperTexture,
        );

        await this.loadTexture(
            "directionalBumperInner",
            directionalBumperInnerTexture,
        );

        await this.loadTexture(
            "rotatingPaddleClockwise",
            rotatingPaddleClockwiseTexture,
        );

        await this.loadTexture(
            "rotatingPaddleCounterClockwise",
            rotatingPaddleCounterClockwiseTexture,
        );

        // R-1 Fire Robot composite presentation assets.
        await this.loadTexture("fireRobotBody", fireRobotBodyTexture);
        await this.loadTexture("fireRobotLeg1", fireRobotLeg1Texture);
        await this.loadTexture("fireRobotLeg2", fireRobotLeg2Texture);

        // Water Robot composite presentation assets.
        await this.loadTexture("waterRobotBody", waterRobotBodyTexture);
        await this.loadTexture("waterRobotLeg1", waterRobotLeg1Texture);
        await this.loadTexture("waterRobotLeg2", waterRobotLeg2Texture);

        // Wind Robot composite presentation assets.
        await this.loadTexture("windRobotBody", windRobotBodyTexture);
        await this.loadTexture("windRobotLeg1", windRobotLeg1Texture);
        await this.loadTexture("windRobotLeg2", windRobotLeg2Texture);

        await this.loadTexture(
            "grassTerrain",
            grassTexture,
        );

        await this.loadTexture(
            "sandTerrain",
            sandTexture,
        );

        await this.loadTexture(
            "metalObstacle",
            metalTilingTexture,
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
        // FIRE VFX crisp illustrated flame vocabulary
        // F-3 primary Ground Fire + F-4 Wind-compatible family
        // ---------------------------------------------------

        await this.loadTexture(
            "fireFlameBroad",
            fireFlameBroadTexture,
        );

        await this.loadTexture(
            "fireFlameTall",
            fireFlameTallTexture,
        );

        await this.loadTexture(
            "fireFlameCurveLeft",
            fireFlameCurveLeftTexture,
        );

        await this.loadTexture(
            "fireFlameCurveRight",
            fireFlameCurveRightTexture,
        );

        await this.loadTexture(
            "fireFlameFork",
            fireFlameForkTexture,
        );

        await this.loadTexture(
            "fireFlameSmall",
            fireFlameSmallTexture,
        );

        await this.loadTexture(
            "fireFlameTongueNarrow",
            fireFlameTongueNarrowTexture,
        );

        await this.loadTexture(
            "fireFlameTongueCurveLeft",
            fireFlameTongueCurveLeftTexture,
        );

        await this.loadTexture(
            "fireFlameTongueCurveRight",
            fireFlameTongueCurveRightTexture,
        );

        // F-5/F-6 top-down Fire masks
        await this.loadTexture("fireTopdownLobe01", fireTopdownLobe01Texture);
        await this.loadTexture("fireTopdownLobe02", fireTopdownLobe02Texture);
        await this.loadTexture("fireTopdownLobe03", fireTopdownLobe03Texture);
        await this.loadTexture("fireTopdownCurl01", fireTopdownCurl01Texture);
        await this.loadTexture("fireTopdownCurl02", fireTopdownCurl02Texture);
        await this.loadTexture("fireTopdownHook01", fireTopdownHook01Texture);
        await this.loadTexture("fireTopdownCrescent01", fireTopdownCrescent01Texture);
        await this.loadTexture("fireTopdownFragment01", fireTopdownFragment01Texture);
        await this.loadTexture("fireTopdownFragment02", fireTopdownFragment02Texture);
        await this.loadTexture("fireTopdownFragment03", fireTopdownFragment03Texture);

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

        // PM-2C: dedicated explosion family. AssetLoader owns these shared textures.
        await this.loadTexture("explosionBlastRingA", explosionBlastRingA);
        await this.loadTexture("explosionBlastRingB", explosionBlastRingB);
        await this.loadTexture("explosionBlastRingC", explosionBlastRingC);
        await this.loadTexture("explosionPressureRing", explosionPressureRing);
        await this.loadTexture("explosionIgnition", explosionIgnition);
        await this.loadTexture("explosionFireBody", explosionFireBody);
        await this.loadTexture("explosionFlameFragment", explosionFlameFragment);
        await this.loadTexture("explosionEmber", explosionEmber);
        await this.loadTexture("explosionBreakupNoise", explosionBreakupNoise);

        this.initialized =
            true;
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


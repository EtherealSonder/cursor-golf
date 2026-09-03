export type FireParticleTextureVariant =
    | "body"
    | "core"
    | "accent";

export interface FireParticleThermalRoleDefinition {

    readonly weight:
    number;

    readonly textureVariant:
    FireParticleTextureVariant;

    readonly tint:
    number;

    readonly lifetimeMultiplier:
    number;

    readonly speedMultiplier:
    number;

    readonly scaleMultiplier:
    number;

    readonly alphaMultiplier:
    number;
}

export interface FireParticleVfxDefinition {

    readonly enabled:
    boolean;

    readonly testEmitter: {

        readonly positionX:
        number;

        readonly positionY:
        number;

        readonly spawnRadiusX:
        number;

        readonly spawnRadiusY:
        number;

        readonly particlesPerSecond:
        number;
    };

    readonly pool: {

        readonly initialCapacity:
        number;

        readonly maximumCapacity:
        number;
    };

    readonly particle: {

        readonly lifetimeMinimum:
        number;

        readonly lifetimeMaximum:
        number;

        readonly horizontalVelocityMinimum:
        number;

        readonly horizontalVelocityMaximum:
        number;

        readonly upwardVelocityMinimum:
        number;

        readonly upwardVelocityMaximum:
        number;

        readonly startScaleXMinimum:
        number;

        readonly startScaleXMaximum:
        number;

        readonly startScaleYMinimum:
        number;

        readonly startScaleYMaximum:
        number;

        readonly endScaleXMinimum:
        number;

        readonly endScaleXMaximum:
        number;

        readonly endScaleYMinimum:
        number;

        readonly endScaleYMaximum:
        number;

        readonly alphaMinimum:
        number;

        readonly alphaMaximum:
        number;

        readonly rotationMinimum:
        number;

        readonly rotationMaximum:
        number;

        readonly angularVelocityMinimum:
        number;

        readonly angularVelocityMaximum:
        number;

        readonly emergenceEndFraction:
        number;

        readonly fadeStartFraction:
        number;

        readonly flickerSpeedMinimum:
        number;

        readonly flickerSpeedMaximum:
        number;

        readonly flickerAmountMinimum:
        number;

        readonly flickerAmountMaximum:
        number;

        readonly turbulenceAmplitudeMinimum:
        number;

        readonly turbulenceAmplitudeMaximum:
        number;

        readonly turbulenceFrequencyMinimum:
        number;

        readonly turbulenceFrequencyMaximum:
        number;
    };

    readonly thermalRoles: {

        readonly hot:
        FireParticleThermalRoleDefinition;

        readonly body:
        FireParticleThermalRoleDefinition;

        readonly cool:
        FireParticleThermalRoleDefinition;
    };
}

/**
 * FIRE-VFX-1
 *
 * Isolated textured-particle Fire tuning.
 *
 * Visual direction:
 *
 * bright
 * saturated
 * playful
 * storybook / pop-art
 *
 * Thermal palette:
 *
 * HOT
 * #FFE66A
 *
 * BODY
 * #FF7A32
 *
 * COOL
 * #F04438
 *
 * A golden-orange intermediate color such as #FFB13B can be introduced
 * later through color-over-life or shader work.
 *
 * Nothing in this definition is gameplay authority.
 */
export const DEFAULT_FIRE_PARTICLE_VFX_DEFINITION:
    FireParticleVfxDefinition = {

    enabled:
        true,

    testEmitter: {

        positionX:
            430,

        positionY:
            500,

        /*
         * A relatively broad horizontal emitter helps many independent
         * particles overlap into one flame volume rather than one narrow
         * particle column.
         */
        spawnRadiusX:
            26,

        spawnRadiusY:
            8,

        particlesPerSecond:
            145,
    },

    pool: {

        initialCapacity:
            180,

        maximumCapacity:
            520,
    },

    particle: {

        // ---------------------------------------------------
        // Lifetime
        // ---------------------------------------------------

        lifetimeMinimum:
            0.58,

        lifetimeMaximum:
            1.05,

        // ---------------------------------------------------
        // Velocity
        // ---------------------------------------------------

        horizontalVelocityMinimum:
            -24,

        horizontalVelocityMaximum:
            24,

        /*
         * World/Pixi Y increases downward.
         *
         * Negative Y velocity therefore travels upward.
         */
        upwardVelocityMinimum:
            -155,

        upwardVelocityMaximum:
            -82,

        // ---------------------------------------------------
        // Initial size
        // ---------------------------------------------------

        startScaleXMinimum:
            0.042,

        startScaleXMaximum:
            0.074,

        startScaleYMinimum:
            0.035,

        startScaleYMaximum:
            0.068,

        // ---------------------------------------------------
        // End size
        // ---------------------------------------------------

        /*
         * Y grows more strongly than X.
         *
         * This allows fragments to progressively elongate as they travel
         * rather than simply becoming larger circular blobs.
         */
        endScaleXMinimum:
            0.070,

        endScaleXMaximum:
            0.125,

        endScaleYMinimum:
            0.110,

        endScaleYMaximum:
            0.205,

        // ---------------------------------------------------
        // Opacity
        // ---------------------------------------------------

        /*
         * These values assume NORMAL alpha blending with genuinely
         * transparent Fire masks.
         *
         * Individual particles remain translucent.
         *
         * Dense overlap produces the visible Fire body.
         */
        alphaMinimum:
            0.30,

        alphaMaximum:
            0.54,

        // ---------------------------------------------------
        // Rotation
        // ---------------------------------------------------

        rotationMinimum:
            -0.34,

        rotationMaximum:
            0.34,

        angularVelocityMinimum:
            -0.58,

        angularVelocityMaximum:
            0.58,

        // ---------------------------------------------------
        // Lifecycle
        // ---------------------------------------------------

        emergenceEndFraction:
            0.14,

        fadeStartFraction:
            0.58,

        // ---------------------------------------------------
        // Flicker
        // ---------------------------------------------------

        flickerSpeedMinimum:
            7.0,

        flickerSpeedMaximum:
            13.0,

        /*
         * Deliberately subtle.
         *
         * The flame should move because particles move, stretch, overlap and
         * disappear. It should not visibly pulse like an animated icon.
         */
        flickerAmountMinimum:
            0.015,

        flickerAmountMaximum:
            0.055,

        // ---------------------------------------------------
        // Turbulence
        // ---------------------------------------------------

        turbulenceAmplitudeMinimum:
            2.0,

        turbulenceAmplitudeMaximum:
            7.0,

        turbulenceFrequencyMinimum:
            7.0,

        turbulenceFrequencyMaximum:
            14.0,
    },

    // -------------------------------------------------------
    // Thermal Palette
    // -------------------------------------------------------

    thermalRoles: {

        /*
         * HOT
         *
         * Warm saturated yellow.
         *
         * Hot particles are smaller, faster and shorter lived so yellow
         * appears as energetic highlights rather than one large yellow mass.
         */
        hot: {

            weight:
                0.17,

            textureVariant:
                "core",

            tint:
                0xffe66a,

            lifetimeMultiplier:
                0.76,

            speedMultiplier:
                1.14,

            scaleMultiplier:
                0.76,

            alphaMultiplier:
                1.0,
        },

        /*
         * BODY
         *
         * Main saturated orange.
         *
         * This should form most of the visible flame volume.
         */
        body: {

            weight:
                0.58,

            textureVariant:
                "body",

            tint:
                0xff7a32,

            lifetimeMultiplier:
                1.0,

            speedMultiplier:
                1.0,

            scaleMultiplier:
                1.0,

            alphaMultiplier:
                1.0,
        },

        /*
         * COOL
         *
         * Strong coral/red.
         *
         * Cooling particles are slightly larger and longer lived, allowing
         * red-orange material to appear around the outer and upper portions
         * of the flame volume.
         */
        cool: {

            weight:
                0.25,

            textureVariant:
                "accent",

            tint:
                0xf04438,

            lifetimeMultiplier:
                1.14,

            speedMultiplier:
                0.88,

            scaleMultiplier:
                1.12,

            alphaMultiplier:
                0.88,
        },
    },
};
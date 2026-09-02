/**
 * One configurable sample in the wind-influence
 * curve.
 *
 * normalizedBallSpeed uses the Ball's active speed
 * range:
 *
 * 0 = stop-speed threshold
 * 1 = maximum Ball speed
 *
 * influenceMultiplier scales the current physical
 * wind acceleration.
 */
export interface WindInfluenceCurvePoint {
    readonly normalizedBallSpeed: number;
    readonly influenceMultiplier: number;
}

/**
 * One weighted wind-speed range used when a new
 * game session creates its environmental wind.
 *
 * The values are displayed to the player as km/h.
 */
export interface WindStrengthBand {
    readonly minimumSpeedKph: number;
    readonly maximumSpeedKph: number;
    readonly probabilityWeight: number;
}

/**
 * Configuration for one-time wind randomization at
 * the beginning of a game session.
 */
export interface WindRandomizationDefinition {
    readonly enabled: boolean;

    /**
     * Inclusive minimum direction in screen-space
     * degrees.
     */
    readonly minimumDirectionDegrees: number;

    /**
     * Exclusive upper direction boundary.
     *
     * The default range of 0 to 360 allows every
     * direction around the full circle.
     */
    readonly maximumDirectionDegrees: number;

    /**
     * When enabled, generated directions are stored
     * as whole-number degrees.
     */
    readonly roundDirectionToInteger: boolean;

    /**
     * When enabled, generated wind speeds are stored
     * as whole-number km/h values.
     */
    readonly roundSpeedToInteger: boolean;

    readonly strengthBands:
    readonly WindStrengthBand[];
}

/**
 * Immutable configuration for the environmental
 * wind system.
 */
export interface WindDefinition {

    // -------------------------------------------------------------------------
    // Fallback Wind State
    // -------------------------------------------------------------------------

    /**
     * Deterministic fallback direction used when
     * randomization is disabled.
     *
     * Screen-space convention:
     *
     * 0 = right
     * 90 = down
     * 180 = left
     * 270 = up
     */
    readonly initialDirectionDegrees: number;

    /**
     * Deterministic fallback wind speed.
     *
     * Player-facing unit: km/h.
     */
    readonly initialStrength: number;

    // -------------------------------------------------------------------------
    // Session Randomization
    // -------------------------------------------------------------------------

    readonly randomization:
    WindRandomizationDefinition;

    // -------------------------------------------------------------------------
    // Wind Speed Limits
    // -------------------------------------------------------------------------

    /**
     * Global legal wind-speed range.
     *
     * Player-facing unit: km/h.
     */
    readonly minimumStrength: number;

    readonly maximumStrength: number;

    // -------------------------------------------------------------------------
    // Physical Wind Conversion
    // -------------------------------------------------------------------------

    /**
     * Converts one player-facing kilometre per hour
     * of wind speed into internal game acceleration.
     *
     * Example:
     *
     * displayed wind speed = 80 km/h
     * accelerationPerKph = 3
     *
     * base acceleration:
     *
     * 80 × 3 = 240 px/s²
     *
     * This conversion affects physics only. The HUD
     * continues displaying the original 80 km/h.
     *
     * Units:
     * pixels per second squared per displayed km/h.
     */
    readonly accelerationPerKph: number;

    /**
     * Maximum base acceleration that can be produced
     * before Ball-speed influence scaling is applied.
     *
     * With the default configuration:
     *
     * maximumStrength = 100 km/h
     * accelerationPerKph = 3
     *
     * maximumAcceleration = 300 px/s²
     *
     * Units: pixels per second squared.
     */
    readonly maximumAcceleration: number;

    /**
     * Independent defensive cap applied to the final
     * acceleration returned to physics consumers.
     *
     * This cap is evaluated after the Ball-speed
     * influence curve has been applied.
     *
     * Units: pixels per second squared.
     */
    readonly maximumAppliedAcceleration: number;

    // -------------------------------------------------------------------------
    // Ball-Speed Influence Curve
    // -------------------------------------------------------------------------

    /**
     * Piecewise-linear curve that converts normalized
     * active Ball speed into a wind-influence
     * multiplier.
     *
     * The default curve provides:
     *
     * - zero influence at the stopping threshold
     * - rapid fade-in immediately above rest
     * - maximum influence at low speed
     * - moderate influence at medium speed
     * - weak influence at high speed
     */
    readonly influenceCurve:
    readonly WindInfluenceCurvePoint[];

    // -------------------------------------------------------------------------
    // Near-Rest Safety
    // -------------------------------------------------------------------------

    /**
     * Ball speed at or below which wind is prevented
     * from applying acceleration opposite to the
     * Ball's current travel direction.
     *
     * Units: pixels per second.
     */
    readonly reversalProtectionSpeed: number;

    /**
     * Multiplier applied to the Ball's configured
     * stopping threshold to create the low-speed
     * rest-confirmation region.
     */
    readonly restStabilitySpeedMultiplier: number;

    /**
     * Time the Ball must remain inside the low-speed
     * confirmation region before entering exact rest.
     *
     * Units: seconds.
     */
    readonly restStabilityDuration: number;
}

export const DEFAULT_WIND_DEFINITION:
    WindDefinition = {

    // -------------------------------------------------------------------------
    // Fallback Wind State
    // -------------------------------------------------------------------------

    initialDirectionDegrees: 315,

    initialStrength: 0,

    // -------------------------------------------------------------------------
    // Session Randomization
    // -------------------------------------------------------------------------

    randomization: {
        enabled: false,

        minimumDirectionDegrees: 0,

        maximumDirectionDegrees: 360,

        roundDirectionToInteger: true,

        roundSpeedToInteger: true,

        /*
         * Weighted distribution:
         *
         * Calm       8-20 km/h   20%
         * Moderate  21-45 km/h   50%
         * High      46-65 km/h   22%
         * Very High 66-80 km/h    7%
         * Extreme   81-90 km/h    1%
         *
         * These values remain unchanged in the HUD.
         * The internal physics conversion is handled
         * separately through accelerationPerKph.
         */
        strengthBands: [
            {
                minimumSpeedKph: 8,
                maximumSpeedKph: 20,
                probabilityWeight: 20,
            },
            {
                minimumSpeedKph: 21,
                maximumSpeedKph: 45,
                probabilityWeight: 50,
            },
            {
                minimumSpeedKph: 46,
                maximumSpeedKph: 65,
                probabilityWeight: 22,
            },
            {
                minimumSpeedKph: 66,
                maximumSpeedKph: 80,
                probabilityWeight: 7,
            },
            {
                minimumSpeedKph: 81,
                maximumSpeedKph: 90,
                probabilityWeight: 1,
            },
        ],
    },

    // -------------------------------------------------------------------------
    // Wind Speed Limits
    // -------------------------------------------------------------------------

    minimumStrength: 0,

    maximumStrength: 100,

    // -------------------------------------------------------------------------
    // Physical Wind Conversion
    // -------------------------------------------------------------------------

    /*
     * Every displayed 1 km/h produces 3 px/s² of
     * base game acceleration.
     *
     * Examples:
     *
     * 20 km/h = 60 px/s²
     * 50 km/h = 150 px/s²
     * 80 km/h = 240 px/s²
     * 100 km/h = 300 px/s²
     */
    accelerationPerKph: 3,

    /*
     * Defensive base-acceleration ceiling.
     *
     * This matches:
     *
     * maximumStrength × accelerationPerKph
     *
     * 100 × 3 = 300 px/s²
     */
    maximumAcceleration: 300,

    /*
     * Final acceleration cap after the Ball-speed
     * influence curve has been applied.
     */
    maximumAppliedAcceleration: 300,

    // -------------------------------------------------------------------------
    // Ball-Speed Influence Curve
    // -------------------------------------------------------------------------

    influenceCurve: [
        {
            normalizedBallSpeed: 0,
            influenceMultiplier: 0,
        },

        {
            normalizedBallSpeed: 0.04,
            influenceMultiplier: 0.35,
        },

        {
            normalizedBallSpeed: 0.10,
            influenceMultiplier: 0.85,
        },

        {
            normalizedBallSpeed: 0.20,
            influenceMultiplier: 1.00,
        },

        {
            normalizedBallSpeed: 0.40,
            influenceMultiplier: 0.70,
        },

        {
            normalizedBallSpeed: 0.65,
            influenceMultiplier: 0.45,
        },

        {
            normalizedBallSpeed: 0.85,
            influenceMultiplier: 0.30,
        },

        {
            normalizedBallSpeed: 1.00,
            influenceMultiplier: 0.20,
        },
    ],

    // -------------------------------------------------------------------------
    // Near-Rest Safety
    // -------------------------------------------------------------------------

    reversalProtectionSpeed: 36,

    restStabilitySpeedMultiplier: 1.5,

    restStabilityDuration: 0.12,
};
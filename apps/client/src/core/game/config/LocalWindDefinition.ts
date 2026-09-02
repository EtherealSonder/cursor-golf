import {
    GAME_COLOR_PALETTE,
} from "./GameColorPalette";

/**
 * Immutable definition for one local directional
 * airflow source.
 *
 * Local wind is deliberately separate from the
 * global WindManager. Global Wind represents a
 * course-wide environmental modifier, while these
 * sources represent spatial mechanisms such as fans,
 * vents, turbines, and future saboteur abilities.
 */
export interface LocalWindSourceDefinition {

    readonly id: string;

    readonly positionX: number;
    readonly positionY: number;

    /**
     * Screen-space direction in radians.
     *
     * 0        = right
     * PI / 2   = down
     * PI       = left
     * -PI / 2  = up
     */
    readonly directionRadians: number;

    /**
     * World-space airflow length.
     */
    readonly range: number;

    /**
     * Half-width at the Fan outlet.
     */
    readonly startHalfWidth: number;

    /**
     * Half-width at maximum range.
     */
    readonly endHalfWidth: number;

    /**
     * Maximum authored gameplay acceleration.
     *
     * Units: world pixels per second squared.
     */
    readonly acceleration: number;

    /**
     * Fraction of source acceleration retained at
     * maximum range.
     */
    readonly endStrengthMultiplier: number;

    /**
     * Fraction of the outer stream width used for
     * smooth lateral falloff.
     */
    readonly edgeFalloffFraction: number;

    readonly enabled: boolean;
}

export interface LocalWindVisualDefinition {

    readonly enabled: boolean;

    /**
     * Total reusable gust records per source.
     *
     * A gust is drawn as a short curved ribbon rather
     * than a single rain-like line.
     */
    readonly particlesPerSource: number;

    readonly minimumParticleSpeed: number;
    readonly maximumParticleSpeed: number;

    readonly minimumParticleLength: number;
    readonly maximumParticleLength: number;

    readonly minimumParticleWidth: number;
    readonly maximumParticleWidth: number;

    readonly minimumOpacity: number;
    readonly maximumOpacity: number;

    readonly lineColor: number;

    /**
     * Probability that a gust becomes a short wisp.
     */
    readonly wispProbability: number;

    /**
     * Controls the sideways bend of each gust.
     */
    readonly minimumCurveAmount: number;
    readonly maximumCurveAmount: number;

    /**
     * Visual density is intentionally biased toward
     * the Fan outlet.
     */
    readonly sourceDensityBias: number;

    readonly recyclePadding: number;
}

export interface FanVisualDefinition {

    /**
     * Fan art is authored pointing to the right and
     * the complete Entity is rotated to match airflow.
     *
     * The silhouette is intentionally directional:
     * a rounded body with a narrower intake/rear and
     * an obvious open outlet on the downwind side.
     */
    readonly bodyLength: number;
    readonly bodyHalfHeight: number;
    readonly rearHalfHeight: number;
    readonly outletDepth: number;

    readonly bladeLength: number;
    readonly bladeWidth: number;
    readonly bladeCount: number;

    readonly bodyFillColor: number;
    readonly bodyShadowColor: number;
    readonly housingOutlineColor: number;
    readonly outletColor: number;
    readonly bladeColor: number;
    readonly hubColor: number;
    readonly accentColor: number;

    readonly outlineWidth: number;
    readonly shadowOffsetX: number;
    readonly shadowOffsetY: number;

    readonly bladeRotationSpeed: number;
}

/**
 * Temporary fixed local-wind test layout.
 *
 * These values are deliberately exaggerated. Fans
 * are gameplay hazards, not ordinary ambient wind.
 * A fast golf shot should still visibly bend while
 * crossing one of these streams.
 */
export const DEFAULT_LOCAL_WIND_SOURCE_DEFINITIONS:
    readonly LocalWindSourceDefinition[] = [

        {
            id: "test-fan-right",
            positionX: 170,
            positionY: 150,
            directionRadians: 0,
            range: 760,
            startHalfWidth: 62,
            endHalfWidth: 168,
            acceleration: 1100,
            endStrengthMultiplier: 0.60,
            edgeFalloffFraction: 0.22,
            enabled: true,
        },

        {
            id: "test-fan-down",
            positionX: 820,
            positionY: 110,
            directionRadians: Math.PI / 2,
            range: 760,
            startHalfWidth: 62,
            endHalfWidth: 168,
            acceleration: 1050,
            endStrengthMultiplier: 0.60,
            edgeFalloffFraction: 0.22,
            enabled: true,
        },

        {
            id: "test-fan-left",
            positionX: 1030,
            positionY: 545,
            directionRadians: Math.PI,
            range: 760,
            startHalfWidth: 62,
            endHalfWidth: 168,
            acceleration: 1150,
            endStrengthMultiplier: 0.60,
            edgeFalloffFraction: 0.22,
            enabled: true,
        },

        {
            id: "test-fan-diagonal",
            positionX: 250,
            positionY: 610,
            directionRadians: -Math.PI / 4,
            range: 760,
            startHalfWidth: 60,
            endHalfWidth: 160,
            acceleration: 1100,
            endStrengthMultiplier: 0.60,
            edgeFalloffFraction: 0.22,
            enabled: true,
        },
    ];

export const DEFAULT_LOCAL_WIND_VISUAL_DEFINITION:
    LocalWindVisualDefinition = {

    enabled: true,

    particlesPerSource: 28,

    minimumParticleSpeed: 260,
    maximumParticleSpeed: 440,

    minimumParticleLength: 45,
    maximumParticleLength: 100,

    minimumParticleWidth: 3,
    maximumParticleWidth: 6,

    minimumOpacity: 0.15,
    maximumOpacity: 0.55,

    lineColor: 0xf4fbff,

    wispProbability: 0.30,

    minimumCurveAmount: 5,
    maximumCurveAmount: 16,

    sourceDensityBias: 1.65,

    recyclePadding: 24,
};

export const DEFAULT_FAN_VISUAL_DEFINITION:
    FanVisualDefinition = {

    bodyLength: 59,
    bodyHalfHeight: 26,
    rearHalfHeight: 21,
    outletDepth: 12,

    bladeLength: 15,
    bladeWidth: 7,
    bladeCount: 3,

    bodyFillColor: GAME_COLOR_PALETTE.terrain.water,
    bodyShadowColor: GAME_COLOR_PALETTE.terrain.waterShadow,
    housingOutlineColor: GAME_COLOR_PALETTE.ink.outline,
    outletColor: GAME_COLOR_PALETTE.golf.hole,
    bladeColor: GAME_COLOR_PALETTE.golf.ball,
    hubColor: GAME_COLOR_PALETTE.ink.outline,
    accentColor: GAME_COLOR_PALETTE.fire.hot,

    outlineWidth: 3,

    shadowOffsetX: 4,
    shadowOffsetY: 5,

    bladeRotationSpeed: 5.8,
};

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

/**
 * @deprecated Legacy Graphics-based local Wind presentation.
 * WindVfxDefinition is authoritative for the new pooled Sprite VFX.
 * Kept temporarily so LocalWindVisualizer.ts can remain compilable until archived.
 */
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

/**
 * Temporary fixed local-wind test layout.
 *
 * The Fan airflow is authored as a straight rectangular tube:
 *
 * - source.position = exact Fan outlet
 * - constant half-width for the complete range
 * - no widening cone/trapezoid
 *
 * Keeping startHalfWidth and endHalfWidth equal lets the existing
 * LocalWindSystem remain generic while this Fan configuration behaves
 * as a constant-width gameplay stream.
 */
export const DEFAULT_LOCAL_WIND_SOURCE_DEFINITIONS:
    readonly LocalWindSourceDefinition[] = [

        {
            id: "test-fan-right",
            positionX: 170,
            positionY: 150,
            directionRadians: 0,
            range: 560,
            startHalfWidth: 55,
            endHalfWidth: 55,
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
            range: 560,
            startHalfWidth: 55,
            endHalfWidth: 55,
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
            range: 560,
            startHalfWidth: 55,
            endHalfWidth: 55,
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
            range: 560,
            startHalfWidth: 55,
            endHalfWidth: 55,
            acceleration: 1100,
            endStrengthMultiplier: 0.60,
            edgeFalloffFraction: 0.22,
            enabled: true,
        },
    ];

/** @deprecated See WindVfxDefinition.ts. */
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

/**
 * Development-only rendering definition for the exact Local Wind simulation
 * volume. This is presentation/debug data only and never changes airflow.
 */
export interface LocalWindDebugVisualDefinition {
    readonly enabledByDefault: boolean;

    readonly fillColor: number;
    readonly fillAlpha: number;

    readonly lineColor: number;
    readonly lineWidth: number;
    readonly lineAlpha: number;

    readonly centerLineColor: number;
    readonly centerLineWidth: number;
    readonly centerLineAlpha: number;

    readonly originColor: number;
    readonly originRadius: number;
    readonly originAlpha: number;

    readonly directionArrowColor: number;
    readonly directionArrowLength: number;
    readonly arrowHeadLength: number;
    readonly directionArrowAlpha: number;
}

export const DEFAULT_LOCAL_WIND_DEBUG_VISUAL_DEFINITION:
    LocalWindDebugVisualDefinition = {

    enabledByDefault: false,

    fillColor: 0x55c9df,
    fillAlpha: 0.08,

    lineColor: 0x55c9df,
    lineWidth: 2,
    lineAlpha: 0.90,

    centerLineColor: 0xffd84a,
    centerLineWidth: 2,
    centerLineAlpha: 0.95,

    originColor: 0xf05a5a,
    originRadius: 6,
    originAlpha: 1.00,

    directionArrowColor: 0xffd84a,
    directionArrowLength: 28,
    arrowHeadLength: 12,
    directionArrowAlpha: 0.95,
};

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

    /**
     * World-space origin of the airflow.
     *
     * For a Fan this is the centre of the Fan entity.
     */
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
     * Distance the airflow extends from its origin.
     *
     * Units: world pixels.
     */
    readonly range: number;

    /**
     * Half-width of the airflow at the source.
     *
     * The complete source width is twice this value.
     */
    readonly startHalfWidth: number;

    /**
     * Half-width of the airflow at maximum range.
     *
     * A value larger than startHalfWidth creates the
     * intended widening fan/cone shape.
     */
    readonly endHalfWidth: number;

    /**
     * Maximum acceleration near the source centre.
     *
     * Units: pixels per second squared.
     */
    readonly acceleration: number;

    /**
     * Fraction of source acceleration retained at the
     * far end of the airflow.
     *
     * Expected range: 0 to 1.
     */
    readonly endStrengthMultiplier: number;

    /**
     * Fraction of the half-width used for smooth edge
     * falloff.
     *
     * Example:
     * 0.25 = outer 25 percent fades toward zero.
     */
    readonly edgeFalloffFraction: number;

    readonly enabled: boolean;
}

export interface LocalWindVisualDefinition {

    readonly enabled: boolean;

    /**
     * Number of reusable particles allocated per
     * enabled source.
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
     * Small distance beyond the source range before a
     * particle is recycled. This prevents visible
     * popping exactly at the force boundary.
     */
    readonly recyclePadding: number;
}

export interface FanVisualDefinition {

    readonly housingRadius: number;
    readonly bladeLength: number;
    readonly bladeWidth: number;
    readonly bladeCount: number;

    readonly housingFillColor: number;
    readonly housingOutlineColor: number;
    readonly bladeColor: number;
    readonly hubColor: number;
    readonly directionIndicatorColor: number;

    readonly outlineWidth: number;

    /**
     * Purely visual blade rotation speed.
     *
     * Units: radians per second.
     */
    readonly bladeRotationSpeed: number;
}

/**
 * Temporary fixed local-wind test layout.
 *
 * These are intentionally data definitions rather
 * than hardcoded logic in World. Later level loading
 * can replace this array without changing the
 * LocalWindSystem.
 */
export const DEFAULT_LOCAL_WIND_SOURCE_DEFINITIONS:
    readonly LocalWindSourceDefinition[] = [

        {
            id: "test-fan-right",
            positionX: 170,
            positionY: 150,
            directionRadians: 0,
            range: 520,
            startHalfWidth: 48,
            endHalfWidth: 120,
            acceleration: 760,
            endStrengthMultiplier: 0.55,
            edgeFalloffFraction: 0.24,
            enabled: true,
        },

        {
            id: "test-fan-down",
            positionX: 820,
            positionY: 110,
            directionRadians: Math.PI / 2,
            range: 470,
            startHalfWidth: 46,
            endHalfWidth: 112,
            acceleration: 700,
            endStrengthMultiplier: 0.55,
            edgeFalloffFraction: 0.24,
            enabled: true,
        },

        {
            id: "test-fan-left",
            positionX: 1030,
            positionY: 545,
            directionRadians: Math.PI,
            range: 500,
            startHalfWidth: 50,
            endHalfWidth: 125,
            acceleration: 780,
            endStrengthMultiplier: 0.52,
            edgeFalloffFraction: 0.24,
            enabled: true,
        },

        {
            id: "test-fan-diagonal",
            positionX: 250,
            positionY: 610,
            directionRadians: -Math.PI / 4,
            range: 480,
            startHalfWidth: 44,
            endHalfWidth: 110,
            acceleration: 720,
            endStrengthMultiplier: 0.55,
            edgeFalloffFraction: 0.24,
            enabled: true,
        },
    ];

export const DEFAULT_LOCAL_WIND_VISUAL_DEFINITION:
    LocalWindVisualDefinition = {

    enabled: true,

    particlesPerSource: 24,

    minimumParticleSpeed: 210,
    maximumParticleSpeed: 390,

    minimumParticleLength: 20,
    maximumParticleLength: 54,

    minimumParticleWidth: 1.5,
    maximumParticleWidth: 2.8,

    minimumOpacity: 0.30,
    maximumOpacity: 0.68,

    lineColor: 0xffffff,

    recyclePadding: 18,
};

export const DEFAULT_FAN_VISUAL_DEFINITION:
    FanVisualDefinition = {

    housingRadius: 34,

    bladeLength: 22,
    bladeWidth: 8,
    bladeCount: 4,

    housingFillColor: 0x3f4d56,
    housingOutlineColor: 0x1f292f,
    bladeColor: 0xb8c5cc,
    hubColor: 0x263238,
    directionIndicatorColor: 0xd9f3ff,

    outlineWidth: 3,

    bladeRotationSpeed: 5.2,
};

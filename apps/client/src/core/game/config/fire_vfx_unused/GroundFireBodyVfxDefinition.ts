export interface GroundFireBodyVfxDefinition {
    readonly outerRadius: number;
    readonly innerRadius: number;
    readonly hotCoreRadius: number;

    readonly minimumBodyScale: number;
    readonly maximumBodyScale: number;

    readonly pulseAmount: number;
    readonly pulseSpeed: number;

    readonly positionWobble: number;
    readonly wobbleSpeed: number;

    readonly minimumAlpha: number;
    readonly maximumAlpha: number;

    readonly outerLobeCount: number;
    readonly innerLobeCount: number;
    readonly hotCoreLobeCount: number;
}

/**
 * Presentation-only tuning for the continuous illustrated Ground Fire body.
 *
 * The body is deliberately broad, overlapping, flat-colored, and graphic.
 * It exists to make neighbouring coarse FireCells read as one burning mass.
 * No value here affects Fire simulation, heat, fuel, burn, or ignition.
 */
export const DEFAULT_GROUND_FIRE_BODY_VFX_DEFINITION:
    GroundFireBodyVfxDefinition = {

    outerRadius:
        31,

    innerRadius:
        24,

    hotCoreRadius:
        15,

    minimumBodyScale:
        0.72,

    maximumBodyScale:
        1.06,

    pulseAmount:
        0.10,

    pulseSpeed:
        8.5,

    positionWobble:
        2.8,

    wobbleSpeed:
        5.4,

    minimumAlpha:
        0.72,

    maximumAlpha:
        0.94,

    outerLobeCount:
        6,

    innerLobeCount:
        5,

    hotCoreLobeCount:
        3,
};

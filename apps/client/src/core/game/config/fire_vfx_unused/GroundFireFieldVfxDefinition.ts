/**
 * Presentation-only tuning for the connected Ground Fire field.
 *
 * The field is intentionally independent from Fire simulation authority.
 * FireManager still owns active FireCells, spread, intensity and lifetime.
 */
export interface GroundFireFieldVfxDefinition {
    readonly influencesPerCell: number;

    readonly minimumInfluenceRadius: number;
    readonly maximumInfluenceRadius: number;

    readonly minimumInfluenceStrength: number;
    readonly maximumInfluenceStrength: number;

    readonly growResponsePerSecond: number;
    readonly shrinkResponsePerSecond: number;

    readonly localOffsetRadius: number;

    readonly wobbleAmplitude: number;
    readonly wobbleSpeed: number;

    readonly connectionDistanceMultiplier: number;

    readonly outerRadiusMultiplier: number;
    readonly bodyRadiusMultiplier: number;
    readonly coreRadiusMultiplier: number;

    readonly outerMinimumStrength: number;
    readonly bodyMinimumStrength: number;
    readonly coreMinimumStrength: number;

    readonly minimumVisibleRadius: number;
}

/**
 * Phase 4B-6E-B connected Fire-field tuning.
 *
 * Visual target:
 * - one shared amoeba-like Fire mass
 * - neighboring FireCells visually attach
 * - new Fire grows into existing Fire instead of popping in
 * - dying Fire retracts instead of disappearing as individual sprites
 * - red edge, orange body and yellow hot core use the central palette
 */
export const DEFAULT_GROUND_FIRE_FIELD_VFX_DEFINITION:
    GroundFireFieldVfxDefinition = {

    influencesPerCell:
        7,

    minimumInfluenceRadius:
        12,

    maximumInfluenceRadius:
        24,

    minimumInfluenceStrength:
        0.34,

    maximumInfluenceStrength:
        1,

    growResponsePerSecond:
        8.5,

    shrinkResponsePerSecond:
        5.2,

    localOffsetRadius:
        21,

    wobbleAmplitude:
        3.6,

    wobbleSpeed:
        2.7,

    connectionDistanceMultiplier:
        1.55,

    outerRadiusMultiplier:
        1.18,

    bodyRadiusMultiplier:
        0.90,

    coreRadiusMultiplier:
        0.48,

    outerMinimumStrength:
        0.08,

    bodyMinimumStrength:
        0.26,

    coreMinimumStrength:
        0.62,

    minimumVisibleRadius:
        1.25,
};

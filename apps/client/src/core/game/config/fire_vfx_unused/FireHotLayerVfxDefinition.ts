/**
 * Presentation-only tuning for broken yellow hot regions.
 *
 * Yellow is deliberately NOT a clean nested interior. Hot islands use a
 * related but differently moving coherent noise field so orange and yellow
 * interpenetrate and continuously rearrange.
 */
export interface FireHotLayerVfxDefinition {
    readonly baseCoverage: number;
    readonly youngFireCoverageBoost: number;
    readonly oldFireCoverageMultiplier: number;

    readonly noiseScale: number;
    readonly noiseSpeed: number;
    readonly breakupStrength: number;

    readonly minimumRadiusMultiplier: number;
    readonly maximumRadiusMultiplier: number;

    readonly minimumAlpha: number;
    readonly maximumAlpha: number;

    readonly hottestSpotChance: number;
    readonly hottestSpotRadiusMultiplier: number;
    readonly hottestSpotAlpha: number;
}

export const DEFAULT_FIRE_HOT_LAYER_VFX_DEFINITION:
    FireHotLayerVfxDefinition = {

    baseCoverage:
        0.34,

    youngFireCoverageBoost:
        0.28,

    oldFireCoverageMultiplier:
        0.46,

    noiseScale:
        0.055,

    noiseSpeed:
        3.15,

    breakupStrength:
        0.58,

    minimumRadiusMultiplier:
        0.16,

    maximumRadiusMultiplier:
        0.42,

    minimumAlpha:
        0.68,

    maximumAlpha:
        0.96,

    hottestSpotChance:
        0.14,

    hottestSpotRadiusMultiplier:
        0.38,

    hottestSpotAlpha:
        0.88,
};

export interface ScorchVfxDefinition {
    readonly freshCharColor: number;
    readonly recentCharColor: number;
    readonly oldCharColor: number;

    readonly freshCharAlpha: number;
    readonly recentCharAlpha: number;
    readonly oldCharAlpha: number;

    readonly freshBurnThreshold: number;
    readonly recentBurnThreshold: number;

    readonly minimumRadiusMultiplier: number;
    readonly maximumRadiusMultiplier: number;

    readonly positionJitterMultiplier: number;

    readonly lowBurnSkipChance: number;
    readonly highBurnSkipChance: number;

    readonly secondaryPatchChance: number;
    readonly secondaryPatchRadiusMultiplier: number;
    readonly secondaryPatchAlphaMultiplier: number;
}

/**
 * Stronger scorch presentation, deliberately between the old heavy V1
 * footprint and the overly weak/fragmented cluster-pass footprint.
 *
 * EnvironmentField burn remains authoritative. These values only control
 * how that persistent damage is shown.
 */
export const DEFAULT_SCORCH_VFX_DEFINITION:
    ScorchVfxDefinition = {

    freshCharColor:
        0x3f3029,

    recentCharColor:
        0x5d4033,

    oldCharColor:
        0x795746,

    freshCharAlpha:
        0.76,

    recentCharAlpha:
        0.66,

    oldCharAlpha:
        0.48,

    freshBurnThreshold:
        0.72,

    recentBurnThreshold:
        0.36,

    minimumRadiusMultiplier:
        0.62,

    maximumRadiusMultiplier:
        1.02,

    positionJitterMultiplier:
        0.42,

    lowBurnSkipChance:
        0.24,

    highBurnSkipChance:
        0.04,

    secondaryPatchChance:
        0.34,

    secondaryPatchRadiusMultiplier:
        0.48,

    secondaryPatchAlphaMultiplier:
        0.58,
};

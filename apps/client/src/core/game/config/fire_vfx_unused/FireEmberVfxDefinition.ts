export interface FireEmberVfxDefinition {
    readonly maximumVisibleEmbers: number;

    readonly minimumSpawnRatePerHotCell: number;
    readonly maximumSpawnRatePerHotCell: number;

    readonly minimumLifetime: number;
    readonly maximumLifetime: number;

    readonly minimumScale: number;
    readonly maximumScale: number;

    readonly minimumBaseSpeed: number;
    readonly maximumBaseSpeed: number;

    readonly windAccelerationMultiplier: number;

    readonly maximumSpawnRadius: number;

    readonly minimumAlpha: number;
    readonly maximumAlpha: number;
}

/**
 * Sparse Fire ember presentation.
 *
 * Embers are intentionally restrained. They should punctuate hot Fire and
 * reveal Wind direction, not become a particle storm.
 */
export const DEFAULT_FIRE_EMBER_VFX_DEFINITION:
    FireEmberVfxDefinition = {

    maximumVisibleEmbers:
        20,

    minimumSpawnRatePerHotCell:
        0.10,

    maximumSpawnRatePerHotCell:
        0.62,

    minimumLifetime:
        0.38,

    maximumLifetime:
        0.92,

    minimumScale:
        0.16,

    maximumScale:
        0.30,

    minimumBaseSpeed:
        5,

    maximumBaseSpeed:
        16,

    windAccelerationMultiplier:
        0.075,

    maximumSpawnRadius:
        18,

    minimumAlpha:
        0.72,

    maximumAlpha:
        0.96,
};

/**
 * Shared medium-resolution environmental field configuration.
 *
 * SurfaceSystem remains authoritative for categorical terrain identity
 * such as Grass and Sand. EnvironmentField stores continuous dynamic
 * quantities manipulated by Fire now and Water later.
 */
export interface EnvironmentFieldDefinition {
    readonly cellSize: number;

    readonly grassInitialFuel: number;
    readonly sandInitialFuel: number;

    readonly normalGrassInitialMoisture: number;
    readonly wetGrassInitialMoisture: number;
    readonly drySandInitialMoisture: number;
    readonly wetSandInitialMoisture: number;

    readonly maximumFuel: number;
    readonly maximumHeat: number;
    readonly maximumBurnAmount: number;
    readonly maximumMoisture: number;
    readonly maximumWaterAmount: number;

    readonly minimumTrackedBurnAmount: number;

    /**
     * Heat is tracked sparsely once it reaches this amount.
     * When cooling drops below this threshold the value is cleared
     * and removed from the active thermal set.
     */
    readonly minimumTrackedHeat: number;

    /**
     * Passive heat loss per second. Active Water cooling is a later
     * phase and will apply additional cooling on top of this value.
     */
    readonly heatDecayPerSecond: number;

    readonly minimumBurnNoiseMultiplier: number;
    readonly maximumBurnNoiseMultiplier: number;

    readonly visual: {
        readonly enabled: boolean;
        readonly minimumVisibleBurnAmount: number;
        readonly minimumRadiusMultiplier: number;
        readonly maximumRadiusMultiplier: number;
        readonly positionJitterMultiplier: number;
        readonly lowBurnColor: number;
        readonly highBurnColor: number;
        readonly minimumAlpha: number;
        readonly maximumAlpha: number;

        /**
         * Number of discrete burn presentation levels. Simulation stays
         * continuous, while rendering only updates when a cell crosses
         * into a new visual bucket.
         */
        readonly burnVisualBucketCount: number;

        /**
         * Scale of the persistent scorch RenderTexture relative to world
         * pixels. Lower values reduce GPU memory and fill cost.
         */
        readonly renderTextureScale: number;

        /**
         * Small irregular lobes added to each scorch brush impression.
         */
        readonly brushLobeCount: number;
        readonly brushLobeOffsetMultiplier: number;
        readonly brushLobeRadiusMultiplier: number;
    };
}

export const DEFAULT_ENVIRONMENT_FIELD_DEFINITION:
    EnvironmentFieldDefinition = {

    cellSize: 8,

    grassInitialFuel: 1,
    sandInitialFuel: 0,

    normalGrassInitialMoisture: 0.08,
    wetGrassInitialMoisture: 0.82,
    drySandInitialMoisture: 0.04,
    wetSandInitialMoisture: 0.68,

    maximumFuel: 1,
    maximumHeat: 1,
    maximumBurnAmount: 1,
    maximumMoisture: 1,
    maximumWaterAmount: 1,

    minimumTrackedBurnAmount: 0.025,

    minimumTrackedHeat: 0.01,

    heatDecayPerSecond: 0.04,

    minimumBurnNoiseMultiplier: 0.72,
    maximumBurnNoiseMultiplier: 1.16,

    visual: {
        enabled: true,
        minimumVisibleBurnAmount: 0.055,
        minimumRadiusMultiplier: 0.58,
        maximumRadiusMultiplier: 1.12,
        positionJitterMultiplier: 0.42,
        lowBurnColor: 0x76502f,
        highBurnColor: 0x24150f,
        minimumAlpha: 0.10,
        maximumAlpha: 0.78,

        burnVisualBucketCount: 8,

        renderTextureScale: 0.5,

        brushLobeCount: 3,
        brushLobeOffsetMultiplier: 0.72,
        brushLobeRadiusMultiplier: 0.70,
    },
};

export function validateEnvironmentFieldDefinition(
    definition: EnvironmentFieldDefinition,
): void {
    if (
        !Number.isFinite(definition.cellSize) ||
        definition.cellSize <= 0
    ) {
        throw new Error(
            "Environment field cellSize must be a finite number greater than zero.",
        );
    }

    const nonNegativeValues: Array<readonly [string, number]> = [
        ["grassInitialFuel", definition.grassInitialFuel],
        ["sandInitialFuel", definition.sandInitialFuel],
        ["normalGrassInitialMoisture", definition.normalGrassInitialMoisture],
        ["wetGrassInitialMoisture", definition.wetGrassInitialMoisture],
        ["drySandInitialMoisture", definition.drySandInitialMoisture],
        ["wetSandInitialMoisture", definition.wetSandInitialMoisture],
        ["minimumTrackedBurnAmount", definition.minimumTrackedBurnAmount],
        ["minimumTrackedHeat", definition.minimumTrackedHeat],
        ["heatDecayPerSecond", definition.heatDecayPerSecond],
        ["minimumBurnNoiseMultiplier", definition.minimumBurnNoiseMultiplier],
        ["maximumBurnNoiseMultiplier", definition.maximumBurnNoiseMultiplier],
    ];

    for (const [name, value] of nonNegativeValues) {
        if (!Number.isFinite(value) || value < 0) {
            throw new Error(
                `Environment field ${name} must be a finite non-negative number.`,
            );
        }
    }

    const positiveMaximums: Array<readonly [string, number]> = [
        ["maximumFuel", definition.maximumFuel],
        ["maximumHeat", definition.maximumHeat],
        ["maximumBurnAmount", definition.maximumBurnAmount],
        ["maximumMoisture", definition.maximumMoisture],
        ["maximumWaterAmount", definition.maximumWaterAmount],
    ];

    for (const [name, value] of positiveMaximums) {
        if (!Number.isFinite(value) || value <= 0) {
            throw new Error(
                `Environment field ${name} must be a finite number greater than zero.`,
            );
        }
    }

    if (
        definition.minimumBurnNoiseMultiplier <= 0 ||
        definition.maximumBurnNoiseMultiplier <
        definition.minimumBurnNoiseMultiplier
    ) {
        throw new Error(
            "Environment field burn noise multipliers must be positive with maximum >= minimum.",
        );
    }

    const visual = definition.visual;

    if (
        !Number.isFinite(visual.minimumVisibleBurnAmount) ||
        visual.minimumVisibleBurnAmount < 0 ||
        !Number.isFinite(visual.minimumRadiusMultiplier) ||
        visual.minimumRadiusMultiplier <= 0 ||
        !Number.isFinite(visual.maximumRadiusMultiplier) ||
        visual.maximumRadiusMultiplier <
        visual.minimumRadiusMultiplier ||
        !Number.isFinite(visual.positionJitterMultiplier) ||
        visual.positionJitterMultiplier < 0 ||
        !Number.isFinite(visual.minimumAlpha) ||
        visual.minimumAlpha < 0 ||
        visual.minimumAlpha > 1 ||
        !Number.isFinite(visual.maximumAlpha) ||
        visual.maximumAlpha < visual.minimumAlpha ||
        visual.maximumAlpha > 1 ||
        !Number.isInteger(visual.burnVisualBucketCount) ||
        visual.burnVisualBucketCount <= 1 ||
        visual.burnVisualBucketCount > 255 ||
        !Number.isFinite(visual.renderTextureScale) ||
        visual.renderTextureScale <= 0 ||
        visual.renderTextureScale > 1 ||
        !Number.isInteger(visual.brushLobeCount) ||
        visual.brushLobeCount < 0 ||
        !Number.isFinite(visual.brushLobeOffsetMultiplier) ||
        visual.brushLobeOffsetMultiplier < 0 ||
        !Number.isFinite(visual.brushLobeRadiusMultiplier) ||
        visual.brushLobeRadiusMultiplier <= 0
    ) {
        throw new Error(
            "Environment field visual configuration is invalid.",
        );
    }
}

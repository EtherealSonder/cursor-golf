/**
 * Immutable configuration for the coarse deterministic Fire lifecycle.
 *
 * Fire still uses sparse coarse cells for ignition/spread in this
 * intermediate architecture, while each active Fire cell now influences
 * the higher-resolution EnvironmentField.
 */
export interface FireDefinition {
    readonly cellSize: number;
    readonly firstSpreadAge: number;
    readonly spreadInterval: number;
    readonly maximumSpreadGeneration: number;
    readonly scorchAge: number;
    readonly lifetime: number;
    readonly maximumActiveCellCount: number;
    readonly initialIntensity: number;
    readonly intensityFadeLifetimeFraction: number;

    readonly fieldInfluenceRadius: number;
    readonly heatDepositPerSecond: number;
    readonly burnDepositPerSecond: number;
    readonly fuelConsumptionPerSecond: number;
    readonly minimumFuelForIgnition: number;

    readonly baseSpreadProbability: number;
    readonly minimumWindAccelerationForBias: number;
    readonly windAccelerationForMaximumBias: number;
    readonly maximumDownwindSpreadMultiplier: number;
    readonly maximumUpwindSpreadMultiplier: number;
    readonly crosswindSpreadMultiplier: number;
    readonly diagonalSpreadMultiplier: number;
}

export const DEFAULT_FIRE_DEFINITION: FireDefinition = {
    cellSize: 48,

    /*
     * More frequent, smaller propagation steps make Fire feel continuous
     * instead of "spread, pause, spread". Probability is reduced below so
     * the faster cadence does not explode the footprint.
     */
    firstSpreadAge: 0.38,
    spreadInterval: 0.42,

    maximumSpreadGeneration: 3,

    scorchAge: 2.60,
    lifetime: 3.50,
    maximumActiveCellCount: 128,
    initialIntensity: 1,
    intensityFadeLifetimeFraction: 0.22,

    fieldInfluenceRadius: 34,
    heatDepositPerSecond: 0.52,
    burnDepositPerSecond: 0.34,
    fuelConsumptionPerSecond: 0.22,
    minimumFuelForIgnition: 0.08,

    /*
     * Lower per-attempt probability compensates for the shorter spread
     * interval while still producing more frequent visible propagation.
     */
    baseSpreadProbability: 0.34,

    minimumWindAccelerationForBias: 120,
    windAccelerationForMaximumBias: 1000,

    maximumDownwindSpreadMultiplier: 2.05,
    maximumUpwindSpreadMultiplier: 0.06,
    crosswindSpreadMultiplier: 0.38,
    diagonalSpreadMultiplier: 0.72,
};

export function validateFireDefinition(
    definition: FireDefinition,
): void {
    const positiveValues:
        Array<readonly [string, number]> = [
            ["cellSize", definition.cellSize],
            ["firstSpreadAge", definition.firstSpreadAge],
            ["spreadInterval", definition.spreadInterval],
            ["scorchAge", definition.scorchAge],
            ["lifetime", definition.lifetime],
            ["fieldInfluenceRadius", definition.fieldInfluenceRadius],
            ["heatDepositPerSecond", definition.heatDepositPerSecond],
            ["burnDepositPerSecond", definition.burnDepositPerSecond],
            ["fuelConsumptionPerSecond", definition.fuelConsumptionPerSecond],
        ];

    for (const [name, value] of positiveValues) {
        if (!Number.isFinite(value) || value <= 0) {
            throw new Error(
                `Fire ${name} must be a finite number greater than zero.`,
            );
        }
    }

    if (definition.scorchAge >= definition.lifetime) {
        throw new Error(
            "Fire scorchAge must be less than lifetime.",
        );
    }

    if (
        !Number.isInteger(definition.maximumSpreadGeneration) ||
        definition.maximumSpreadGeneration < 0
    ) {
        throw new Error(
            "Fire maximumSpreadGeneration must be a non-negative integer.",
        );
    }

    if (
        !Number.isInteger(definition.maximumActiveCellCount) ||
        definition.maximumActiveCellCount <= 0
    ) {
        throw new Error(
            "Fire maximumActiveCellCount must be a positive integer.",
        );
    }

    if (
        !Number.isFinite(definition.initialIntensity) ||
        definition.initialIntensity < 0 ||
        definition.initialIntensity > 1
    ) {
        throw new Error(
            "Fire initialIntensity must remain between zero and one.",
        );
    }

    if (
        !Number.isFinite(definition.intensityFadeLifetimeFraction) ||
        definition.intensityFadeLifetimeFraction <= 0 ||
        definition.intensityFadeLifetimeFraction > 1
    ) {
        throw new Error(
            "Fire intensityFadeLifetimeFraction must be greater than zero and at most one.",
        );
    }

    if (
        !Number.isFinite(definition.minimumFuelForIgnition) ||
        definition.minimumFuelForIgnition < 0 ||
        definition.minimumFuelForIgnition > 1
    ) {
        throw new Error(
            "Fire minimumFuelForIgnition must remain between zero and one.",
        );
    }

    const probabilityValues:
        Array<readonly [string, number]> = [
            ["baseSpreadProbability", definition.baseSpreadProbability],
            ["maximumUpwindSpreadMultiplier", definition.maximumUpwindSpreadMultiplier],
            ["crosswindSpreadMultiplier", definition.crosswindSpreadMultiplier],
            ["diagonalSpreadMultiplier", definition.diagonalSpreadMultiplier],
        ];

    for (const [name, value] of probabilityValues) {
        if (!Number.isFinite(value) || value < 0 || value > 1) {
            throw new Error(
                `Fire ${name} must remain between zero and one.`,
            );
        }
    }

    if (
        !Number.isFinite(definition.maximumDownwindSpreadMultiplier) ||
        definition.maximumDownwindSpreadMultiplier < 1
    ) {
        throw new Error(
            "Fire maximumDownwindSpreadMultiplier must be finite and at least one.",
        );
    }

    if (
        !Number.isFinite(definition.minimumWindAccelerationForBias) ||
        definition.minimumWindAccelerationForBias < 0
    ) {
        throw new Error(
            "Fire minimumWindAccelerationForBias must be finite and non-negative.",
        );
    }

    if (
        !Number.isFinite(definition.windAccelerationForMaximumBias) ||
        definition.windAccelerationForMaximumBias <=
        definition.minimumWindAccelerationForBias
    ) {
        throw new Error(
            "Fire windAccelerationForMaximumBias must be finite and greater than minimumWindAccelerationForBias.",
        );
    }
}

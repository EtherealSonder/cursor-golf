/**
 * Authoritative WaterField grid, flow, momentum, damping, and sparse activity
 * tuning.
 */
export interface WaterFieldDefinition {
    readonly cellSize: number;
    readonly maximumDepth: number;
    readonly maximumVelocity: number;
    readonly depthEqualizationRate: number;
    readonly minimumDepthDifference: number;
    readonly maximumTransferFractionPerNeighbor: number;
    readonly pressureAcceleration: number;
    readonly momentumAdvectionStrength: number;
    readonly velocityDamping: number;
    readonly minimumVelocity: number;

    /**
     * A wet cell at or above this depth remains simulation-active even when
     * its current velocity is very small. Shallower, nearly stationary cells
     * may sleep while retaining their authoritative Water depth.
     */
    readonly activeDepthThreshold: number;

    /**
     * A cell whose speed is at or above this value remains simulation-active
     * even when its depth is below activeDepthThreshold.
     */
    readonly activeVelocityThreshold: number;

    /**
     * Phase 8B-4C shallow-Water mobility curve.
     *
     * Water below thinWaterDepth moves at thinWaterMinimumMobility.
     * Mobility then rises smoothly toward 1.0 at fullMobilityDepth.
     * This controls transport only and never deletes Water.
     */
    readonly thinWaterDepth: number;
    readonly fullMobilityDepth: number;
    readonly thinWaterMinimumMobility: number;
    readonly shallowMobilityExponent: number;

    /**
     * Fixed internal Water simulation step.
     */
    readonly simulationStepSeconds: number;

    /**
     * Maximum fixed solver steps allowed during one rendered frame.
     */
    readonly maximumSubstepsPerFrame: number;

    /**
     * Maximum incoming frame delta admitted to the Water accumulator.
     * Larger hitches are intentionally discarded to avoid a spiral of death.
     */
    readonly maximumFrameDeltaSeconds: number;
}

export const DEFAULT_WATER_FIELD_DEFINITION: WaterFieldDefinition = {
    cellSize: 8,
    maximumDepth: 16,
    maximumVelocity: 2400,
    depthEqualizationRate: 6,
    minimumDepthDifference: 0.0001,
    maximumTransferFractionPerNeighbor: 0.20,
    pressureAcceleration: 95,
    momentumAdvectionStrength: 0.55,
    velocityDamping: 3.2,
    minimumVelocity: 0.02,
    activeDepthThreshold: 0.0005,
    activeVelocityThreshold: 0.05,

    /*
     * Sprinkler-scale Water begins as a very shallow film. Keep that film
     * mobile, but deliberately slow, until repeated impacts build depth.
     */
    thinWaterDepth: 0.012,
    fullMobilityDepth: 0.12,
    thinWaterMinimumMobility: 0.08,
    shallowMobilityExponent: 1.6,

    simulationStepSeconds: 1 / 60,
    maximumSubstepsPerFrame: 4,
    maximumFrameDeltaSeconds: 0.1,
};

export function validateWaterFieldDefinition(
    definition: WaterFieldDefinition,
): void {
    const positiveFiniteValues = [
        definition.cellSize,
        definition.maximumDepth,
        definition.maximumVelocity,
        definition.depthEqualizationRate,
        definition.pressureAcceleration,
        definition.velocityDamping,
        definition.activeDepthThreshold,
        definition.activeVelocityThreshold,
        definition.thinWaterDepth,
        definition.fullMobilityDepth,
        definition.shallowMobilityExponent,
        definition.simulationStepSeconds,
        definition.maximumFrameDeltaSeconds,
    ];

    if (!positiveFiniteValues.every((value: number): boolean =>
        Number.isFinite(value) && value > 0
    )) {
        throw new Error(
            "WaterField positive tuning values must be finite numbers greater than 0.",
        );
    }

    const nonNegativeFiniteValues = [
        definition.minimumDepthDifference,
        definition.momentumAdvectionStrength,
        definition.minimumVelocity,
        definition.thinWaterMinimumMobility,
    ];

    if (!nonNegativeFiniteValues.every((value: number): boolean =>
        Number.isFinite(value) && value >= 0
    )) {
        throw new Error(
            "WaterField non-negative tuning values must be finite numbers greater than or equal to 0.",
        );
    }


    if (
        definition.fullMobilityDepth <=
        definition.thinWaterDepth
    ) {
        throw new Error(
            "WaterField fullMobilityDepth must be greater than thinWaterDepth.",
        );
    }

    if (
        definition.thinWaterMinimumMobility < 0 ||
        definition.thinWaterMinimumMobility > 1
    ) {
        throw new Error(
            "WaterField thinWaterMinimumMobility must be between 0 and 1.",
        );
    }

    if (
        !Number.isInteger(definition.maximumSubstepsPerFrame) ||
        definition.maximumSubstepsPerFrame <= 0
    ) {
        throw new Error(
            "WaterField maximumSubstepsPerFrame must be a positive integer.",
        );
    }

    if (
        !Number.isFinite(definition.maximumTransferFractionPerNeighbor) ||
        definition.maximumTransferFractionPerNeighbor <= 0 ||
        definition.maximumTransferFractionPerNeighbor > 0.25
    ) {
        throw new Error(
            "WaterField maximumTransferFractionPerNeighbor must be greater than 0 and no greater than 0.25.",
        );
    }
}

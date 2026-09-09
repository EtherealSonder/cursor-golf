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
    ];

    if (!nonNegativeFiniteValues.every((value: number): boolean =>
        Number.isFinite(value) && value >= 0
    )) {
        throw new Error(
            "WaterField non-negative tuning values must be finite numbers greater than or equal to 0.",
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

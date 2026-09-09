/**
 * Presentation-only WaterField debug visualization tuning.
 *
 * This file must never influence authoritative Water simulation.
 */
export interface WaterDebugDefinition {
    readonly enabled: boolean;
    readonly showDepth: boolean;
    readonly showVelocity: boolean;

    /**
     * Dry neighbour cells are useful when diagnosing sparse activation, but
     * rebuilding their outlines is expensive and visually noisy. Keep them
     * disabled during ordinary Water inspection.
     */
    readonly showActiveCells: boolean;

    /**
     * Standing Water below this depth remains authoritative but is not painted
     * as an obvious blue puddle by the development visualizer.
     */
    readonly minimumVisibleDepth: number;

    readonly depthAlphaMinimum: number;
    readonly depthAlphaMaximum: number;
    readonly activeCellAlpha: number;

    readonly velocityVectorScale: number;
    readonly maximumVelocityVectorLength: number;
    readonly velocityVectorMinimumSpeed: number;

    /**
     * Only every Nth tracked Water cell is allowed to draw a velocity vector.
     */
    readonly velocityVectorStride: number;

    /**
     * Debug geometry refresh rate. The Water simulation still runs at its
     * fixed authoritative timestep; only presentation is throttled.
     */
    readonly refreshIntervalSeconds: number;

    /**
     * Temporary 8A-6 demonstration deposit.
     *
     * The deposit is positioned relative to the initialized Ball so it is
     * visible immediately in the initial gameplay viewport.
     */
    readonly createValidationDeposit: boolean;
    readonly validationDepositOffsetX: number;
    readonly validationDepositOffsetY: number;
    readonly validationDepositAmount: number;
    readonly validationDepositVelocityX: number;
    readonly validationDepositVelocityY: number;
}

export const DEFAULT_WATER_DEBUG_DEFINITION: WaterDebugDefinition = {
    enabled: true,
    showDepth: true,
    showVelocity: true,

    showActiveCells: false,

    minimumVisibleDepth: 0.003,

    depthAlphaMinimum: 0.45,
    depthAlphaMaximum: 0.90,
    activeCellAlpha: 0.06,

    velocityVectorScale: 0.035,
    maximumVelocityVectorLength: 20,
    velocityVectorMinimumSpeed: 8,
    velocityVectorStride: 6,

    /*
     * 12 Hz is smooth enough for debugging the field while avoiding a full
     * Pixi Graphics rebuild on every rendered frame.
     */
    refreshIntervalSeconds: 1 / 12,

    createValidationDeposit: false,

    /*
     * Put the temporary puddle just left of the Ball. This keeps it inside
     * the starting camera view without depending on hard-coded world coords.
     */
    validationDepositOffsetX: -180,
    validationDepositOffsetY: 0,

    validationDepositAmount: 8,
    validationDepositVelocityX: 260,
    validationDepositVelocityY: 40,
};

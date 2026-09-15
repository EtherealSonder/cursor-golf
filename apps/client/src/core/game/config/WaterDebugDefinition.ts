/**
 * Development presentation settings for the authoritative WaterField.
 *
 * Standing Water temporarily uses WaterFieldVisualizer again. Final Water
 * material/VFX presentation is deferred to the later Water VFX phase.
 */
export interface WaterDebugDefinition {
    readonly enabled: boolean;

    readonly showDepth: boolean;
    readonly showVelocity: boolean;
    readonly showActiveCells: boolean;

    readonly minimumVisibleDepth: number;

    readonly depthAlphaMinimum: number;
    readonly depthAlphaMaximum: number;

    readonly activeCellAlpha: number;

    readonly velocityVectorScale: number;
    readonly maximumVelocityVectorLength: number;
    readonly velocityVectorMinimumSpeed: number;
    readonly velocityVectorStride: number;

    readonly refreshIntervalSeconds: number;

    /**
     * Phase 8C-8A interactive development Water source.
     *
     * While enabled, primary mouse input over the canvas is reserved for
     * continuous Water deposition instead of golf-shot input.
     */
    readonly interactiveDepositEnabled: boolean;
    readonly interactiveDepositAmountPerPulse: number;
    readonly interactiveDepositIntervalSeconds: number;
    readonly interactiveDepositMaximumFrameDelta: number;

    readonly createValidationDeposit: boolean;
    readonly validationDepositOffsetX: number;
    readonly validationDepositOffsetY: number;
    readonly validationDepositAmount: number;
    readonly validationDepositVelocityX: number;
    readonly validationDepositVelocityY: number;
}

export const DEFAULT_WATER_DEBUG_DEFINITION:
    WaterDebugDefinition = {

    enabled:
        true,

    showDepth:
        true,

    showVelocity:
        false,

    showActiveCells:
        false,

    minimumVisibleDepth:
        0.003,

    depthAlphaMinimum:
        0.45,

    depthAlphaMaximum:
        0.90,

    activeCellAlpha:
        0.06,

    velocityVectorScale:
        0.035,

    maximumVelocityVectorLength:
        20,

    velocityVectorMinimumSpeed:
        8,

    velocityVectorStride:
        6,

    refreshIntervalSeconds:
        1 / 12,

    /*
     * 8C-8A testing tool. Set false to restore normal left-mouse golf input.
     * Each pulse enters the real WaterField and therefore exercises the full
     * production puddle -> infiltration -> Wet Ground -> drying lifecycle.
     */
    interactiveDepositEnabled:
        false,

    interactiveDepositAmountPerPulse:
        0.12,

    interactiveDepositIntervalSeconds:
        1 / 30,

    interactiveDepositMaximumFrameDelta:
        0.1,

    createValidationDeposit:
        false,

    validationDepositOffsetX:
        -180,

    validationDepositOffsetY:
        0,

    validationDepositAmount:
        8,

    validationDepositVelocityX:
        260,

    validationDepositVelocityY:
        40,
};

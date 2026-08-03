/**
 * Temporary development UI configuration.
 *
 * These flags control only React-side presentation.
 * They do not enable, disable or modify gameplay
 * systems.
 */
export interface DebugUiDefinition {

    /**
     * Controls whether the complete Phase C7 wind
     * validation panel is rendered in the left HUD.
     *
     * false:
     *
     * - Wind preset details are hidden
     * - Shot metrics are hidden
     * - Previous and Next controls are hidden
     * - Reference-shot text is hidden
     *
     * The Wind HUD, Reset Ball button and Generate
     * Random Wind button remain available.
     *
     * true:
     *
     * Restores the complete Phase C7 validation UI.
     */
    readonly showWindValidationPanel:
    boolean;
}

/**
 * Phase 4C camera-development configuration.
 *
 * The detailed Phase C7 panel remains implemented
 * but hidden while Camera work is in progress.
 */
export const DEFAULT_DEBUG_UI_DEFINITION:
    DebugUiDefinition = {

    showWindValidationPanel:
        false,
};
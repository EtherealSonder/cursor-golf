/**
 * Defines the complete visual behaviour of a
 * segmented Ball-to-Club connector.
 *
 * ConnectorDefinition contains configuration
 * only. It does not contain runtime state or
 * rendering logic.
 */
export interface ConnectorDefinition {

    // -------------------------------------------------------
    // Segment Geometry
    // -------------------------------------------------------

    readonly segmentLength: number;

    readonly segmentGap: number;

    readonly minimumSegmentLength: number;

    readonly minimumPowerLength: number;

    // -------------------------------------------------------
    // Neutral Track
    // -------------------------------------------------------

    readonly trackThickness: number;

    readonly trackColor: number;

    readonly trackAlpha: number;

    // -------------------------------------------------------
    // Active Power Layer
    // -------------------------------------------------------

    readonly basePowerThickness: number;

    readonly maximumPowerThickness: number;

    readonly powerAlpha: number;

    // -------------------------------------------------------
    // Near-Maximum Emphasis
    // -------------------------------------------------------

    readonly emphasisStartPower: number;

    readonly emphasisHighlightColor: number;

    readonly maximumHighlightBlend: number;

    readonly maximumHighlightThickness: number;

    readonly maximumHighlightAlpha: number;

    // -------------------------------------------------------
    // Travelling Pulse
    // -------------------------------------------------------

    readonly pulseDuration: number;

    readonly pulseHalfWidth: number;

    readonly pulseThicknessIncrease: number;

    readonly maximumPulseAlpha: number;

    readonly pulseColor: number;

    readonly maximumAnimationDeltaTime: number;

    // -------------------------------------------------------
    // Power Colours
    // -------------------------------------------------------

    readonly lowPowerColor: number;

    readonly mediumPowerColor: number;

    readonly highPowerColor: number;

    readonly lowToMediumTransitionEnd: number;

    readonly lowPowerNameEnd: number;

    readonly mediumPowerNameEnd: number;
}

/**
 * Default connector configuration used by the
 * current basic golf club.
 *
 * These values preserve the appearance and
 * behaviour established during Stage A7.
 */
export const DEFAULT_CONNECTOR_DEFINITION:
    ConnectorDefinition = {

    // ---------------------------------------------------
    // Segment Geometry
    // ---------------------------------------------------

    segmentLength: 12,

    segmentGap: 6,

    minimumSegmentLength: 2,

    minimumPowerLength: 0.5,

    // ---------------------------------------------------
    // Neutral Track
    // ---------------------------------------------------

    trackThickness: 10,

    trackColor: 0x3f474f,

    trackAlpha: 0.8,

    // ---------------------------------------------------
    // Active Power Layer
    // ---------------------------------------------------

    basePowerThickness: 6,

    maximumPowerThickness: 8,

    powerAlpha: 1,

    // ---------------------------------------------------
    // Near-Maximum Emphasis
    // ---------------------------------------------------

    emphasisStartPower: 0.8,

    emphasisHighlightColor: 0xffffff,

    maximumHighlightBlend: 0.28,

    maximumHighlightThickness: 11,

    maximumHighlightAlpha: 0.32,

    // ---------------------------------------------------
    // Travelling Pulse
    // ---------------------------------------------------

    pulseDuration: 0.9,

    pulseHalfWidth: 14,

    pulseThicknessIncrease: 2,

    maximumPulseAlpha: 0.65,

    pulseColor: 0xffffff,

    maximumAnimationDeltaTime: 0.1,

    // ---------------------------------------------------
    // Power Colours
    // ---------------------------------------------------

    lowPowerColor: 0xffff00,

    mediumPowerColor: 0xffa500,

    highPowerColor: 0xff0000,

    lowToMediumTransitionEnd: 0.5,

    lowPowerNameEnd: 0.33,

    mediumPowerNameEnd: 0.66,
};
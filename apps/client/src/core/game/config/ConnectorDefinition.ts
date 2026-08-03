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
    // Power Milestones
    // -------------------------------------------------------

    readonly milestoneRatios:
    readonly number[];

    readonly milestoneLength: number;

    readonly milestoneThickness: number;

    readonly milestoneColor: number;

    readonly milestoneInactiveAlpha: number;

    readonly milestoneActiveAlpha: number;

    // -------------------------------------------------------
    // Active Power Endpoint
    // -------------------------------------------------------

    readonly endpointMarkerBaseRadius: number;

    readonly endpointMarkerMaximumRadius: number;

    readonly endpointMarkerOutlineThickness: number;

    readonly endpointMarkerOutlineColor: number;

    readonly endpointMarkerAlpha: number;

    // -------------------------------------------------------
    // Club-End Energy Node
    // -------------------------------------------------------

    readonly clubNodeBaseRadius: number;

    readonly clubNodeMaximumRadius: number;

    readonly clubNodeAlpha: number;

    readonly clubNodeGlowStartPower: number;

    readonly clubNodeGlowMaximumRadius: number;

    readonly clubNodeGlowAlpha: number;

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

    segmentLength: 14,

    segmentGap: 4,

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

    basePowerThickness: 5,

    maximumPowerThickness: 11,

    powerAlpha: 1,

    // ---------------------------------------------------
    // Near-Maximum Emphasis
    // ---------------------------------------------------

    emphasisStartPower: 0.55,

    emphasisHighlightColor: 0xffffff,

    maximumHighlightBlend: 0.28,

    maximumHighlightThickness: 15,

    maximumHighlightAlpha: 0.42,

    // ---------------------------------------------------
    // Travelling Pulse
    // ---------------------------------------------------

    pulseDuration: 0.72,

    pulseHalfWidth: 17,

    pulseThicknessIncrease: 3,

    maximumPulseAlpha: 0.78,

    pulseColor: 0xffffff,

    maximumAnimationDeltaTime: 0.1,

    // ---------------------------------------------------
    // Power Milestones
    // ---------------------------------------------------

    milestoneRatios: [
        0.25,
        0.50,
        0.75,
        1.00,
    ],

    milestoneLength: 16,

    milestoneThickness: 2,

    milestoneColor: 0xffffff,

    milestoneInactiveAlpha: 0.20,

    milestoneActiveAlpha: 0.86,

    // ---------------------------------------------------
    // Active Power Endpoint
    // ---------------------------------------------------

    endpointMarkerBaseRadius: 4,

    endpointMarkerMaximumRadius: 7,

    endpointMarkerOutlineThickness: 2,

    endpointMarkerOutlineColor: 0xffffff,

    endpointMarkerAlpha: 1,

    // ---------------------------------------------------
    // Club-End Energy Node
    // ---------------------------------------------------

    clubNodeBaseRadius: 3,

    clubNodeMaximumRadius: 8,

    clubNodeAlpha: 0.95,

    clubNodeGlowStartPower: 0.65,

    clubNodeGlowMaximumRadius: 14,

    clubNodeGlowAlpha: 0.25,

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
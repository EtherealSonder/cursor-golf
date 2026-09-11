/**
 * Phase 8B-4 presentation-only tuning for airborne Water.
 *
 * None of these values affect authoritative packet transport or WaterField
 * deposition. The visualizer is intentionally bounded and lightweight.
 */
export interface AirborneWaterDebugDefinition {
    readonly enabled: boolean;

    /** Hard presentation cap independent from the simulation packet cap. */
    readonly maximumVisiblePackets: number;

    /** Length of the small velocity-aligned streak drawn for each packet. */
    readonly streakLength: number;
    readonly streakWidth: number;

    /**
     * Presentation-only multipliers for high-volume DirectionalJet packets.
     * Sprinkler packets continue using the baseline radius/streak width.
     */
    readonly directionalJetRadiusMultiplier: number;
    readonly directionalJetStreakWidthMultiplier: number;

    /** Packet marker radius at ground level and at the visual height cap. */
    readonly minimumRadius: number;
    readonly maximumRadius: number;

    readonly minimumAlpha: number;
    readonly maximumAlpha: number;

    /**
     * Height used only to normalize presentation size/alpha.
     * Higher packets clamp to this value.
     */
    readonly heightForMaximumPresentation: number;

    /** Temporary debug Water color. */
    readonly waterColor: number;

    /** Small dark core improves readability over Grass. */
    readonly coreColor: number;
    readonly coreAlpha: number;
}

export const DEFAULT_AIRBORNE_WATER_DEBUG_DEFINITION:
    AirborneWaterDebugDefinition = {
    enabled: true,

    maximumVisiblePackets: 128,

    streakLength: 15,
    streakWidth: 4,

    directionalJetRadiusMultiplier: 1.6,
    directionalJetStreakWidthMultiplier: 1.7,

    minimumRadius: 3.5,
    maximumRadius: 5.5,

    minimumAlpha: 0.62,
    maximumAlpha: 0.9,

    heightForMaximumPresentation: 48,

    waterColor: 0x55c9df,
    coreColor: 0xffffff,
    coreAlpha: 0.42,
};

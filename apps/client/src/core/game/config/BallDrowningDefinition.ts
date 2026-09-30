export interface BallDrowningDefinition {
    readonly uiActivationDelaySeconds: number;

    /** Physical sampled standing-Water contact gates. */
    readonly minimumWaterCoverage: number;
    readonly minimumRepresentativeDepth: number;

    /**
     * Gameplay severity remapping. WaterField remains authoritative for the
     * physical depth; these values only translate that depth into readable
     * drowning gameplay.
     */
    readonly establishedPuddleDepth: number;
    readonly substantialPuddleDepth: number;
    readonly veryDeepWaterDepth: number;

    readonly minimumEstablishedPuddleBaseline: number;
    readonly substantialPuddleBaseline: number;
    readonly maximumEnvironmentalBaseline: number;
    readonly coverageBaselineWeight: number;

    /** Hysteresis prevents drying/fluctuation around one threshold. */
    readonly deepWaterEnterDepth: number;
    readonly deepWaterExitDepth: number;
    readonly deepWaterMinimumCoverage: number;

    readonly stationaryEnterSpeed: number;
    readonly stationaryExitSpeed: number;

    /** Accumulated danger is independent of the environmental baseline. */
    readonly dangerAccumulationPerSecond: number;
    readonly deepestWaterRateMultiplier: number;
    readonly dangerRecoveryPerSecond: number;

    readonly deathThreshold: number;

    readonly sinkingStartProgress: number;
    readonly minimumVisibleBallFraction: number;
}

export const DEFAULT_BALL_DROWNING_DEFINITION: BallDrowningDefinition = {
    uiActivationDelaySeconds: 0.10,

    minimumWaterCoverage: 0.05,
    minimumRepresentativeDepth: 0.0005,

    // Empirical WaterField ranges observed during D-4 testing:
    // ~0.006-0.009 shallow established puddles, ~0.09-0.12 very deep centres.
    establishedPuddleDepth: 0.004,
    substantialPuddleDepth: 0.012,
    veryDeepWaterDepth: 0.080,

    // D-4 threat pass: visually substantial puddles should read as dangerous
    // immediately, before stationary accumulation begins.
    minimumEstablishedPuddleBaseline: 0.18,
    substantialPuddleBaseline: 0.42,
    maximumEnvironmentalBaseline: 0.62,
    coverageBaselineWeight: 0.10,

    deepWaterEnterDepth: 0.022,
    deepWaterExitDepth: 0.014,
    deepWaterMinimumCoverage: 0.55,

    stationaryEnterSpeed: 10,
    stationaryExitSpeed: 16,

    dangerAccumulationPerSecond: 0.24,
    deepestWaterRateMultiplier: 2.1,
    dangerRecoveryPerSecond: 0.10,

    deathThreshold: 1,

    sinkingStartProgress: 0.50,
    minimumVisibleBallFraction: 0.25,
};

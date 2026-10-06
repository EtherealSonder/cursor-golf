export interface ShotPowerDefinition {
    readonly minimumNormalizedPower: number;
    readonly minimumBaselineTravelDistance: number;
    readonly maximumBaselineTravelDistance: number;
    readonly baselineDistanceExponent: number;
    readonly baselineRollingDeceleration: number;
    readonly baselineStopSpeedThreshold: number;
}

export const DEFAULT_SHOT_POWER_DEFINITION: ShotPowerDefinition = {
    minimumNormalizedPower: 0.10,
    minimumBaselineTravelDistance: 11.88,
    maximumBaselineTravelDistance: 1199.88,
    baselineDistanceExponent: 1.0,
    baselineRollingDeceleration: 600,
    baselineStopSpeedThreshold: 12,
};

import { SHOT_INPUT_POLICY } from "./ShotInputPolicyDefinition";
export interface ShotPowerDefinition {
    readonly minimumNormalizedPower: number;
    readonly minimumBaselineTravelDistance: number;
    readonly maximumBaselineTravelDistance: number;
    readonly baselineDistanceExponent: number;
    readonly baselineRollingDeceleration: number;
    readonly baselineStopSpeedThreshold: number;
}

export const DEFAULT_SHOT_POWER_DEFINITION: ShotPowerDefinition = {
    minimumNormalizedPower: SHOT_INPUT_POLICY.enforceMultiplayerMinimumShot ? 0.10 : 0,
    minimumBaselineTravelDistance: SHOT_INPUT_POLICY.enforceMultiplayerMinimumShot ? 11.88 : SHOT_INPUT_POLICY.singlePlayerMinimumBaselineTravelDistance,
    maximumBaselineTravelDistance: 1199.88,
    baselineDistanceExponent: 1.0,
    baselineRollingDeceleration: 600,
    baselineStopSpeedThreshold: 12,
};

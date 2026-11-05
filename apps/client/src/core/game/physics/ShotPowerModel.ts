import { DEFAULT_SHOT_POWER_DEFINITION, type ShotPowerDefinition } from "../config/ShotPowerDefinition";

export class ShotPowerModel {
    public constructor(private readonly definition: ShotPowerDefinition = DEFAULT_SHOT_POWER_DEFINITION) {}
    public getExpectedBaselineTravelDistance(normalizedPower: number, distanceMultiplier = 1, maximumBaselineDistance?: number): number {
        const p = Math.max(0, Math.min(1, normalizedPower));
        if (p < this.definition.minimumNormalizedPower) return 0;
        const range = 1 - this.definition.minimumNormalizedPower;
        const t = range > 0 ? (p - this.definition.minimumNormalizedPower) / range : 1;
        const curved = Math.pow(Math.max(0, Math.min(1, t)), this.definition.baselineDistanceExponent);
        return (this.definition.minimumBaselineTravelDistance + curved * ((maximumBaselineDistance ?? this.definition.maximumBaselineTravelDistance) - this.definition.minimumBaselineTravelDistance)) * Math.max(0, distanceMultiplier);
    }
    /** Uses the existing baseline distance curve with a reduced maximum distance. */
    public getLaunchSpeedForMaximumDistance(normalizedPower: number, maximumBaselineDistance: number): number {
        return this.getLaunchSpeed(normalizedPower, 1, maximumBaselineDistance);
    }
    public getLaunchSpeed(normalizedPower: number, distanceMultiplier = 1, maximumBaselineDistance?: number, maximumLaunchSpeed?: number): number {
        const d = this.getExpectedBaselineTravelDistance(normalizedPower, distanceMultiplier, maximumBaselineDistance);
        if (d <= 0) return 0;
        const stop = this.definition.baselineStopSpeedThreshold;
        const calculatedSpeed = Math.sqrt(stop * stop + 2 * this.definition.baselineRollingDeceleration * d);
        if (maximumLaunchSpeed === undefined) return calculatedSpeed;
        const maxDistance = maximumBaselineDistance ?? this.definition.maximumBaselineTravelDistance;
        const maxPowerSpeed = Math.max(0, maximumLaunchSpeed);
        return maxDistance > 0 ? maxPowerSpeed * Math.sqrt(d / maxDistance) : 0;
    }
}
export const DEFAULT_SHOT_POWER_MODEL = new ShotPowerModel();

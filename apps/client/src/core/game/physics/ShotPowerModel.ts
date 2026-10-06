import { DEFAULT_SHOT_POWER_DEFINITION, type ShotPowerDefinition } from "../config/ShotPowerDefinition";

export class ShotPowerModel {
    public constructor(private readonly definition: ShotPowerDefinition = DEFAULT_SHOT_POWER_DEFINITION) {}
    public getExpectedBaselineTravelDistance(normalizedPower: number): number {
        const p = Math.max(0, Math.min(1, normalizedPower));
        if (p < this.definition.minimumNormalizedPower) return 0;
        const range = 1 - this.definition.minimumNormalizedPower;
        const t = range > 0 ? (p - this.definition.minimumNormalizedPower) / range : 1;
        const curved = Math.pow(Math.max(0, Math.min(1, t)), this.definition.baselineDistanceExponent);
        return this.definition.minimumBaselineTravelDistance + curved * (this.definition.maximumBaselineTravelDistance - this.definition.minimumBaselineTravelDistance);
    }
    public getLaunchSpeed(normalizedPower: number): number {
        const d = this.getExpectedBaselineTravelDistance(normalizedPower);
        if (d <= 0) return 0;
        const stop = this.definition.baselineStopSpeedThreshold;
        return Math.sqrt(stop * stop + 2 * this.definition.baselineRollingDeceleration * d);
    }
}
export const DEFAULT_SHOT_POWER_MODEL = new ShotPowerModel();

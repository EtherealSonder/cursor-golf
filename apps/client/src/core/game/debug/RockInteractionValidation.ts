import { DEFAULT_ROCK_INTERACTION_DEFINITION as D } from "../config/RockInteractionDefinition";

export class RockInteractionValidation {
    public static validate(): void {
        if (!(D.smallRockExplosionPulverizeRadiusFraction > 0 &&
              D.smallRockExplosionPulverizeRadiusFraction < 1)) {
            throw new Error("[R-ROCK] Pulverize fraction must be between zero and one.");
        }
        if (!D.smallRockSuctionEnabled || !D.smallRockRobotTargetEnabled) {
            throw new Error("[R-ROCK-3] Small Rocks must support Robot targeting and Wind suction.");
        }
        if (!D.boulderRobotTargetEnabled ||
            !D.boulderBlocksLocalWind ||
            !D.boulderBlocksAirborneElements ||
            !D.boulderWaterWindImmune ||
            !(D.boulderExplosionFractureRadiusFraction > 0 &&
              D.boulderExplosionFractureRadiusFraction <= 1)) {
            throw new Error("[R-ROCK-4] Boulder static/elemental interaction contract is incomplete.");
        }
    }
}

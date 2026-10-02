export interface RockInteractionDefinition {
    readonly smallRockExplosionPulverizeRadiusFraction: number;
    readonly smallRockSuctionEnabled: boolean;
    readonly smallRockRobotTargetEnabled: boolean;
    readonly boulderRobotTargetEnabled: boolean;
    readonly boulderBlocksLocalWind: boolean;
    readonly boulderBlocksAirborneElements: boolean;
    readonly boulderWaterWindImmune: boolean;
    readonly boulderExplosionFractureRadiusFraction: number;
}

export const DEFAULT_ROCK_INTERACTION_DEFINITION: RockInteractionDefinition = {
    smallRockExplosionPulverizeRadiusFraction: 0.22,
    smallRockSuctionEnabled: true,
    smallRockRobotTargetEnabled: true,
    boulderRobotTargetEnabled: true,
    boulderBlocksLocalWind: true,
    boulderBlocksAirborneElements: true,
    boulderWaterWindImmune: true,
    boulderExplosionFractureRadiusFraction: 0.75,
};

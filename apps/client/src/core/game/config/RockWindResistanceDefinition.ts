/** Rock-specific environmental wind policy. Wind-robot pull remains enabled. */
export interface RockWindResistanceDefinition {
    readonly globalWindMultiplier: number;
    readonly fanMaximumRadius: number;
    readonly fanMinimumAcceleration: number;
    readonly fanImpulseMultiplier: number;
    readonly robotPullMultiplier: number;
}
export const DEFAULT_ROCK_WIND_RESISTANCE_DEFINITION: RockWindResistanceDefinition = {
    globalWindMultiplier: 0,
    fanMaximumRadius: 7,
    fanMinimumAcceleration: 150,
    fanImpulseMultiplier: 0.025,
    robotPullMultiplier: 1,
};

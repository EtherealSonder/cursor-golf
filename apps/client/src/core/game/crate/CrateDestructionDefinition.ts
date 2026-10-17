export type CrateDestructionCause = "ballImpact" | "objectImpact" | "wallImpact" | "windNozzle" | "fire" | "mineContact" | "mineExplosion" | "manual";
export type CrateDestructionState = "active" | "destroying" | "removed";
export const CRATE_DESTRUCTION = {
    ballMaximumSpeed: 1200,
    ballNormalSpeedFraction: 0.25,
    minimumBallImpulse: 0.1,
    otherMinimumClosingSpeed: 180,
    otherMinimumImpulse: 130,
    smokeFramesPerSecond: 14,
    smokeSize: 110,
} as const;

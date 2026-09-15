/**
 * Phase 8D-8 acceptance tolerances and minimum live-world requirements.
 *
 * 8D-8 is an acceptance gate. The detailed deterministic physics probes are
 * already executed by the 8D-1 through 8D-7E validators before this suite.
 * These values define the additional live integration requirements.
 */
export interface WaterStaticObstacleAcceptanceDefinition {
    readonly minimumGroundObstacleCells: number;
    readonly minimumAirborneColliderShapes: number;
    readonly minimumRegisteredColliders: number;
    readonly requiredSprinklerCount: number;
}

export const DEFAULT_WATER_STATIC_OBSTACLE_ACCEPTANCE_DEFINITION:
    WaterStaticObstacleAcceptanceDefinition = {

    minimumGroundObstacleCells:
        1,

    minimumAirborneColliderShapes:
        1,

    minimumRegisteredColliders:
        1,

    requiredSprinklerCount:
        2,
};

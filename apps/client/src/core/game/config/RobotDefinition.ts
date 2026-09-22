export interface RobotDefinition {
    readonly id: string;
    readonly positionX: number;
    readonly positionY: number;
    readonly roamRadius: number;
    readonly navigationRadius: number;
    readonly destinationClearancePadding: number;
    readonly destinationAttempts: number;
    readonly movementSpeed: number;
    readonly arrivalTolerance: number;
    readonly waitMinimumSeconds: number;
    readonly waitMaximumSeconds: number;
    readonly bodyWidth: number;
    readonly legScale: number;
    readonly legOffsetX: number;
    readonly legOffsetY: number;
    readonly avoidanceProbeDistance: number;
    readonly avoidanceProbeStepDegrees: number;
    readonly avoidanceMaximumTurnDegrees: number;
    readonly avoidanceCommitSeconds: number;
    readonly avoidanceReleaseClearFrames: number;
    readonly stuckTimeoutSeconds: number;
    readonly stuckMinimumProgress: number;
    readonly turnSpeedRadiansPerSecond: number;
    readonly turnAlignmentToleranceDegrees: number;
    readonly stepDistance: number;
    readonly legReachSeconds: number;
    readonly bodyCatchupSeconds: number;
    readonly visionRange: number;
    readonly visionHalfAngleDegrees: number;
    readonly enabled: boolean;
    readonly debugEnabled: boolean;
}

export const DEFAULT_FIRE_ROBOT_DEFINITION: RobotDefinition = {
    id: "fire-robot-1",
    positionX: 1320,
    positionY: 420,
    roamRadius: 450,
    navigationRadius: 34,
    destinationClearancePadding: 16,
    destinationAttempts: 12,
    movementSpeed: 72,
    arrivalTolerance: 5,
    waitMinimumSeconds: 2,
    waitMaximumSeconds: 3,
    bodyWidth: 105,

    // R-3: smaller walking paddles. Source PNGs remain unchanged.
    legScale: 0.085,
    legOffsetX: -6,
    legOffsetY: 31,

    avoidanceProbeDistance: 78,
    avoidanceProbeStepDegrees: 30,
    avoidanceMaximumTurnDegrees: 120,
    // Hold an avoidance side briefly and require several clear probes before
    // returning to direct travel. This suppresses left/right obstacle jitter.
    avoidanceCommitSeconds: 0.45,
    avoidanceReleaseClearFrames: 4,
    stuckTimeoutSeconds: 1.5,
    stuckMinimumProgress: 5,

    // R-3 turn-before-walk and discrete step locomotion.
    turnSpeedRadiansPerSecond: Math.PI * 1.65,
    turnAlignmentToleranceDegrees: 5,
    stepDistance: 22,
    legReachSeconds: 0.14,
    bodyCatchupSeconds: 0.21,

    // R-4 passive perception. Detection does not interrupt locomotion yet.
    visionRange: 360,
    visionHalfAngleDegrees: 42,

    enabled: true,
    debugEnabled: true,
};

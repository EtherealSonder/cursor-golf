export type RobotElement = "fire" | "water" | "wind";

export interface RobotDefinition {
    readonly element: RobotElement;
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
    readonly targetTurnSpeedRadiansPerSecond: number;
    readonly targetAlignmentToleranceDegrees: number;
    readonly targetLossGraceSeconds: number;
    readonly attackDurationSeconds: number;
    readonly attackCooldownSeconds: number;
    readonly attackWarningDurationSeconds: number;
    readonly fireOutletOffset: number;
    readonly waterOutletOffset: number;
    readonly windOutletOffset: number;
    readonly waterJetBallImpulseMultiplier: number;
    /** Shared physical mass used when elemental forces such as Water/Wind move a Robot. */
    readonly externalForceMass: number;
    readonly bodyTextureKey: string;
    readonly leg1TextureKey: string;
    readonly leg2TextureKey: string;
    readonly ledColor: number;
    readonly ledScreenDiameter: number;
    readonly impactReactionDurationSeconds: number;
    readonly impactScanAngleDegrees: number;
    readonly impactTurnSpeedRadiansPerSecond: number;
    readonly enabled: boolean;
    readonly debugEnabled: boolean;
}

export const DEFAULT_FIRE_ROBOT_DEFINITION: RobotDefinition = {
    id: "fire-robot-1",
    element: "fire",
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
    visionRange: 450,
    visionHalfAngleDegrees: 42,

    // R-5 target orientation. Kept separate from wander turning so attack
    // presentation can be tuned independently later.
    targetTurnSpeedRadiansPerSecond: Math.PI * 1.8,
    targetAlignmentToleranceDegrees: 4,
    targetLossGraceSeconds: 0.3,

    // R-6 generic attack commitment. Elemental output is added in a later phase.
    attackDurationSeconds: 5.0,

    // R-7 attack availability cooldown. Navigation and perception continue
    // normally while the elemental attack remains unavailable.
    attackCooldownSeconds: 10.0,

    // R-8.1 warning window before the actual elemental attack begins.
    attackWarningDurationSeconds: 1.5,

    // R-8 directional Fire originates at the visual nozzle tip.
    fireOutletOffset: 72,
    waterOutletOffset: 72,
    windOutletOffset: 48,
    waterJetBallImpulseMultiplier: 1,
    // Robots should react to strong elemental forces, but only with a subtle shove.
    externalForceMass: 16,
    bodyTextureKey: "fireRobotBody",
    leg1TextureKey: "fireRobotLeg1",
    leg2TextureKey: "fireRobotLeg2",

    // Shared robot LED presentation. All elemental robots use the same attack red.
    ledColor: 0xDD3E80,
    ledScreenDiameter: 31,

    // R-9 shared impact-awareness response.
    impactReactionDurationSeconds: 1.5,
    impactScanAngleDegrees: 45,
    impactTurnSpeedRadiansPerSecond: Math.PI * 2.2,

    enabled: true,
    // Master Robot debug toggle. Set true whenever vision/AI diagnostics are needed.
    debugEnabled: false,
};


/** Water Robot uses the completed shared Robot behaviour with Hose-style output. */
export const DEFAULT_WATER_ROBOT_DEFINITION: RobotDefinition = {
    ...DEFAULT_FIRE_ROBOT_DEFINITION,
    id: "water-robot-1",
    element: "water",
    positionX: 1040,
    positionY: 610,
    bodyTextureKey: "waterRobotBody",
    leg1TextureKey: "waterRobotLeg1",
    leg2TextureKey: "waterRobotLeg2",
    ledColor: 0x1E99FF,
    waterJetBallImpulseMultiplier: 8,
    // Water artwork has a slightly smaller circular LED aperture than Fire.
    // Match the Fire Robot chassis scale despite the wider Water nozzle artwork.
    bodyWidth: 122,
    legScale: 0.085,
    legOffsetX: -6,
    legOffsetY: 31,
    ledScreenDiameter: 28,
    enabled: true,
    debugEnabled: false,
};


/** Wind Robot reuses shared Robot AI and emits a powerful conical suction field. */
export const DEFAULT_WIND_ROBOT_DEFINITION: RobotDefinition = {
    ...DEFAULT_FIRE_ROBOT_DEFINITION,
    id: "wind-robot-1",
    element: "wind",
    positionX: 760,
    positionY: 360,
    bodyTextureKey: "windRobotBody",
    leg1TextureKey: "windRobotLeg1",
    leg2TextureKey: "windRobotLeg2",
    ledColor: 0xF4F0D8,
    // Wind artwork is wider than Fire because of its large suction nozzle.
    // Scale the complete sprite so the circular chassis matches Fire, then
    // keep the shared legs at the approved Fire proportions.
    bodyWidth: 120,
    legScale: 0.085,
    legOffsetX: -6,
    legOffsetY: 31,
    ledScreenDiameter: 25,
    // With bodyWidth=120 the nozzle lip sits close to local +60. Keep the
    // authoritative source just inside the painted rim so VFX can overlap it.
    windOutletOffset: 58,
    enabled: true,
    debugEnabled: false,
};


/** Temporary second instances used to exercise multi-Robot interactions. */
export const SECOND_FIRE_ROBOT_DEFINITION: RobotDefinition = {
    ...DEFAULT_FIRE_ROBOT_DEFINITION,
    id: "fire-robot-2",
    positionX: 700,
    positionY: 650,
};

export const SECOND_WATER_ROBOT_DEFINITION: RobotDefinition = {
    ...DEFAULT_WATER_ROBOT_DEFINITION,
    id: "water-robot-2",
    // Clear fallback test location. World performs a final static-blocker check.
    positionX: 1480,
    positionY: 760,
};

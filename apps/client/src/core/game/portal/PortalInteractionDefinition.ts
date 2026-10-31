/** P3 ball interaction thresholds, in world units and seconds. */
export const PORTAL_INTERACTION = {
    outerRadiusX: 87, outerRadiusY: 39,
    centralRadiusX: 72, centralRadiusY: 30,
    minimumEntrySpeed: 18,
    maximumEntrySpeed: 1600,
    minimumExitSpeed: 35,
    maximumExitSpeed: 1600,
    edgeRejectAcceleration: 110,
    lowSpeedThreshold: 24,
    stuckSeconds: 0.15,
    stuckEjectionSpeed: 100,
    reentryCooldownSeconds: 0.28,
    exitClearance: 8,
    exitForwardOffset: 30,
    releaseMargin: 12,
    exitNormalDeadzone: 0.12,
} as const;

/** P4-A defaults. Kept separate from established P3 ball tuning. */
export const PORTAL_DYNAMIC_INTERACTION = {
    minimumEntrySpeed: 0.5,
    maximumEntrySpeed: 1600,
    exitClearance: 8,
    exitForwardOffset: 30,
    releaseMargin: 12,
    reentryCooldownSeconds: 0.28,
    maxCollisionRadius: 52,
    /** Allow entry after the physics solver places a moving object inside the vortex. */
    insideEntryMinimumNormalSpeed: 0.5,
    /** The destination can be searched forward along the outgoing normal. */
    exitSearchStep: 20,
    exitSearchSteps: 11,
} as const;

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
} as const;

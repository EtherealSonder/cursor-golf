/** Presentation-only occlusion tuning. Detection rules remain authoritative. */
export const ROBOT_VISION_OCCLUSION_DEFINITION = {
    baseAngularSamples: 64,
    maximumRays: 192,
    edgeAngleOffsetRadians: 0.0015,
    intersectionTolerance: 0.05,
    maximumUpdatesPerSecond: 20,
    movementThreshold: 2,
    rotationThresholdRadians: 0.008,
} as const;

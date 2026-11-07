/** RN-3B: route following and avoidance coordination. */
export const ROBOT_PATH_FOLLOWING_DEFINITION = {
    waypointProbePadding: 4,
    minimumProbeDistance: 8,
    routeProgressTimeoutSeconds: 3.2,
    routeProgressMinimumPixels: 6,
    repeatedRouteLimit: 2,
    repeatedRouteCooldownSeconds: 1.2,
    segmentSampleSpacing: 6,
} as const;

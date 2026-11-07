import { ROBOT_PATH_FOLLOWING_DEFINITION as D } from "../config/RobotPathFollowingDefinition";
/** Deterministic RN-3B configuration invariants; call from a test harness as required. */
export function validateRobotPathFollowing(): { passed: boolean; checks: Record<string, boolean> } {
    const checks = {
        positiveProbe: D.minimumProbeDistance > 0,
        boundedProbe: D.waypointProbePadding >= 0,
        progressWindow: D.routeProgressTimeoutSeconds > 0 && D.routeProgressMinimumPixels > 0,
        repeatedRouteBudget: D.repeatedRouteLimit >= 1 && D.repeatedRouteCooldownSeconds > 0,
        segmentSampling: D.segmentSampleSpacing > 0,
    };
    return { passed: Object.values(checks).every(Boolean), checks };
}

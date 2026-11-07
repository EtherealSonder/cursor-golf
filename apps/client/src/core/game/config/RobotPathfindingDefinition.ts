/** RN-2 path search and route-following tuning. */
export const ROBOT_PATHFINDING_DEFINITION = {
    maxExpandedCells: 14000,
    maximumCandidateAttempts: 12,
    waypointArrivalTolerance: 18,
    minimumRoamDistanceRatio: 0.5,
    smoothingSampleSpacing: 8,
    debugPathColor: 0x34d6ff,
    debugWaypointColor: 0xffdf65,
} as const;

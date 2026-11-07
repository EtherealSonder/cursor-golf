/** RN-4 dynamic navigation tuning. All values are in world pixels or seconds. */
export const ROBOT_DYNAMIC_NAVIGATION_DEFINITION = {
    refreshSeconds: 0.20,
    dynamicClearancePadding: 2,
    hardBlockerMinimumRadius: 18,
    waypointBlockLookahead: 95,
    obstructionGraceSeconds: 0.65,
    replanCooldownSeconds: 1.25,
    maximumSearchesPerFrame: 2,
    maximumExpandedNodesPerFrame: 22000,
    maximumCacheEntries: 48,
    cacheTimeToLiveSeconds: 3,
    debugDynamicColor: 0xffa84a,
} as const;

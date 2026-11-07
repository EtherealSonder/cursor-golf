/** RN-1 diagnostic-only navigation occupancy settings. */
export const ROBOT_NAVIGATION_GRID_DEFINITION = {
    cellSize: 24,
    robotClearanceRadius: 34,
    safetyPadding: 4,
    /** Static grid is built once after all level objects are registered. */
    rebuildStaticOnChange: false,
    debug: { traversable: 0x47d889, blocked: 0xf36b75, alpha: 0.16, lineAlpha: 0.10 },
} as const;

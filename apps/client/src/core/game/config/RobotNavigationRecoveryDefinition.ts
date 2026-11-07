/** RN-3 bounded, staged navigation recovery. */
export const ROBOT_NAVIGATION_RECOVERY_DEFINITION = {
    displacementThreshold: 36,
    routeDeviationThreshold: 72,
    replanCooldownSeconds: 0.8,
    maximumReplansBeforeAbandon: 3,
    localEscapeDistance: 52,
    localEscapeAttempts: 16,
    minimumMovementDistance: 5,
    relocationAfterFailures: 3,
} as const;

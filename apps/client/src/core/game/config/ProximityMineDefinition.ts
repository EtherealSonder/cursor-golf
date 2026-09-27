/** PM-1 presentation and proximity tuning; explosion gameplay remains PM-2. */
export const PROXIMITY_MINE_DEFINITION = {
    bodyRadius: 17,
    contactRadius: 19,
    detectionRadius: 180,
    armingRadius: 110,
    /** Time to detonate while a target stays at the arming edge / near contact. */
    outerArmingSeconds: 3.5,
    innerArmingSeconds: 1.0,
    /** Normalized arming progress removed each second outside the arming zone. */
    warningDecayPerSecond: 0.4,
    idleBeepIntervalSeconds: 2,
    detectionBeepIntervalSeconds: 0.9,
    minimumBeepIntervalSeconds: 0.2,
    sonarDurationSeconds: 1.2,
    sonarMaximumCount: 12,
    sonarIdleColor: 0xffffff,
    sonarAlertColor: 0xdd3e80,
    debugEnabled: true,
    color: 0xdd3e80,
} as const;

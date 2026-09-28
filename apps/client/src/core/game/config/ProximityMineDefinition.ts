/** PM-1 presentation and proximity tuning; explosion gameplay remains PM-2. */
export const PROXIMITY_MINE_DEFINITION = {
    bodyRadius: 17,
    /** Presentation only: gameplay collision stays at bodyRadius. */
    visual: {
        spriteWidth: 36,
        spriteHeight: 36,
        spriteAnchorX: 0.5,
        spriteAnchorY: 0.5,
        ledRadius: 4.0,
        ledIdleColor: 0xeaf1ff,
        ledAlertColor: 0xdd3e80,
    },
    nozzleContactRadius: 7,
    windPullAcceleration: 650,
    windMaximumSpeed: 180,
    windVelocityDamping: 6,
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
    debugEnabled: false,
    color: 0xdd3e80,
} as const;

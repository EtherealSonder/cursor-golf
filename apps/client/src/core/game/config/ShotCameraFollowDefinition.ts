/** Shot-scoped camera and club recovery tuning. */
export const SHOT_CAMERA_FOLLOW = {
    responseRate: 9,
    settleSpeed: 14,
    settleDuration: 0.32,
    lowSpeedGrace: 1.25,
    minimumFollowDuration: 0.18,
    eligibilityConfirmationDuration: 0.08,
    clubReturnDuration: 0.16,
    shrinkDuration: 0.10,
    growDuration: 0.14,
} as const;

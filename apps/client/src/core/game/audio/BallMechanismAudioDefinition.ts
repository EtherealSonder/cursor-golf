/** Audio-only thresholds. Physics and powered mechanisms remain unchanged. */
export const BALL_MECHANISM_AUDIO = {
    minimumImpactSpeed: 35,
    fullImpactSpeed: 650,
    impactCooldownMs: 95,
    bushCooldownMs: 140,
    rollContactGraceSeconds: 0.05,
    rollMinimumSpeed: 5,
} as const;

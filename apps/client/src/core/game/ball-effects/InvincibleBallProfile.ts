import type { BallGameplayProfile } from "./HighPowerBallProfile";
/** Normal movement and shot parameters. Elemental influences are handled at their sources. */
export const INVINCIBLE_BALL_PROFILE: BallGameplayProfile = Object.freeze({
    travelDistanceMultiplier: 1,
    aimLengthMultiplier: 1,
    fireDangerRateMultiplier: 0,
    waterDangerRateMultiplier: 0,
    highPowerVisual: false,
    heavyVisual: false,
    stickyVisual: false,
    invincibleVisual: true,
});

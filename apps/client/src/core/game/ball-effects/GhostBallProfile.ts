import type { BallGameplayProfile } from "./HighPowerBallProfile";
/** Ghost Ball uses normal movement, power, and hazard exposure. */
export const GHOST_BALL_PROFILE: BallGameplayProfile = Object.freeze({
    travelDistanceMultiplier: 1,
    aimLengthMultiplier: 1,
    fireDangerRateMultiplier: 1,
    waterDangerRateMultiplier: 1,
    highPowerVisual: false,
    heavyVisual: false,
    stickyVisual: false,
    invincibleVisual: false,
    ghostVisual: true,
});

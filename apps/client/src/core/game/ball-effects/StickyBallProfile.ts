import type { BallGameplayProfile } from "./HighPowerBallProfile";
/** Sticky modifies collision response only, not movement or hazard physics. */
export const STICKY_BALL_PROFILE: BallGameplayProfile = Object.freeze({
    travelDistanceMultiplier: 1,
    aimLengthMultiplier: 1,
    fireDangerRateMultiplier: 1,
    waterDangerRateMultiplier: 1,
    highPowerVisual: false,
    heavyVisual: false,
    stickyVisual: true,
});

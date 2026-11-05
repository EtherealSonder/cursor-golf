import { HEAVY_BALL } from "../config/HeavyBallDefinition";
/** P-2 values, consumed by the shared gameplay profile resolver. */
export const HEAVY_BALL_PROFILE = Object.freeze({
    travelDistanceMultiplier: 1,
    aimLengthMultiplier: HEAVY_BALL.aimLengthMultiplier,
    fireDangerRateMultiplier: HEAVY_BALL.fireDangerRateMultiplier,
    waterDangerRateMultiplier: HEAVY_BALL.waterDangerRateMultiplier,
    highPowerVisual: false,
    heavyVisual: true,
});

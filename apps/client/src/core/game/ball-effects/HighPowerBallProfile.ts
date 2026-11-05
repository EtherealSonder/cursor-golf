import { GHOST_BALL_PROFILE } from "./GhostBallProfile";
import { INVINCIBLE_BALL_PROFILE } from "./InvincibleBallProfile";
import { STICKY_BALL_PROFILE } from "./StickyBallProfile";
import { HEAVY_BALL_PROFILE } from "./HeavyBallProfile";
import { HIGH_POWER_BALL } from "../config/HighPowerBallDefinition";
import type { BallEffectSelection } from "./BallEffectDefinition";
export interface BallGameplayProfile {
    readonly travelDistanceMultiplier: number;
    readonly aimLengthMultiplier: number;
    readonly fireDangerRateMultiplier: number;
    readonly waterDangerRateMultiplier: number;
    readonly highPowerVisual: boolean;
    readonly heavyVisual: boolean;
    readonly stickyVisual?: boolean;
    readonly invincibleVisual?: boolean;
    readonly ghostVisual?: boolean;
}
const NORMAL: BallGameplayProfile = Object.freeze({ travelDistanceMultiplier: 1, aimLengthMultiplier: 1, fireDangerRateMultiplier: 1, waterDangerRateMultiplier: 1, highPowerVisual: false, heavyVisual: false, stickyVisual: false });
const HIGH: BallGameplayProfile = Object.freeze({
    travelDistanceMultiplier: HIGH_POWER_BALL.travelDistanceMultiplier,
    aimLengthMultiplier: HIGH_POWER_BALL.aimLengthMultiplier,
    fireDangerRateMultiplier: HIGH_POWER_BALL.fireDangerRateMultiplier,
    waterDangerRateMultiplier: HIGH_POWER_BALL.waterDangerRateMultiplier,
    highPowerVisual: true,
    heavyVisual: false,
    stickyVisual: false,
});
export function getBallGameplayProfile(effect: BallEffectSelection): BallGameplayProfile {
    return effect === "high-power" ? HIGH : effect === "heavy" ? HEAVY_BALL_PROFILE : effect === "sticky" ? STICKY_BALL_PROFILE : effect === "invincible" ? INVINCIBLE_BALL_PROFILE : effect === "ghost" ? GHOST_BALL_PROFILE : NORMAL;
}

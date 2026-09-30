/**
 * Temporary screen-space HUD tuning used during the death/retry phase.
 *
 * The reset control is intentionally lightweight and presentation-only.
 * It reuses Game.resetBall() and can be replaced by the final retry UI later.
 */
export interface ResetBallButtonDefinition {
    readonly left: number;
    readonly top: number;
    readonly diameter: number;
    readonly backgroundColor: number;
    readonly backgroundAlpha: number;
    readonly outlineColor: number;
    readonly outlineWidth: number;
    readonly iconColor: number;
    readonly iconWidth: number;
    readonly hoverScale: number;
    readonly pressedScale: number;
}

export const DEFAULT_RESET_BALL_BUTTON_DEFINITION:
    ResetBallButtonDefinition = {

    // Positioned directly below the existing top-left FPS diagnostics.
    left: 18,
    top: 46,

    diameter: 38,

    backgroundColor: 0xffffff,
    backgroundAlpha: 0.88,

    outlineColor: 0x17171c,
    outlineWidth: 3,

    iconColor: 0x17171c,
    iconWidth: 4,

    hoverScale: 1.05,
    pressedScale: 0.94,
};

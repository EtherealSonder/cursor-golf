/**
 * Presentation-only tuning for the Ball lives HUD.
 * Gameplay life counts are supplied by BallDeathController through Game.
 */
export interface BallLivesHudDefinition {
    readonly maximumSlots: number;
    readonly rightMargin: number;
    readonly topMargin: number;
    readonly holderWidth: number;
    readonly holderHeight: number;
    readonly holderPaddingX: number;
    readonly rowOffsetY: number;
    readonly ballDiameter: number;
    readonly socketDiameter: number;
    readonly socketSpacing: number;
    readonly socketColor: number;
    readonly socketAlpha: number;

    /** Unscaled presentation timing for a consumed life icon. */
    readonly lifeLossPopDurationSeconds: number;
    readonly lifeLossShrinkDurationSeconds: number;
    readonly lifeLossPopScale: number;
}

export const DEFAULT_BALL_LIVES_HUD_DEFINITION:
    BallLivesHudDefinition = {

    maximumSlots: 5,

    rightMargin: 24,
    topMargin: 18,

    holderWidth: 330,
    holderHeight: 72,
    holderPaddingX: 24,

    // Optical correction for the visible pink holder interior.
    // Negative Y moves the complete socket/ball row upward.
    rowOffsetY: -2,

    ballDiameter: 44,
    socketDiameter: 52,
    socketSpacing: 5,

    socketColor: 0x55545c,
    socketAlpha: 0.28,

    lifeLossPopDurationSeconds: 0.16,
    lifeLossShrinkDurationSeconds: 0.48,
    lifeLossPopScale: 1.16,
};

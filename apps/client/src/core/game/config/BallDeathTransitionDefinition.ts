export interface BallDeathTransitionDefinition {
    readonly cameraFocusDurationSeconds: number;
    readonly slowMotionDurationSeconds: number;
    readonly feedbackTimeScale: number;
    readonly lifeLossDurationSeconds: number;
    readonly closeDurationSeconds: number;
    readonly relocateDurationSeconds: number;
    readonly openDurationSeconds: number;
    readonly overlayColor: number;
    readonly minimumApertureRadius: number;
    readonly radiusOverscan: number;
    readonly apertureSegments: number;
}

export const DEFAULT_BALL_DEATH_TRANSITION_DEFINITION:
    BallDeathTransitionDefinition = {
        // Real-time death feedback beat. Gameplay alone runs at this scale.
        cameraFocusDurationSeconds: 1.0,
        slowMotionDurationSeconds: 1.0,
        feedbackTimeScale: 0.15,
        lifeLossDurationSeconds: 0.68,

        // Retain the deliberately readable iris timings.
        closeDurationSeconds: 1.5,
        relocateDurationSeconds: 1.0,
        openDurationSeconds: 1.5,
        overlayColor: 0x242128,
        // Current Ball physics/render radius is 10 px. No padding is added:
        // the tightest iris meets the visible Ball edge.
        minimumApertureRadius: 10,
        radiusOverscan: 48,
        apertureSegments: 72,
    };

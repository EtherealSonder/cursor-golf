import type {
    Ball,
} from "../entities/Ball";
import {
    DEFAULT_BALL_DROWNING_DEFINITION,
} from "../config/BallDrowningDefinition";

/**
 * Converts authoritative drowning progress into a Ball-local presentation clip.
 * Gameplay geometry and club interaction are never modified.
 */
export class BallDrowningOverlay {
    constructor(
        private readonly ball: Ball,
    ) {
        this.setState(0, false);
    }

    public setState(
        normalizedProgress: number,
        isInWater: boolean,
    ): void {
        const progress =
            Math.max(
                0,
                Math.min(
                    1,
                    normalizedProgress,
                ),
            );

        /*
         * Sinking is physical Water presentation, not retained danger.
         * The instant the Ball is no longer in standing Water it must be fully
         * visible even if the HUD meter is still recovering toward zero.
         */
        if (!isInWater) {
            this.ball
                .setDrowningVisibleFraction(1);
            return;
        }

        const start =
            DEFAULT_BALL_DROWNING_DEFINITION
                .sinkingStartProgress;

        const minimumVisible =
            DEFAULT_BALL_DROWNING_DEFINITION
                .minimumVisibleBallFraction;

        const sinkT =
            progress <= start
                ? 0
                : Math.min(
                    1,
                    (progress - start) /
                    Math.max(
                        0.0001,
                        1 - start,
                    ),
                );

        const visibleFraction =
            1 -
            sinkT *
            (1 - minimumVisible);

        this.ball
            .setDrowningVisibleFraction(
                visibleFraction,
            );
    }

    public reset(): void {
        this.setState(0, false);
    }

    public destroy(): void {
        this.ball
            .clearDrowningVisualMask();
    }
}

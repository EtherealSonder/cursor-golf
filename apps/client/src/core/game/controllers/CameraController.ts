import {
    InputManager,
} from "../../input/InputManager";

import type {
    Camera,
} from "../camera/Camera";

/**
 * Converts cursor position inside the logical game
 * viewport into Camera movement intent.
 *
 * Processing pipeline:
 *
 * Cursor position
 * → activation-boundary penetration
 * → normalized penetration
 * → progressive response curve
 * → movement direction
 * → diagonal normalization
 * → Camera target velocity
 */
export class CameraController {

    private enabled =
        true;

    constructor(
        private readonly inputManager:
            InputManager,

        private readonly camera:
            Camera,
    ) {
    }

    // -------------------------------------------------------
    // Enabled State
    // -------------------------------------------------------

    public setEnabled(
        enabled:
            boolean,
    ): void {

        this.enabled =
            enabled;

        if (!enabled) {
            this.camera
                .clearMovementIntent();
        }
    }

    public isEnabled():
        boolean {

        return this.enabled;
    }

    // -------------------------------------------------------
    // Frame Update
    // -------------------------------------------------------

    public update(): void {

        if (
            !this.enabled ||
            !this.inputManager
                .isPointerInsideTarget()
        ) {
            this.camera
                .clearMovementIntent();

            return;
        }

        const viewportWidth =
            this.camera
                .getViewportWidth();

        const viewportHeight =
            this.camera
                .getViewportHeight();

        const horizontalInset =
            this.camera
                .getHorizontalActivationInset();

        const verticalInset =
            this.camera
                .getVerticalActivationInset();

        const pointerX =
            this.inputManager
                .getMouseX();

        const pointerY =
            this.inputManager
                .getMouseY();

        const leftBoundary =
            horizontalInset;

        const rightBoundary =
            viewportWidth -
            horizontalInset;

        const topBoundary =
            verticalInset;

        const bottomBoundary =
            viewportHeight -
            verticalInset;

        // ---------------------------------------------------
        // Horizontal Penetration
        // ---------------------------------------------------

        const leftStrength =
            this.calculateProgressiveStrength(
                leftBoundary -
                pointerX,

                leftBoundary,
            );

        const rightStrength =
            this.calculateProgressiveStrength(
                pointerX -
                rightBoundary,

                viewportWidth -
                rightBoundary,
            );

        // ---------------------------------------------------
        // Vertical Penetration
        // ---------------------------------------------------

        const topStrength =
            this.calculateProgressiveStrength(
                topBoundary -
                pointerY,

                topBoundary,
            );

        const bottomStrength =
            this.calculateProgressiveStrength(
                pointerY -
                bottomBoundary,

                viewportHeight -
                bottomBoundary,
            );

        /*
         * Opposing strengths are subtracted so each
         * axis produces one signed movement value.
         *
         * Negative X = move Camera left
         * Positive X = move Camera right
         *
         * Negative Y = move Camera up
         * Positive Y = move Camera down
         */
        const horizontalIntent =
            rightStrength -
            leftStrength;

        const verticalIntent =
            bottomStrength -
            topStrength;

        const directionMagnitude =
            Math.hypot(
                horizontalIntent,
                verticalIntent,
            );

        if (
            directionMagnitude <=
            0
        ) {
            this.camera
                .clearMovementIntent();

            return;
        }

        /*
         * Preserve the strongest axis penetration as
         * the total movement strength.
         *
         * Direction is normalized separately below.
         *
         * This prevents diagonal movement from
         * becoming faster than horizontal or vertical
         * movement.
         */
        const movementStrength =
            Math.max(
                Math.abs(
                    horizontalIntent,
                ),

                Math.abs(
                    verticalIntent,
                ),
            );

        this.camera
            .setMovementIntent(
                horizontalIntent /
                directionMagnitude,

                verticalIntent /
                directionMagnitude,

                movementStrength,
            );
    }

    // -------------------------------------------------------
    // Progressive Input Response
    // -------------------------------------------------------

    /**
     * Converts penetration beyond one side of the
     * activation rectangle into a progressive
     * movement strength.
     *
     * penetration:
     *
     * Distance the pointer has travelled beyond the
     * activation boundary.
     *
     * zoneSize:
     *
     * Distance from the activation boundary to the
     * corresponding viewport edge.
     */
    private calculateProgressiveStrength(
        penetration:
            number,

        zoneSize:
            number,
    ): number {

        if (
            !Number.isFinite(
                penetration,
            ) ||
            !Number.isFinite(
                zoneSize,
            ) ||
            penetration <=
            0 ||
            zoneSize <=
            0
        ) {
            return 0;
        }

        const normalizedPenetration =
            this.clamp(
                penetration /
                zoneSize,

                0,
                1,
            );

        /*
         * Smoothstep:
         *
         * f(t) = t² × (3 - 2t)
         *
         * Properties:
         *
         * - begins at exactly zero
         * - ends at exactly one
         * - changes gradually near both ends
         * - accelerates noticeably through the middle
         */
        const smoothStrength =
            normalizedPenetration *
            normalizedPenetration *
            (
                3 -
                2 *
                normalizedPenetration
            );

        const responseExponent =
            this.camera
                .getDefinition()
                .inputResponseExponent;

        return this.clamp(
            Math.pow(
                smoothStrength,
                responseExponent,
            ),

            0,
            1,
        );
    }

    // -------------------------------------------------------
    // Utilities
    // -------------------------------------------------------

    private clamp(
        value:
            number,

        minimum:
            number,

        maximum:
            number,
    ): number {

        return Math.max(
            minimum,
            Math.min(
                value,
                maximum,
            ),
        );
    }
}
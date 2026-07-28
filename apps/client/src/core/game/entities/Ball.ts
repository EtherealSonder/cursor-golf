import {
    Container,
    Graphics,
} from "pixi.js";

import { Entity } from "./Entity";

export enum BallInteractionState {
    Normal,
    Hovered,
    Dragging,
}

export class Ball extends Entity {

    // -------------------------------------------------------
    // Visual Structure
    // -------------------------------------------------------

    /**
     * Child container used exclusively for
     * temporary visual animation.
     *
     * The parent entity container continues
     * to represent the ball's true gameplay
     * position.
     */
    private visualContainer:
        Container | null = null;

    private ballGraphics:
        Graphics | null = null;

    // -------------------------------------------------------
    // Ball Configuration
    // -------------------------------------------------------

    private readonly radius = 10;

    /**
     * The ball remains white in every
     * interaction state.
     *
     * Hover and drag feedback are communicated
     * through scale and vibration instead.
     */
    private readonly ballColor =
        0xffffff;

    // -------------------------------------------------------
    // Interaction State
    // -------------------------------------------------------

    private interactionState =
        BallInteractionState.Normal;

    // -------------------------------------------------------
    // Scale Feedback
    // -------------------------------------------------------

    /**
     * Normal rendered scale of the ball.
     */
    private readonly normalScale = 1;

    /**
     * Scale used while the ball is hovered
     * or actively being dragged.
     */
    private readonly interactionScale = 1.12;

    /**
     * Controls how quickly the rendered scale
     * approaches its target value.
     *
     * Larger values produce faster transitions.
     */
    private readonly scaleResponseSpeed = 12;

    private currentVisualScale =
        this.normalScale;

    private targetVisualScale =
        this.normalScale;

    // -------------------------------------------------------
    // Drag-Tension Vibration
    // -------------------------------------------------------

    /**
     * Current normalized shot power received
     * from ShotController.
     *
     * Expected range:
     * 0 to 1.
     */
    private tensionPower = 0;

    /**
     * Continuously accumulated visual
     * vibration time.
     */
    private vibrationTime = 0;

    /**
     * Lowest vibration frequency.
     *
     * At zero power the amplitude is also zero,
     * so this frequency is not visibly applied.
     */
    private readonly minimumVibrationFrequency = 3;

    /**
     * Highest vibration frequency reached
     * at full shot power.
     */
    private readonly maximumVibrationFrequency = 18;

    /**
     * Maximum visual displacement in pixels.
     */
    private readonly maximumVibrationAmplitude = 1.5;

    /**
     * Secondary frequency ratio prevents the
     * vibration from looking like a perfect
     * circular orbit.
     */
    private readonly secondaryFrequencyRatio = 1.37;

    // -------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------

    protected onInitialize(): void {

        this.visualContainer =
            new Container();

        this.ballGraphics =
            new Graphics();

        /*
         * The entity container stores the
         * actual gameplay position.
         */
        this.container.position.set(
            500,
            300,
        );

        /*
         * All temporary visual animation is
         * isolated inside visualContainer.
         */
        this.visualContainer.addChild(
            this.ballGraphics,
        );

        this.container.addChild(
            this.visualContainer,
        );

        this.applyVisualScale();
        this.resetVisualOffset();
        this.drawBall();
    }

    protected onUpdate(
        deltaTime: number,
    ): void {

        /*
         * A development-mode restart can briefly
         * produce an invalid negative frame delta.
         *
         * Visual animation should pause for that
         * frame instead of terminating the game.
         */
        const safeDeltaTime =
            Math.max(
                0,
                deltaTime,
            );

        this.updateTargetScale();

        this.updateVisualScale(
            safeDeltaTime,
        );

        this.updateVibration(
            safeDeltaTime,
        );
    }

    protected onDestroy(): void {

        this.ballGraphics?.destroy();

        this.ballGraphics = null;
        this.visualContainer = null;

        this.container.destroy({
            children: true,
        });
    }

    // -------------------------------------------------------
    // Ball Data
    // -------------------------------------------------------

    public getRadius(): number {
        return this.radius;
    }

    // -------------------------------------------------------
    // Interaction State
    // -------------------------------------------------------

    public getInteractionState():
        BallInteractionState {

        return this.interactionState;
    }

    public setInteractionState(
        state: BallInteractionState,
    ): void {

        if (
            this.interactionState ===
            state
        ) {
            return;
        }

        this.interactionState =
            state;

        /*
         * Interaction state still controls scale
         * and vibration, but no longer changes
         * the ball colour.
         */
        if (
            state !==
            BallInteractionState.Dragging
        ) {
            this.setTensionPower(
                0,
            );

            this.resetVibration();
        }
    }

    // -------------------------------------------------------
    // Scale Feedback
    // -------------------------------------------------------

    private updateTargetScale(): void {

        switch (
        this.interactionState
        ) {
            case BallInteractionState.Normal:
                this.targetVisualScale =
                    this.normalScale;
                break;

            case BallInteractionState.Hovered:
            case BallInteractionState.Dragging:
                this.targetVisualScale =
                    this.interactionScale;
                break;
        }
    }

    private updateVisualScale(
        deltaTime: number,
    ): void {

        const interpolationFactor =
            1 -
            Math.exp(
                -this.scaleResponseSpeed *
                deltaTime,
            );

        this.currentVisualScale +=
            (
                this.targetVisualScale -
                this.currentVisualScale
            ) *
            interpolationFactor;

        if (
            Math.abs(
                this.targetVisualScale -
                this.currentVisualScale,
            ) <
            0.0001
        ) {
            this.currentVisualScale =
                this.targetVisualScale;
        }

        this.applyVisualScale();
    }

    private applyVisualScale(): void {

        this.visualContainer?.scale.set(
            this.currentVisualScale,
        );
    }

    // -------------------------------------------------------
    // Drag-Tension Feedback
    // -------------------------------------------------------

    public setTensionPower(
        normalizedPower: number,
    ): void {

        this.tensionPower =
            Math.max(
                0,
                Math.min(
                    normalizedPower,
                    1,
                ),
            );
    }

    public getTensionPower(): number {
        return this.tensionPower;
    }

    private updateVibration(
        deltaTime: number,
    ): void {

        if (
            this.interactionState !==
            BallInteractionState.Dragging
        ) {
            this.resetVisualOffset();
            return;
        }

        if (
            this.tensionPower <= 0
        ) {
            this.resetVisualOffset();
            return;
        }

        const frequencyRange =
            this.maximumVibrationFrequency -
            this.minimumVibrationFrequency;

        const currentFrequency =
            this.minimumVibrationFrequency +
            this.tensionPower *
            frequencyRange;

        this.vibrationTime +=
            deltaTime *
            currentFrequency;

        const amplitude =
            this.maximumVibrationAmplitude *
            this.tensionPower;

        const offsetX =
            Math.sin(
                this.vibrationTime,
            ) *
            amplitude;

        const offsetY =
            Math.cos(
                this.vibrationTime *
                this.secondaryFrequencyRatio,
            ) *
            amplitude;

        this.visualContainer?.position.set(
            offsetX,
            offsetY,
        );
    }

    private resetVibration(): void {

        this.vibrationTime = 0;
        this.resetVisualOffset();
    }

    private resetVisualOffset(): void {

        this.visualContainer?.position.set(
            0,
            0,
        );
    }

    // -------------------------------------------------------
    // Temporary Compatibility
    // -------------------------------------------------------

    public setAimVector(
        dx: number,
        dy: number,
    ): void {

        void dx;
        void dy;
    }

    public clearAimVector(): void {
        // Intentionally empty.
    }

    // -------------------------------------------------------
    // Rendering
    // -------------------------------------------------------

    private drawBall(): void {

        if (!this.ballGraphics) {
            return;
        }

        this.ballGraphics.clear();

        this.ballGraphics.circle(
            0,
            0,
            this.radius,
        );

        this.ballGraphics.fill(
            this.ballColor,
        );
    }
}
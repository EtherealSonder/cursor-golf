import { InputManager } from "../../input/InputManager";

import {
    Ball,
    BallInteractionState,
} from "../entities/Ball";

import { ShotController } from "../shot/ShotController";
import { World } from "../world/World";

export class PlayerController {

    private readonly inputManager:
        InputManager;

    private readonly world:
        World;

    private readonly shotController:
        ShotController;

    private readonly hoverRadius = 4;

    private dragging = false;

    constructor(
        inputManager: InputManager,
        world: World,
        shotController: ShotController,
    ) {
        this.inputManager =
            inputManager;

        this.world =
            world;

        this.shotController =
            shotController;
    }

    public update(
        deltaTime: number,
    ): void {

        void deltaTime;

        const ball =
            this.world.getBall();

        const club =
            this.world.getClub();

        if (
            !ball ||
            !club
        ) {
            return;
        }

        // ---------------------------------------------------
        // Right-Click Cancellation
        // ---------------------------------------------------

        /*
         * Cancellation is processed before
         * normal left-button release handling.
         *
         * This guarantees that a right-click
         * cannot finish or launch the shot.
         */
        if (
            this.dragging &&
            this.inputManager
                .wasRightMousePressed()
        ) {
            this.dragging = false;

            this.shotController
                .cancelShot();

            ball.clearAimVector();

            ball.setInteractionState(
                BallInteractionState.Normal,
            );

            return;
        }

        // ---------------------------------------------------
        // Cursor Mode
        // ---------------------------------------------------

        if (!this.dragging) {

            club.setCursorPosition(
                this.inputManager
                    .getMouseX(),
                this.inputManager
                    .getMouseY(),
            );
        }

        // ---------------------------------------------------
        // Moving-Ball Interaction Lock
        // ---------------------------------------------------

        if (ball.isMoving()) {

            if (this.dragging) {
                this.dragging = false;

                this.shotController
                    .cancelShot();
            }

            ball.clearAimVector();

            ball.setInteractionState(
                BallInteractionState.Normal,
            );

            return;
        }

        const hovered =
            this.isBallHovered(
                ball,
            );

        // ---------------------------------------------------
        // Begin Shot
        // ---------------------------------------------------

        if (
            !this.dragging &&
            hovered &&
            this.inputManager
                .wasLeftMousePressed()
        ) {
            this.shotController
                .beginShot();

            /*
             * Set local dragging state only when
             * ShotController successfully entered
             * its preparation state.
             */
            this.dragging =
                this.shotController
                    .isPreparingShot();
        }

        // ---------------------------------------------------
        // Finish Shot
        // ---------------------------------------------------

        if (
            this.dragging &&
            this.inputManager
                .wasLeftMouseReleased()
        ) {
            this.dragging = false;

            this.shotController
                .finishShot();
        }

        // ---------------------------------------------------
        // Ball Visual State
        // ---------------------------------------------------

        if (this.dragging) {

            const dx =
                this.inputManager
                    .getMouseX() -
                ball.getX();

            const dy =
                this.inputManager
                    .getMouseY() -
                ball.getY();

            ball.setInteractionState(
                BallInteractionState.Dragging,
            );

            ball.setAimVector(
                dx,
                dy,
            );
        } else {

            ball.clearAimVector();

            if (hovered) {
                ball.setInteractionState(
                    BallInteractionState.Hovered,
                );
            } else {
                ball.setInteractionState(
                    BallInteractionState.Normal,
                );
            }
        }
    }

    /**
     * Clears local drag ownership and returns the shot
     * controller and Ball interaction state to idle.
     */
    public reset(): void {

        this.dragging =
            false;

        this.shotController
            .reset();

        const ball =
            this.world.getBall();

        ball?.clearAimVector();

        ball?.setInteractionState(
            BallInteractionState.Normal,
        );
    }

    private isBallHovered(
        ball: Ball,
    ): boolean {

        if (ball.isMoving()) {
            return false;
        }

        const mouseX =
            this.inputManager
                .getMouseX();

        const mouseY =
            this.inputManager
                .getMouseY();

        const dx =
            mouseX -
            ball.getX();

        const dy =
            mouseY -
            ball.getY();

        const distance =
            Math.hypot(
                dx,
                dy,
            );

        return (
            distance <=
            ball.getRadius() +
            this.hoverRadius
        );
    }
}
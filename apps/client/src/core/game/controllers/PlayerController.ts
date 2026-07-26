import { InputManager } from "../../input/InputManager";
import { Ball, BallInteractionState } from "../entities/Ball";
import { ShotController } from "../shot/ShotController";
import { World } from "../world/World";

export class PlayerController {
    private readonly inputManager: InputManager;
    private readonly world: World;
    private readonly shotController: ShotController;

    private readonly hoverRadius = 4;

    private dragging = false;

    constructor(
        inputManager: InputManager,
        world: World,
        shotController: ShotController,
    ) {
        this.inputManager = inputManager;
        this.world = world;
        this.shotController = shotController;
    }

    public update(deltaTime: number): void {
        void deltaTime;

        const ball = this.world.getBall();
        const club = this.world.getClub();

        if (!ball || !club) {
            return;
        }

        //
        // Cursor Mode
        //
        // When the player is not preparing a shot,
        // the golf club behaves like the mouse cursor.
        //

        if (!this.dragging) {
            
            club.setCursorPosition(
                this.inputManager.getMouseX(),
                this.inputManager.getMouseY(),
            );
        }

        const hovered = this.isBallHovered(ball);

        //
        // Begin Shot
        //

        if (
            !this.dragging &&
            hovered &&
            this.inputManager.wasMousePressed()
        ) {
            this.dragging = true;
            this.shotController.beginShot();
        }

        //
        // Finish Shot
        //

        if (
            this.dragging &&
            this.inputManager.wasMouseReleased()
        ) {
            this.dragging = false;
            this.shotController.finishShot();
        }

        //
        // Ball Visual State
        //

        if (this.dragging) {
            const dx =
                this.inputManager.getMouseX() -
                ball.getX();

            const dy =
                this.inputManager.getMouseY() -
                ball.getY();

            ball.setInteractionState(
                BallInteractionState.Dragging,
            );

            ball.setAimVector(dx, dy);
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

    private isBallHovered(ball: Ball): boolean {
        const mouseX = this.inputManager.getMouseX();
        const mouseY = this.inputManager.getMouseY();

        const dx = mouseX - ball.getX();
        const dy = mouseY - ball.getY();

        const distance = Math.sqrt(
            dx * dx +
            dy * dy,
        );

        return (
            distance <=
            ball.getRadius() + this.hoverRadius
        );
    }
}
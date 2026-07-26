import { InputManager } from "../../input/InputManager";
import { World } from "../world/World";
import { ShotPreparation } from "./ShotPreparation";

export enum ShotState {
    Idle,
    Preparing,
}

export class ShotController {

    private readonly world: World;

    private readonly inputManager:
        InputManager;

    private readonly shotPreparation:
        ShotPreparation;

    private state: ShotState =
        ShotState.Idle;

    constructor(
        world: World,
        inputManager: InputManager,
    ) {

        this.world =
            world;

        this.inputManager =
            inputManager;

        /*
         * ShotPreparation receives its
         * gameplay configuration from
         * the currently equipped club.
         */

        const club =
            this.world.getClub();

        if (!club) {
            throw new Error(
                "ShotController could not initialize because the Club does not exist.",
            );
        }

        this.shotPreparation =
            new ShotPreparation(
                club,
            );
    }

    // -------------------------------------------------------
    // Update
    // -------------------------------------------------------

    public update(
        deltaTime: number,
    ): void {

        if (
            this.state !==
            ShotState.Preparing
        ) {
            return;
        }

        const ball =
            this.world.getBall();

        const club =
            this.world.getClub();

        const aimIndicator =
            this.world.getAimIndicator();

        if (
            !ball ||
            !club ||
            !aimIndicator
        ) {
            return;
        }

        // -----------------------------
        // Time-Based Values
        // -----------------------------

        this.shotPreparation.update(
            deltaTime,
        );

        // -----------------------------
        // Current Drag Vector
        // -----------------------------

        const mouseX =
            this.inputManager
                .getMouseX();

        const mouseY =
            this.inputManager
                .getMouseY();

        const deltaX =
            mouseX -
            ball.getX();

        const deltaY =
            mouseY -
            ball.getY();

        this.shotPreparation.updateDrag(
            deltaX,
            deltaY,
        );

        // -----------------------------
        // Prepared Shot Data
        // -----------------------------

        const dragDistance =
            this.shotPreparation
                .getDragDistance();

        const normalizedPower =
            this.shotPreparation
                .getNormalizedPower();

        const baseAimAngle =
            this.shotPreparation
                .getBaseAimAngle();

        const currentAimAngle =
            this.shotPreparation
                .getCurrentAimAngle();

        // -----------------------------
        // Club Position
        // -----------------------------

        /*
         * The club uses the base aim angle,
         * so it remains fixed while the aim
         * indicator oscillates independently.
         */

        club.setPose(
            ball.getX(),
            ball.getY(),
            baseAimAngle,
            dragDistance,
        );

        // -----------------------------
        // Power Visualization
        // -----------------------------

        club.setPower(
            normalizedPower,
        );

        // -----------------------------
        // Oscillating Aim Indicator
        // -----------------------------

        aimIndicator.show();

        aimIndicator.setDirection(
            ball.getX(),
            ball.getY(),
            currentAimAngle,
            club.getAimIndicatorLength(),
        );

        // -----------------------------
        // Temporary Preparation Debug
        // -----------------------------

        console.clear();

        console.log(
            "========== SHOT DEBUG ==========",
        );

        console.log(
            "Power:",
            normalizedPower.toFixed(2),
        );

        console.log(
            "Drag Distance:",
            dragDistance.toFixed(2),
            "px",
        );

        console.log(
            "Maximum Drag Distance:",
            club
                .getMaximumDragDistance()
                .toFixed(2),
            "px",
        );

        console.log(
            "Base Aim Angle:",
            this.radiansToDegrees(
                baseAimAngle,
            ).toFixed(2),
            "degrees",
        );

        console.log(
            "Current Aim Angle:",
            this.radiansToDegrees(
                currentAimAngle,
            ).toFixed(2),
            "degrees",
        );

        console.log(
            "Current Oscillation Offset:",
            this.radiansToDegrees(
                this.shotPreparation
                    .getOscillationOffset(),
            ).toFixed(2),
            "degrees",
        );

        console.log(
            "Maximum Oscillation Angle:",
            this.radiansToDegrees(
                club.getOscillationAngle(),
            ).toFixed(2),
            "degrees",
        );

        console.log(
            "Current Oscillation Speed:",
            this.shotPreparation
                .getOscillationSpeed()
                .toFixed(2),
        );

        console.log(
            "Aim Indicator Length:",
            club
                .getAimIndicatorLength()
                .toFixed(2),
            "px",
        );

        console.log(
            "Connector Color:",
            club.getConnectorColorName(),
        );

        console.log(
            "================================",
        );
    }

    // -------------------------------------------------------
    // Shot Lifecycle
    // -------------------------------------------------------

    public beginShot(): void {

        if (
            this.state !==
            ShotState.Idle
        ) {
            return;
        }

        this.state =
            ShotState.Preparing;

        this.shotPreparation.reset();

        this.world
            .getClub()
            ?.resetShotVisuals();

        this.world
            .getAimIndicator()
            ?.show();

        console.log(
            "Shot Started",
        );
    }

    public cancelShot(): void {

        if (
            this.state !==
            ShotState.Preparing
        ) {
            return;
        }

        this.state =
            ShotState.Idle;

        this.shotPreparation.reset();

        this.world
            .getClub()
            ?.resetShotVisuals();

        this.world
            .getAimIndicator()
            ?.hide();

        console.log(
            "Shot Cancelled",
        );
    }

    public finishShot(): void {

        if (
            this.state !==
            ShotState.Preparing
        ) {
            return;
        }

        const club =
            this.world.getClub();

        if (!club) {

            this.state =
                ShotState.Idle;

            this.shotPreparation.reset();

            this.world
                .getAimIndicator()
                ?.hide();

            console.error(
                "Shot could not be released because the Club does not exist.",
            );

            return;
        }

        /*
         * Capture all release data before
         * resetting ShotPreparation.
         *
         * These values will later be passed
         * into the ball physics system.
         */

        const releasedPower =
            this.shotPreparation
                .getNormalizedPower();

        const releasedDirection =
            this.shotPreparation
                .getCurrentAimAngle();

        const releasedOscillationOffset =
            this.shotPreparation
                .getOscillationOffset();

        const releasedOscillationSpeed =
            this.shotPreparation
                .getOscillationSpeed();

        this.logReleasedShot(
            releasedPower,
            releasedDirection,
            club.getClubName(),
            releasedOscillationOffset,
            releasedOscillationSpeed,
        );

        /*
         * No ball movement is performed yet.
         * Milestone 5 only verifies that the
         * correct release data is captured.
         */

        this.state =
            ShotState.Idle;

        this.shotPreparation.reset();

        club.resetShotVisuals();

        this.world
            .getAimIndicator()
            ?.hide();
    }

    // -------------------------------------------------------
    // Release Data
    // -------------------------------------------------------

    private logReleasedShot(
        power: number,
        directionRadians: number,
        clubName: string,
        oscillationOffsetRadians: number,
        oscillationSpeed: number,
    ): void {

        console.clear();

        console.log(
            "==============================",
        );

        console.log(
            "SHOT RELEASED",
        );

        console.log(
            "Power:",
            power.toFixed(2),
        );

        console.log(
            "Direction:",
            this.radiansToDegrees(
                directionRadians,
            ).toFixed(2),
            "degrees",
        );

        console.log(
            "Club Used:",
            clubName,
        );

        console.log(
            "Oscillation Angle:",
            this.radiansToDegrees(
                oscillationOffsetRadians,
            ).toFixed(2),
            "degrees",
        );

        console.log(
            "Oscillation Speed:",
            oscillationSpeed.toFixed(2),
        );

        console.log(
            "==============================",
        );
    }

    // -------------------------------------------------------
    // State
    // -------------------------------------------------------

    public getState(): ShotState {
        return this.state;
    }

    public isPreparingShot(): boolean {

        return (
            this.state ===
            ShotState.Preparing
        );
    }

    // -------------------------------------------------------
    // Utilities
    // -------------------------------------------------------

    private radiansToDegrees(
        radians: number,
    ): number {

        return (
            radians *
            180 /
            Math.PI
        );
    }
}
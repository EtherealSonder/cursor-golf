import { InputManager } from "../../input/InputManager";
import { World } from "../world/World";
import { ShotPreparation } from "./ShotPreparation";

export enum ShotState {
    Idle,
    Preparing,
}

export class ShotController {

    private readonly world:
        World;

    private readonly inputManager:
        InputManager;

    private readonly shotPreparation:
        ShotPreparation;

    private state =
        ShotState.Idle;

    /**
     * Amount of time spent in the current
     * preparation state.
     *
     * Measured in seconds.
     */
    private preparationElapsedTime = 0;

    constructor(
        world: World,
        inputManager: InputManager,
    ) {
        this.world =
            world;

        this.inputManager =
            inputManager;

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

        const connector =
            this.world.getConnector();

        const aimIndicator =
            this.world.getAimIndicator();

        if (
            !ball ||
            !club ||
            !connector ||
            !aimIndicator
        ) {
            return;
        }

        if (ball.isMoving()) {
            this.cancelShot();
            return;
        }

        const safeDeltaTime =
            Math.max(
                0,
                deltaTime,
            );

        this.preparationElapsedTime +=
            safeDeltaTime;

        // -----------------------------
        // Current Drag Vector
        // -----------------------------

        /*
         * InputManager stores viewport coordinates.
         *
         * Shot preparation must use world coordinates
         * because Ball position remains authoritative
         * in world space after camera rendering is
         * introduced.
         */
        const mouseWorldPosition =
            this.world
                .getCamera()
                .viewportToWorld(
                    this.inputManager
                        .getMouseX(),

                    this.inputManager
                        .getMouseY(),
                );

        const deltaX =
            mouseWorldPosition.x -
            ball.getX();

        const deltaY =
            mouseWorldPosition.y -
            ball.getY();

        this.shotPreparation.updateDrag(
            deltaX,
            deltaY,
        );

        // -----------------------------
        // Time-Based Shot Values
        // -----------------------------

        this.shotPreparation.update(
            safeDeltaTime,
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

        const oscillationOffset =
            this.shotPreparation
                .getOscillationOffset();

        const accuracyQuality =
            this.shotPreparation
                .getAccuracyQuality();

        const optimalAccuracyTolerance =
            this.shotPreparation
                .getOptimalAccuracyTolerance();

        const insideOptimalAccuracyRange =
            this.shotPreparation
                .isInsideOptimalAccuracyRange();

        const hasMinimumPower =
            ball.canLaunchWithPower(
                normalizedPower,
            );

        const hasMinimumPreparationTime =
            ball.hasMetMinimumPreparationTime(
                this.preparationElapsedTime,
            );

        const shotCanLaunch =
            ball.canLaunchShot(
                normalizedPower,
                this.preparationElapsedTime,
            );

        // -----------------------------
        // Ball Tension Feedback
        // -----------------------------

        ball.setTensionPower(
            normalizedPower,
        );

        // -----------------------------
        // Club Position
        // -----------------------------

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
            normalizedPower,
        );

        // -----------------------------
        // Temporary Debug Information
        // -----------------------------

        console.clear();

        console.log(
            "========== SHOT DEBUG ==========",
        );

        console.log(
            "Power:",
            normalizedPower.toFixed(3),
        );

        console.log(
            "Required Power:",
            ball
                .getMinimumLaunchPower()
                .toFixed(3),
        );

        console.log(
            "Power Requirement Met:",
            hasMinimumPower,
        );

        console.log(
            "Preparation Time:",
            this.preparationElapsedTime
                .toFixed(3),
            "seconds",
        );

        console.log(
            "Required Preparation Time:",
            ball
                .getMinimumShotPreparationTime()
                .toFixed(3),
            "seconds",
        );

        console.log(
            "Time Requirement Met:",
            hasMinimumPreparationTime,
        );

        console.log(
            "Shot Can Launch:",
            shotCanLaunch,
        );

        console.log(
            "Predicted Launch Speed:",
            ball
                .getLaunchSpeedForPower(
                    normalizedPower,
                )
                .toFixed(2),
            "px/s",
        );

        console.log(
            "Power Curve Exponent:",
            ball
                .getShotPowerExponent()
                .toFixed(2),
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
                oscillationOffset,
            ).toFixed(2),
            "degrees",
        );

        console.log(
            "Optimal Accuracy Tolerance:",
            "±" +
            this.radiansToDegrees(
                optimalAccuracyTolerance,
            ).toFixed(2),
            "degrees",
        );

        console.log(
            "Inside Optimal Range:",
            insideOptimalAccuracyRange,
        );

        console.log(
            "Accuracy Quality:",
            accuracyQuality.toFixed(3),
        );

        console.log(
            "Current Oscillation Speed:",
            this.shotPreparation
                .getOscillationSpeed()
                .toFixed(2),
        );

        console.log(
            "Oscillation Phase:",
            this.shotPreparation
                .getOscillationPhase()
                .toFixed(2),
            "radians",
        );

        console.log(
            "Raw Oscillation Wave:",
            this.shotPreparation
                .getRawOscillationWave()
                .toFixed(3),
        );

        console.log(
            "Shaped Oscillation Wave:",
            this.shotPreparation
                .getShapedOscillationWave()
                .toFixed(3),
        );

        console.log(
            "Aim Guide Dots:",
            aimIndicator
                .getDotCount(),
        );

        console.log(
            "Aim Guide End Distance:",
            aimIndicator
                .getGuideEndDistance()
                .toFixed(2),
            "px",
        );

        console.log(
            "Aim Guide Alpha:",
            aimIndicator
                .getCurrentDotAlpha()
                .toFixed(3),
        );

        console.log(
            "Ball Tension Power:",
            ball
                .getTensionPower()
                .toFixed(2),
        );

        console.log(
            "Connector Color:",
            connector.getColorName(
                normalizedPower,
            ),
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

        const ball =
            this.world.getBall();

        if (
            !ball ||
            ball.isMoving()
        ) {
            return;
        }

        this.state =
            ShotState.Preparing;

        this.preparationElapsedTime = 0;

        this.shotPreparation.reset();

        ball.setTensionPower(
            0,
        );

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

        this.preparationElapsedTime = 0;

        this.shotPreparation.reset();

        this.world
            .getBall()
            ?.setTensionPower(
                0,
            );

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

        const ball =
            this.world.getBall();

        const club =
            this.world.getClub();

        if (
            !ball ||
            !club
        ) {
            this.resetAfterShot();

            console.error(
                "Shot could not be released because the Ball or Club does not exist.",
            );

            return;
        }

        // -----------------------------
        // Capture Release Snapshot
        // -----------------------------

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

        const releasedAccuracyQuality =
            this.shotPreparation
                .getAccuracyQuality();

        const releasedInsideOptimalRange =
            this.shotPreparation
                .isInsideOptimalAccuracyRange();

        const releasedPreparationTime =
            this.preparationElapsedTime;

        // -----------------------------
        // Validate Launch
        // -----------------------------

        const hasMinimumPower =
            ball.canLaunchWithPower(
                releasedPower,
            );

        const hasMinimumPreparationTime =
            ball.hasMetMinimumPreparationTime(
                releasedPreparationTime,
            );

        const shotCanLaunch =
            ball.canLaunchShot(
                releasedPower,
                releasedPreparationTime,
            );

        /*
         * Invalid quick clicks and tiny drags
         * cancel cleanly.
         *
         * They do not create release feedback and
         * do not move the Ball.
         */
        if (!shotCanLaunch) {

            this.logRejectedShot(
                releasedPower,
                releasedPreparationTime,
                hasMinimumPower,
                hasMinimumPreparationTime,
            );

            this.resetAfterShot();

            return;
        }

        // -----------------------------
        // Accurate Release Feedback
        // -----------------------------

        if (
            releasedInsideOptimalRange
        ) {
            this.world
                .getShotFeedback()
                ?.spawn(
                    ball.getX(),
                    ball.getY(),
                    releasedPower,
                );
        }

        // -----------------------------
        // Ball Launch
        // -----------------------------

        const launchSucceeded =
            ball.launch(
                releasedPower,
                releasedDirection,
            );

        if (launchSucceeded) {
            this.world
                .getCameraFeedbackController()
                .triggerShotRelease(
                    releasedPower,
                    releasedAccuracyQuality,
                    releasedInsideOptimalRange,
                );
        }

        this.logReleasedShot(
            releasedPower,
            releasedDirection,
            club.getClubName(),
            releasedOscillationOffset,
            releasedOscillationSpeed,
            releasedAccuracyQuality,
            releasedInsideOptimalRange,
            releasedPreparationTime,
            launchSucceeded,
            ball.getVelocityX(),
            ball.getVelocityY(),
            ball.getSpeed(),
        );

        this.resetAfterShot();
    }

    private resetAfterShot(): void {

        this.state =
            ShotState.Idle;

        this.preparationElapsedTime = 0;

        this.shotPreparation.reset();

        this.world
            .getBall()
            ?.setTensionPower(
                0,
            );

        this.world
            .getClub()
            ?.resetShotVisuals();

        this.world
            .getAimIndicator()
            ?.hide();
    }

    /**
     * Cancels any active preparation and restores all
     * shot-facing visuals to their idle state.
     *
     * Used by the temporary C7 Ball reset control.
     */
    public reset(): void {

        this.resetAfterShot();
    }

    // -------------------------------------------------------
    // Release Diagnostics
    // -------------------------------------------------------

    private logRejectedShot(
        power: number,
        preparationTime: number,
        hasMinimumPower: boolean,
        hasMinimumPreparationTime: boolean,
    ): void {

        console.clear();

        console.log(
            "==============================",
        );

        console.log(
            "SHOT REJECTED",
        );

        console.log(
            "Power:",
            power.toFixed(3),
        );

        console.log(
            "Power Requirement Met:",
            hasMinimumPower,
        );

        console.log(
            "Preparation Time:",
            preparationTime.toFixed(3),
            "seconds",
        );

        console.log(
            "Time Requirement Met:",
            hasMinimumPreparationTime,
        );

        console.log(
            "Ball Movement:",
            "No launch",
        );

        console.log(
            "==============================",
        );
    }

    private logReleasedShot(
        power: number,
        directionRadians: number,
        clubName: string,
        oscillationOffsetRadians: number,
        oscillationSpeed: number,
        accuracyQuality: number,
        insideOptimalRange: boolean,
        preparationTime: number,
        launchSucceeded: boolean,
        velocityX: number,
        velocityY: number,
        speed: number,
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
            power.toFixed(3),
        );

        console.log(
            "Preparation Time:",
            preparationTime.toFixed(3),
            "seconds",
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
            "Accuracy Quality:",
            accuracyQuality.toFixed(3),
        );

        console.log(
            "Inside Optimal Range:",
            insideOptimalRange,
        );

        console.log(
            "Feedback Spawned:",
            insideOptimalRange,
        );

        console.log(
            "Launch Succeeded:",
            launchSucceeded,
        );

        console.log(
            "Velocity X:",
            velocityX.toFixed(2),
            "px/s",
        );

        console.log(
            "Velocity Y:",
            velocityY.toFixed(2),
            "px/s",
        );

        console.log(
            "Launch Speed:",
            speed.toFixed(2),
            "px/s",
        );

        console.log(
            "==============================",
        );
    }

    // -------------------------------------------------------
    // State Queries
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

    public getPreparationElapsedTime():
        number {

        return this.preparationElapsedTime;
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
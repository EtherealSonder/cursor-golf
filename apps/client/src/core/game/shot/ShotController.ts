import { InputManager } from "../../input/InputManager";
import { BallInteractionState } from "../entities/Ball";
import { World } from "../world/World";
import { ShotPreparation } from "./ShotPreparation";

export enum ShotState {
    Idle,
    Preparing,
    Swinging,
    Recovering,
}

interface CommittedShot {
    readonly power: number;
    readonly direction: number;
    readonly oscillationOffset: number;
    readonly oscillationSpeed: number;
    readonly accuracyQuality: number;
    readonly insideOptimalRange: boolean;
    readonly preparationTime: number;
    readonly clubName: string;
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

    private committedShot:
        CommittedShot | null = null;

    private contactLaunchProcessed =
        false;

    private successfulContactPending = false;

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
            this.state ===
            ShotState.Swinging
        ) {
            this.updateSwinging();
            return;
        }

        if (
            this.state ===
            ShotState.Recovering
        ) {
            this.updateRecovering();
            return;
        }

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

        if (!ball.canInteractWithClub()) {
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

        this.world
            .getCamera()
            .setShotPreparationDragPower(
                normalizedPower,
            );

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
            !ball.canInteractWithClub()
        ) {
            return;
        }

        this.state =
            ShotState.Preparing;

        this.preparationElapsedTime = 0;

        this.committedShot = null;
        this.contactLaunchProcessed = false;

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

        this.world
            .getCamera()
            .setShotPreparationZoom(
                ball.getX(),
                ball.getY(),
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

        this.world
            .getCamera()
            .restoreNormalZoom();

        
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
        // Commit Valid Shot
        // -----------------------------

        this.committedShot = {
            power: releasedPower,
            direction: releasedDirection,
            oscillationOffset: releasedOscillationOffset,
            oscillationSpeed: releasedOscillationSpeed,
            accuracyQuality: releasedAccuracyQuality,
            insideOptimalRange: releasedInsideOptimalRange,
            preparationTime: releasedPreparationTime,
            clubName: club.getClubName(),
        };

        this.contactLaunchProcessed = false;

        this.state =
            ShotState.Swinging;

        ball.setTensionPower(0);
        ball.clearAimVector();

        ball.setInteractionState(
            BallInteractionState.Normal,
        );

        this.world
            .getAimIndicator()
            ?.hide();

        this.world
            .getCamera()
            .restoreNormalZoom();

        club.beginSwing(
            ball.getX(),
            ball.getY(),
            releasedDirection,
            releasedPower,
        );
    }

    private updateSwinging(): void {

        const ball =
            this.world.getBall();

        const club =
            this.world.getClub();

        const shot =
            this.committedShot;

        if (!ball || !club || !shot) {
            this.resetAfterShot();
            return;
        }

        if (
            !club.hasReachedContact() ||
            this.contactLaunchProcessed
        ) {
            return;
        }

        this.contactLaunchProcessed = true;

        if (shot.insideOptimalRange) {
            this.world
                .getShotFeedback()
                ?.spawn(
                    ball.getX(),
                    ball.getY(),
                    shot.power,
                );
        }

        const launchSucceeded =
            ball.launch(
                shot.power,
                shot.direction,
            );

        if (launchSucceeded) {
            this.successfulContactPending = true;
            this.world
                .getCameraFeedbackController()
                .triggerShotRelease(
                    shot.power,
                    shot.accuracyQuality,
                    shot.insideOptimalRange,
                );
        }

        this.logReleasedShot(
            shot.power,
            shot.direction,
            shot.clubName,
            shot.oscillationOffset,
            shot.oscillationSpeed,
            shot.accuracyQuality,
            shot.insideOptimalRange,
            shot.preparationTime,
            launchSucceeded,
            ball.getVelocityX(),
            ball.getVelocityY(),
            ball.getSpeed(),
        );

        club.beginRecovery();

        this.state =
            ShotState.Recovering;
    }

    private updateRecovering(): void {

        const club =
            this.world.getClub();

        if (!club) {
            this.resetAfterShot();
            return;
        }

        if (!club.hasCompletedRecovery()) {
            return;
        }

        this.resetAfterShot();
    }

    private resetAfterShot(): void {

        this.state =
            ShotState.Idle;

        this.preparationElapsedTime = 0;

        this.committedShot = null;
        this.contactLaunchProcessed = false;

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

        this.world
            .getCamera()
            .restoreNormalZoom();
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

        

        

        

        

        

        

        

        

        

        

        

        

        

        

        

        

        
    }

    // -------------------------------------------------------
    // State Queries
    // -------------------------------------------------------

    public getState(): ShotState {

        return this.state;
    }

    /** One-shot signal emitted at actual successful Ball launch. */
    public consumeSuccessfulContact(): boolean {
        const result = this.successfulContactPending;
        this.successfulContactPending = false;
        return result;
    }

    public isPreparingShot(): boolean {

        return (
            this.state ===
            ShotState.Preparing
        );
    }

    public isSwinging(): boolean {

        return this.state === ShotState.Swinging;
    }

    public isRecovering(): boolean {

        return this.state === ShotState.Recovering;
    }

    public isShotSequenceActive(): boolean {

        return this.state !== ShotState.Idle;
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
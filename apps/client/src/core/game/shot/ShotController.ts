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
        // Time-Based Values
        // -----------------------------

        this.shotPreparation.update(
            deltaTime,
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
            accuracyQuality,
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
                oscillationOffset,
            ).toFixed(2),
            "degrees",
        );

        console.log(
            "Absolute Oscillation Offset:",
            this.radiansToDegrees(
                Math.abs(
                    oscillationOffset,
                ),
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
            "Optimal Accuracy Ratio:",
            (
                club
                    .getOptimalAccuracyRatio() *
                100
            ).toFixed(2),
            "%",
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
            "Oscillation Curve Strength:",
            club
                .getOscillationCurveStrength()
                .toFixed(2),
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

        this.state =
            ShotState.Preparing;

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

            this.state =
                ShotState.Idle;

            this.shotPreparation.reset();

            ball?.setTensionPower(
                0,
            );

            this.world
                .getAimIndicator()
                ?.hide();

            console.error(
                "Shot could not be released because the Ball or Club does not exist.",
            );

            return;
        }

        /*
         * Capture all release data before
         * ShotPreparation is reset.
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

        const releasedAccuracyQuality =
            this.shotPreparation
                .getAccuracyQuality();

        const releasedInsideOptimalRange =
            this.shotPreparation
                .isInsideOptimalAccuracyRange();

        this.logReleasedShot(
            releasedPower,
            releasedDirection,
            club.getClubName(),
            releasedOscillationOffset,
            releasedOscillationSpeed,
            releasedAccuracyQuality,
            releasedInsideOptimalRange,
        );

        // -----------------------------
        // Accurate Release Feedback
        // -----------------------------

        /*
         * Power determines which word tier is
         * selected, but accuracy determines
         * whether feedback appears at all.
         *
         * Every accurate release receives
         * feedback regardless of shot power.
         */
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

        /*
         * Ball movement is not performed yet.
         */

        this.state =
            ShotState.Idle;

        this.shotPreparation.reset();

        ball.setTensionPower(
            0,
        );

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
        accuracyQuality: number,
        insideOptimalRange: boolean,
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
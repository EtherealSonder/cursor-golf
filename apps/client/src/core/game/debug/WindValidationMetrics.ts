import type {
    WindTuningController,
} from "./WindTuningController";

import type {
    Ball,
} from "../entities/Ball";

import type {
    WindManager,
} from "../environment/WindManager";

export type WindValidationStatus =
    | "waiting"
    | "measuring"
    | "complete";

export interface WindValidationResult {

    readonly shotNumber: number;

    readonly windMode:
    "random" | "preset";

    readonly windPresetName:
    string | null;

    readonly windDirectionDegrees:
    number;

    readonly windStrengthKph:
    number;

    readonly launchPositionX:
    number;

    readonly launchPositionY:
    number;

    readonly stopPositionX:
    number;

    readonly stopPositionY:
    number;

    readonly launchDirectionRadians:
    number;

    readonly launchSpeed:
    number;

    readonly maximumSpeed:
    number;

    readonly movementTime:
    number;

    readonly travelDistance:
    number;

    readonly straightLineDisplacement:
    number;

    /**
     * Largest absolute displacement measured
     * perpendicular to the original shot direction.
     */
    readonly maximumLateralDrift:
    number;

    /**
     * Signed final displacement measured
     * perpendicular to the original shot direction.
     */
    readonly finalLateralDrift:
    number;

    /**
     * Signed final displacement measured along the
     * original shot direction.
     */
    readonly longitudinalDisplacement:
    number;

    readonly boundaryCollisionCount:
    number;

    readonly obstacleCollisionCount:
    number;
}

export interface WindValidationState {

    readonly status:
    WindValidationStatus;

    readonly completedShotCount:
    number;

    readonly activeShotNumber:
    number | null;

    readonly latestResult:
    WindValidationResult | null;
}

export type WindValidationStateListener = (
    state: WindValidationState,
) => void;

/**
 * Collects one structured measurement for every
 * completed Ball shot.
 *
 * The class samples Ball data during World updates,
 * but React listeners are notified only when:
 *
 * - a shot begins
 * - a shot completes
 * - the current result is cleared
 *
 * This avoids per-frame React rerenders.
 */
export class WindValidationMetrics {

    private readonly ball:
        Ball;

    private readonly windManager:
        WindManager;

    private readonly windTuningController:
        WindTuningController;

    private readonly stateListeners:
        Set<WindValidationStateListener> =
        new Set<WindValidationStateListener>();

    private status:
        WindValidationStatus =
        "waiting";

    private completedShotCount = 0;

    private activeShotNumber:
        number | null =
        null;

    private latestResult:
        WindValidationResult | null =
        null;

    private wasBallMoving = false;

    private activeWindMode:
        "random" | "preset" =
        "random";

    private activeWindPresetName:
        string | null =
        null;

    private activeWindDirectionDegrees = 0;

    private activeWindStrengthKph = 0;

    private launchPositionX = 0;

    private launchPositionY = 0;

    private launchDirectionRadians = 0;

    private launchSpeed = 0;

    private maximumSpeed = 0;

    private maximumLateralDrift = 0;

    constructor(
        ball: Ball,
        windManager: WindManager,
        windTuningController:
            WindTuningController,
    ) {
        this.ball =
            ball;

        this.windManager =
            windManager;

        this.windTuningController =
            windTuningController;

        this.wasBallMoving =
            this.ball.isMoving();
    }

    // -------------------------------------------------------------------------
    // Measurement Update
    // -------------------------------------------------------------------------

    public update(): void {

        const isBallMoving =
            this.ball.isMoving();

        if (
            !this.wasBallMoving &&
            isBallMoving
        ) {
            this.beginMeasurement();
        }

        if (
            this.status ===
            "measuring" &&
            isBallMoving
        ) {
            this.sampleMeasurement();
        }

        if (
            this.wasBallMoving &&
            !isBallMoving &&
            this.status ===
            "measuring"
        ) {
            this.completeMeasurement();
        }

        this.wasBallMoving =
            isBallMoving;
    }

    private beginMeasurement(): void {

        const windState =
            this.windManager
                .getState();

        const tuningState =
            this.windTuningController
                .getState();

        this.activeShotNumber =
            this.completedShotCount +
            1;

        this.status =
            "measuring";

        this.activeWindMode =
            tuningState.mode;

        this.activeWindPresetName =
            tuningState
                .activePreset
                ?.name ??
            null;

        this.activeWindDirectionDegrees =
            windState.directionDegrees;

        this.activeWindStrengthKph =
            windState.strength;

        this.launchPositionX =
            this.ball
                .getLaunchPositionX();

        this.launchPositionY =
            this.ball
                .getLaunchPositionY();

        this.launchDirectionRadians =
            this.ball
                .getMostRecentLaunchDirectionRadians();

        this.launchSpeed =
            this.ball
                .getMostRecentLaunchSpeed();

        this.maximumSpeed =
            this.ball
                .getSpeed();

        this.maximumLateralDrift = 0;

        this.sampleMeasurement();

        this.notifyStateListeners();
    }

    private sampleMeasurement(): void {

        const currentSpeed =
            this.ball
                .getSpeed();

        this.maximumSpeed =
            Math.max(
                this.maximumSpeed,
                currentSpeed,
            );

        const displacementX =
            this.ball.getX() -
            this.launchPositionX;

        const displacementY =
            this.ball.getY() -
            this.launchPositionY;

        const perpendicularX =
            -Math.sin(
                this.launchDirectionRadians,
            );

        const perpendicularY =
            Math.cos(
                this.launchDirectionRadians,
            );

        const lateralDrift =
            displacementX *
            perpendicularX +
            displacementY *
            perpendicularY;

        this.maximumLateralDrift =
            Math.max(
                this.maximumLateralDrift,
                Math.abs(
                    lateralDrift,
                ),
            );
    }

    private completeMeasurement(): void {

        this.sampleMeasurement();

        const stopPositionX =
            this.ball.getX();

        const stopPositionY =
            this.ball.getY();

        const displacementX =
            stopPositionX -
            this.launchPositionX;

        const displacementY =
            stopPositionY -
            this.launchPositionY;

        const forwardX =
            Math.cos(
                this.launchDirectionRadians,
            );

        const forwardY =
            Math.sin(
                this.launchDirectionRadians,
            );

        const perpendicularX =
            -forwardY;

        const perpendicularY =
            forwardX;

        const finalLateralDrift =
            displacementX *
            perpendicularX +
            displacementY *
            perpendicularY;

        const longitudinalDisplacement =
            displacementX *
            forwardX +
            displacementY *
            forwardY;

        const straightLineDisplacement =
            Math.hypot(
                displacementX,
                displacementY,
            );

        if (
            this.activeShotNumber ===
            null
        ) {
            return;
        }

        this.latestResult = {
            shotNumber:
                this.activeShotNumber,

            windMode:
                this.activeWindMode,

            windPresetName:
                this.activeWindPresetName,

            windDirectionDegrees:
                this.activeWindDirectionDegrees,

            windStrengthKph:
                this.activeWindStrengthKph,

            launchPositionX:
                this.launchPositionX,

            launchPositionY:
                this.launchPositionY,

            stopPositionX,

            stopPositionY,

            launchDirectionRadians:
                this.launchDirectionRadians,

            launchSpeed:
                this.launchSpeed,

            maximumSpeed:
                this.maximumSpeed,

            movementTime:
                this.ball
                    .getMovementElapsedTime(),

            travelDistance:
                this.ball
                    .getMovementDistanceTravelled(),

            straightLineDisplacement,

            maximumLateralDrift:
                this.maximumLateralDrift,

            finalLateralDrift,

            longitudinalDisplacement,

            boundaryCollisionCount:
                this.ball
                    .getBoundaryCollisionCount(),

            obstacleCollisionCount:
                this.ball
                    .getObstacleCollisionCount(),
        };

        this.completedShotCount += 1;

        this.activeShotNumber =
            null;

        this.status =
            "complete";

        this.notifyStateListeners();
    }

    // -------------------------------------------------------------------------
    // State Queries and Subscription
    // -------------------------------------------------------------------------

    public getState():
        WindValidationState {

        return {
            status:
                this.status,

            completedShotCount:
                this.completedShotCount,

            activeShotNumber:
                this.activeShotNumber,

            latestResult:
                this.latestResult,
        };
    }

    public subscribe(
        listener:
            WindValidationStateListener,
    ): () => void {

        this.stateListeners.add(
            listener,
        );

        listener(
            this.getState(),
        );

        let unsubscribed =
            false;

        return (): void => {

            if (unsubscribed) {
                return;
            }

            unsubscribed =
                true;

            this.stateListeners.delete(
                listener,
            );
        };
    }

    /**
     * Clears the displayed result without resetting
     * the completed-shot counter.
     *
     * Preset controls call this before changing wind
     * so a result from the previous condition is not
     * mistaken for the newly selected condition.
     */
    public clearLatestResult(): void {

        if (
            this.status ===
            "measuring"
        ) {
            return;
        }

        this.latestResult =
            null;

        this.status =
            "waiting";

        this.notifyStateListeners();
    }

    /**
     * Cancels any active measurement and clears the
     * current result after the Ball is returned to its
     * validation start position.
     *
     * The completed-shot counter is intentionally
     * preserved so repeated testing remains numbered
     * across resets.
     */
    public resetMeasurement(): void {

        this.latestResult =
            null;

        this.activeShotNumber =
            null;

        this.status =
            "waiting";

        this.wasBallMoving =
            this.ball.isMoving();

        this.activeWindMode =
            "random";

        this.activeWindPresetName =
            null;

        this.activeWindDirectionDegrees = 0;

        this.activeWindStrengthKph = 0;

        this.launchPositionX =
            this.ball.getX();

        this.launchPositionY =
            this.ball.getY();

        this.launchDirectionRadians = 0;

        this.launchSpeed = 0;

        this.maximumSpeed = 0;

        this.maximumLateralDrift = 0;

        this.notifyStateListeners();
    }

    public isMeasuring(): boolean {

        return (
            this.status ===
            "measuring"
        );
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    public destroy(): void {

        this.stateListeners.clear();

        this.latestResult =
            null;

        this.activeShotNumber =
            null;

        this.status =
            "waiting";

        this.wasBallMoving =
            false;
    }

    private notifyStateListeners():
        void {

        if (
            this.stateListeners.size ===
            0
        ) {
            return;
        }

        const state =
            this.getState();

        this.stateListeners.forEach(
            (
                listener,
            ): void => {

                listener(
                    state,
                );
            },
        );
    }
}

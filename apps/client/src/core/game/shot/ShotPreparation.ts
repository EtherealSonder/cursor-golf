import { Club } from "../entities/Club";

export class ShotPreparation {

    // -------------------------------------------------------
    // Club
    // -------------------------------------------------------

    /**
     * The active club supplies gameplay configuration
     * such as maximum drag distance, oscillation angle,
     * and oscillation speed range.
     */
    private readonly club: Club;

    // -------------------------------------------------------
    // Drag Data
    // -------------------------------------------------------

    /**
     * Actual distance between the mouse
     * and the golf ball.
     */
    private dragDistance = 0;

    /**
     * Shot power represented as a value
     * between 0 and 1.
     */
    private normalizedPower = 0;

    // -------------------------------------------------------
    // Aim Data
    // -------------------------------------------------------

    /**
     * Direction from the ball toward
     * the dragged mouse position.
     */
    private dragAngle = 0;

    /**
     * Intended shot direction before
     * oscillation is applied.
     */
    private baseAimAngle = 0;

    /**
     * Final shot direction after
     * oscillation is applied.
     */
    private currentAimAngle = 0;

    // -------------------------------------------------------
    // Oscillation
    // -------------------------------------------------------

    /**
     * Accumulated time used by the
     * sine-wave oscillation.
     */
    private oscillationTime = 0;

    /**
     * Current angular offset produced
     * by the sine wave.
     */
    private oscillationOffset = 0;

    /**
     * Current oscillation speed.
     *
     * This is calculated from:
     *
     * Club minimum speed
     * Club maximum speed
     * Normalized shot power
     */
    private oscillationSpeed = 0;

    constructor(
        club: Club,
    ) {

        this.club = club;

        /*
         * Begin at the club's minimum
         * oscillation speed.
         */
        this.oscillationSpeed =
            this.club
                .getMinimumOscillationSpeed();
    }

    // -------------------------------------------------------
    // Update
    // -------------------------------------------------------

    /**
     * Updates values that change
     * continuously over time.
     */
    public update(
        deltaTime: number,
    ): void {

        this.oscillationTime +=
            deltaTime;
    }

    /**
     * Updates gameplay values derived
     * from the current drag vector.
     */
    public updateDrag(
        deltaX: number,
        deltaY: number,
    ): void {

        // -----------------------------
        // Drag Distance
        // -----------------------------

        this.dragDistance =
            Math.sqrt(
                deltaX * deltaX +
                deltaY * deltaY,
            );

        // -----------------------------
        // Maximum Drag Distance
        // -----------------------------

        const maximumDragDistance =
            this.club
                .getMaximumDragDistance();

        if (maximumDragDistance <= 0) {

            this.normalizedPower = 0;

            throw new Error(
                "Club maximum drag distance must be greater than zero.",
            );
        }

        // -----------------------------
        // Clamp Power Distance
        // -----------------------------

        const clampedDistance =
            Math.min(
                this.dragDistance,
                maximumDragDistance,
            );

        // -----------------------------
        // Normalized Power
        // -----------------------------

        this.normalizedPower =
            clampedDistance /
            maximumDragDistance;

        // -----------------------------
        // Drag Angle
        // -----------------------------

        this.dragAngle =
            Math.atan2(
                deltaY,
                deltaX,
            );

        // -----------------------------
        // Base Aim Angle
        // -----------------------------

        /*
         * The shot travels in the opposite
         * direction from the mouse drag.
         */
        this.baseAimAngle =
            this.dragAngle +
            Math.PI;

        // -----------------------------
        // Dynamic Oscillation Speed
        // -----------------------------

        this.updateOscillationSpeed();

        // -----------------------------
        // Oscillation Offset
        // -----------------------------

        const maximumOscillationAngle =
            this.club
                .getOscillationAngle();

        this.oscillationOffset =
            Math.sin(
                this.oscillationTime *
                this.oscillationSpeed,
            ) *
            maximumOscillationAngle;

        // -----------------------------
        // Current Aim Angle
        // -----------------------------

        this.currentAimAngle =
            this.baseAimAngle +
            this.oscillationOffset;
    }

    // -------------------------------------------------------
    // Oscillation Calculation
    // -------------------------------------------------------

    /**
     * Calculates the current oscillation speed
     * using linear interpolation.
     *
     * Power 0:
     * minimum club oscillation speed
     *
     * Power 1:
     * maximum club oscillation speed
     */
    private updateOscillationSpeed(): void {

        const minimumSpeed =
            this.club
                .getMinimumOscillationSpeed();

        const maximumSpeed =
            this.club
                .getMaximumOscillationSpeed();

        if (minimumSpeed < 0) {
            throw new Error(
                "Club minimum oscillation speed cannot be negative.",
            );
        }

        if (maximumSpeed < minimumSpeed) {
            throw new Error(
                "Club maximum oscillation speed cannot be lower than its minimum oscillation speed.",
            );
        }

        const speedRange =
            maximumSpeed -
            minimumSpeed;

        this.oscillationSpeed =
            minimumSpeed +
            this.normalizedPower *
            speedRange;
    }

    // -------------------------------------------------------
    // Reset
    // -------------------------------------------------------

    /**
     * Clears all temporary shot
     * preparation data.
     */
    public reset(): void {

        this.dragDistance = 0;
        this.normalizedPower = 0;

        this.dragAngle = 0;
        this.baseAimAngle = 0;
        this.currentAimAngle = 0;

        this.oscillationTime = 0;
        this.oscillationOffset = 0;

        /*
         * A new shot begins at the club's
         * minimum oscillation speed.
         */
        this.oscillationSpeed =
            this.club
                .getMinimumOscillationSpeed();
    }

    // -------------------------------------------------------
    // Drag Getters
    // -------------------------------------------------------

    public getDragDistance(): number {
        return this.dragDistance;
    }

    public getNormalizedPower(): number {
        return this.normalizedPower;
    }

    // -------------------------------------------------------
    // Aim Getters
    // -------------------------------------------------------

    public getDragAngle(): number {
        return this.dragAngle;
    }

    public getBaseAimAngle(): number {
        return this.baseAimAngle;
    }

    public getCurrentAimAngle(): number {
        return this.currentAimAngle;
    }

    // -------------------------------------------------------
    // Oscillation Getters
    // -------------------------------------------------------

    public getOscillationTime(): number {
        return this.oscillationTime;
    }

    public getOscillationOffset(): number {
        return this.oscillationOffset;
    }

    public getOscillationSpeed(): number {
        return this.oscillationSpeed;
    }
}
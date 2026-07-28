import type {
    ClubDefinition,
} from "../config/ClubDefinition";

import { Club } from "../entities/Club";

export class ShotPreparation {

    // -------------------------------------------------------
    // Club Definition
    // -------------------------------------------------------

    private readonly clubDefinition:
        ClubDefinition;

    // -------------------------------------------------------
    // Drag Data
    // -------------------------------------------------------

    private dragDistance = 0;

    private normalizedPower = 0;

    // -------------------------------------------------------
    // Aim Data
    // -------------------------------------------------------

    private dragAngle = 0;

    private baseAimAngle = 0;

    private currentAimAngle = 0;

    // -------------------------------------------------------
    // Oscillation
    // -------------------------------------------------------

    private oscillationTime = 0;

    private oscillationPhase = 0;

    private rawOscillationWave = 0;

    private shapedOscillationWave = 0;

    private oscillationOffset = 0;

    private oscillationSpeed = 0;

    // -------------------------------------------------------
    // Accuracy
    // -------------------------------------------------------

    /**
     * Maximum absolute oscillation offset that
     * remains inside the club's optimal zone.
     */
    private readonly optimalAccuracyTolerance:
        number;

    /**
     * Current quality of the aim timing.
     *
     * 1:
     * inside the complete optimal zone
     *
     * 0:
     * at the maximum oscillation edge
     */
    private accuracyQuality = 1;

    /**
     * Whether the current oscillation offset
     * remains inside the optimal tolerance.
     */
    private insideOptimalAccuracyRange = true;

    constructor(
        club: Club,
    ) {

        this.clubDefinition =
            club.getDefinition();

        this.oscillationSpeed =
            this.clubDefinition
                .minimumOscillationSpeed;

        this.optimalAccuracyTolerance =
            this.clubDefinition
                .oscillationAngle *
            this.clubDefinition
                .optimalAccuracyRatio;

        this.validateAccuracyConfiguration();
    }

    // -------------------------------------------------------
    // Update
    // -------------------------------------------------------

    public update(
        deltaTime: number,
    ): void {

        if (deltaTime < 0) {
            throw new Error(
                "ShotPreparation deltaTime cannot be negative.",
            );
        }

        this.oscillationTime +=
            deltaTime;

        this.oscillationPhase +=
            this.oscillationSpeed *
            deltaTime;

        this.updateOscillationOffset();

        this.updateCurrentAimAngle();

        this.updateAccuracy();
    }

    public updateDrag(
        deltaX: number,
        deltaY: number,
    ): void {

        this.dragDistance =
            Math.hypot(
                deltaX,
                deltaY,
            );

        const maximumDragDistance =
            this.clubDefinition
                .maximumDragDistance;

        if (maximumDragDistance <= 0) {

            this.normalizedPower = 0;

            throw new Error(
                "Club maximum drag distance must be greater than zero.",
            );
        }

        const clampedDistance =
            Math.min(
                this.dragDistance,
                maximumDragDistance,
            );

        this.normalizedPower =
            clampedDistance /
            maximumDragDistance;

        this.dragAngle =
            Math.atan2(
                deltaY,
                deltaX,
            );

        this.baseAimAngle =
            this.dragAngle +
            Math.PI;

        this.updateOscillationSpeed();
    }

    // -------------------------------------------------------
    // Oscillation Calculation
    // -------------------------------------------------------

    private updateOscillationSpeed(): void {

        const minimumSpeed =
            this.clubDefinition
                .minimumOscillationSpeed;

        const maximumSpeed =
            this.clubDefinition
                .maximumOscillationSpeed;

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

    private updateOscillationOffset(): void {

        this.rawOscillationWave =
            Math.sin(
                this.oscillationPhase,
            );

        this.shapedOscillationWave =
            this.calculateShapedOscillationWave(
                this.oscillationPhase,
            );

        this.oscillationOffset =
            this.shapedOscillationWave *
            this.clubDefinition
                .oscillationAngle;
    }

    private calculateShapedOscillationWave(
        phase: number,
    ): number {

        const strength =
            this.clubDefinition
                .oscillationCurveStrength;

        if (strength < 0) {
            throw new Error(
                "Club oscillation curve strength cannot be negative.",
            );
        }

        if (strength >= 1 / 3) {
            throw new Error(
                "Club oscillation curve strength must be lower than one third.",
            );
        }

        const primaryWave =
            Math.sin(
                phase,
            );

        const thirdHarmonic =
            Math.sin(
                phase * 3,
            );

        const shapedWave =
            (
                primaryWave -
                strength *
                thirdHarmonic
            ) /
            (
                1 +
                strength
            );

        return Math.max(
            -1,
            Math.min(
                shapedWave,
                1,
            ),
        );
    }

    private updateCurrentAimAngle(): void {

        this.currentAimAngle =
            this.baseAimAngle +
            this.oscillationOffset;
    }

    // -------------------------------------------------------
    // Accuracy Calculation
    // -------------------------------------------------------

    private validateAccuracyConfiguration(): void {

        const ratio =
            this.clubDefinition
                .optimalAccuracyRatio;

        if (
            ratio < 0 ||
            ratio > 1
        ) {
            throw new Error(
                "Club optimal accuracy ratio must remain between zero and one.",
            );
        }

        if (
            this.optimalAccuracyTolerance <
            0
        ) {
            throw new Error(
                "Club optimal accuracy tolerance cannot be negative.",
            );
        }
    }

    /**
     * Calculates the current accuracy quality.
     *
     * The complete optimal tolerance remains at
     * quality 1.
     *
     * Outside that range, quality falls linearly
     * toward 0 at the maximum oscillation edge.
     */
    private updateAccuracy(): void {

        const absoluteOffset =
            Math.abs(
                this.oscillationOffset,
            );

        const maximumOffset =
            this.clubDefinition
                .oscillationAngle;

        this.insideOptimalAccuracyRange =
            absoluteOffset <=
            this.optimalAccuracyTolerance;

        if (
            this.insideOptimalAccuracyRange
        ) {
            this.accuracyQuality = 1;

            return;
        }

        const fadeRange =
            maximumOffset -
            this.optimalAccuracyTolerance;

        /*
         * This can occur only when the optimal
         * ratio equals one or oscillation angle
         * equals zero.
         */
        if (fadeRange <= 0) {
            this.accuracyQuality = 1;

            return;
        }

        const distanceOutsideOptimalRange =
            absoluteOffset -
            this.optimalAccuracyTolerance;

        this.accuracyQuality =
            Math.max(
                0,
                Math.min(
                    1 -
                    distanceOutsideOptimalRange /
                    fadeRange,
                    1,
                ),
            );
    }

    // -------------------------------------------------------
    // Reset
    // -------------------------------------------------------

    public reset(): void {

        this.dragDistance = 0;
        this.normalizedPower = 0;

        this.dragAngle = 0;
        this.baseAimAngle = 0;
        this.currentAimAngle = 0;

        this.oscillationTime = 0;
        this.oscillationPhase = 0;

        this.rawOscillationWave = 0;
        this.shapedOscillationWave = 0;

        this.oscillationOffset = 0;

        this.oscillationSpeed =
            this.clubDefinition
                .minimumOscillationSpeed;

        this.accuracyQuality = 1;

        this.insideOptimalAccuracyRange =
            true;
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

    public getOscillationPhase(): number {
        return this.oscillationPhase;
    }

    public getRawOscillationWave(): number {
        return this.rawOscillationWave;
    }

    public getShapedOscillationWave(): number {
        return this.shapedOscillationWave;
    }

    public getOscillationOffset(): number {
        return this.oscillationOffset;
    }

    public getOscillationSpeed(): number {
        return this.oscillationSpeed;
    }

    // -------------------------------------------------------
    // Accuracy Getters
    // -------------------------------------------------------

    public getOptimalAccuracyTolerance(): number {

        return this.optimalAccuracyTolerance;
    }

    public getAccuracyQuality(): number {

        return this.accuracyQuality;
    }

    public isInsideOptimalAccuracyRange(): boolean {

        return this.insideOptimalAccuracyRange;
    }
}
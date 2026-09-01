import {
    Graphics,
} from "pixi.js";

import {
    DEFAULT_HOLE_DEFINITION,
} from "../config/HoleDefinition";

import type {
    HoleDefinition,
} from "../config/HoleDefinition";

import type {
    Ball,
} from "./Ball";

import {
    Entity,
} from "./Entity";

export enum HoleEntryState {
    Waiting,
    OverlappingTooFast,
    Capturing,
    Holed,
}

export interface HoleDebugState {
    readonly state: HoleEntryState;

    readonly currentCentreDistance: number;
    readonly sweptCentreDistance: number;
    readonly evaluatedCentreDistance: number;

    readonly effectiveCaptureRadius: number;
    readonly combinedCaptureDistance: number;
    readonly penetrationDepth: number;
    readonly entryRatio: number;
    readonly minimumEntryRatio: number;

    readonly ballSpeed: number;
    readonly allowedCaptureSpeed: number;
    readonly minimumCaptureSpeed: number;
    readonly maximumCaptureSpeed: number;

    readonly hasMinimumEntry: boolean;
    readonly isEntrySpeedValid: boolean;

    readonly captureProgress: number;
}

/**
 * Arcade-friendly Hole detector and controlled Ball-capture owner.
 *
 * Capture eligibility uses:
 *
 * 1. Swept-path distance, so a Ball cannot skip the Hole between frames.
 * 2. A small invisible capture-assist margin.
 * 3. A minimum entry ratio based on Ball-diameter penetration.
 * 4. A centre-weighted speed allowance.
 */
export class Hole extends Entity {

    // -------------------------------------------------------------------------
    // Dependencies and Configuration
    // -------------------------------------------------------------------------

    private readonly ball:
        Ball;

    private readonly definition:
        HoleDefinition;

    // -------------------------------------------------------------------------
    // Visuals
    // -------------------------------------------------------------------------

    private holeGraphics:
        Graphics | null = null;

    private debugGraphics:
        Graphics | null = null;

    // -------------------------------------------------------------------------
    // Detection State
    // -------------------------------------------------------------------------

    private entryState =
        HoleEntryState.Waiting;

    private previousBallX = 0;
    private previousBallY = 0;
    private hasPreviousBallPosition = false;

    private currentCentreDistance =
        Number.POSITIVE_INFINITY;

    private sweptCentreDistance =
        Number.POSITIVE_INFINITY;

    private evaluatedCentreDistance =
        Number.POSITIVE_INFINITY;

    private effectiveCaptureRadius = 0;
    private combinedCaptureDistance = 0;
    private penetrationDepth = 0;
    private entryRatio = 0;

    private ballSpeed = 0;
    private allowedCaptureSpeed = 0;

    private hasMinimumEntry = false;
    private isEntrySpeedValid = false;

    // -------------------------------------------------------------------------
    // Capture Animation State
    // -------------------------------------------------------------------------

    private captureElapsedTime = 0;
    private captureStartX = 0;
    private captureStartY = 0;
    private captureStartScale = 1;

    constructor(
        ball: Ball,
        definition:
            HoleDefinition =
            DEFAULT_HOLE_DEFINITION,
    ) {

        super();

        this.ball =
            ball;

        this.definition =
            definition;

        this.validateDefinition();

        this.setPosition(
            this.definition.positionX,
            this.definition.positionY,
        );
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    protected onInitialize(): void {

        this.holeGraphics =
            new Graphics();

        this.container.addChild(
            this.holeGraphics,
        );

        if (
            this.definition
                .showDebugCaptureRadius
        ) {
            this.debugGraphics =
                new Graphics();

            this.container.addChild(
                this.debugGraphics,
            );
        }

        this.resetPreviousBallPosition();
        this.updateCaptureGeometry();

        this.drawDebugCaptureRadius();
        this.drawHole();
    }

    protected onUpdate(
        deltaTime: number,
    ): void {

        const safeDeltaTime =
            Math.max(
                0,
                deltaTime,
            );

        if (
            this.entryState ===
            HoleEntryState.Capturing
        ) {
            this.updateCapture(
                safeDeltaTime,
            );

            return;
        }

        if (
            this.entryState ===
            HoleEntryState.Holed
        ) {
            return;
        }

        this.evaluateBallEntry();
    }

    protected onDestroy(): void {

        this.holeGraphics
            ?.destroy();

        this.debugGraphics
            ?.destroy();

        this.holeGraphics =
            null;

        this.debugGraphics =
            null;

        this.container.destroy({
            children:
                true,
        });
    }

    // -------------------------------------------------------------------------
    // Entry Detection
    // -------------------------------------------------------------------------

    private evaluateBallEntry(): void {

        const currentBallX =
            this.ball.getX();

        const currentBallY =
            this.ball.getY();

        const deltaX =
            currentBallX -
            this.getX();

        const deltaY =
            currentBallY -
            this.getY();

        this.currentCentreDistance =
            Math.hypot(
                deltaX,
                deltaY,
            );

        if (
            this.hasPreviousBallPosition
        ) {
            this.sweptCentreDistance =
                this.calculateDistanceFromHoleToMovementSegment(
                    this.previousBallX,
                    this.previousBallY,
                    currentBallX,
                    currentBallY,
                );
        } else {
            this.sweptCentreDistance =
                this.currentCentreDistance;
        }

        this.evaluatedCentreDistance =
            Math.min(
                this.currentCentreDistance,
                this.sweptCentreDistance,
            );

        this.updateCaptureGeometry();

        this.penetrationDepth =
            Math.max(
                0,
                this.combinedCaptureDistance -
                this.evaluatedCentreDistance,
            );

        const ballDiameter =
            this.ball.getRadius() *
            2;

        this.entryRatio =
            ballDiameter > 0
                ? this.clampNormalizedValue(
                    this.penetrationDepth /
                    ballDiameter,
                )
                : 0;

        this.hasMinimumEntry =
            this.entryRatio >=
            this.definition
                .minimumEntryRatio;

        this.ballSpeed =
            this.ball.getSpeed();

        this.allowedCaptureSpeed =
            this.calculateAllowedCaptureSpeed(
                this.entryRatio,
            );

        this.isEntrySpeedValid =
            this.ballSpeed <=
            this.allowedCaptureSpeed;

        const previousState =
            this.entryState;

        if (
            !this.hasMinimumEntry
        ) {
            this.entryState =
                HoleEntryState.Waiting;
        } else if (
            this.isEntrySpeedValid
        ) {
            this.beginCapture();
            return;
        } else {
            this.entryState =
                HoleEntryState.OverlappingTooFast;
        }

        if (
            previousState !==
            this.entryState
        ) {
            this.drawHole();

            if (
                this.entryState ===
                HoleEntryState.OverlappingTooFast
            ) {
                console.log(
                    "Hole entry rejected because the Ball exceeded the centre-weighted capture speed.",
                    this.getDebugState(),
                );
            }
        }

        this.previousBallX =
            currentBallX;

        this.previousBallY =
            currentBallY;

        this.hasPreviousBallPosition =
            true;
    }

    /**
     * Returns the shortest distance from the Hole centre to the Ball's
     * movement segment between the previous and current World updates.
     */
    private calculateDistanceFromHoleToMovementSegment(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
    ): number {

        const segmentX =
            endX -
            startX;

        const segmentY =
            endY -
            startY;

        const segmentLengthSquared =
            segmentX *
            segmentX +
            segmentY *
            segmentY;

        if (
            segmentLengthSquared <=
            Number.EPSILON
        ) {
            return Math.hypot(
                this.getX() -
                endX,

                this.getY() -
                endY,
            );
        }

        const holeFromStartX =
            this.getX() -
            startX;

        const holeFromStartY =
            this.getY() -
            startY;

        const projection =
            (
                holeFromStartX *
                segmentX +
                holeFromStartY *
                segmentY
            ) /
            segmentLengthSquared;

        const clampedProjection =
            this.clampNormalizedValue(
                projection,
            );

        const closestX =
            startX +
            segmentX *
            clampedProjection;

        const closestY =
            startY +
            segmentY *
            clampedProjection;

        return Math.hypot(
            this.getX() -
            closestX,

            this.getY() -
            closestY,
        );
    }

    /**
     * Produces a lenient but accuracy-sensitive speed limit.
     *
     * At the minimum accepted entry ratio, the shallow-entry speed is used.
     * As the Ball enters more deeply, the permitted speed approaches the
     * configured central-entry maximum.
     */
    private calculateAllowedCaptureSpeed(
        entryRatio: number,
    ): number {

        const validEntryRange =
            1 -
            this.definition
                .minimumEntryRatio;

        const normalizedEntryQuality =
            validEntryRange > 0
                ? this.clampNormalizedValue(
                    (
                        entryRatio -
                        this.definition
                            .minimumEntryRatio
                    ) /
                    validEntryRange,
                )
                : 1;

        const curvedEntryQuality =
            Math.pow(
                normalizedEntryQuality,
                this.definition
                    .captureSpeedCurveExponent,
            );

        return this.interpolateNumber(
            this.definition
                .minimumCaptureSpeed,

            this.definition
                .maximumCaptureSpeed,

            curvedEntryQuality,
        );
    }

    private updateCaptureGeometry(): void {

        this.effectiveCaptureRadius =
            this.definition
                .visualRadius +
            this.definition
                .captureAssistMargin;

        this.combinedCaptureDistance =
            this.effectiveCaptureRadius +
            this.ball.getRadius();
    }

    // -------------------------------------------------------------------------
    // Controlled Capture
    // -------------------------------------------------------------------------

    private beginCapture(): void {

        this.entryState =
            HoleEntryState.Capturing;

        this.captureElapsedTime = 0;

        this.captureStartX =
            this.ball.getX();

        this.captureStartY =
            this.ball.getY();

        this.captureStartScale =
            this.ball.getVisualScale();

        this.ball.beginHoleCapture();

        this.drawHole();

        console.log(
            "Valid Hole entry detected. Ball capture started.",
            this.getDebugState(),
        );
    }

    private updateCapture(
        deltaTime: number,
    ): void {

        this.captureElapsedTime +=
            deltaTime;

        const progress =
            this.clampNormalizedValue(
                this.captureElapsedTime /
                this.definition
                    .captureDuration,
            );

        const easedProgress =
            progress *
            progress *
            (
                3 -
                2 *
                progress
            );

        const positionX =
            this.interpolateNumber(
                this.captureStartX,
                this.getX(),
                easedProgress,
            );

        const positionY =
            this.interpolateNumber(
                this.captureStartY,
                this.getY(),
                easedProgress,
            );

        const visualScale =
            this.interpolateNumber(
                this.captureStartScale,
                this.definition
                    .capturedBallScale,
                easedProgress,
            );

        this.ball
            .setHoleCaptureTransform(
                positionX,
                positionY,
                visualScale,
            );

        if (
            progress <
            1
        ) {
            return;
        }

        this.ball
            .completeHoleCapture(
                this.getX(),
                this.getY(),
                this.definition
                    .capturedBallScale,
            );

        this.entryState =
            HoleEntryState.Holed;

        this.drawHole();

        console.log(
            "Ball holed.",
            this.getDebugState(),
        );
    }

    // -------------------------------------------------------------------------
    // Reset
    // -------------------------------------------------------------------------

    public resetEntryState(): void {

        this.entryState =
            HoleEntryState.Waiting;

        this.currentCentreDistance =
            Number.POSITIVE_INFINITY;

        this.sweptCentreDistance =
            Number.POSITIVE_INFINITY;

        this.evaluatedCentreDistance =
            Number.POSITIVE_INFINITY;

        this.updateCaptureGeometry();

        this.penetrationDepth = 0;
        this.entryRatio = 0;

        this.ballSpeed = 0;

        this.allowedCaptureSpeed =
            this.definition
                .minimumCaptureSpeed;

        this.hasMinimumEntry = false;
        this.isEntrySpeedValid = false;

        this.captureElapsedTime = 0;
        this.captureStartX = 0;
        this.captureStartY = 0;
        this.captureStartScale = 1;

        this.resetPreviousBallPosition();

        this.drawHole();
    }

    private resetPreviousBallPosition(): void {

        this.previousBallX =
            this.ball.getX();

        this.previousBallY =
            this.ball.getY();

        this.hasPreviousBallPosition =
            true;
    }

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    public getDefinition():
        HoleDefinition {

        return this.definition;
    }

    public getEntryState():
        HoleEntryState {

        return this.entryState;
    }

    public isCapturing(): boolean {

        return (
            this.entryState ===
            HoleEntryState.Capturing
        );
    }

    public isHoled(): boolean {

        return (
            this.entryState ===
            HoleEntryState.Holed
        );
    }

    public hasValidEntry(): boolean {

        return (
            this.isCapturing() ||
            this.isHoled()
        );
    }

    public isBallOverlapping(): boolean {

        return this.entryRatio > 0;
    }

    public getCentreDistance(): number {

        return this.evaluatedCentreDistance;
    }

    public getOverlapDistance(): number {

        return this.combinedCaptureDistance;
    }

    public getBallSpeed(): number {

        return this.ballSpeed;
    }

    public getCaptureProgress(): number {

        if (
            this.entryState ===
            HoleEntryState.Holed
        ) {
            return 1;
        }

        if (
            this.entryState !==
            HoleEntryState.Capturing
        ) {
            return 0;
        }

        return this.clampNormalizedValue(
            this.captureElapsedTime /
            this.definition
                .captureDuration,
        );
    }

    public getDebugState():
        HoleDebugState {

        return {
            state:
                this.entryState,

            currentCentreDistance:
                this.currentCentreDistance,

            sweptCentreDistance:
                this.sweptCentreDistance,

            evaluatedCentreDistance:
                this.evaluatedCentreDistance,

            effectiveCaptureRadius:
                this.effectiveCaptureRadius,

            combinedCaptureDistance:
                this.combinedCaptureDistance,

            penetrationDepth:
                this.penetrationDepth,

            entryRatio:
                this.entryRatio,

            minimumEntryRatio:
                this.definition
                    .minimumEntryRatio,

            ballSpeed:
                this.ballSpeed,

            allowedCaptureSpeed:
                this.allowedCaptureSpeed,

            minimumCaptureSpeed:
                this.definition
                    .minimumCaptureSpeed,

            maximumCaptureSpeed:
                this.definition
                    .maximumCaptureSpeed,

            hasMinimumEntry:
                this.hasMinimumEntry,

            isEntrySpeedValid:
                this.isEntrySpeedValid,

            captureProgress:
                this.getCaptureProgress(),
        };
    }

    // -------------------------------------------------------------------------
    // Rendering
    // -------------------------------------------------------------------------

    private drawHole(): void {

        if (
            !this.holeGraphics
        ) {
            return;
        }

        let outlineColor =
            this.definition
                .outlineColor;

        if (
            this.entryState ===
            HoleEntryState.OverlappingTooFast
        ) {
            outlineColor =
                this.definition
                    .tooFastOutlineColor;
        } else if (
            this.entryState ===
            HoleEntryState.Capturing ||
            this.entryState ===
            HoleEntryState.Holed
        ) {
            outlineColor =
                this.definition
                    .validEntryOutlineColor;
        }

        this.holeGraphics.clear();

        this.holeGraphics.circle(
            0,
            0,
            this.definition
                .visualRadius,
        );

        this.holeGraphics.fill({
            color:
                this.definition
                    .fillColor,

            alpha:
                this.definition
                    .fillAlpha,
        });

        this.holeGraphics.stroke({
            width:
                this.definition
                    .outlineWidth,

            color:
                outlineColor,

            alpha:
                this.definition
                    .outlineAlpha,
        });
    }

    private drawDebugCaptureRadius(): void {

        if (
            !this.debugGraphics
        ) {
            return;
        }

        this.debugGraphics.clear();

        this.debugGraphics.circle(
            0,
            0,
            this.effectiveCaptureRadius,
        );

        this.debugGraphics.stroke({
            width:
                this.definition
                    .debugCaptureRadiusWidth,

            color:
                this.definition
                    .debugCaptureRadiusColor,

            alpha:
                this.definition
                    .debugCaptureRadiusAlpha,
        });
    }

    // -------------------------------------------------------------------------
    // Validation and Utilities
    // -------------------------------------------------------------------------

    private validateDefinition(): void {

        const d =
            this.definition;

        const finiteValues = [
            d.positionX,
            d.positionY,
            d.visualRadius,
            d.captureAssistMargin,
            d.minimumEntryRatio,
            d.minimumCaptureSpeed,
            d.maximumCaptureSpeed,
            d.captureSpeedCurveExponent,
            d.captureDuration,
            d.capturedBallScale,
            d.fillAlpha,
            d.outlineAlpha,
            d.outlineWidth,
            d.debugCaptureRadiusAlpha,
            d.debugCaptureRadiusWidth,
        ];

        if (
            finiteValues.some(
                (value): boolean =>
                    !Number.isFinite(
                        value,
                    ),
            )
        ) {
            throw new Error(
                "Hole definition values must be finite numbers.",
            );
        }

        if (
            d.visualRadius <=
            0
        ) {
            throw new Error(
                "Hole visualRadius must be greater than zero.",
            );
        }

        if (
            d.captureAssistMargin <
            0
        ) {
            throw new Error(
                "Hole captureAssistMargin cannot be negative.",
            );
        }

        if (
            d.minimumEntryRatio <
            0 ||
            d.minimumEntryRatio >
            1
        ) {
            throw new Error(
                "Hole minimumEntryRatio must remain between zero and one.",
            );
        }

        if (
            d.minimumCaptureSpeed <
            0 ||
            d.maximumCaptureSpeed <
            d.minimumCaptureSpeed
        ) {
            throw new Error(
                "Hole capture-speed limits are invalid.",
            );
        }

        if (
            d.captureSpeedCurveExponent <=
            0
        ) {
            throw new Error(
                "Hole captureSpeedCurveExponent must be greater than zero.",
            );
        }

        if (
            d.captureDuration <=
            0
        ) {
            throw new Error(
                "Hole captureDuration must be greater than zero.",
            );
        }

        if (
            d.capturedBallScale <
            0
        ) {
            throw new Error(
                "Hole capturedBallScale cannot be negative.",
            );
        }

        if (
            d.fillAlpha <
            0 ||
            d.fillAlpha >
            1 ||
            d.outlineAlpha <
            0 ||
            d.outlineAlpha >
            1 ||
            d.debugCaptureRadiusAlpha <
            0 ||
            d.debugCaptureRadiusAlpha >
            1
        ) {
            throw new Error(
                "Hole alpha values must remain between zero and one.",
            );
        }

        if (
            d.outlineWidth <
            0 ||
            d.debugCaptureRadiusWidth <
            0
        ) {
            throw new Error(
                "Hole outline widths cannot be negative.",
            );
        }
    }

    private clampNormalizedValue(
        value: number,
    ): number {

        return Math.max(
            0,
            Math.min(
                value,
                1,
            ),
        );
    }

    private interpolateNumber(
        start: number,
        end: number,
        amount: number,
    ): number {

        const t =
            this.clampNormalizedValue(
                amount,
            );

        return (
            start +
            (
                end -
                start
            ) *
            t
        );
    }
}

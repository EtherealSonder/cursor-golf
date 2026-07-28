import {
    Graphics,
} from "pixi.js";

import type {
    AimGuideDefinition,
} from "../config/ClubDefinition";

import { Entity } from "./Entity";

export class AimIndicator extends Entity {

    private graphics:
        Graphics | null = null;

    // -------------------------------------------------------
    // Aim Guide Definition
    // -------------------------------------------------------

    private readonly definition:
        AimGuideDefinition;

    // -------------------------------------------------------
    // Current Guide State
    // -------------------------------------------------------

    private currentAngle = 0;

    private normalizedPower = 0;

    private currentAccuracyQuality = 1;

    private currentDotCount = 0;

    private currentGuideEndDistance = 0;

    private currentDotColor = 0xffffff;

    private currentDotAlpha = 1;

    constructor(
        definition: AimGuideDefinition,
    ) {

        super();

        this.definition =
            definition;

        this.validateDefinition();
    }

    // -------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------

    protected onInitialize(): void {

        this.graphics =
            new Graphics();

        this.container.addChild(
            this.graphics,
        );

        this.hide();
    }

    protected onUpdate(
        deltaTime: number,
    ): void {

        void deltaTime;
    }

    protected onDestroy(): void {

        this.graphics?.destroy();

        this.graphics = null;

        this.container.destroy({
            children: true,
        });
    }

    // -------------------------------------------------------
    // Definition Validation
    // -------------------------------------------------------

    private validateDefinition(): void {

        if (
            this.definition
                .startDistance <
            0
        ) {
            throw new Error(
                "AimIndicator start distance cannot be negative.",
            );
        }

        if (
            this.definition
                .dotSpacing <=
            0
        ) {
            throw new Error(
                "AimIndicator dot spacing must be greater than zero.",
            );
        }

        if (
            this.definition
                .maximumDotRadius <=
            0
        ) {
            throw new Error(
                "AimIndicator maximum dot radius must be greater than zero.",
            );
        }

        if (
            this.definition
                .minimumDotRadius <=
            0
        ) {
            throw new Error(
                "AimIndicator minimum dot radius must be greater than zero.",
            );
        }

        if (
            this.definition
                .minimumDotRadius >
            this.definition
                .maximumDotRadius
        ) {
            throw new Error(
                "AimIndicator minimum dot radius cannot exceed its maximum dot radius.",
            );
        }

        if (
            this.definition
                .minimumDots <
            1
        ) {
            throw new Error(
                "AimIndicator minimum dot count must be at least one.",
            );
        }

        if (
            this.definition
                .maximumDots <
            this.definition
                .minimumDots
        ) {
            throw new Error(
                "AimIndicator maximum dot count cannot be lower than its minimum dot count.",
            );
        }

        this.validateNormalizedValue(
            this.definition
                .optimalAlpha,
            "AimIndicator optimal alpha",
        );

        this.validateNormalizedValue(
            this.definition
                .edgeAlpha,
            "AimIndicator edge alpha",
        );

        if (
            this.definition
                .edgeAlpha >
            this.definition
                .optimalAlpha
        ) {
            throw new Error(
                "AimIndicator edge alpha cannot exceed its optimal alpha.",
            );
        }
    }

    private validateNormalizedValue(
        value: number,
        label: string,
    ): void {

        if (
            value < 0 ||
            value > 1
        ) {
            throw new Error(
                `${label} must remain between zero and one.`,
            );
        }
    }

    // -------------------------------------------------------
    // Visibility
    // -------------------------------------------------------

    public show(): void {

        this.setVisible(
            true,
        );
    }

    public hide(): void {

        this.setVisible(
            false,
        );

        this.graphics?.clear();

        this.currentDotCount = 0;
        this.currentGuideEndDistance = 0;

        this.currentAccuracyQuality = 1;

        this.currentDotColor =
            this.definition
                .optimalColor;

        this.currentDotAlpha =
            this.definition
                .optimalAlpha;
    }

    // -------------------------------------------------------
    // Direction and Accuracy
    // -------------------------------------------------------

    /**
     * Positions and redraws the dotted aiming
     * guide using current direction, power,
     * and timing accuracy.
     *
     * accuracyQuality:
     *
     * 1 = optimal range
     * 0 = maximum oscillation edge
     */
    public setDirection(
        centerX: number,
        centerY: number,
        angleRadians: number,
        normalizedPower: number,
        accuracyQuality: number,
    ): void {

        if (!this.graphics) {
            return;
        }

        this.container.position.set(
            centerX,
            centerY,
        );

        this.currentAngle =
            angleRadians;

        this.normalizedPower =
            this.clampNormalizedValue(
                normalizedPower,
            );

        this.currentAccuracyQuality =
            this.clampNormalizedValue(
                accuracyQuality,
            );

        this.currentDotCount =
            this.calculateDotCount();

        this.currentGuideEndDistance =
            this.calculateGuideEndDistance(
                this.currentDotCount,
            );

        this.currentDotColor =
            this.calculateCurrentDotColor();

        this.currentDotAlpha =
            this.calculateCurrentDotAlpha();

        this.redraw();
    }

    // -------------------------------------------------------
    // Dot Count Calculation
    // -------------------------------------------------------

    private calculateDotCount(): number {

        const maximumDots =
            this.definition
                .maximumDots;

        const minimumDots =
            this.definition
                .minimumDots;

        const dotRange =
            maximumDots -
            minimumDots;

        const interpolatedCount =
            maximumDots -
            this.normalizedPower *
            dotRange;

        return Math.round(
            interpolatedCount,
        );
    }

    private calculateGuideEndDistance(
        dotCount: number,
    ): number {

        if (dotCount <= 0) {
            return 0;
        }

        const finalDotIndex =
            dotCount -
            1;

        const finalDotCenterDistance =
            this.definition
                .startDistance +
            finalDotIndex *
            this.definition
                .dotSpacing;

        const finalDotRadius =
            this.calculateDotRadius(
                finalDotIndex,
                dotCount,
            );

        return (
            finalDotCenterDistance +
            finalDotRadius
        );
    }

    // -------------------------------------------------------
    // Dot Size Calculation
    // -------------------------------------------------------

    private calculateDotRadius(
        dotIndex: number,
        dotCount: number,
    ): number {

        if (dotCount <= 1) {
            return this.definition
                .maximumDotRadius;
        }

        const taperProgress =
            dotIndex /
            (
                dotCount -
                1
            );

        return this.interpolateNumber(
            this.definition
                .maximumDotRadius,
            this.definition
                .minimumDotRadius,
            taperProgress,
        );
    }

    // -------------------------------------------------------
    // Accuracy Appearance
    // -------------------------------------------------------

    /**
     * Interpolates from edge grey at quality 0
     * to bright white at quality 1.
     */
    private calculateCurrentDotColor(): number {

        return this.interpolateColor(
            this.definition
                .edgeColor,
            this.definition
                .optimalColor,
            this.currentAccuracyQuality,
        );
    }

    /**
     * Interpolates from reduced edge opacity at
     * quality 0 to full optimal opacity at 1.
     */
    private calculateCurrentDotAlpha(): number {

        return this.interpolateNumber(
            this.definition
                .edgeAlpha,
            this.definition
                .optimalAlpha,
            this.currentAccuracyQuality,
        );
    }

    // -------------------------------------------------------
    // Rendering
    // -------------------------------------------------------

    private redraw(): void {

        if (!this.graphics) {
            return;
        }

        this.graphics.clear();

        if (
            this.currentDotCount <=
            0
        ) {
            return;
        }

        const directionX =
            Math.cos(
                this.currentAngle,
            );

        const directionY =
            Math.sin(
                this.currentAngle,
            );

        this.drawDottedGuide(
            directionX,
            directionY,
        );
    }

    private drawDottedGuide(
        directionX: number,
        directionY: number,
    ): void {

        if (!this.graphics) {
            return;
        }

        for (
            let dotIndex = 0;
            dotIndex <
            this.currentDotCount;
            dotIndex += 1
        ) {

            const dotDistance =
                this.definition
                    .startDistance +
                dotIndex *
                this.definition
                    .dotSpacing;

            const dotX =
                directionX *
                dotDistance;

            const dotY =
                directionY *
                dotDistance;

            const dotRadius =
                this.calculateDotRadius(
                    dotIndex,
                    this.currentDotCount,
                );

            this.graphics
                .circle(
                    dotX,
                    dotY,
                    dotRadius,
                )
                .fill({
                    color:
                        this.currentDotColor,

                    alpha:
                        this.currentDotAlpha,
                });
        }
    }

    // -------------------------------------------------------
    // Utilities
    // -------------------------------------------------------

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
        startValue: number,
        endValue: number,
        interpolation: number,
    ): number {

        const amount =
            this.clampNormalizedValue(
                interpolation,
            );

        return (
            startValue +
            (
                endValue -
                startValue
            ) *
            amount
        );
    }

    private interpolateColor(
        startColor: number,
        endColor: number,
        interpolation: number,
    ): number {

        const amount =
            this.clampNormalizedValue(
                interpolation,
            );

        const startRed =
            (
                startColor >>
                16
            ) &
            0xff;

        const startGreen =
            (
                startColor >>
                8
            ) &
            0xff;

        const startBlue =
            startColor &
            0xff;

        const endRed =
            (
                endColor >>
                16
            ) &
            0xff;

        const endGreen =
            (
                endColor >>
                8
            ) &
            0xff;

        const endBlue =
            endColor &
            0xff;

        const red =
            Math.round(
                startRed +
                (
                    endRed -
                    startRed
                ) *
                amount,
            );

        const green =
            Math.round(
                startGreen +
                (
                    endGreen -
                    startGreen
                ) *
                amount,
            );

        const blue =
            Math.round(
                startBlue +
                (
                    endBlue -
                    startBlue
                ) *
                amount,
            );

        return (
            (
                red <<
                16
            ) |
            (
                green <<
                8
            ) |
            blue
        );
    }

    // -------------------------------------------------------
    // Definition
    // -------------------------------------------------------

    public getDefinition():
        AimGuideDefinition {

        return this.definition;
    }

    // -------------------------------------------------------
    // Debug
    // -------------------------------------------------------

    public getAngle(): number {
        return this.currentAngle;
    }

    public getNormalizedPower(): number {
        return this.normalizedPower;
    }

    public getAccuracyQuality(): number {
        return this.currentAccuracyQuality;
    }

    public getDotCount(): number {
        return this.currentDotCount;
    }

    /**
     * Temporarily retained for compatibility.
     */
    public getSegmentCount(): number {
        return this.currentDotCount;
    }

    public getGuideEndDistance(): number {
        return this.currentGuideEndDistance;
    }

    public getCurrentDotColor(): number {
        return this.currentDotColor;
    }

    public getCurrentDotAlpha(): number {
        return this.currentDotAlpha;
    }
}
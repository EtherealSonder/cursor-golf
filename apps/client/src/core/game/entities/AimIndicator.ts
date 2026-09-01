import {
    Graphics,
} from "pixi.js";

import type {
    AimGuideDefinition,
} from "../config/ClubDefinition";

import {
    Entity,
} from "./Entity";

/**
 * Simple dotted aim guide.
 *
 * The complete guide rotates with the current oscillating aim angle.
 * Power changes only the number of visible dots.
 */
export class AimIndicator extends Entity {

    private graphics:
        Graphics | null = null;

    private readonly definition:
        AimGuideDefinition;

    private currentAngle = 0;
    private normalizedPower = 0;
    private currentDotCount = 0;
    private currentGuideEndDistance = 0;
    private hasDirectionData = false;

    constructor(
        definition:
            AimGuideDefinition,
    ) {

        super();

        this.definition =
            definition;

        this.validateDefinition();
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

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

        /*
         * ShotController supplies fresh direction data while preparing.
         * No independent visual animation is required.
         */
    }

    protected onDestroy(): void {

        this.graphics
            ?.destroy();

        this.graphics =
            null;

        this.container.destroy({
            children:
                true,
        });
    }

    // -------------------------------------------------------------------------
    // Visibility and Direction
    // -------------------------------------------------------------------------

    public show(): void {

        this.setVisible(
            true,
        );
    }

    public hide(): void {

        this.setVisible(
            false,
        );

        this.graphics
            ?.clear();

        this.currentDotCount = 0;
        this.currentGuideEndDistance = 0;
        this.normalizedPower = 0;
        this.hasDirectionData = false;

        this.container.scale.set(
            1,
        );
    }

    public setDirection(
        centerX: number,
        centerY: number,
        angleRadians: number,
        normalizedPower: number,
    ): void {

        if (
            !this.graphics
        ) {
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

        this.currentDotCount =
            this.calculateDotCount();

        this.currentGuideEndDistance =
            this.calculateGuideEndDistance(
                this.currentDotCount,
            );

        this.hasDirectionData =
            true;

        this.redraw();
    }

    // -------------------------------------------------------------------------
    // Guide Calculation
    // -------------------------------------------------------------------------

    private calculateDotCount(): number {

        const range =
            this.definition
                .maximumDots -
            this.definition
                .minimumDots;

        return Math.round(
            this.definition
                .minimumDots +
            this.normalizedPower *
            range,
        );
    }

    private calculateGuideEndDistance(
        dotCount: number,
    ): number {

        if (
            dotCount <=
            0
        ) {
            return 0;
        }

        return (
            this.definition
                .startDistance +
            (
                dotCount -
                1
            ) *
            this.definition
                .dotSpacing +
            this.definition
                .dotRadius
        );
    }

    // -------------------------------------------------------------------------
    // Rendering
    // -------------------------------------------------------------------------

    private redraw(): void {

        if (
            !this.graphics
        ) {
            return;
        }

        this.graphics.clear();

        if (
            !this.hasDirectionData ||
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

        for (
            let dotIndex = 0;
            dotIndex <
            this.currentDotCount;
            dotIndex += 1
        ) {
            const distance =
                this.definition
                    .startDistance +
                dotIndex *
                this.definition
                    .dotSpacing;

            const x =
                directionX *
                distance;

            const y =
                directionY *
                distance;

            this.graphics.circle(
                x,
                y,
                this.definition
                    .dotRadius,
            );

            this.graphics.fill({
                color:
                    this.definition
                        .dotColor,

                alpha:
                    this.definition
                        .dotAlpha,
            });
        }
    }

    // -------------------------------------------------------------------------
    // Validation
    // -------------------------------------------------------------------------

    private validateDefinition(): void {

        const d =
            this.definition;

        if (
            !Number.isFinite(
                d.startDistance,
            ) ||
            !Number.isFinite(
                d.dotSpacing,
            ) ||
            !Number.isFinite(
                d.dotRadius,
            ) ||
            !Number.isFinite(
                d.minimumDots,
            ) ||
            !Number.isFinite(
                d.maximumDots,
            ) ||
            !Number.isFinite(
                d.dotAlpha,
            )
        ) {
            throw new Error(
                "AimIndicator definition values must be finite.",
            );
        }

        if (
            d.startDistance <
            0 ||
            d.dotSpacing <=
            0 ||
            d.dotRadius <=
            0
        ) {
            throw new Error(
                "AimIndicator guide geometry is invalid.",
            );
        }

        if (
            !Number.isInteger(
                d.minimumDots,
            ) ||
            !Number.isInteger(
                d.maximumDots,
            ) ||
            d.minimumDots <
            1 ||
            d.maximumDots <
            d.minimumDots
        ) {
            throw new Error(
                "AimIndicator dot-count limits are invalid.",
            );
        }

        if (
            d.dotAlpha <
            0 ||
            d.dotAlpha >
            1
        ) {
            throw new Error(
                "AimIndicator dotAlpha must remain between zero and one.",
            );
        }
    }

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    public getDefinition():
        AimGuideDefinition {

        return this.definition;
    }

    public getAngle(): number {

        return this.currentAngle;
    }

    public getNormalizedPower(): number {

        return this.normalizedPower;
    }

    /**
     * Compatibility getter retained for current debug tooling.
     *
     * The simplified guide no longer visualizes accuracy quality.
     */
    public getAccuracyQuality(): number {

        return 1;
    }

    public getDotCount(): number {

        return this.currentDotCount;
    }

    public getSegmentCount(): number {

        return this.currentDotCount;
    }

    public getGuideEndDistance(): number {

        return this.currentGuideEndDistance;
    }

    public getCurrentDotColor(): number {

        return this.definition
            .dotColor;
    }

    public getCurrentDotAlpha(): number {

        return this.definition
            .dotAlpha;
    }

    // -------------------------------------------------------------------------
    // Utilities
    // -------------------------------------------------------------------------

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
}

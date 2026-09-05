import {
    Graphics,
} from "pixi.js";

import {
    DEFAULT_LOCAL_WIND_DEBUG_VISUAL_DEFINITION,
} from "../config/LocalWindDefinition";

import type {
    LocalWindDebugVisualDefinition,
    LocalWindSourceDefinition,
} from "../config/LocalWindDefinition";

import type {
    LocalWindSystem,
} from "../environment/LocalWindSystem";

/**
 * Development-only visualization of the authoritative LocalWindSystem field.
 *
 * The visualizer renders the exact authored Local Wind volume for every
 * enabled source. Fan sources currently use equal start/end half-widths,
 * therefore their authoritative field appears as a straight rectangle:
 *
 * source origin -> constant-width side boundaries -> range end
 *
 * It owns no simulation state and never changes LocalWindSystem values.
 */
export class LocalWindDebugVisualizer {

    private readonly localWindSystem:
        LocalWindSystem;

    private readonly definition:
        LocalWindDebugVisualDefinition;

    private readonly graphics:
        Graphics;

    private visible:
        boolean;

    private destroyed =
        false;

    public constructor(
        localWindSystem:
            LocalWindSystem,

        definition:
            LocalWindDebugVisualDefinition =
            DEFAULT_LOCAL_WIND_DEBUG_VISUAL_DEFINITION,
    ) {
        this.localWindSystem =
            localWindSystem;

        this.definition =
            definition;

        this.validateDefinition(
            definition,
        );

        this.visible =
            definition.enabledByDefault;

        this.graphics =
            new Graphics();

        this.graphics.visible =
            this.visible;
    }

    public getGraphics():
        Graphics {
        return this.graphics;
    }

    public setVisible(
        visible:
            boolean,
    ): void {
        if (this.destroyed) {
            return;
        }

        this.visible =
            visible;

        this.graphics.visible =
            visible;

        if (!visible) {
            this.graphics.clear();
            return;
        }

        this.update();
    }

    public isVisible():
        boolean {
        return this.visible;
    }

    public update():
        void {
        if (
            this.destroyed ||
            !this.visible
        ) {
            return;
        }

        this.graphics.clear();

        for (
            const source
            of this.localWindSystem
                .getSources()
        ) {
            if (
                !source.enabled ||
                source.id.startsWith(
                    "fire-validation-field-",
                )
            ) {
                continue;
            }

            this.drawSource(
                source,
            );
        }
    }

    public destroy():
        void {
        if (this.destroyed) {
            return;
        }

        this.destroyed =
            true;

        this.graphics
            .removeFromParent();

        this.graphics.destroy();
    }

    private drawSource(
        source:
            LocalWindSourceDefinition,
    ): void {
        const directionX =
            Math.cos(
                source.directionRadians,
            );

        const directionY =
            Math.sin(
                source.directionRadians,
            );

        const perpendicularX =
            -directionY;

        const perpendicularY =
            directionX;

        const startCenterX =
            source.positionX;

        const startCenterY =
            source.positionY;

        const endCenterX =
            startCenterX +
            directionX *
            source.range;

        const endCenterY =
            startCenterY +
            directionY *
            source.range;

        const startLeftX =
            startCenterX +
            perpendicularX *
            source.startHalfWidth;

        const startLeftY =
            startCenterY +
            perpendicularY *
            source.startHalfWidth;

        const startRightX =
            startCenterX -
            perpendicularX *
            source.startHalfWidth;

        const startRightY =
            startCenterY -
            perpendicularY *
            source.startHalfWidth;

        const endLeftX =
            endCenterX +
            perpendicularX *
            source.endHalfWidth;

        const endLeftY =
            endCenterY +
            perpendicularY *
            source.endHalfWidth;

        const endRightX =
            endCenterX -
            perpendicularX *
            source.endHalfWidth;

        const endRightY =
            endCenterY -
            perpendicularY *
            source.endHalfWidth;

        /*
         * Exact Local Wind field footprint. The four points are calculated
         * from the same source position/direction/range/width values consumed
         * by gameplay physics. When startHalfWidth === endHalfWidth this is a
         * straight rectangular tube, which is the intended Fan configuration.
         */
        this.graphics
            .moveTo(
                startLeftX,
                startLeftY,
            )
            .lineTo(
                endLeftX,
                endLeftY,
            )
            .lineTo(
                endRightX,
                endRightY,
            )
            .lineTo(
                startRightX,
                startRightY,
            )
            .closePath()
            .fill({
                color:
                    this.definition.fillColor,
                alpha:
                    this.definition.fillAlpha,
            })
            .stroke({
                width:
                    this.definition.lineWidth,
                color:
                    this.definition.lineColor,
                alpha:
                    this.definition.lineAlpha,
            });

        /* Center direction line from authoritative source origin to range end. */
        this.graphics
            .moveTo(
                startCenterX,
                startCenterY,
            )
            .lineTo(
                endCenterX,
                endCenterY,
            )
            .stroke({
                width:
                    this.definition.centerLineWidth,
                color:
                    this.definition.centerLineColor,
                alpha:
                    this.definition.centerLineAlpha,
            });

        /* Source/outlet marker. */
        this.graphics
            .circle(
                startCenterX,
                startCenterY,
                this.definition.originRadius,
            )
            .fill({
                color:
                    this.definition.originColor,
                alpha:
                    this.definition.originAlpha,
            })
            .stroke({
                width:
                    this.definition.lineWidth,
                color:
                    this.definition.lineColor,
                alpha:
                    this.definition.lineAlpha,
            });

        this.drawDirectionArrow(
            endCenterX,
            endCenterY,
            directionX,
            directionY,
            perpendicularX,
            perpendicularY,
        );
    }

    private drawDirectionArrow(
        endX:
            number,

        endY:
            number,

        directionX:
            number,

        directionY:
            number,

        perpendicularX:
            number,

        perpendicularY:
            number,
    ): void {
        const arrowTipX =
            endX +
            directionX *
            this.definition.directionArrowLength;

        const arrowTipY =
            endY +
            directionY *
            this.definition.directionArrowLength;

        const arrowBaseX =
            arrowTipX -
            directionX *
            this.definition.arrowHeadLength;

        const arrowBaseY =
            arrowTipY -
            directionY *
            this.definition.arrowHeadLength;

        const headHalfWidth =
            this.definition.arrowHeadLength *
            0.55;

        const leftX =
            arrowBaseX +
            perpendicularX *
            headHalfWidth;

        const leftY =
            arrowBaseY +
            perpendicularY *
            headHalfWidth;

        const rightX =
            arrowBaseX -
            perpendicularX *
            headHalfWidth;

        const rightY =
            arrowBaseY -
            perpendicularY *
            headHalfWidth;

        this.graphics
            .moveTo(
                endX,
                endY,
            )
            .lineTo(
                arrowTipX,
                arrowTipY,
            )
            .stroke({
                width:
                    this.definition.centerLineWidth,
                color:
                    this.definition.directionArrowColor,
                alpha:
                    this.definition.directionArrowAlpha,
            });

        this.graphics
            .moveTo(
                arrowTipX,
                arrowTipY,
            )
            .lineTo(
                leftX,
                leftY,
            )
            .lineTo(
                rightX,
                rightY,
            )
            .closePath()
            .fill({
                color:
                    this.definition.directionArrowColor,
                alpha:
                    this.definition.directionArrowAlpha,
            });
    }

    private validateDefinition(
        definition:
            LocalWindDebugVisualDefinition,
    ): void {
        const nonNegativeFiniteValues = [
            definition.fillAlpha,
            definition.lineWidth,
            definition.lineAlpha,
            definition.centerLineWidth,
            definition.centerLineAlpha,
            definition.originRadius,
            definition.originAlpha,
            definition.directionArrowLength,
            definition.arrowHeadLength,
            definition.directionArrowAlpha,
        ];

        if (
            !nonNegativeFiniteValues.every(
                (value): boolean =>
                    Number.isFinite(value) &&
                    value >= 0,
            )
        ) {
            throw new Error(
                "Local Wind debug visual values must be finite and non-negative.",
            );
        }

        const alphaValues = [
            definition.fillAlpha,
            definition.lineAlpha,
            definition.centerLineAlpha,
            definition.originAlpha,
            definition.directionArrowAlpha,
        ];

        if (
            !alphaValues.every(
                (value): boolean =>
                    value <= 1,
            )
        ) {
            throw new Error(
                "Local Wind debug alpha values must remain between zero and one.",
            );
        }
    }
}

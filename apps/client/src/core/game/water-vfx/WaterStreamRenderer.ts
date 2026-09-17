import {
    Container,
    Graphics,
} from "pixi.js";

import type {
    WaterVfxStreamDefinition,
} from "../config/WaterVfxDefinition";

export interface WaterStreamPresentation {
    readonly startX: number;
    readonly startY: number;
    readonly endX: number;
    readonly endY: number;
    readonly startWidth: number;
    readonly endWidth: number;
    readonly bodyColor?: number;
    readonly highlightColor?: number;
    readonly bodyAlpha?: number;
    readonly highlightAlpha?: number;
    readonly highlightWidthFraction?: number;
}

/**
 * Presentation-only continuous Water stream foundation.
 *
 * This renderer deliberately does not know about AirborneWaterSystem,
 * Sprinkler, HydrantHose, WaterField, collision, pressure, or deposition.
 * Later emitters/controllers provide presentation endpoints derived from
 * authoritative state.
 */
export class WaterStreamRenderer {
    private readonly container = new Container();
    private readonly bodyGraphics = new Graphics();
    private readonly highlightGraphics = new Graphics();

    private readonly definition: WaterVfxStreamDefinition;
    private visible = false;

    public constructor(
        definition: WaterVfxStreamDefinition,
    ) {
        this.definition = definition;

        this.container.addChild(
            this.bodyGraphics,
            this.highlightGraphics,
        );

        this.container.visible = false;
    }

    public getContainer(): Container {
        return this.container;
    }

    public setStream(stream: WaterStreamPresentation): void {
        const dx = stream.endX - stream.startX;
        const dy = stream.endY - stream.startY;
        const length = Math.hypot(dx, dy);

        if (
            !Number.isFinite(length) ||
            length < this.definition.minimumLength
        ) {
            this.hide();
            return;
        }

        const inverseLength = 1 / length;
        const normalX = -dy * inverseLength;
        const normalY = dx * inverseLength;

        const startWidth = this.clampWidth(stream.startWidth);
        const endWidth = this.clampWidth(stream.endWidth);

        const startHalf = startWidth * 0.5;
        const endHalf = endWidth * 0.5;

        const bodyColor = stream.bodyColor ?? this.definition.bodyColor;
        const bodyAlpha = this.clamp01(
            stream.bodyAlpha ?? this.definition.bodyAlpha,
        );

        this.bodyGraphics.clear();
        this.bodyGraphics
            .poly([
                stream.startX + normalX * startHalf,
                stream.startY + normalY * startHalf,
                stream.endX + normalX * endHalf,
                stream.endY + normalY * endHalf,
                stream.endX - normalX * endHalf,
                stream.endY - normalY * endHalf,
                stream.startX - normalX * startHalf,
                stream.startY - normalY * startHalf,
            ])
            .fill({
                color: bodyColor,
                alpha: bodyAlpha,
            });

        const highlightWidthFraction = this.clamp01(
            stream.highlightWidthFraction ??
            this.definition.highlightWidthFraction,
        );

        const highlightStartHalf =
            startHalf * highlightWidthFraction;
        const highlightEndHalf =
            endHalf * highlightWidthFraction;

        this.highlightGraphics.clear();

        if (highlightWidthFraction > 0) {
            this.highlightGraphics
                .poly([
                    stream.startX + normalX * highlightStartHalf,
                    stream.startY + normalY * highlightStartHalf,
                    stream.endX + normalX * highlightEndHalf,
                    stream.endY + normalY * highlightEndHalf,
                    stream.endX - normalX * highlightEndHalf,
                    stream.endY - normalY * highlightEndHalf,
                    stream.startX - normalX * highlightStartHalf,
                    stream.startY - normalY * highlightStartHalf,
                ])
                .fill({
                    color:
                        stream.highlightColor ??
                        this.definition.highlightColor,
                    alpha:
                        this.clamp01(
                            stream.highlightAlpha ??
                            this.definition.highlightAlpha,
                        ),
                });
        }

        this.visible = true;
        this.container.visible = true;
    }

    public hide(): void {
        if (!this.visible) {
            return;
        }

        this.visible = false;
        this.container.visible = false;
        this.bodyGraphics.clear();
        this.highlightGraphics.clear();
    }

    public reset(): void {
        this.hide();
    }

    public destroy(): void {
        this.bodyGraphics.destroy();
        this.highlightGraphics.destroy();

        this.container.removeFromParent();
        this.container.destroy({
            children: false,
        });
    }

    private clampWidth(width: number): number {
        if (!Number.isFinite(width)) {
            return this.definition.minimumWidth;
        }

        return Math.max(
            this.definition.minimumWidth,
            Math.min(
                this.definition.maximumWidth,
                width,
            ),
        );
    }

    private clamp01(value: number): number {
        return Math.max(0, Math.min(1, value));
    }
}

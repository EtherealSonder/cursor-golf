import { Graphics } from "pixi.js";
import {
    DEFAULT_AIM_INDICATOR_DEFINITION,
    type AimIndicatorDefinition,
} from "../config/AimIndicatorDefinition";
import { Entity } from "./Entity";

/**
 * Forward shot direction + power meter.
 *
 * The silhouette begins at the Ball edge, grows strongly with normalized
 * power, and ends in a compact tapered point. Six chevron-ended bands
 * communicate power progression. A white band travels outward continuously
 * as a directional visual cue.
 */
export class AimIndicator extends Entity {
    private graphics: Graphics | null = null;

    private currentAngle = 0;
    private normalizedPower = 0;
    private currentLength = 0;
    private currentThickness = 0;
    private hasDirectionData = false;

    private pulseElapsed = 0;
    private pulseBandIndex = 0;

    public constructor(
        private readonly definition: AimIndicatorDefinition =
            DEFAULT_AIM_INDICATOR_DEFINITION,
    ) {
        super();
        this.validateDefinition();
    }

    protected onInitialize(): void {
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
        this.hide();
    }

    protected onUpdate(deltaTime: number): void {
        if (!this.hasDirectionData || !this.definition.pulseEnabled) {
            return;
        }

        const dt = Number.isFinite(deltaTime) ? Math.max(0, deltaTime) : 0;
        const cycleDuration =
            this.definition.pulseBandDuration * 6 +
            this.definition.pulseGapDuration;

        this.pulseElapsed = (this.pulseElapsed + dt) % cycleDuration;

        const activeDuration = this.definition.pulseBandDuration * 6;
        this.pulseBandIndex =
            this.pulseElapsed < activeDuration
                ? Math.min(
                    5,
                    Math.floor(
                        this.pulseElapsed /
                        this.definition.pulseBandDuration,
                    ),
                )
                : -1;

        this.redraw();
    }

    protected onDestroy(): void {
        this.graphics?.destroy();
        this.graphics = null;
        this.container.destroy({ children: true });
    }

    public show(): void {
        this.setVisible(true);
    }

    public hide(): void {
        this.setVisible(false);
        this.graphics?.clear();
        this.normalizedPower = 0;
        this.currentLength = 0;
        this.currentThickness = 0;
        this.hasDirectionData = false;
        this.pulseElapsed = 0;
        this.pulseBandIndex = 0;
        this.container.rotation = 0;
    }

    public setDirection(
        centerX: number,
        centerY: number,
        angleRadians: number,
        normalizedPower: number,
    ): void {
        if (!this.graphics) {
            return;
        }

        this.container.position.set(centerX, centerY);
        this.container.rotation = angleRadians;

        this.currentAngle = angleRadians;
        this.normalizedPower = this.clamp01(normalizedPower);

        const readablePower = Math.max(
            this.definition.minimumReadablePower,
            this.normalizedPower,
        );
        const growth = this.clamp01(
            (readablePower - this.definition.minimumReadablePower) /
            Math.max(0.001, 1 - this.definition.minimumReadablePower),
        );

        this.currentLength = this.lerp(
            this.definition.minimumLength,
            this.definition.maximumLength,
            growth,
        );

        this.currentThickness = this.lerp(
            this.definition.minimumThickness,
            this.definition.maximumThickness,
            this.normalizedPower,
        );

        this.hasDirectionData = true;
        this.redraw();
    }

    private redraw(): void {
        const g = this.graphics;
        if (!g || !this.hasDirectionData) return;
        g.clear();

        const d = this.definition;
        const startX = d.startOffset;
        const length = this.currentLength;
        const half = this.currentThickness * 0.5;
        const tipLength = Math.min(d.tipLength, Math.max(8, length * 0.22));
        const bodyLength = Math.max(0, length - tipLength);
        const tipX = startX + length;

        // The silhouette itself grows with power. There is no long,
        // permanently visible full-power shell.
        this.drawMeterSilhouette(g, startX, bodyLength, tipX, half);
        g.fill({ color: d.trackColor, alpha: d.trackAlpha });

        // At least one band is visible for directional readability. More
        // bands progressively enter as power rises.
        const exactBands = Math.max(1, this.normalizedPower * 6);
        const visibleBands = Math.min(6, Math.max(1, Math.ceil(exactBands)));
        const bandWidth = bodyLength / visibleBands;

        for (let i = 0; i < visibleBands; i += 1) {
            if (i === visibleBands - 1) {
                this.drawTerminalBodyBand(
                    g,
                    startX,
                    i * bandWidth,
                    bodyLength,
                    half,
                    d.bandColors[i],
                    d.fillAlpha,
                    i > 0,
                );
            } else {
                this.drawContiguousBand(
                    g,
                    startX,
                    i * bandWidth,
                    (i + 1) * bandWidth,
                    half,
                    d.bandColors[i],
                    d.fillAlpha,
                    i > 0,
                );
            }
        }

        const terminalIndex = Math.max(0, visibleBands - 1);
        this.drawTip(
            g,
            startX + bodyLength,
            tipX,
            half,
            d.bandColors[terminalIndex],
            d.fillAlpha,
        );

        // Preserve the outward traveling white-band cue.
        if (
            d.pulseEnabled &&
            this.pulseBandIndex >= 0 &&
            this.pulseBandIndex < visibleBands
        ) {
            const i = this.pulseBandIndex;
            if (i === visibleBands - 1) {
                this.drawTerminalBodyBand(
                    g,
                    startX,
                    i * bandWidth,
                    bodyLength,
                    half,
                    d.pulseColor,
                    d.pulseAlpha,
                    i > 0,
                );
            } else {
                this.drawContiguousBand(
                    g,
                    startX,
                    i * bandWidth,
                    (i + 1) * bandWidth,
                    half,
                    d.pulseColor,
                    d.pulseAlpha,
                    i > 0,
                );
            }

            if (i === visibleBands - 1) {
                this.drawTip(
                    g,
                    startX + bodyLength,
                    tipX,
                    half,
                    d.pulseColor,
                    d.pulseAlpha,
                );
            }
        }

        this.drawMeterSilhouette(g, startX, bodyLength, tipX, half);
        g.stroke({
            color: d.outlineColor,
            width: d.outlineThickness,
            alpha: 1,
        });
    }

    private drawMeterSilhouette(
        g: Graphics,
        startX: number,
        bodyLength: number,
        tipX: number,
        half: number,
    ): void {
        const shoulderX = startX + bodyLength;
        g.moveTo(startX, -half)
            .lineTo(shoulderX, -half)
            .lineTo(tipX, 0)
            .lineTo(shoulderX, half)
            .lineTo(startX, half)
            .closePath();
    }

    private drawContiguousBand(
        g: Graphics,
        startX: number,
        localStart: number,
        localEnd: number,
        half: number,
        color: number,
        alpha: number,
        hasPreviousBand: boolean,
    ): void {
        const d = this.definition;
        const overlap = hasPreviousBand
            ? Math.min(d.bandOverlap, localStart)
            : 0;
        const x0 = startX + localStart - overlap;
        const x1 = startX + localEnd;
        const depth = Math.min(d.chevronDepth, Math.max(0, x1 - x0));

        // Overlap fills the rear chevron wedge, so no ground-colored
        // triangular gap can appear between neighbouring bands.
        g.moveTo(x0, -half)
            .lineTo(Math.max(x0, x1 - depth), -half)
            .lineTo(x1, 0)
            .lineTo(Math.max(x0, x1 - depth), half)
            .lineTo(x0, half)
            .closePath();
        g.fill({ color, alpha });
    }


    private drawTerminalBodyBand(
        g: Graphics,
        startX: number,
        localStart: number,
        localEnd: number,
        half: number,
        color: number,
        alpha: number,
        hasPreviousBand: boolean,
    ): void {
        const overlap = hasPreviousBand
            ? Math.min(this.definition.bandOverlap, localStart)
            : 0;
        const x0 = startX + localStart - overlap;
        const x1 = startX + localEnd;

        // The terminal band fills the complete shoulder height. The tapered
        // tip begins from this same full-height edge, so no wedge can expose
        // the ground beneath the final colour band.
        g.rect(x0, -half, Math.max(0, x1 - x0), half * 2);
        g.fill({ color, alpha });
    }

    private drawTip(
        g: Graphics,
        shoulderX: number,
        tipX: number,
        half: number,
        color: number,
        alpha: number,
    ): void {
        g.moveTo(shoulderX, -half)
            .lineTo(tipX, 0)
            .lineTo(shoulderX, half)
            .closePath();
        g.fill({ color, alpha });
    }

    private validateDefinition(): void {
        const d = this.definition;

        const finite = [
            d.ballRadius,
            d.startOffset,
            d.minimumLength,
            d.maximumLength,
            d.minimumThickness,
            d.maximumThickness,
            d.minimumReadablePower,
            d.outlineThickness,
            d.trackAlpha,
            d.tipLength,
            d.chevronDepth,
            d.bandOverlap,
            d.fillAlpha,
            d.pulseBandDuration,
            d.pulseGapDuration,
            d.pulseAlpha,
        ].every(Number.isFinite);

        if (
            !finite ||
            d.ballRadius < 0 ||
            d.minimumLength <= 0 ||
            d.maximumLength < d.minimumLength ||
            d.minimumThickness <= 0 ||
            d.maximumThickness < d.minimumThickness ||
            d.minimumReadablePower <= 0 ||
            d.minimumReadablePower >= 1 ||
            d.outlineThickness < 0 ||
            d.trackAlpha < 0 ||
            d.trackAlpha > 1 ||
            d.tipLength <= 0 ||
            d.tipLength >= d.minimumLength ||
            d.chevronDepth < 0 ||
            d.bandOverlap < 0 ||
            d.fillAlpha < 0 ||
            d.fillAlpha > 1 ||
            d.pulseBandDuration <= 0 ||
            d.pulseGapDuration < 0 ||
            d.pulseAlpha < 0 ||
            d.pulseAlpha > 1 ||
            d.bandColors.length !== 6
        ) {
            throw new Error(
                "AimIndicator segmented power-meter definition is invalid.",
            );
        }
    }

    public getDefinition(): AimIndicatorDefinition {
        return this.definition;
    }

    public getAngle(): number {
        return this.currentAngle;
    }

    public getNormalizedPower(): number {
        return this.normalizedPower;
    }

    public getMeterLength(): number {
        return this.currentLength;
    }

    public getMeterThickness(): number {
        return this.currentThickness;
    }

    public getFilledLength(): number {
        return this.currentLength * this.normalizedPower;
    }

    public getActiveBandCount(): number {
        return Math.min(
            6,
            Math.ceil(this.normalizedPower * 6),
        );
    }

    public getPulseBandIndex(): number {
        return this.pulseBandIndex;
    }

    public getAccuracyQuality(): number {
        return 1;
    }

    private clamp01(value: number): number {
        return Math.max(0, Math.min(value, 1));
    }

    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }
}

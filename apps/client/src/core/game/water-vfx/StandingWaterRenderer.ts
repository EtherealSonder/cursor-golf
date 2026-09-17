import {
    Container,
} from "pixi.js";

import {
    WaterPresentationDefinition,
} from "../config/WaterPresentationDefinition";

import type {
    WaterPresentationDefinitionType,
} from "../config/WaterPresentationDefinition";

import type {
    WaterField,
} from "../environment/WaterField";

import {
    ScalarFieldTexture,
} from "../../rendering/ScalarFieldTexture";

import {
    getStandingWaterAlpha,
    getStandingWaterDepthFactor,
    getStandingWaterHighlightStrength,
} from "./StandingWaterShader";

/**
 * Phase 8I-2 production standing-Water presentation.
 *
 * WaterField remains authoritative. The renderer mirrors tracked Water cells
 * into a presentation texture fixed in world space. The body is deliberately
 * near opaque and depth is expressed mainly through restrained colour changes.
 */
export class StandingWaterRenderer {
    private readonly container: Container;
    private readonly fieldTexture: ScalarFieldTexture;
    private readonly cellCount: number;
    private readonly columnCount: number;

    private readonly directAlpha: Float32Array;
    private readonly directDepth: Float32Array;
    private readonly touchedFlags: Uint8Array;
    private readonly touchedIndices: number[] = [];

    private refreshAccumulator = 0;
    private destroyed = false;

    public constructor(
        private readonly waterField: WaterField,
        private readonly definition: WaterPresentationDefinitionType =
            WaterPresentationDefinition,
    ) {
        this.container = new Container();
        this.cellCount = waterField.getCellCount();
        this.columnCount = waterField.getColumnCount();

        this.directAlpha = new Float32Array(this.cellCount);
        this.directDepth = new Float32Array(this.cellCount);
        this.touchedFlags = new Uint8Array(this.cellCount);

        const cellSize = waterField.getDefinition().cellSize;

        this.fieldTexture = new ScalarFieldTexture({
            columnCount: waterField.getColumnCount(),
            rowCount: waterField.getRowCount(),
            cellSize,
            minimumWorldX: waterField.getMinimumWorldX(),
            minimumWorldY: waterField.getMinimumWorldY(),
        });

        this.fieldTexture.getSprite().visible =
            definition.enabled && definition.standingWater.enabled;

        this.container.addChild(this.fieldTexture.getSprite());
        this.redrawImmediately();
    }

    public getDisplayObject(): Container {
        return this.container;
    }

    public update(deltaTime: number): void {
        if (
            this.destroyed ||
            !this.definition.enabled ||
            !this.definition.standingWater.enabled ||
            !Number.isFinite(deltaTime) ||
            deltaTime < 0
        ) {
            return;
        }

        this.refreshAccumulator += deltaTime;

        const refreshInterval =
            this.definition.standingWater.refreshIntervalSeconds;

        if (
            refreshInterval > 0 &&
            this.refreshAccumulator < refreshInterval
        ) {
            return;
        }

        if (refreshInterval > 0) {
            this.refreshAccumulator %= refreshInterval;
        } else {
            this.refreshAccumulator = 0;
        }

        this.redraw();
    }

    public redrawImmediately(): void {
        if (
            this.destroyed ||
            !this.definition.enabled ||
            !this.definition.standingWater.enabled
        ) {
            return;
        }

        this.refreshAccumulator = 0;
        this.redraw();
    }

    public clear(): void {
        if (this.destroyed) {
            return;
        }

        this.refreshAccumulator = 0;
        this.clearWorkingSet();
        this.fieldTexture.clear();
    }

    public destroy(): void {
        if (this.destroyed) {
            return;
        }

        this.destroyed = true;
        this.touchedIndices.length = 0;

        this.fieldTexture.destroy();
        this.container.removeFromParent();
        this.container.destroy();
    }

    private redraw(): void {
        this.clearWorkingSet();

        const standingWater = this.definition.standingWater;

        this.waterField.forEachTrackedWaterCell((cell): void => {
            const alpha = getStandingWaterAlpha(
                cell.depth,
                standingWater.minimumVisibleDepth,
                standingWater.edgeTransitionDepth,
                standingWater.fullScaleDepth,
                standingWater.shallowAlpha,
                standingWater.baseAlpha,
                standingWater.deepAlpha,
            );

            if (alpha <= 0) {
                return;
            }

            this.directAlpha[cell.index] = Math.max(
                this.directAlpha[cell.index],
                alpha,
            );

            this.directDepth[cell.index] = Math.max(
                this.directDepth[cell.index],
                cell.depth,
            );

            this.markTouched(cell.index);
        });

        this.fieldTexture.beginUpdate();

        for (const index of this.touchedIndices) {
            const alpha = this.directAlpha[index];

            if (alpha <= 0) {
                continue;
            }

            const depthFactor = getStandingWaterDepthFactor(
                this.directDepth[index],
                standingWater.minimumVisibleDepth,
                standingWater.fullScaleDepth,
            );

            // Keep most of the puddle in the bright base colour. Only deeper
            // areas receive a restrained shift toward deepWater.
            const deepMix = Math.max(
                0,
                Math.min(1, (depthFactor - 0.55) / 0.45),
            ) * 0.32;

            const bodyColor = mixRgb(
                this.definition.palette.baseWater,
                this.definition.palette.deepWater,
                deepMix,
            );

            let color = bodyColor;

            if (standingWater.highlightsEnabled) {
                const highlightPattern =
                    getStandingWaterHighlightStrength(
                        index,
                        this.columnCount,
                        depthFactor,
                        standingWater.highlightMinimumDepthFactor,
                        standingWater.highlightSpacingCellsX,
                        standingWater.highlightSpacingCellsY,
                    );

                if (highlightPattern > 0) {
                    color = mixRgb(
                        bodyColor,
                        this.definition.palette.waterHighlight,
                        highlightPattern *
                            standingWater.highlightStrength,
                    );
                }
            }

            this.fieldTexture.writeColorByIndex(
                index,
                color,
                alpha,
            );
        }

        this.fieldTexture.commit();
    }

    private markTouched(index: number): void {
        if (
            index < 0 ||
            index >= this.cellCount ||
            this.touchedFlags[index] !== 0
        ) {
            return;
        }

        this.touchedFlags[index] = 1;
        this.touchedIndices.push(index);
    }

    private clearWorkingSet(): void {
        for (const index of this.touchedIndices) {
            this.directAlpha[index] = 0;
            this.directDepth[index] = 0;
            this.touchedFlags[index] = 0;
        }

        this.touchedIndices.length = 0;
    }
}

function mixRgb(
    from: number,
    to: number,
    amount: number,
): number {
    const t = Math.max(0, Math.min(1, amount));

    const fromR = (from >> 16) & 0xff;
    const fromG = (from >> 8) & 0xff;
    const fromB = from & 0xff;

    const toR = (to >> 16) & 0xff;
    const toG = (to >> 8) & 0xff;
    const toB = to & 0xff;

    const r = Math.round(fromR + (toR - fromR) * t);
    const g = Math.round(fromG + (toG - fromG) * t);
    const b = Math.round(fromB + (toB - fromB) * t);

    return (r << 16) | (g << 8) | b;
}

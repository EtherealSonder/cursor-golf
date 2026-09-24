import { Container, Graphics } from "pixi.js";
import type { ContainerChild } from "pixi.js";
import type { WaterPerformanceProfiler } from "../game/debug/WaterPerformanceProfiler";
import type { ContourRefreshScheduler } from "./ContourRefreshScheduler";
import type { PresentationVisibilityQuery } from "./PresentationVisibilityQuery";

import {
    DEFAULT_WET_SURFACE_VISUAL_DEFINITION,
    validateWetSurfaceVisualDefinition,
} from "../game/config/WetSurfaceVisualDefinition";
import type {
    WetSurfaceVisualDefinition,
} from "../game/config/WetSurfaceVisualDefinition";
import type { EnvironmentField } from "../game/environment/EnvironmentField";
import type { SurfaceSystem } from "../game/surface/SurfaceSystem";
import { SurfaceState } from "../game/surface/SurfaceState";
import { SurfaceType } from "../game/surface/SurfaceType";
import { WetGroundContourBuilder } from "./WetGroundContourBuilder";
import type { WetGroundContour } from "./WetGroundContourBuilder";

/**
 * 8I-8E-A contour-based wet-ground presentation.
 * EnvironmentField moisture remains authoritative.
 */
export class WetGroundRenderer {
    private readonly container = new Container();
    private readonly graphicsBySurfaceType = new Map<SurfaceType, Graphics>();
    private readonly contourBuilder = new WetGroundContourBuilder();
    /** Per-material presentation membership. Value is remaining grace refreshes. */
    private readonly visibleCellsBySurfaceType =
        new Map<SurfaceType, Map<number, number>>();
    private readonly contourSignatureBySurfaceType =
        new Map<SurfaceType, number>();
    private readonly secondsSinceContourRebuildBySurfaceType =
        new Map<SurfaceType, number>();

    /*
     * Performance Optimization Pass 6. Reuse redraw scratch collections so
     * periodic Wet Ground refreshes do not create a fresh Map-of-Maps and
     * Set for every material on every contour tick. This changes allocation
     * behavior only. Moisture membership and contour rules remain identical.
     */
    private readonly samplesBySurfaceType =
        new Map<SurfaceType, Map<number, number>>();

    private readonly seenCellsBySurfaceType =
        new Map<SurfaceType, Set<number>>();

    private refreshAccumulator = 0;
    private destroyed = false;

    public constructor(
        private readonly environmentField: EnvironmentField,
        private readonly surfaceSystem: SurfaceSystem,
        private readonly definition: WetSurfaceVisualDefinition =
            DEFAULT_WET_SURFACE_VISUAL_DEFINITION,
        private readonly performanceProfiler: WaterPerformanceProfiler | null = null,
        private readonly contourRefreshScheduler: ContourRefreshScheduler | null = null,
        private readonly presentationVisibilityQuery: PresentationVisibilityQuery | null = null,
    ) {
        validateWetSurfaceVisualDefinition(definition);
        this.container.visible = definition.enabled;

        definition.materialStyles.forEach((style) => {
            const graphics = new Graphics();
            this.graphicsBySurfaceType.set(style.surfaceType, graphics);
            this.visibleCellsBySurfaceType.set(style.surfaceType, new Map<number, number>());
            this.samplesBySurfaceType.set(style.surfaceType, new Map<number, number>());
            this.seenCellsBySurfaceType.set(style.surfaceType, new Set<number>());
            this.secondsSinceContourRebuildBySurfaceType.set(style.surfaceType, 0);
            this.container.addChild(graphics);
        });
    }

    public getDisplayObject(): ContainerChild {
        return this.container;
    }

    public update(deltaTime: number): void {
        if (this.destroyed || !this.definition.enabled) return;
        if (!Number.isFinite(deltaTime) || deltaTime < 0) return;

        this.refreshAccumulator += deltaTime;
        this.secondsSinceContourRebuildBySurfaceType.forEach((seconds, surfaceType) => {
            this.secondsSinceContourRebuildBySurfaceType.set(surfaceType, seconds + deltaTime);
        });
        if (this.refreshAccumulator < this.definition.refreshIntervalSeconds) return;

        this.refreshAccumulator %= this.definition.refreshIntervalSeconds;
        if (this.contourRefreshScheduler &&
            !this.contourRefreshScheduler.request("wetGround")) return;
        this.redraw();
    }

    public redrawImmediately(): void {
        if (this.destroyed || !this.definition.enabled) return;
        this.refreshAccumulator = 0;
        this.secondsSinceContourRebuildBySurfaceType.forEach((_seconds, surfaceType) => {
            this.secondsSinceContourRebuildBySurfaceType.set(
                surfaceType, this.definition.maximumContourReuseSeconds,
            );
        });
        this.redraw();
    }

    public clear(): void {
        this.refreshAccumulator = 0;
        this.graphicsBySurfaceType.forEach((graphics) => graphics.clear());
        this.visibleCellsBySurfaceType.forEach((cells) => cells.clear());
        this.samplesBySurfaceType.forEach((samples) => samples.clear());
        this.seenCellsBySurfaceType.forEach((seen) => seen.clear());
        this.contourSignatureBySurfaceType.clear();
        this.secondsSinceContourRebuildBySurfaceType.forEach((_seconds, surfaceType) => {
            this.secondsSinceContourRebuildBySurfaceType.set(surfaceType, 0);
        });
    }

    public destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        this.graphicsBySurfaceType.forEach((graphics) => graphics.destroy());
        this.graphicsBySurfaceType.clear();
        this.visibleCellsBySurfaceType.clear();
        this.samplesBySurfaceType.clear();
        this.seenCellsBySurfaceType.clear();
        this.contourSignatureBySurfaceType.clear();
        this.secondsSinceContourRebuildBySurfaceType.clear();
        this.container.destroy({ children: false });
    }

    private redraw(): void {
        let membershipMilliseconds = 0;
        let contourMilliseconds = 0;
        let graphicsMilliseconds = 0;
        let visibleWetCells = 0;
        let contourCount = 0;
        let vertexCount = 0;
        const tracked = this.environmentField.getTrackedMoistureIndices();
        const columnCount = this.environmentField.getColumnCount();
        const rowCount = this.environmentField.getRowCount();
        const cellSize = this.environmentField.getDefinition().cellSize;

        /*
         * Pass 2: classify tracked moisture once per wet-ground refresh. The
         * previous path scanned the complete tracked set once for every
         * material and repeatedly asked SurfaceSystem for the same cell.
         * Presentation samples are immutable for the duration of this redraw.
         */
        const classificationStartedAt = performance.now();
        const sampleBySurfaceType =
            this.samplesBySurfaceType;

        sampleBySurfaceType.forEach((samples) => samples.clear());

        for (let i = 0; i < tracked.length; i += 1) {
            const index = tracked[i];
            const excess = this.environmentField.getExcessMoistureByIndex(index);
            if (!Number.isFinite(excess) || excess <= 0) continue;

            const center = this.environmentField.getWorldCenterByIndex(index);
            if (!center) continue;
            if (
                this.presentationVisibilityQuery &&
                !this.presentationVisibilityQuery.intersectsExpandedViewport(
                    center.x - cellSize * 0.5,
                    center.y - cellSize * 0.5,
                    center.x + cellSize * 0.5,
                    center.y + cellSize * 0.5,
                    cellSize * 2,
                )
            ) continue;
            const surface = this.surfaceSystem.getSurfaceAt(center.x, center.y);
            if (surface.surfaceState === SurfaceState.Scorched) continue;

            sampleBySurfaceType.get(surface.surfaceType)?.set(index, excess);
        }
        membershipMilliseconds += performance.now() - classificationStartedAt;

        for (let styleIndex = 0;
            styleIndex < this.definition.materialStyles.length;
            styleIndex += 1) {
            const membershipStartedAt = performance.now();
            const style = this.definition.materialStyles[styleIndex];
            const graphics = this.graphicsBySurfaceType.get(style.surfaceType);
            const visibleCells = this.visibleCellsBySurfaceType.get(style.surfaceType);
            const currentSamples = sampleBySurfaceType.get(style.surfaceType);
            if (!graphics || !visibleCells || !currentSamples) continue;

            const seen =
                this.seenCellsBySurfaceType.get(style.surfaceType);

            if (!seen) continue;
            seen.clear();

            currentSamples.forEach((excess, index) => {
                const wasVisible = visibleCells.has(index);
                const threshold = wasVisible
                    ? this.definition.visibleMoistureExitExcess
                    : this.definition.minimumVisibleMoistureExcess;
                if (excess >= threshold) {
                    visibleCells.set(index, this.definition.visibleCellRetentionRefreshes);
                    seen.add(index);
                }
            });

            visibleCells.forEach((remaining, index) => {
                if (seen.has(index)) return;
                const excess = currentSamples.get(index) ?? 0;
                if (excess >= this.definition.visibleMoistureExitExcess) {
                    visibleCells.set(index, this.definition.visibleCellRetentionRefreshes);
                    return;
                }
                if (remaining > 0) visibleCells.set(index, remaining - 1);
                else visibleCells.delete(index);
            });

            if (visibleCells.size === 0) {
                if (this.contourSignatureBySurfaceType.get(style.surfaceType) !== 0) {
                    graphics.clear();
                    this.contourSignatureBySurfaceType.set(style.surfaceType, 0);
                    this.secondsSinceContourRebuildBySurfaceType.set(style.surfaceType, 0);
                }
                membershipMilliseconds += performance.now() - membershipStartedAt;
                continue;
            }

            let minColumn = columnCount - 1;
            let maxColumn = 0;
            let minRow = rowCount - 1;
            let maxRow = 0;
            let signature = 2166136261;
            const moistureQuantum =
                Math.max(0.000001, this.definition.contourChangeMoistureQuantum);

            /* One membership walk now computes bounds and signature together. */
            visibleCells.forEach((_remaining, index) => {
                const column = index % columnCount;
                const row = Math.floor(index / columnCount);
                minColumn = Math.min(minColumn, column);
                maxColumn = Math.max(maxColumn, column);
                minRow = Math.min(minRow, row);
                maxRow = Math.max(maxRow, row);

                const excess = currentSamples.get(index) ?? 0;
                const retainedExcess = Math.max(
                    excess,
                    this.definition.visibleMoistureExitExcess + 0.000001,
                );
                const quantizedMoisture = Math.floor(retainedExcess / moistureQuantum);
                signature = Math.imul(signature ^ index, 16777619);
                signature = Math.imul(signature ^ quantizedMoisture, 16777619);
            });
            signature = Math.imul(signature ^ visibleCells.size, 16777619);

            minColumn = Math.max(0, minColumn - 1);
            maxColumn = Math.min(columnCount - 1, maxColumn + 1);
            minRow = Math.max(0, minRow - 1);
            maxRow = Math.min(rowCount - 1, maxRow + 1);

            visibleWetCells += visibleCells.size;
            membershipMilliseconds += performance.now() - membershipStartedAt;

            const secondsSinceRebuild =
                this.secondsSinceContourRebuildBySurfaceType.get(style.surfaceType) ?? 0;
            const forcedRefresh =
                secondsSinceRebuild >= this.definition.maximumContourReuseSeconds;
            const previousSignature =
                this.contourSignatureBySurfaceType.get(style.surfaceType);

            if (!forcedRefresh && previousSignature === signature) {
                continue;
            }

            this.contourSignatureBySurfaceType.set(style.surfaceType, signature);
            this.secondsSinceContourRebuildBySurfaceType.set(style.surfaceType, 0);
            graphics.clear();

            const contourStartedAt = performance.now();
            const contours = this.contourBuilder.build(
                {
                    columnCount,
                    rowCount,
                    cellSize,
                    minimumWorldX: this.environmentField.getMinimumWorldX(),
                    minimumWorldY: this.environmentField.getMinimumWorldY(),
                    isoLevel: this.definition.visibleMoistureExitExcess,
                    minimumColumn: minColumn,
                    maximumColumn: maxColumn,
                    minimumRow: minRow,
                    maximumRow: maxRow,
                    boundsAlreadyTight: true,
                    knownActiveSamples: visibleCells.size,
                    sampleValueByIndex: (index) => {
                        if (!visibleCells.has(index)) return 0;
                        const excess = currentSamples.get(index) ?? 0;
                        return Math.max(
                            excess,
                            this.definition.visibleMoistureExitExcess + 0.000001,
                        );
                    },
                },
                {
                    simplificationTolerance: this.definition.contourSimplificationTolerance,
                    smoothingPasses: this.definition.contourSmoothingPasses,
                    smoothingStrength: this.definition.contourSmoothingStrength,
                    cornerPreservation: this.definition.contourCornerPreservation,
                    minimumArea: this.definition.minimumContourArea,
                    lobeDeformation: {
                        enabled: this.definition.organicLobesEnabled,
                        primaryLobeCount: this.definition.organicLobeCount,
                        primaryAmplitudeWorldUnits: this.definition.organicLobeAmplitudeCells * cellSize,
                        secondaryAmplitudeWorldUnits: this.definition.organicSecondaryLobeAmplitudeCells * cellSize,
                        seedOffset: style.surfaceType === SurfaceType.Grass ? 1.37 : 3.11,
                    },
                },
            );
            contourMilliseconds += performance.now() - contourStartedAt;
            contourCount += contours.length;
            for (let contourIndex = 0; contourIndex < contours.length; contourIndex += 1) {
                vertexCount += contours[contourIndex].points.length;
            }
            const graphicsStartedAt = performance.now();
            this.drawContours(graphics, contours, style.color, this.definition.wetGroundAlpha);
            graphicsMilliseconds += performance.now() - graphicsStartedAt;
        }

        this.performanceProfiler?.recordWetGroundDetails({
            membershipMilliseconds, contourMilliseconds, graphicsMilliseconds,
            trackedMoistureCells: tracked.length, visibleWetCells, contours: contourCount, vertices: vertexCount,
        });
    }

    private drawContours(
        graphics: Graphics,
        contours: readonly WetGroundContour[],
        color: number,
        alpha: number,
    ): void {
        for (let contourIndex = 0;
            contourIndex < contours.length;
            contourIndex += 1) {
            const points = contours[contourIndex].points;
            if (points.length < 3) continue;

            graphics.moveTo(points[0].x, points[0].y);
            for (let pointIndex = 1;
                pointIndex < points.length;
                pointIndex += 1) {
                graphics.lineTo(points[pointIndex].x, points[pointIndex].y);
            }
            graphics.closePath().fill({ color, alpha });
        }
    }
}

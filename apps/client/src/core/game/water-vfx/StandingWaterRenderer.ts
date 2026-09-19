import {
    Container,
    Graphics,
} from "pixi.js";

import type {
    WaterPerformanceProfiler,
} from "../debug/WaterPerformanceProfiler";

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
    StandingWaterContourBuilder,
} from "./StandingWaterContourBuilder";

import {
    StandingWaterReflectionRenderer,
} from "./StandingWaterReflectionRenderer";

import type {
    ContourRefreshScheduler,
} from "../../rendering/ContourRefreshScheduler";

/**
 * 8I-8B.2A production illustrated standing-Water renderer.
 *
 * WaterField remains authoritative. The renderer reconstructs smooth closed
 * presentation contours from the sparse depth field and fills those contours
 * with the same cyan material family used by Hose and Sprinkler Water.
 */
export class StandingWaterRenderer {
    private readonly container:
        Container;

    private readonly bodyGraphics:
        Graphics;

    private readonly accentGraphics:
        Graphics;

    private readonly reflectionGraphics:
        Graphics;

    private readonly reflectionRenderer =
        new StandingWaterReflectionRenderer();

    private readonly contourBuilder =
        new StandingWaterContourBuilder();

    /** Cells retained by presentation hysteresis only. Simulation is untouched. */
    private readonly visibleBodyCellIndices =
        new Set<number>();

    private readonly cellSize:
        number;

    private readonly columnCount:
        number;

    private readonly rowCount:
        number;

    private readonly minimumWorldX:
        number;

    private readonly minimumWorldY:
        number;

    private refreshAccumulator =
        0;

    private secondsSinceContourRebuild = 0;
    private lastContourSignature: number | null = null;

    private destroyed =
        false;

    public constructor(
        private readonly waterField:
            WaterField,

        private readonly definition:
            WaterPresentationDefinitionType =
            WaterPresentationDefinition,

        private readonly performanceProfiler:
            WaterPerformanceProfiler | null =
            null,

        private readonly contourRefreshScheduler:
            ContourRefreshScheduler | null =
            null,
    ) {
        this.container =
            new Container();

        this.bodyGraphics =
            new Graphics();

        this.accentGraphics =
            new Graphics();

        this.reflectionGraphics =
            new Graphics();

        this.container.addChild(
            this.bodyGraphics,
        );

        this.container.addChild(
            this.accentGraphics,
        );

        this.container.addChild(
            this.reflectionGraphics,
        );

        this.cellSize =
            waterField
                .getDefinition()
                .cellSize;

        this.columnCount =
            waterField
                .getColumnCount();

        this.rowCount =
            waterField
                .getRowCount();

        this.minimumWorldX =
            waterField
                .getMinimumWorldX();

        this.minimumWorldY =
            waterField
                .getMinimumWorldY();

        this.redrawImmediately();
    }

    public getDisplayObject():
        Container {
        return this.container;
    }

    public update(
        deltaTime:
            number,
    ): void {
        if (
            this.destroyed ||
            !this.definition.enabled ||
            !this.definition
                .standingWater
                .enabled ||
            !Number.isFinite(
                deltaTime,
            ) ||
            deltaTime < 0
        ) {
            return;
        }

        this.refreshAccumulator +=
            deltaTime;
        this.secondsSinceContourRebuild +=
            deltaTime;

        const refreshInterval =
            this.definition
                .standingWater
                .refreshIntervalSeconds;

        if (
            refreshInterval > 0 &&
            this.refreshAccumulator <
            refreshInterval
        ) {
            return;
        }

        if (
            refreshInterval > 0
        ) {
            this.refreshAccumulator %=
                refreshInterval;
        } else {
            this.refreshAccumulator =
                0;
        }

        if (
            this.contourRefreshScheduler &&
            !this.contourRefreshScheduler.request("standingWater")
        ) {
            return;
        }

        this.redraw();
    }

    public redrawImmediately():
        void {
        if (
            this.destroyed ||
            !this.definition.enabled ||
            !this.definition
                .standingWater
                .enabled
        ) {
            return;
        }

        this.refreshAccumulator =
            0;
        this.secondsSinceContourRebuild =
            this.definition.standingWater.maximumContourReuseSeconds;

        this.redraw();
    }

    public clear():
        void {
        if (this.destroyed) {
            return;
        }

        this.refreshAccumulator =
            0;

        this.reflectionRenderer
            .clear();

        this.visibleBodyCellIndices.clear();
        this.lastContourSignature = null;
        this.secondsSinceContourRebuild = 0;
    }

    public destroy():
        void {
        if (this.destroyed) {
            return;
        }

        this.destroyed =
            true;

        this.bodyGraphics
            .destroy();

        this.accentGraphics
            .destroy();

        this.reflectionRenderer
            .clear();

        this.reflectionGraphics
            .destroy();

        this.container
            .removeFromParent();

        this.container
            .destroy({
                children:
                    false,
            });
    }

    private redraw():
        void {
        const standingWater =
            this.definition
                .standingWater;

        const redrawStartedAt = performance.now();
        let scanMilliseconds: number;
        let contourMilliseconds: number;
        let graphicsMilliseconds: number;
        let reflectionMilliseconds: number;

        let minimumColumn =
            this.columnCount;
        let maximumColumn =
            -1;
        let minimumRow =
            this.rowCount;
        let maximumRow =
            -1;
        let visibleWaterCells =
            0;
        let contourSignature =
            2166136261;

        const scanStartedAt = performance.now();

        this.waterField
            .forEachTrackedWaterCell(
                (cell): void => {
                    if (!Number.isFinite(cell.depth)) {
                        this.visibleBodyCellIndices.delete(cell.index);
                        return;
                    }

                    const wasVisible =
                        this.visibleBodyCellIndices.has(cell.index);
                    const threshold =
                        wasVisible
                            ? standingWater.contourExitThreshold
                            : standingWater.contourThreshold;

                    if (cell.depth < threshold) {
                        this.visibleBodyCellIndices.delete(cell.index);
                        return;
                    }

                    this.visibleBodyCellIndices.add(cell.index);

                    const depthQuantum =
                        Math.max(
                            0.000001,
                            standingWater.contourChangeDepthQuantum,
                        );
                    const quantizedDepth =
                        Math.floor(cell.depth / depthQuantum);
                    contourSignature =
                        Math.imul(
                            contourSignature ^ cell.index,
                            16777619,
                        );
                    contourSignature =
                        Math.imul(
                            contourSignature ^ quantizedDepth,
                            16777619,
                        );

                    const column =
                        cell.index %
                        this.columnCount;

                    const row =
                        Math.floor(
                            cell.index /
                            this.columnCount,
                        );

                    minimumColumn =
                        Math.min(
                            minimumColumn,
                            column,
                        );

                    maximumColumn =
                        Math.max(
                            maximumColumn,
                            column,
                        );

                    minimumRow =
                        Math.min(
                            minimumRow,
                            row,
                        );

                    maximumRow =
                        Math.max(
                            maximumRow,
                            row,
                        );

                    visibleWaterCells +=
                        1;
                },
            );

        scanMilliseconds = performance.now() - scanStartedAt;

        if (
            maximumColumn < 0 ||
            maximumRow < 0
        ) {
            const alreadyEmpty =
                this.lastContourSignature === 0;
            this.visibleBodyCellIndices.clear();
            if (alreadyEmpty) {
                return;
            }
            this.bodyGraphics.clear();
            this.accentGraphics.clear();
            this.reflectionGraphics.clear();
            this.lastContourSignature = 0;
            this.secondsSinceContourRebuild = 0;
            this.reflectionRenderer.draw(
                this.reflectionGraphics,
                [],
                standingWater,
            );

            this.performanceProfiler
                ?.setWaterCounts(
                    this.waterField
                        .getTrackedWaterCellCount(),
                    0,
                    0,
                );
            this.performanceProfiler?.recordStandingWaterDetails({
                scanMilliseconds, contourMilliseconds: 0, graphicsMilliseconds: 0,
                reflectionMilliseconds: performance.now() - redrawStartedAt - scanMilliseconds,
                bodyContours: 0, accentContours: 0, bodyVertices: 0, accentVertices: 0,
            });

            return;
        }

        const forcedRefresh =
            this.secondsSinceContourRebuild >=
            standingWater.maximumContourReuseSeconds;

        if (
            !forcedRefresh &&
            this.lastContourSignature === contourSignature
        ) {
            this.performanceProfiler?.recordStandingWaterDetails({
                scanMilliseconds, contourMilliseconds: 0, graphicsMilliseconds: 0,
                reflectionMilliseconds: 0, bodyContours: 0, accentContours: 0,
                bodyVertices: 0, accentVertices: 0,
            });
            return;
        }

        this.lastContourSignature = contourSignature;
        this.secondsSinceContourRebuild = 0;
        this.bodyGraphics.clear();
        this.accentGraphics.clear();
        this.reflectionGraphics.clear();

        /*
         * Expand one sample around the sparse visible bounds. Marching Squares
         * needs the dry neighbour samples to close the outer contour.
         */
        minimumColumn =
            Math.max(
                0,
                minimumColumn - 1,
            );

        maximumColumn =
            Math.min(
                this.columnCount - 1,
                maximumColumn + 1,
            );

        minimumRow =
            Math.max(
                0,
                minimumRow - 1,
            );

        maximumRow =
            Math.min(
                this.rowCount - 1,
                maximumRow + 1,
            );

        const commonFieldOptions = {
            columnCount:
                this.columnCount,

            rowCount:
                this.rowCount,

            cellSize:
                this.cellSize,

            minimumWorldX:
                this.minimumWorldX,

            minimumWorldY:
                this.minimumWorldY,

            minimumColumn,
            maximumColumn,
            minimumRow,
            maximumRow,

            sampleValueByIndex:
                (
                    index:
                        number,
                ): number =>
                    this.visibleBodyCellIndices.has(index)
                        ? Math.max(
                            this.waterField.getDepthByIndex(index),
                            standingWater.contourExitThreshold + 0.000001,
                        )
                        : 0,
        };

        const bodyContourOptions = {
            simplificationTolerance: standingWater.contourSimplificationTolerance,
            smoothingPasses: standingWater.contourSmoothingPasses,
            smoothingStrength: standingWater.contourSmoothingStrength,
            cornerPreservation: standingWater.contourCornerPreservation,
            minimumArea: standingWater.minimumContourArea,

            lobeDeformation: {
                enabled: standingWater.organicLobesEnabled,
                primaryLobeCount: standingWater.bodyLobeCount,
                primaryAmplitudeWorldUnits:
                    standingWater.bodyLobeAmplitudeCells *
                    this.cellSize,
                secondaryAmplitudeWorldUnits:
                    standingWater.bodySecondaryLobeAmplitudeCells *
                    this.cellSize,
                seedOffset: 0.73,
            },
        };

        // Independently reconstructed from its own depth threshold.
        const accentContourOptions = {
            simplificationTolerance: standingWater.accentContourSimplificationTolerance,
            smoothingPasses: standingWater.accentContourSmoothingPasses,
            smoothingStrength: standingWater.accentContourSmoothingStrength,
            cornerPreservation: standingWater.accentContourCornerPreservation,
            minimumArea: standingWater.minimumAccentContourArea,

            /*
             * Deliberately different frequency/amplitude/phase from the body.
             * The light region therefore cannot read as a scaled inset copy.
             */
            lobeDeformation: {
                enabled: standingWater.organicLobesEnabled,
                primaryLobeCount: standingWater.accentLobeCount,
                primaryAmplitudeWorldUnits:
                    standingWater.accentLobeAmplitudeCells *
                    this.cellSize,
                secondaryAmplitudeWorldUnits:
                    standingWater.accentSecondaryLobeAmplitudeCells *
                    this.cellSize,
                seedOffset: 2.41,
            },
        };

        const contourStartedAt = performance.now();

        const bodyContours =
            this.contourBuilder
                .build(
                    {
                        ...commonFieldOptions,
                        isoLevel:
                            standingWater
                                .contourExitThreshold,
                    },
                    bodyContourOptions,
                );

        const accentContours =
            this.contourBuilder
                .build(
                    {
                        ...commonFieldOptions,
                        isoLevel:
                            standingWater
                                .accentContourThreshold,
                    },
                    accentContourOptions,
                );

        contourMilliseconds = performance.now() - contourStartedAt;
        const graphicsStartedAt = performance.now();

        /*
         * 8I-8B.3 presentation hierarchy.
         *
         * Trace regions remain invisible as standing-Water geometry so the
         * existing wet-ground presentation can carry those tiny deposits.
         * Small/shallow regions receive a restrained body only. Full body
         * opacity and the secondary light-water region are reserved for
         * established connected puddles.
         */
        const visibleBodyContours =
            bodyContours.filter(
                (contour) =>
                    contour.area >
                    standingWater.traceMaximumArea,
            );

        for (
            let contourIndex = 0;
            contourIndex < visibleBodyContours.length;
            contourIndex += 1
        ) {
            const contour =
                visibleBodyContours[contourIndex];

            const established =
                contour.area >=
                standingWater.establishedPuddleMinimumArea &&
                contour.peakDepth >=
                standingWater.establishedPuddleMinimumPeakDepth;

            const bodyAlpha =
                established
                    ? standingWater.illustratedBodyAlpha
                    : standingWater.smallPuddleAlpha;

            this.drawContours(
                this.bodyGraphics,
                [contour],
                this.definition.palette.baseWater,
                bodyAlpha,
            );
        }

        /*
         * Accent contours are independently reconstructed, but they may only
         * appear when they sit inside a substantial/deep established body.
         * This prevents tiny deposits from becoming two-tone cyan markers.
         */
        const eligibleAccentContours =
            accentContours.filter(
                (accentContour) => {
                    if (
                        accentContour.area <
                        standingWater.minimumAccentContourArea
                    ) {
                        return false;
                    }

                    for (
                        let bodyIndex = 0;
                        bodyIndex < bodyContours.length;
                        bodyIndex += 1
                    ) {
                        const bodyContour =
                            bodyContours[bodyIndex];

                        if (
                            bodyContour.area <
                            standingWater.accentMinimumBodyArea ||
                            bodyContour.peakDepth <
                            standingWater.accentMinimumPeakDepth
                        ) {
                            continue;
                        }

                        if (
                            this.isContourCentroidInside(
                                accentContour.points,
                                bodyContour.points,
                            )
                        ) {
                            return true;
                        }
                    }

                    return false;
                },
            );

        this.drawContours(
            this.accentGraphics,
            eligibleAccentContours,
            this.definition
                .palette
                .lightWater,
            standingWater
                .illustratedAccentAlpha,
        );

        graphicsMilliseconds = performance.now() - graphicsStartedAt;
        const reflectionStartedAt = performance.now();

        this.reflectionRenderer
            .draw(
                this.reflectionGraphics,
                visibleBodyContours,
                standingWater,
            );

        reflectionMilliseconds = performance.now() - reflectionStartedAt;

        this.performanceProfiler
            ?.setWaterCounts(
                this.waterField
                    .getTrackedWaterCellCount(),
                visibleWaterCells,
                bodyContours.length,
            );

        this.performanceProfiler?.recordStandingWaterDetails({
            scanMilliseconds, contourMilliseconds, graphicsMilliseconds, reflectionMilliseconds,
            bodyContours: visibleBodyContours.length, accentContours: eligibleAccentContours.length,
            bodyVertices: visibleBodyContours.reduce((sum, contour) => sum + contour.points.length, 0),
            accentVertices: eligibleAccentContours.reduce((sum, contour) => sum + contour.points.length, 0),
        });
    }

    private isContourCentroidInside(
        innerPoints:
            readonly {
                readonly x: number;
                readonly y: number;
            }[],

        outerPoints:
            readonly {
                readonly x: number;
                readonly y: number;
            }[],
    ): boolean {
        if (
            innerPoints.length < 3 ||
            outerPoints.length < 3
        ) {
            return false;
        }

        let x = 0;
        let y = 0;

        for (
            let index = 0;
            index < innerPoints.length;
            index += 1
        ) {
            x += innerPoints[index].x;
            y += innerPoints[index].y;
        }

        x /= innerPoints.length;
        y /= innerPoints.length;

        let inside = false;

        for (
            let currentIndex = 0, previousIndex = outerPoints.length - 1;
            currentIndex < outerPoints.length;
            previousIndex = currentIndex, currentIndex += 1
        ) {
            const current =
                outerPoints[currentIndex];
            const previous =
                outerPoints[previousIndex];

            const crosses =
                (current.y > y) !==
                (previous.y > y) &&
                x <
                (
                    (previous.x - current.x) *
                    (y - current.y) /
                    (previous.y - current.y) +
                    current.x
                );

            if (crosses) {
                inside = !inside;
            }
        }

        return inside;
    }

    private drawContours(
        graphics:
            Graphics,

        contours:
            readonly {
                readonly points:
                readonly {
                    readonly x:
                    number;
                    readonly y:
                    number;
                }[];
            }[],

        color:
            number,

        alpha:
            number,
    ): void {
        const safeAlpha =
            Math.max(
                0,
                Math.min(
                    1,
                    alpha,
                ),
            );

        if (
            safeAlpha <= 0
        ) {
            return;
        }

        for (
            let contourIndex = 0;
            contourIndex <
            contours.length;
            contourIndex += 1
        ) {
            const points =
                contours[
                    contourIndex
                ].points;

            if (
                points.length < 3
            ) {
                continue;
            }

            graphics.moveTo(
                points[0].x,
                points[0].y,
            );

            for (
                let pointIndex = 1;
                pointIndex <
                points.length;
                pointIndex += 1
            ) {
                graphics.lineTo(
                    points[
                        pointIndex
                    ].x,
                    points[
                        pointIndex
                    ].y,
                );
            }

            graphics.closePath();

            graphics.fill({
                color,
                alpha:
                    safeAlpha,
            });
        }
    }
}

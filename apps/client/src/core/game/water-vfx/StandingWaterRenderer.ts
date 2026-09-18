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

/**
 * 8I-8B.1 production illustrated standing-Water renderer.
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

    private readonly contourBuilder =
        new StandingWaterContourBuilder();

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
    ) {
        this.container =
            new Container();

        this.bodyGraphics =
            new Graphics();

        this.accentGraphics =
            new Graphics();

        this.container.addChild(
            this.bodyGraphics,
        );

        this.container.addChild(
            this.accentGraphics,
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

        this.redraw();
    }

    public clear():
        void {
        if (this.destroyed) {
            return;
        }

        this.refreshAccumulator =
            0;

        this.bodyGraphics
            .clear();

        this.accentGraphics
            .clear();
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

        this.bodyGraphics
            .clear();

        this.accentGraphics
            .clear();

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

        this.waterField
            .forEachTrackedWaterCell(
                (cell): void => {
                    if (
                        !Number.isFinite(
                            cell.depth,
                        ) ||
                        cell.depth <
                        standingWater
                            .contourThreshold
                    ) {
                        return;
                    }

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

        if (
            maximumColumn < 0 ||
            maximumRow < 0
        ) {
            this.performanceProfiler
                ?.setWaterCounts(
                    this.waterField
                        .getTrackedWaterCellCount(),
                    0,
                    0,
                );

            return;
        }

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
                    this.waterField
                        .getDepthByIndex(
                            index,
                        ),
        };

        const contourOptions = {
            simplificationTolerance:
                standingWater
                    .contourSimplificationTolerance,

            smoothingPasses:
                standingWater
                    .contourSmoothingPasses,

            minimumArea:
                standingWater
                    .minimumContourArea,
        };

        const bodyContours =
            this.contourBuilder
                .build(
                    {
                        ...commonFieldOptions,
                        isoLevel:
                            standingWater
                                .contourThreshold,
                    },
                    contourOptions,
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
                    {
                        ...contourOptions,

                        /*
                         * Small accent islands are intentionally suppressed.
                         * The light layer should read as broad calm Water mass,
                         * not depth speckles.
                         */
                        minimumArea:
                            standingWater
                                .minimumContourArea *
                            2.5,
                    },
                );

        this.drawContours(
            this.bodyGraphics,
            bodyContours,
            this.definition
                .palette
                .baseWater,
            standingWater
                .illustratedBodyAlpha,
        );

        this.drawContours(
            this.accentGraphics,
            accentContours,
            this.definition
                .palette
                .lightWater,
            standingWater
                .illustratedAccentAlpha,
        );

        this.performanceProfiler
            ?.setWaterCounts(
                this.waterField
                    .getTrackedWaterCellCount(),
                visibleWaterCells,
                bodyContours.length,
            );
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

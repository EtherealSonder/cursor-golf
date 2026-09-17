import {
    Container,
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
    ScalarFieldTexture,
} from "../../rendering/ScalarFieldTexture";

import {
    getStandingWaterAlpha,
    getStandingWaterDepthFactor,
    getStandingWaterHighlightStrength,
} from "./StandingWaterShader";

import {
    WaterRenderRegionBuilder,
} from "./WaterRenderRegion";

import type {
    WaterRenderRegion,
} from "./WaterRenderRegion";

interface VisibleWaterCell {
    readonly index:
    number;

    readonly column:
    number;

    readonly row:
    number;

    readonly depth:
    number;

    readonly alpha:
    number;
}

interface RegionFrameData {
    readonly descriptor:
    WaterRenderRegion;

    readonly cells:
    VisibleWaterCell[];
}

interface ActiveRegion {
    readonly descriptor:
    WaterRenderRegion;

    readonly fieldTexture:
    ScalarFieldTexture;

    lastSeenRefresh:
    number;

    clearedWhileInactive:
    boolean;
}

/**
 * Phase 8I-3 bounded production standing-Water presentation.
 *
 * WaterField remains authoritative. Presentation is partitioned into fixed
 * local regions. Only regions containing visible tracked Water are authored,
 * uploaded and rendered, so procedural world size no longer determines the
 * standing-Water texture/fill cost.
 */
export class StandingWaterRenderer {
    private readonly container:
        Container;

    private readonly regions =
        new Map<
            string,
            ActiveRegion
        >();

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

    private refreshGeneration =
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

        for (
            const region
            of this.regions.values()
        ) {
            region.fieldTexture
                .clear();

            region.fieldTexture
                .getSprite()
                .visible =
                false;

            region.clearedWhileInactive =
                true;
        }
    }

    public destroy():
        void {
        if (this.destroyed) {
            return;
        }

        this.destroyed =
            true;

        for (
            const region
            of this.regions.values()
        ) {
            region.fieldTexture
                .destroy();
        }

        this.regions
            .clear();

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
        this.refreshGeneration +=
            1;

        const standingWater =
            this.definition
                .standingWater;

        const regionSizeCells =
            standingWater
                .renderRegionSizeCells;

        const frameRegions =
            new Map<
                string,
                RegionFrameData
            >();

        /*
         * WaterField traversal is already sparse. Group only visible tracked
         * cells into fixed local regions. No world-sized intermediate arrays
         * or world-sized presentation texture are allocated.
         */
        this.waterField
            .forEachTrackedWaterCell(
                (cell): void => {
                    const alpha =
                        getStandingWaterAlpha(
                            cell.depth,
                            standingWater
                                .minimumVisibleDepth,
                            standingWater
                                .edgeTransitionDepth,
                            standingWater
                                .fullScaleDepth,
                            standingWater
                                .shallowAlpha,
                            standingWater
                                .baseAlpha,
                            standingWater
                                .deepAlpha,
                        );

                    if (
                        alpha <= 0
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

                    const key =
                        WaterRenderRegionBuilder
                            .getKeyForCell(
                                column,
                                row,
                                regionSizeCells,
                            );

                    let frameRegion =
                        frameRegions.get(
                            key,
                        );

                    if (!frameRegion) {
                        frameRegion = {
                            descriptor:
                                WaterRenderRegionBuilder
                                    .buildForCell(
                                        column,
                                        row,
                                        this.columnCount,
                                        this.rowCount,
                                        regionSizeCells,
                                        this.cellSize,
                                        this.minimumWorldX,
                                        this.minimumWorldY,
                                    ),

                            cells:
                                [],
                        };

                        frameRegions.set(
                            key,
                            frameRegion,
                        );
                    }

                    frameRegion.cells
                        .push({
                            index:
                                cell.index,

                            column,
                            row,

                            depth:
                                cell.depth,

                            alpha,
                        });
                },
            );

        let visibleWaterCells =
            0;

        const frameRegionList =
            Array.from(
                frameRegions.values(),
            );

        for (
            let regionIndex = 0;
            regionIndex < frameRegionList.length;
            regionIndex += 1
        ) {
            visibleWaterCells +=
                frameRegionList[
                    regionIndex
                ].cells.length;
        }

        this.performanceProfiler
            ?.setWaterCounts(
                this.waterField
                    .getTrackedWaterCellCount(),
                visibleWaterCells,
                frameRegionList.length,
            );

        for (
            let regionOffset = 0;
            regionOffset <
            frameRegionList.length;
            regionOffset += 1
        ) {
            const frameRegion =
                frameRegionList[
                regionOffset
                ];

            const activeRegion =
                this.getOrCreateRegion(
                    frameRegion
                        .descriptor,
                );

            activeRegion.lastSeenRefresh =
                this.refreshGeneration;

            activeRegion.clearedWhileInactive =
                false;

            const sprite =
                activeRegion
                    .fieldTexture
                    .getSprite();

            sprite.visible =
                true;

            activeRegion
                .fieldTexture
                .beginUpdate();

            const cells =
                frameRegion
                    .cells;

            for (
                let cellOffset = 0;
                cellOffset <
                cells.length;
                cellOffset += 1
            ) {
                const cell =
                    cells[
                    cellOffset
                    ];

                const depthFactor =
                    getStandingWaterDepthFactor(
                        cell.depth,
                        standingWater
                            .minimumVisibleDepth,
                        standingWater
                            .fullScaleDepth,
                    );

                const deepMix =
                    Math.max(
                        0,
                        Math.min(
                            1,
                            (
                                depthFactor -
                                0.55
                            ) /
                            0.45,
                        ),
                    ) *
                    0.32;

                const bodyColor =
                    mixRgb(
                        this.definition
                            .palette
                            .baseWater,

                        this.definition
                            .palette
                            .deepWater,

                        deepMix,
                    );

                let color =
                    bodyColor;

                if (
                    standingWater
                        .highlightsEnabled
                ) {
                    const highlightPattern =
                        getStandingWaterHighlightStrength(
                            cell.index,
                            this.columnCount,
                            depthFactor,
                            standingWater
                                .highlightMinimumDepthFactor,
                            standingWater
                                .highlightSpacingCellsX,
                            standingWater
                                .highlightSpacingCellsY,
                        );

                    if (
                        highlightPattern >
                        0
                    ) {
                        color =
                            mixRgb(
                                bodyColor,
                                this.definition
                                    .palette
                                    .waterHighlight,
                                highlightPattern *
                                standingWater
                                    .highlightStrength,
                            );
                    }
                }

                activeRegion
                    .fieldTexture
                    .writeColorByCell(
                        cell.column -
                        frameRegion
                            .descriptor
                            .minimumColumn,

                        cell.row -
                        frameRegion
                            .descriptor
                            .minimumRow,

                        color,
                        cell.alpha,
                    );
            }

            activeRegion
                .fieldTexture
                .commit();
        }

        this.retireInactiveRegions();
    }

    private getOrCreateRegion(
        descriptor:
            WaterRenderRegion,
    ): ActiveRegion {
        const existing =
            this.regions.get(
                descriptor.key,
            );

        if (existing) {
            return existing;
        }

        const fieldTexture =
            new ScalarFieldTexture({
                columnCount:
                    descriptor
                        .columnCount,

                rowCount:
                    descriptor
                        .rowCount,

                cellSize:
                    this.cellSize,

                minimumWorldX:
                    descriptor
                        .minimumWorldX,

                minimumWorldY:
                    descriptor
                        .minimumWorldY,
            });

        const region:
            ActiveRegion = {
            descriptor,
            fieldTexture,

            lastSeenRefresh:
                this.refreshGeneration,

            clearedWhileInactive:
                false,
        };

        this.regions.set(
            descriptor.key,
            region,
        );

        this.container
            .addChild(
                fieldTexture
                    .getSprite(),
            );

        return region;
    }

    private retireInactiveRegions():
        void {
        const retention =
            this.definition
                .standingWater
                .renderRegionRetentionRefreshes;

        const entries =
            Array.from(
                this.regions
                    .entries(),
            );

        for (
            let offset = 0;
            offset <
            entries.length;
            offset += 1
        ) {
            const [
                key,
                region,
            ] =
                entries[
                offset
                ];

            if (
                region.lastSeenRefresh ===
                this.refreshGeneration
            ) {
                continue;
            }

            /*
             * Clear once immediately so stale Water never remains visible,
             * then keep the small texture hidden briefly to avoid allocation
             * churn if Water returns to the same region.
             */
            if (
                !region
                    .clearedWhileInactive
            ) {
                region.fieldTexture
                    .clear();

                region.fieldTexture
                    .getSprite()
                    .visible =
                    false;

                region.clearedWhileInactive =
                    true;
            }

            const inactiveRefreshes =
                this.refreshGeneration -
                region.lastSeenRefresh;

            if (
                inactiveRefreshes <=
                retention
            ) {
                continue;
            }

            region.fieldTexture
                .destroy();

            this.regions
                .delete(
                    key,
                );
        }
    }
}

function mixRgb(
    from:
        number,

    to:
        number,

    amount:
        number,
): number {
    const t =
        Math.max(
            0,
            Math.min(
                1,
                amount,
            ),
        );

    const fromR =
        (
            from >>
            16
        ) &
        0xff;

    const fromG =
        (
            from >>
            8
        ) &
        0xff;

    const fromB =
        from &
        0xff;

    const toR =
        (
            to >>
            16
        ) &
        0xff;

    const toG =
        (
            to >>
            8
        ) &
        0xff;

    const toB =
        to &
        0xff;

    const r =
        Math.round(
            fromR +
            (
                toR -
                fromR
            ) *
            t,
        );

    const g =
        Math.round(
            fromG +
            (
                toG -
                fromG
            ) *
            t,
        );

    const b =
        Math.round(
            fromB +
            (
                toB -
                fromB
            ) *
            t,
        );

    return (
        r <<
        16
    ) |
        (
            g <<
            8
        ) |
        b;
}

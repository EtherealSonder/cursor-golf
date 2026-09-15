import {
    Graphics,
} from "pixi.js";

import {
    DEFAULT_WET_SURFACE_VISUAL_DEFINITION,
    validateWetSurfaceVisualDefinition,
} from "../game/config/WetSurfaceVisualDefinition";

import type {
    WetSurfaceVisualDefinition,
} from "../game/config/WetSurfaceVisualDefinition";

import type {
    EnvironmentField,
} from "../game/environment/EnvironmentField";

import type {
    MoistureSurfaceBridge,
} from "../game/environment/MoistureSurfaceBridge";

import type {
    SurfaceSystem,
} from "../game/surface/SurfaceSystem";

import {
    SurfaceState,
} from "../game/surface/SurfaceState";

import {
    SurfaceType,
} from "../game/surface/SurfaceType";

import {
    ScalarFieldContourBuilder,
} from "./ScalarFieldContourBuilder";

/**
 * Phase 8C-6E continuous Wet-terrain presentation.
 *
 * Gameplay still uses MoistureSurfaceBridge Wet/Normal classification.
 * Rendering reads continuous EnvironmentField excess moisture, so the dark
 * terrain fades and retreats gradually as the ground dries.
 */
export class WetSurfaceVisualizer {
    private readonly graphics =
        new Graphics();

    private readonly styleBySurfaceType:
        ReadonlyMap<SurfaceType, number>;

    private refreshAccumulator =
        0;

    private lastBridgeRevision =
        -1;

    private destroyed =
        false;

    public constructor(
        private readonly bridge:
            MoistureSurfaceBridge,

        private readonly environmentField:
            EnvironmentField,

        private readonly surfaceSystem:
            SurfaceSystem,

        private readonly definition:
            WetSurfaceVisualDefinition =
            DEFAULT_WET_SURFACE_VISUAL_DEFINITION,
    ) {
        validateWetSurfaceVisualDefinition(
            definition,
        );

        this.styleBySurfaceType =
            new Map(
                definition.materialStyles.map(
                    (style) => [
                        style.surfaceType,
                        style.color,
                    ] as const,
                ),
            );

        this.graphics.visible =
            definition.enabled;
    }

    public getGraphics():
        Graphics {
        return this.graphics;
    }

    public update(
        deltaTime = 0,
    ): void {
        if (
            this.destroyed ||
            !this.definition.enabled
        ) {
            return;
        }

        if (
            !Number.isFinite(deltaTime) ||
            deltaTime < 0
        ) {
            deltaTime =
                0;
        }

        this.refreshAccumulator +=
            deltaTime;

        const bridgeRevision =
            this.bridge.getRevision();

        const classificationChanged =
            bridgeRevision !==
            this.lastBridgeRevision;

        if (
            !classificationChanged &&
            this.refreshAccumulator <
            this.definition
                .refreshIntervalSeconds
        ) {
            return;
        }

        this.lastBridgeRevision =
            bridgeRevision;

        this.refreshAccumulator =
            0;

        this.redraw();
    }

    public redrawImmediately():
        void {
        if (
            this.destroyed ||
            !this.definition.enabled
        ) {
            return;
        }

        this.lastBridgeRevision =
            this.bridge.getRevision();

        this.refreshAccumulator =
            0;

        this.redraw();
    }

    public destroy():
        void {
        if (this.destroyed) {
            return;
        }

        this.destroyed =
            true;

        this.graphics.removeFromParent();
        this.graphics.destroy();
    }

    private redraw():
        void {
        this.graphics.clear();

        const fieldDefinition =
            this.environmentField
                .getDefinition();

        const columnCount =
            this.environmentField
                .getColumnCount();

        const rowCount =
            this.environmentField
                .getRowCount();

        const cellSize =
            fieldDefinition.cellSize;

        const minimumWorldX =
            this.environmentField
                .getMinimumWorldX();

        const minimumWorldY =
            this.environmentField
                .getMinimumWorldY();

        const tracked =
            this.environmentField
                .getTrackedMoistureIndices();

        if (
            tracked.length ===
            0
        ) {
            return;
        }

        const indicesBySurface =
            new Map<
                SurfaceType,
                number[]
            >();

        let minimumColumn =
            columnCount - 1;

        let maximumColumn =
            0;

        let minimumRow =
            rowCount - 1;

        let maximumRow =
            0;

        let hasVisibleMoisture =
            false;

        for (
            const index
            of tracked
        ) {
            const excess =
                this.environmentField
                    .getExcessMoistureByIndex(
                        index,
                    );

            const alpha =
                this.getAlphaForExcess(
                    excess,
                );

            if (alpha <= 0) {
                continue;
            }

            const center =
                this.environmentField
                    .getWorldCenterByIndex(
                        index,
                    );

            if (!center) {
                continue;
            }

            const sample =
                this.surfaceSystem
                    .getSurfaceAt(
                        center.x,
                        center.y,
                    );

            /*
             * Explicit Scorched or other authoritative states must remain
             * visually authoritative over moisture.
             */
            if (
                sample.surfaceState ===
                SurfaceState.Scorched
            ) {
                continue;
            }

            const color =
                this.styleBySurfaceType
                    .get(
                        sample.surfaceType,
                    );

            if (
                color ===
                undefined
            ) {
                continue;
            }

            hasVisibleMoisture =
                true;

            const column =
                index %
                columnCount;

            const row =
                Math.floor(
                    index /
                    columnCount,
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

            let indices =
                indicesBySurface.get(
                    sample.surfaceType,
                );

            if (!indices) {
                indices = [];
                indicesBySurface.set(
                    sample.surfaceType,
                    indices,
                );
            }

            indices.push(
                index,
            );

            this.graphics
                .rect(
                    minimumWorldX +
                    column *
                    cellSize,
                    minimumWorldY +
                    row *
                    cellSize,
                    cellSize,
                    cellSize,
                )
                .fill({
                    color,
                    alpha,
                });
        }

        if (!hasVisibleMoisture) {
            return;
        }

        minimumColumn =
            Math.max(
                0,
                minimumColumn - 1,
            );

        maximumColumn =
            Math.min(
                columnCount - 1,
                maximumColumn + 1,
            );

        minimumRow =
            Math.max(
                0,
                minimumRow - 1,
            );

        maximumRow =
            Math.min(
                rowCount - 1,
                maximumRow + 1,
            );

        /*
         * Draw a soft interpolated moisture iso-line per material. The body
         * alpha above already fades continuously, while this line removes the
         * strongest visual impression of an 8 px binary boundary.
         */
        for (
            const [
                surfaceType,
                indices,
            ]
            of indicesBySurface
        ) {
            if (
                indices.length ===
                0
            ) {
                continue;
            }

            const color =
                this.styleBySurfaceType
                    .get(
                        surfaceType,
                    );

            if (
                color ===
                undefined
            ) {
                continue;
            }

            const segments =
                ScalarFieldContourBuilder
                    .buildSegments({
                        columnCount,
                        rowCount,
                        cellSize,
                        minimumWorldX,
                        minimumWorldY,

                        isoLevel:
                            this.definition
                                .minimumVisibleMoistureExcess,

                        minimumColumn,
                        maximumColumn,
                        minimumRow,
                        maximumRow,

                        sampleValueByIndex:
                            (index): number => {
                                const center =
                                    this.environmentField
                                        .getWorldCenterByIndex(
                                            index,
                                        );

                                if (!center) {
                                    return 0;
                                }

                                const sample =
                                    this.surfaceSystem
                                        .getSurfaceAt(
                                            center.x,
                                            center.y,
                                        );

                                if (
                                    sample.surfaceType !==
                                    surfaceType ||
                                    sample.surfaceState ===
                                    SurfaceState.Scorched
                                ) {
                                    return 0;
                                }

                                return this.environmentField
                                    .getExcessMoistureByIndex(
                                        index,
                                    );
                            },
                    });

            for (
                const segment
                of segments
            ) {
                this.graphics
                    .moveTo(
                        segment.start.x,
                        segment.start.y,
                    )
                    .lineTo(
                        segment.end.x,
                        segment.end.y,
                    )
                    .stroke({
                        color,

                        alpha:
                            Math.min(
                                this.definition.alpha,
                                0.20,
                            ),

                        width:
                            this.definition
                                .scalarEdgeWidth,
                    });
            }
        }
    }

    private getAlphaForExcess(
        excess:
            number,
    ): number {
        if (
            !Number.isFinite(excess) ||
            excess <
            this.definition
                .minimumVisibleMoistureExcess
        ) {
            return 0;
        }

        const minimum =
            this.definition
                .minimumVisibleMoistureExcess;

        const maximum =
            Math.max(
                minimum + 1e-8,
                this.definition
                    .fullVisualMoistureExcess,
            );

        const normalized =
            Math.max(
                0,
                Math.min(
                    1,
                    (
                        excess -
                        minimum
                    ) /
                    (
                        maximum -
                        minimum
                    ),
                ),
            );

        /*
         * Smoothstep prevents a hard alpha jump at the visual threshold.
         */
        const smooth =
            normalized *
            normalized *
            (
                3 -
                2 *
                normalized
            );

        return (
            this.definition.alpha *
            smooth
        );
    }
}

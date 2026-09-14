import {
    Graphics,
} from "pixi.js";

import {
    DEFAULT_WATER_DEBUG_DEFINITION,
} from "../config/WaterDebugDefinition";

import type {
    WaterDebugDefinition,
} from "../config/WaterDebugDefinition";

import type {
    WaterField,
} from "../environment/WaterField";

/**
 * Development-only read-only visualization of authoritative WaterField state.
 *
 * The visualizer intentionally exposes grid cells. Final Water rendering in
 * Phase 8I will replace this with continuous puddle contours.
 *
 * Performance rule:
 * Debug geometry is NOT rebuilt every rendered frame. Water simulation keeps
 * running normally, while this presentation layer redraws at a low fixed
 * debug frequency.
 */
export class WaterFieldVisualizer {

    private readonly graphics =
        new Graphics();

    private refreshAccumulator =
        0;

    private destroyed =
        false;

    public constructor(
        private readonly waterField:
            WaterField,

        private readonly definition:
            WaterDebugDefinition =
            DEFAULT_WATER_DEBUG_DEFINITION,
    ) {
        this.graphics.visible =
            definition.enabled;

    }

    public getGraphics():
        Graphics {

        return this.graphics;
    }

    public update(
        deltaTime:
            number,
    ): void {

        if (
            this.destroyed ||
            !this.definition.enabled
        ) {
            return;
        }

        if (
            !Number.isFinite(
                deltaTime,
            ) ||
            deltaTime < 0
        ) {
            return;
        }

        this.refreshAccumulator +=
            deltaTime;

        if (
            this.refreshAccumulator <
            this.definition
                .refreshIntervalSeconds
        ) {
            return;
        }

        /*
         * Do not attempt to catch up by redrawing multiple times after a
         * hitch. One current-state redraw is sufficient for a debug view.
         */
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

        this.refreshAccumulator =
            0;

        this.redraw();
    }

    public destroy():
        void {

        if (
            this.destroyed
        ) {
            return;
        }

        this.destroyed =
            true;

        this.graphics
            .removeFromParent();

        this.graphics
            .destroy();
    }

    private redraw():
        void {

        this.graphics.clear();

        const cellSize =
            this.waterField
                .getDefinition()
                .cellSize;

        const maximumDepth =
            this.waterField
                .getDefinition()
                .maximumDepth;

        /*
         * Optional sparse-region inspection. Disabled by default because dry
         * neighbour outlines create substantial Graphics geometry without
         * helping normal Water-flow inspection.
         */
        if (
            this.definition
                .showActiveCells
        ) {
            this.waterField
                .forEachActiveCell(
                    (
                        cell,
                    ): void => {

                        if (
                            cell.depth > 0
                        ) {
                            return;
                        }

                        this.graphics
                            .rect(
                                cell.worldCenterX -
                                cellSize * 0.5,

                                cell.worldCenterY -
                                cellSize * 0.5,

                                cellSize,
                                cellSize,
                            )
                            .stroke({
                                color: 0x55c9df,

                                alpha:
                                    this.definition
                                        .activeCellAlpha,

                                width: 1,
                            });
                    },
                );
        }

        let trackedCellOrdinal =
            0;

        this.waterField
            .forEachTrackedWaterCell(
                (
                    cell,
                ): void => {

                    if (
                        cell.depth <
                        this.definition
                            .minimumVisibleDepth
                    ) {
                        return;
                    }

                    if (
                        this.definition
                            .showDepth
                    ) {
                        const normalizedDepth =
                            Math.max(
                                0,
                                Math.min(
                                    1,
                                    (
                                        cell.depth -
                                        this.definition
                                            .minimumVisibleDepth
                                    ) /
                                    Math.max(
                                        1e-9,
                                        maximumDepth -
                                        this.definition
                                            .minimumVisibleDepth,
                                    ),
                                ),
                            );

                        const alpha =
                            this.definition
                                .depthAlphaMinimum +
                            (
                                this.definition
                                    .depthAlphaMaximum -
                                this.definition
                                    .depthAlphaMinimum
                            ) *
                            normalizedDepth;

                        this.graphics
                            .rect(
                                cell.worldCenterX -
                                cellSize * 0.5,

                                cell.worldCenterY -
                                cellSize * 0.5,

                                cellSize,
                                cellSize,
                            )
                            .fill({
                                color: 0x55c9df,
                                alpha,
                            });
                    }

                    const shouldDrawVelocity =
                        this.definition
                            .showVelocity &&
                        trackedCellOrdinal %
                        this.definition
                            .velocityVectorStride ===
                        0;

                    trackedCellOrdinal +=
                        1;

                    if (
                        !shouldDrawVelocity
                    ) {
                        return;
                    }

                    const speed =
                        Math.hypot(
                            cell.velocityX,
                            cell.velocityY,
                        );

                    if (
                        speed <
                        this.definition
                            .velocityVectorMinimumSpeed
                    ) {
                        return;
                    }

                    const vectorLength =
                        Math.min(
                            this.definition
                                .maximumVelocityVectorLength,

                            speed *
                            this.definition
                                .velocityVectorScale,
                        );

                    const directionX =
                        cell.velocityX /
                        speed;

                    const directionY =
                        cell.velocityY /
                        speed;

                    this.graphics
                        .moveTo(
                            cell.worldCenterX,
                            cell.worldCenterY,
                        )
                        .lineTo(
                            cell.worldCenterX +
                            directionX *
                            vectorLength,

                            cell.worldCenterY +
                            directionY *
                            vectorLength,
                        )
                        .stroke({
                            color: 0xffffff,
                            alpha: 0.85,
                            width: 1,
                        });
                },
            );
    }
}

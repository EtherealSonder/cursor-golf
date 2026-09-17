import type {
    Sprite,
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
    SurfaceSystem,
} from "../game/surface/SurfaceSystem";

import {
    SurfaceState,
} from "../game/surface/SurfaceState";

import {
    SurfaceType,
} from "../game/surface/SurfaceType";

import {
    ScalarFieldTexture,
} from "./ScalarFieldTexture";

/**
 * First scalar-texture Wet-ground presentation.
 *
 * The gameplay bridge may still answer Wet/Normal categorically for rolling
 * resistance. Visual darkening is driven directly by continuous excess ground
 * moisture so the former puddle footprint fades gradually rather than losing
 * entire cells when a categorical threshold is crossed.
 */
export class WetGroundRenderer {
    private readonly fieldTexture:
        ScalarFieldTexture;

    private readonly colorBySurfaceType:
        ReadonlyMap<
            SurfaceType,
            number
        >;

    private refreshAccumulator =
        0;

    private destroyed =
        false;

    public constructor(
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

        this.colorBySurfaceType =
            new Map(
                definition.materialStyles.map(
                    (style) => [
                        style.surfaceType,
                        style.color,
                    ] as const,
                ),
            );

        this.fieldTexture =
            new ScalarFieldTexture({
                columnCount:
                    environmentField
                        .getColumnCount(),

                rowCount:
                    environmentField
                        .getRowCount(),

                cellSize:
                    environmentField
                        .getDefinition()
                        .cellSize,

                minimumWorldX:
                    environmentField
                        .getMinimumWorldX(),

                minimumWorldY:
                    environmentField
                        .getMinimumWorldY(),
            });

        this.fieldTexture
            .getSprite()
            .visible =
            definition.enabled;
    }

    public getDisplayObject():
        Sprite {
        return this.fieldTexture
            .getSprite();
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

        this.refreshAccumulator %=
            this.definition
                .refreshIntervalSeconds;

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

    public clear():
        void {
        this.refreshAccumulator =
            0;

        this.fieldTexture
            .clear();
    }

    public destroy():
        void {
        if (this.destroyed) {
            return;
        }

        this.destroyed =
            true;

        this.fieldTexture
            .destroy();
    }

    private redraw():
        void {
        this.fieldTexture
            .beginUpdate();

        const columnCount =
            this.environmentField
                .getColumnCount();

        const rowCount =
            this.environmentField
                .getRowCount();

        const radius =
            this.definition
                .smoothingRadiusCells;

        /*
         * Presentation-only reconstruction.
         *
         * EnvironmentField remains authoritative. We expand the sparse set by
         * a small halo and blend neighbouring excess-moisture samples into a
         * continuous visual field. This prevents isolated watered cells and
         * the edges of larger wet regions from exposing obvious square texels.
         */
        const candidateIndices =
            new Set<number>();

        for (
            const trackedIndex
            of this.environmentField
                .getTrackedMoistureIndices()
        ) {
            const trackedColumn =
                trackedIndex %
                columnCount;

            const trackedRow =
                Math.floor(
                    trackedIndex /
                    columnCount,
                );

            for (
                let offsetY =
                    -radius;
                offsetY <= radius;
                offsetY += 1
            ) {
                const row =
                    trackedRow +
                    offsetY;

                if (
                    row < 0 ||
                    row >= rowCount
                ) {
                    continue;
                }

                for (
                    let offsetX =
                        -radius;
                    offsetX <= radius;
                    offsetX += 1
                ) {
                    const column =
                        trackedColumn +
                        offsetX;

                    if (
                        column < 0 ||
                        column >= columnCount
                    ) {
                        continue;
                    }

                    candidateIndices.add(
                        row *
                        columnCount +
                        column,
                    );
                }
            }
        }

        for (
            const index
            of candidateIndices
        ) {
            const smoothedExcess =
                this.getSmoothedExcessByIndex(
                    index,
                    columnCount,
                    rowCount,
                    radius,
                );

            const alpha =
                this.getAlphaForExcess(
                    smoothedExcess,
                );

            if (
                alpha <=
                0
            ) {
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

            const surface =
                this.surfaceSystem
                    .getSurfaceAt(
                        center.x,
                        center.y,
                    );

            /*
             * ScorchRenderer remains visually authoritative over permanently
             * damaged substrate. Moisture can still exist there in gameplay.
             */
            if (
                surface.surfaceState ===
                SurfaceState.Scorched
            ) {
                continue;
            }

            const color =
                this.colorBySurfaceType
                    .get(
                        surface.surfaceType,
                    );

            if (
                color ===
                undefined
            ) {
                continue;
            }

            this.fieldTexture
                .writeColorByIndex(
                    index,
                    color,
                    alpha,
                );
        }

        this.fieldTexture
            .commit();
    }

    private getSmoothedExcessByIndex(
        index:
            number,

        columnCount:
            number,

        rowCount:
            number,

        radius:
            number,
    ): number {
        if (radius <= 0) {
            return this.environmentField
                .getExcessMoistureByIndex(
                    index,
                );
        }

        const centerColumn =
            index %
            columnCount;

        const centerRow =
            Math.floor(
                index /
                columnCount,
            );

        let weightedExcess =
            0;

        let totalWeight =
            0;

        /*
         * Compact Gaussian-like kernel. The quadratic falloff softens the
         * silhouette without spreading the presentation far beyond the
         * authoritative wet region.
         */
        const maximumDistance =
            radius +
            1;

        for (
            let offsetY =
                -radius;
            offsetY <= radius;
            offsetY += 1
        ) {
            const row =
                centerRow +
                offsetY;

            if (
                row < 0 ||
                row >= rowCount
            ) {
                continue;
            }

            for (
                let offsetX =
                    -radius;
                offsetX <= radius;
                offsetX += 1
            ) {
                const column =
                    centerColumn +
                    offsetX;

                if (
                    column < 0 ||
                    column >= columnCount
                ) {
                    continue;
                }

                const distanceSquared =
                    offsetX *
                    offsetX +
                    offsetY *
                    offsetY;

                const normalizedDistanceSquared =
                    distanceSquared /
                    (
                        maximumDistance *
                        maximumDistance
                    );

                const weight =
                    Math.max(
                        0,
                        1 -
                        normalizedDistanceSquared,
                    );

                if (
                    weight <=
                    0
                ) {
                    continue;
                }

                const sampleIndex =
                    row *
                    columnCount +
                    column;

                weightedExcess +=
                    this.environmentField
                        .getExcessMoistureByIndex(
                            sampleIndex,
                        ) *
                    weight;

                totalWeight +=
                    weight;
            }
        }

        if (
            totalWeight <=
            0
        ) {
            return 0;
        }

        return (
            weightedExcess /
            totalWeight
        );
    }

    private getAlphaForExcess(
        excess:
            number,
    ): number {
        if (
            !Number.isFinite(
                excess,
            ) ||
            excess <=
            this.definition
                .minimumVisibleMoistureExcess
        ) {
            return 0;
        }

        const range =
            this.definition
                .fullVisualMoistureExcess -
            this.definition
                .minimumVisibleMoistureExcess;

        let normalized =
            (
                excess -
                this.definition
                    .minimumVisibleMoistureExcess
            ) /
            range;

        normalized =
            Math.max(
                0,
                Math.min(
                    1,
                    normalized,
                ),
            );

        /*
         * Smoothstep keeps the drying edge from popping when moisture crosses
         * the visual floor.
         */
        normalized =
            normalized *
            normalized *
            (
                3 -
                2 *
                normalized
            );

        return (
            this.definition
                .maximumAlpha *
            normalized
        );
    }
}

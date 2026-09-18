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

import {
    WetGroundShader,
} from "./WetGroundShader";

/**
 * Scalar-texture wet-ground presentation.
 *
 * EnvironmentField remains authoritative. The renderer reconstructs a small
 * presentation-only moisture neighbourhood, writes one texel per field cell,
 * and relies on Pixi linear sampling plus the lightweight edge shader.
 */
export class WetGroundRenderer {
    private readonly fieldTexture:
        ScalarFieldTexture;

    private readonly colorBySurfaceType:
        ReadonlyMap<
            SurfaceType,
            number
        >;

    private readonly edgeShader:
        WetGroundShader;

    private refreshAccumulator =
        0;

    private readonly candidateFlags:
        Uint8Array;

    private readonly candidateIndices:
        number[] = [];

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

        this.candidateFlags =
            new Uint8Array(
                environmentField.getCellCount(),
            );

        this.edgeShader =
            new WetGroundShader(
                definition.edgeThreshold,
                definition.edgeSoftness,
            );

        const sprite =
            this.fieldTexture
                .getSprite();

        sprite.filters = [
            this.edgeShader,
        ];

        sprite.visible =
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

        this.edgeShader
            .destroy();

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

        const candidateIndices =
            this.candidateIndices;

        const candidateFlags =
            this.candidateFlags;

        candidateIndices.length = 0;

        const tracked =
            this.environmentField
                .getTrackedMoistureIndices();

        for (
            let trackedOffset = 0;
            trackedOffset < tracked.length;
            trackedOffset += 1
        ) {
            const trackedIndex =
                tracked[
                trackedOffset
                ];

            const trackedColumn =
                trackedIndex %
                columnCount;

            const trackedRow =
                Math.floor(
                    trackedIndex /
                    columnCount,
                );

            for (
                let offsetY = -radius;
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
                    let offsetX = -radius;
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

                    const candidateIndex =
                        row *
                        columnCount +
                        column;

                    if (
                        candidateFlags[
                        candidateIndex
                        ] === 0
                    ) {
                        candidateFlags[
                            candidateIndex
                        ] = 1;

                        candidateIndices.push(
                            candidateIndex,
                        );
                    }
                }
            }
        }

        for (
            let candidateOffset = 0;
            candidateOffset < candidateIndices.length;
            candidateOffset += 1
        ) {
            const index =
                candidateIndices[
                candidateOffset
                ];

            const smoothedExcess =
                this.getSmoothedExcessByIndex(
                    index,
                    columnCount,
                    rowCount,
                    radius,
                );

            const rawAlpha =
                this.getAlphaForExcess(
                    smoothedExcess,
                );

            /*
             * 8I-8A halo removal.
             *
             * Very weak colored texels are visually misleading once the
             * scalar texture is linearly sampled: during drying they can read
             * as a bright cyan perimeter around the darker wet interior.
             * Remove only that presentation fringe. Moisture simulation,
             * smoothing radius, wet/dry thresholds and SurfaceState remain
             * untouched.
             */
            const alpha =
                this.getHaloSafeAlpha(
                    rawAlpha,
                );

            if (
                alpha <= 0
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

        for (
            let offset = 0;
            offset < candidateIndices.length;
            offset += 1
        ) {
            candidateFlags[
                candidateIndices[offset]
            ] = 0;
        }
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

        const maximumDistance =
            radius +
            1;

        for (
            let offsetY = -radius;
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
                let offsetX = -radius;
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
                    weight <= 0
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
            totalWeight <= 0
        ) {
            return 0;
        }

        return (
            weightedExcess /
            totalWeight
        );
    }

    private getHaloSafeAlpha(
        alpha:
            number,
    ): number {
        if (
            !Number.isFinite(alpha) ||
            alpha <= 0
        ) {
            return 0;
        }

        const threshold =
            Math.max(
                0,
                Math.min(
                    this.definition.maximumAlpha,
                    this.definition.edgeThreshold,
                ),
            );

        if (alpha <= threshold) {
            return 0;
        }

        /*
         * Keep the established interior alpha unchanged. Only the tiny
         * low-alpha tail below the visual edge threshold is removed.
         */
        return alpha;
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

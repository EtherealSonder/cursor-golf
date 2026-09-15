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

        for (
            const index
            of this.environmentField
                .getTrackedMoistureIndices()
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
             * 8C-8B material precedence:
             * Scorched ground can still contain authoritative moisture and
             * standing Water can still render above it, but WetGroundRenderer
             * must not recolor the permanently damaged substrate green/brown.
             * ScorchRenderer remains visually authoritative after Water
             * retreats.
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

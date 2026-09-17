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
} from "./StandingWaterShader";

/**
 * Phase 8I-1D production standing-Water presentation.
 *
 * WaterField remains authoritative. This renderer reconstructs presentation
 * coverage into a grid-resolution RGBA texture whose Sprite is fixed in
 * WaterField world space.
 *
 * Every meaningful tracked WaterField cell contributes directly to the
 * production presentation. Pixi's linear texture sampling smooths the visual
 * boundary between Water and dry texels without expanding the authoritative
 * standing-Water footprint.
 */
export class StandingWaterRenderer {
    private readonly container:
        Container;

    private readonly fieldTexture:
        ScalarFieldTexture;

    private readonly columnCount:
        number;

    private readonly rowCount:
        number;

    private readonly cellCount:
        number;

    private readonly directAlpha:
        Float32Array;

    private readonly touchedFlags:
        Uint8Array;

    private readonly touchedIndices:
        number[] = [];

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
    ) {
        this.container =
            new Container();

        this.columnCount =
            waterField.getColumnCount();

        this.rowCount =
            waterField.getRowCount();

        this.cellCount =
            waterField.getCellCount();

        this.directAlpha =
            new Float32Array(
                this.cellCount,
            );

        this.touchedFlags =
            new Uint8Array(
                this.cellCount,
            );

        const cellSize =
            waterField
                .getDefinition()
                .cellSize;

        this.fieldTexture =
            new ScalarFieldTexture({
                columnCount:
                    this.columnCount,

                rowCount:
                    this.rowCount,

                cellSize,

                minimumWorldX:
                    waterField
                        .getMinimumWorldX(),

                minimumWorldY:
                    waterField
                        .getMinimumWorldY(),
            });

        this.fieldTexture
            .getSprite()
            .visible =
            definition.enabled &&
            definition
                .standingWater
                .enabled;

        this.container.addChild(
            this.fieldTexture
                .getSprite(),
        );

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

        if (refreshInterval > 0) {
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

        this.clearWorkingSet();

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

        this.touchedIndices.length =
            0;

        this.fieldTexture
            .destroy();

        this.container
            .removeFromParent();

        this.container
            .destroy();
    }

    private redraw():
        void {
        this.clearWorkingSet();

        const standingWater =
            this.definition
                .standingWater;

        this.waterField
            .forEachTrackedWaterCell(
                (
                    cell,
                ): void => {
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

                    if (alpha <= 0) {
                        return;
                    }

                    this.directAlpha[
                        cell.index
                    ] =
                        Math.max(
                            this.directAlpha[
                                cell.index
                            ],
                            alpha,
                        );

                    this.markTouched(
                        cell.index,
                    );
                },
            );

        this.fieldTexture
            .beginUpdate();

        for (
            const index of
            this.touchedIndices
        ) {
            const alpha =
                this.directAlpha[
                    index
                ];

            if (alpha <= 0) {
                continue;
            }

            this.fieldTexture
                .writeColorByIndex(
                    index,
                    this.definition
                        .palette
                        .baseWater,
                    alpha,
                );
        }

        this.fieldTexture
            .commit();
    }

    private markTouched(
        index:
            number,
    ): void {
        if (
            index < 0 ||
            index >= this.cellCount ||
            this.touchedFlags[
                index
            ] !== 0
        ) {
            return;
        }

        this.touchedFlags[
            index
        ] =
            1;

        this.touchedIndices.push(
            index,
        );
    }

    private clearWorkingSet():
        void {
        for (
            const index of
            this.touchedIndices
        ) {
            this.directAlpha[
                index
            ] =
                0;

            this.touchedFlags[
                index
            ] =
                0;
        }

        this.touchedIndices.length =
            0;
    }
}

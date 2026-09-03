import {
    Container,
    Graphics,
} from "pixi.js";

import {
    DEFAULT_FIRE_VISUAL_DEFINITION,
    validateFireVisualDefinition,
} from "../config/FireVisualDefinition";

import type {
    FireVisualDefinition,
} from "../config/FireVisualDefinition";

import type {
    FireManager,
} from "./FireManager";

import type {
    FireCell,
} from "./FireCell";

/**
 * Temporary presentation-only Fire renderer.
 *
 * Each FireCell gets a stable deformed footprint derived from its grid
 * coordinates. The footprint is intentionally wider than the simulation
 * cell so neighbouring cells visually overlap.
 */
export class FireVisualizer {
    private readonly container:
        Container;

    private readonly graphics:
        Graphics;

    private readonly definition:
        FireVisualDefinition;

    private elapsedTime =
        0;

    private destroyed =
        false;

    /**
     * Legacy FireCell footprint rendering is now debug-only.
     * Normal ground Fire presentation is owned by FireVfxSystem.
     */
    private debugVisible =
        false;

    constructor(
        private readonly fireManager:
            FireManager,

        definition:
            FireVisualDefinition =
            DEFAULT_FIRE_VISUAL_DEFINITION,
    ) {
        validateFireVisualDefinition(
            definition,
        );

        this.definition =
            definition;

        this.container =
            new Container();

        this.graphics =
            new Graphics();

        this.container
            .addChild(
                this.graphics,
            );
    }

    public setDebugVisible(
        visible: boolean,
    ): void {

        this.debugVisible =
            visible;

        if (!visible) {
            this.graphics.clear();
        }
    }

    public isDebugVisible():
        boolean {

        return this.debugVisible;
    }

    public update(
        deltaTime: number,
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
            )
        ) {
            return;
        }

        this.elapsedTime +=
            Math.max(
                0,
                deltaTime,
            );

        if (!this.debugVisible) {
            this.graphics.clear();

            return;
        }

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

        this.container
            .removeFromParent();

        this.container
            .destroy({
                children:
                    false,
            });
    }

    public getContainer():
        Container {
        return this.container;
    }

    private redraw():
        void {
        this.graphics.clear();

        for (
            const cell
            of this.fireManager
                .getActiveCells()
        ) {
            this.drawCell(
                cell,
            );
        }
    }

    private drawCell(
        cell: FireCell,
    ): void {
        /*
         * FireCell intensity is the effective combustion intensity.
         * FireManager now folds local fuel availability into it, so
         * depleted Fire automatically shrinks/fades here.
         */
        const intensity =
            Math.min(
                1,
                Math.max(
                    0,
                    cell.getIntensity(),
                ),
            );

        if (
            intensity <= 0
        ) {
            return;
        }

        const cellSize =
            this.fireManager
                .getDefinition()
                .cellSize;

        const baseSeed =
            this.hashCell(
                cell.getGridX(),
                cell.getGridY(),
            );

        const x =
            cell.getWorldCenterX() +
            this.seededRange(
                baseSeed + 11,
                -this.definition.visualOffsetXRange,
                this.definition.visualOffsetXRange,
            );

        const y =
            cell.getWorldCenterY() +
            this.seededRange(
                baseSeed + 23,
                -this.definition.visualOffsetYRange,
                this.definition.visualOffsetYRange,
            );

        const phase =
            this.seededRange(
                baseSeed + 37,
                0,
                Math.PI * 2,
            );

        const flicker =
            1 +
            Math.sin(
                this.elapsedTime *
                this.definition.flickerSpeed +
                phase,
            ) *
            this.definition.flickerAmount;

        const width =
            cellSize *
            this.definition.baseWidthMultiplier *
            this.definition.overallOverlapMultiplier *
            flicker *
            (
                0.76 +
                intensity * 0.24
            );

        const height =
            cellSize *
            this.definition.baseHeightMultiplier *
            this.definition.overallOverlapMultiplier *
            flicker *
            (
                0.80 +
                intensity * 0.20
            );

        this.graphics
            .ellipse(
                x,
                y + height * 0.10,
                width * 0.50,
                height * 0.50,
            );

        this.graphics
            .fill({
                color:
                    this.definition.outerColor,

                alpha:
                    this.definition.outerAlpha *
                    intensity,
            });

        for (
            let lobeIndex = 0;
            lobeIndex < this.definition.lobeCount;
            lobeIndex += 1
        ) {
            const lobeSeed =
                baseSeed +
                101 +
                lobeIndex * 97;

            const offsetX =
                this.seededRange(
                    lobeSeed + 3,
                    -this.definition.lobeOffsetRange,
                    this.definition.lobeOffsetRange,
                );

            const offsetY =
                this.seededRange(
                    lobeSeed + 7,
                    -this.definition.lobeOffsetRange * 0.72,
                    this.definition.lobeOffsetRange * 0.38,
                );

            const radius =
                cellSize *
                this.seededRange(
                    lobeSeed + 13,
                    this.definition.lobeMinimumRadiusMultiplier,
                    this.definition.lobeMaximumRadiusMultiplier,
                ) *
                this.definition.overallOverlapMultiplier *
                flicker;

            this.graphics
                .circle(
                    x + offsetX,
                    y + offsetY,
                    radius,
                );

            this.graphics
                .fill({
                    color:
                        this.definition.middleColor,

                    alpha:
                        this.definition.middleAlpha *
                        intensity,
                });
        }

        const coreRadius =
            cellSize *
            0.18 *
            flicker *
            (
                0.82 +
                intensity * 0.18
            );

        this.graphics
            .circle(
                x,
                y - height * 0.16,
                coreRadius,
            );

        this.graphics
            .fill({
                color:
                    this.definition.innerColor,

                alpha:
                    this.definition.innerAlpha *
                    intensity,
            });
    }

    private hashCell(
        gridX: number,
        gridY: number,
    ): number {
        return (
            Math.imul(
                gridX + 2048,
                73856093,
            ) ^
            Math.imul(
                gridY + 2048,
                19349663,
            )
        ) >>> 0;
    }

    private seededRange(
        seed: number,
        minimum: number,
        maximum: number,
    ): number {
        return (
            minimum +
            (
                maximum - minimum
            ) *
            this.seededUnit(
                seed,
            )
        );
    }

    private seededUnit(
        seed: number,
    ): number {
        let value =
            seed >>> 0;

        value +=
            0x6d2b79f5;

        value =
            Math.imul(
                value ^
                value >>> 15,
                value | 1,
            );

        value ^=
            value +
            Math.imul(
                value ^
                value >>> 7,
                value | 61,
            );

        return (
            (
                value ^
                value >>> 14
            ) >>> 0
        ) /
            4294967296;
    }
}

import {
    Graphics,
} from "pixi.js";

import {
    DEFAULT_SCORCH_VFX_DEFINITION,
} from "../config/ScorchVfxDefinition";

import type {
    ScorchVfxDefinition,
} from "../config/ScorchVfxDefinition";

import type {
    EnvironmentField,
} from "./EnvironmentField";

/**
 * Presentation-only renderer for persistent burn/scorch state.
 *
 * Target:
 * - stronger continuous damage trail than the previous refinement
 * - fresh high-burn regions read as dark char
 * - medium burn reads dark brown
 * - lighter burn preserves more grass
 * - irregular edges remain, but the footprint no longer dissolves into
 *   isolated dirt dots
 */
export class EnvironmentFieldVisualizer {
    private readonly graphics:
        Graphics;

    private lastBurnRevision =
        -1;

    private destroyed =
        false;

    public constructor(
        private readonly environmentField:
            EnvironmentField,

        private readonly scorch:
            ScorchVfxDefinition =
            DEFAULT_SCORCH_VFX_DEFINITION,
    ) {
        this.graphics =
            new Graphics();
    }

    public update(): void {

        if (
            this.destroyed ||
            !this.environmentField
                .getDefinition()
                .visual
                .enabled
        ) {
            return;
        }

        const revision =
            this.environmentField
                .getBurnRevision();

        if (
            revision ===
            this.lastBurnRevision
        ) {
            return;
        }

        this.lastBurnRevision =
            revision;

        this.redraw();
    }

    public destroy(): void {

        if (this.destroyed) {
            return;
        }

        this.destroyed =
            true;

        this.graphics
            .removeFromParent();

        this.graphics.destroy();
    }

    public getGraphics():
        Graphics {

        return this.graphics;
    }

    private redraw():
        void {

        this.graphics.clear();

        const definition =
            this.environmentField
                .getDefinition();

        const visual =
            definition.visual;

        for (
            const index
            of this.environmentField
                .getTrackedBurnIndices()
        ) {
            const burnAmount =
                this.environmentField
                    .getBurnAmountByIndex(
                        index,
                    );

            if (
                burnAmount <
                visual
                    .minimumVisibleBurnAmount
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

            const burn =
                this.clamp01(
                    burnAmount,
                );

            const skipChance =
                this.lerp(
                    this.scorch
                        .lowBurnSkipChance,
                    this.scorch
                        .highBurnSkipChance,
                    burn,
                );

            if (
                this.seededUnit(
                    index *
                    71 +
                    5,
                ) <
                skipChance
            ) {
                continue;
            }

            const jitter =
                definition.cellSize *
                this.scorch
                    .positionJitterMultiplier;

            const x =
                center.x +
                this.seededRange(
                    index *
                    13 +
                    17,
                    -jitter,
                    jitter,
                );

            const y =
                center.y +
                this.seededRange(
                    index *
                    19 +
                    31,
                    -jitter,
                    jitter,
                );

            const radius =
                definition.cellSize *
                this.seededRange(
                    index *
                    29 +
                    47,
                    this.scorch
                        .minimumRadiusMultiplier,
                    this.scorch
                        .maximumRadiusMultiplier,
                ) *
                this.lerp(
                    0.82,
                    1.08,
                    burn,
                );

            const style =
                this.getStyle(
                    burn,
                );

            this.graphics
                .circle(
                    x,
                    y,
                    radius,
                )
                .fill({
                    color:
                        style.color,

                    alpha:
                        style.alpha,
                });

            if (
                this.seededUnit(
                    index *
                    97 +
                    61,
                ) <
                this.scorch
                    .secondaryPatchChance
            ) {
                const angle =
                    this.seededUnit(
                        index *
                        101 +
                        73,
                    ) *
                    Math.PI *
                    2;

                const distance =
                    radius *
                    0.72;

                this.graphics
                    .circle(
                        x +
                        Math.cos(
                            angle,
                        ) *
                        distance,

                        y +
                        Math.sin(
                            angle,
                        ) *
                        distance,

                        radius *
                        this.scorch
                            .secondaryPatchRadiusMultiplier,
                    )
                    .fill({
                        color:
                            style.color,

                        alpha:
                            style.alpha *
                            this.scorch
                                .secondaryPatchAlphaMultiplier,
                    });
            }
        }
    }

    private getStyle(
        burn: number,
    ): {
        color: number;
        alpha: number;
    } {

        if (
            burn >=
            this.scorch
                .freshBurnThreshold
        ) {
            const amount =
                (
                    burn -
                    this.scorch
                        .freshBurnThreshold
                ) /
                Math.max(
                    0.001,
                    1 -
                    this.scorch
                        .freshBurnThreshold,
                );

            return {
                color:
                    this.interpolateColor(
                        this.scorch
                            .recentCharColor,
                        this.scorch
                            .freshCharColor,
                        amount,
                    ),

                alpha:
                    this.lerp(
                        this.scorch
                            .recentCharAlpha,
                        this.scorch
                            .freshCharAlpha,
                        amount,
                    ),
            };
        }

        if (
            burn >=
            this.scorch
                .recentBurnThreshold
        ) {
            const amount =
                (
                    burn -
                    this.scorch
                        .recentBurnThreshold
                ) /
                Math.max(
                    0.001,
                    this.scorch
                        .freshBurnThreshold -
                    this.scorch
                        .recentBurnThreshold,
                );

            return {
                color:
                    this.interpolateColor(
                        this.scorch
                            .oldCharColor,
                        this.scorch
                            .recentCharColor,
                        amount,
                    ),

                alpha:
                    this.lerp(
                        this.scorch
                            .oldCharAlpha,
                        this.scorch
                            .recentCharAlpha,
                        amount,
                    ),
            };
        }

        const amount =
            burn /
            Math.max(
                0.001,
                this.scorch
                    .recentBurnThreshold,
            );

        return {
            color:
                this.scorch
                    .oldCharColor,

            alpha:
                this.scorch
                    .oldCharAlpha *
                this.lerp(
                    0.62,
                    1,
                    amount,
                ),
        };
    }

    private interpolateColor(
        startColor: number,
        endColor: number,
        amount: number,
    ): number {

        const safe =
            this.clamp01(
                amount,
            );

        const startRed =
            (
                startColor >>
                16
            ) &
            0xff;

        const startGreen =
            (
                startColor >>
                8
            ) &
            0xff;

        const startBlue =
            startColor &
            0xff;

        const endRed =
            (
                endColor >>
                16
            ) &
            0xff;

        const endGreen =
            (
                endColor >>
                8
            ) &
            0xff;

        const endBlue =
            endColor &
            0xff;

        return (
            Math.round(
                this.lerp(
                    startRed,
                    endRed,
                    safe,
                ),
            ) <<
            16
        ) |
            (
                Math.round(
                    this.lerp(
                        startGreen,
                        endGreen,
                        safe,
                    ),
                ) <<
                8
            ) |
            Math.round(
                this.lerp(
                    startBlue,
                    endBlue,
                    safe,
                ),
            );
    }

    private seededRange(
        seed: number,
        minimum: number,
        maximum: number,
    ): number {

        return this.lerp(
            minimum,
            maximum,
            this.seededUnit(
                seed,
            ),
        );
    }

    private seededUnit(
        seed: number,
    ): number {

        let value =
            seed >>>
            0;

        value +=
            0x6d2b79f5;

        value =
            Math.imul(
                value ^
                value >>>
                15,
                value |
                1,
            );

        value ^=
            value +
            Math.imul(
                value ^
                value >>>
                7,
                value |
                61,
            );

        return (
            (
                value ^
                value >>>
                14
            ) >>>
            0
        ) /
            4294967296;
    }

    private lerp(
        start: number,
        end: number,
        amount: number,
    ): number {

        return (
            start +
            (
                end -
                start
            ) *
            amount
        );
    }

    private clamp01(
        value: number,
    ): number {

        return Math.max(
            0,
            Math.min(
                1,
                value,
            ),
        );
    }
}

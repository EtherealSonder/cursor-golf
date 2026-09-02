import {
    Container,
    Graphics,
    RenderTexture,
    Sprite,
} from "pixi.js";

import type {
    Application,
} from "pixi.js";

import type {
    EnvironmentField,
} from "./EnvironmentField";

/**
 * Incremental persistent scorch renderer.
 *
 * EnvironmentField remains the simulation authority. This renderer only
 * consumes dirty burn cells, quantizes their visual state, batches the
 * changed brush shapes, and paints them into one persistent RenderTexture.
 */
export class EnvironmentFieldVisualizer {
    private readonly container:
        Container;

    private readonly burnSprite:
        Sprite;

    private readonly burnTexture:
        RenderTexture;

    private readonly brush:
        Graphics;

    private destroyed =
        false;

    constructor(
        private readonly app:
            Application,

        private readonly environmentField:
            EnvironmentField,
    ) {
        this.container =
            new Container();

        const definition =
            this.environmentField
                .getDefinition();

        const courseWidth =
            this.environmentField
                .getColumnCount() *
            definition.cellSize;

        const courseHeight =
            this.environmentField
                .getRowCount() *
            definition.cellSize;

        this.burnTexture =
            RenderTexture.create({
                width:
                    Math.max(
                        1,
                        Math.ceil(
                            courseWidth *
                            definition.visual.renderTextureScale,
                        ),
                    ),

                height:
                    Math.max(
                        1,
                        Math.ceil(
                            courseHeight *
                            definition.visual.renderTextureScale,
                        ),
                    ),
            });

        this.burnSprite =
            new Sprite(
                this.burnTexture,
            );

        this.burnSprite.scale.set(
            1 /
            definition.visual.renderTextureScale,
        );

        this.burnSprite.position.set(
            this.environmentField
                .getMinimumWorldX(),

            this.environmentField
                .getMinimumWorldY(),
        );

        this.brush =
            new Graphics();

        this.container
            .addChild(
                this.burnSprite,
            );
    }

    public update(): void {
        if (
            this.destroyed ||
            !this.environmentField
                .getDefinition()
                .visual.enabled
        ) {
            return;
        }

        const dirtyIndices =
            this.environmentField
                .consumeDirtyBurnIndices();

        if (
            dirtyIndices.length === 0
        ) {
            return;
        }

        const definition =
            this.environmentField
                .getDefinition();

        const visual =
            definition.visual;

        const bucketCount =
            visual.burnVisualBucketCount;

        this.brush.clear();

        let paintedAny =
            false;

        for (
            const index
            of dirtyIndices
        ) {
            const burnAmount =
                this.environmentField
                    .getBurnAmountByIndex(
                        index,
                    );

            if (
                burnAmount <
                visual.minimumVisibleBurnAmount
            ) {
                continue;
            }

            const bucket =
                Math.min(
                    bucketCount,
                    Math.max(
                        1,
                        Math.ceil(
                            burnAmount *
                            bucketCount,
                        ),
                    ),
                );

            if (
                bucket <=
                this.environmentField
                    .getVisualBurnBucket(
                        index,
                    )
            ) {
                continue;
            }

            this.environmentField
                .setVisualBurnBucket(
                    index,
                    bucket,
                );

            this.appendBurnSample(
                index,
                bucket /
                bucketCount,
            );

            paintedAny =
                true;
        }

        if (
            !paintedAny
        ) {
            return;
        }

        this.app.renderer.render({
            container:
                this.brush,

            target:
                this.burnTexture,

            clear:
                false,
        });
    }

    public destroy(): void {
        if (
            this.destroyed
        ) {
            return;
        }

        this.destroyed =
            true;

        this.brush.destroy();

        this.burnSprite
            .removeFromParent();

        this.burnSprite
            .destroy();

        this.burnTexture
            .destroy(
                true,
            );

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

    private appendBurnSample(
        index: number,
        normalizedBurn: number,
    ): void {
        const definition =
            this.environmentField
                .getDefinition();

        const visual =
            definition.visual;

        const center =
            this.environmentField
                .getWorldCenterByIndex(
                    index,
                );

        if (!center) {
            return;
        }

        const offsetRange =
            definition.cellSize *
            visual.positionJitterMultiplier;

        const offsetX =
            this.seededRange(
                index * 13 + 17,
                -offsetRange,
                offsetRange,
            );

        const offsetY =
            this.seededRange(
                index * 19 + 31,
                -offsetRange,
                offsetRange,
            );

        const baseRadius =
            definition.cellSize *
            this.seededRange(
                index * 29 + 47,
                visual.minimumRadiusMultiplier,
                visual.maximumRadiusMultiplier,
            ) *
            (
                0.72 +
                normalizedBurn * 0.38
            );

        const color =
            this.interpolateColor(
                visual.lowBurnColor,
                visual.highBurnColor,
                normalizedBurn,
            );

        const alpha =
            visual.minimumAlpha +
            (
                visual.maximumAlpha -
                visual.minimumAlpha
            ) *
            normalizedBurn;

        const localX =
            (
                center.x +
                offsetX -
                this.environmentField
                    .getMinimumWorldX()
            ) *
            visual.renderTextureScale;

        const localY =
            (
                center.y +
                offsetY -
                this.environmentField
                    .getMinimumWorldY()
            ) *
            visual.renderTextureScale;

        const scaledRadius =
            baseRadius *
            visual.renderTextureScale;

        this.brush
            .circle(
                localX,
                localY,
                scaledRadius,
            );

        this.brush
            .fill({
                color,
                alpha,
            });

        for (
            let lobeIndex = 0;
            lobeIndex < visual.brushLobeCount;
            lobeIndex += 1
        ) {
            const seed =
                index * 71 +
                lobeIndex * 97 +
                53;

            const lobeOffset =
                scaledRadius *
                visual.brushLobeOffsetMultiplier;

            const lobeX =
                localX +
                this.seededRange(
                    seed + 3,
                    -lobeOffset,
                    lobeOffset,
                );

            const lobeY =
                localY +
                this.seededRange(
                    seed + 7,
                    -lobeOffset,
                    lobeOffset,
                );

            const lobeRadius =
                scaledRadius *
                visual.brushLobeRadiusMultiplier *
                this.seededRange(
                    seed + 11,
                    0.72,
                    1.18,
                );

            this.brush
                .circle(
                    lobeX,
                    lobeY,
                    lobeRadius,
                );

            this.brush
                .fill({
                    color,
                    alpha:
                        alpha * 0.72,
                });
        }
    }

    private interpolateColor(
        startColor: number,
        endColor: number,
        amount: number,
    ): number {
        const safeAmount =
            Math.min(
                1,
                Math.max(
                    0,
                    amount,
                ),
            );

        const sr =
            (
                startColor >> 16
            ) & 0xff;

        const sg =
            (
                startColor >> 8
            ) & 0xff;

        const sb =
            startColor & 0xff;

        const er =
            (
                endColor >> 16
            ) & 0xff;

        const eg =
            (
                endColor >> 8
            ) & 0xff;

        const eb =
            endColor & 0xff;

        return (
            Math.round(
                sr +
                (
                    er - sr
                ) *
                safeAmount,
            ) << 16
        ) |
            (
                Math.round(
                    sg +
                    (
                        eg - sg
                    ) *
                    safeAmount,
                ) << 8
            ) |
            Math.round(
                sb +
                (
                    eb - sb
                ) *
                safeAmount,
            );
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

import {
    Texture,
} from "pixi.js";

import type {
    EnvironmentField,
} from "../environment/EnvironmentField";

import type {
    ScorchVfxDefinition,
} from "../config/ScorchVfxDefinition";

/**
 * Persistent incremental scorch raster.
 *
 * Important performance rule:
 * - canvas size is fixed once in the constructor
 * - burn coverage is persistent and monotonic until reset
 * - only dirty EnvironmentField cells and their local neighbourhoods are
 *   recomputed
 * - no whole-field blur/noise passes occur while Fire is active
 */
export class ScorchFieldTextureGenerator {

    private readonly canvas:
        HTMLCanvasElement;

    private readonly context:
        CanvasRenderingContext2D;

    private readonly texture:
        Texture;

    private readonly width:
        number;

    private readonly height:
        number;

    private readonly sourceColumns:
        number;

    private readonly sourceRows:
        number;

    private readonly scale:
        number;

    private readonly coverage:
        Float32Array;

    private readonly imageData:
        ImageData;

    private destroyed =
        false;

    public constructor(
        private readonly environmentField:
            EnvironmentField,

        private readonly definition:
            ScorchVfxDefinition,
    ) {
        this.sourceColumns =
            environmentField
                .getColumnCount();

        this.sourceRows =
            environmentField
                .getRowCount();

        this.scale =
            Math.max(
                1,
                Math.floor(
                    definition
                        .textureScale,
                ),
            );

        this.width =
            Math.max(
                1,
                this.sourceColumns *
                this.scale,
            );

        this.height =
            Math.max(
                1,
                this.sourceRows *
                this.scale,
            );

        this.canvas =
            document.createElement(
                "canvas",
            );

        this.canvas.width =
            this.width;

        this.canvas.height =
            this.height;

        const context =
            this.canvas.getContext(
                "2d",
                {
                    alpha:
                        true,
                },
            );

        if (!context) {
            throw new Error(
                "ScorchFieldTextureGenerator requires a 2D canvas context.",
            );
        }

        this.context =
            context;

        this.context.imageSmoothingEnabled =
            true;

        this.coverage =
            new Float32Array(
                this.width *
                this.height,
            );

        this.imageData =
            this.context.createImageData(
                this.width,
                this.height,
            );

        /*
         * Texture is created only after the canvas already has its final
         * dimensions. The backing resource is never resized afterward.
         */
        this.texture =
            Texture.from(
                this.canvas,
            );
    }

    public getTexture():
        Texture {

        return this.texture;
    }

    /**
     * Updates presentation from EnvironmentField dirty burn indices.
     *
     * Returns true only when the canvas changed and therefore requires a
     * texture upload.
     */
    public updateDirty():
        boolean {

        if (
            this.destroyed
        ) {
            return false;
        }

        const dirtyIndices =
            this.environmentField
                .consumeDirtyBurnIndices();

        if (
            dirtyIndices.length ===
            0
        ) {
            return false;
        }

        const maximumBurn =
            Math.max(
                0.0001,
                this.environmentField
                    .getDefinition()
                    .maximumBurnAmount,
            );

        let changed =
            false;

        let minimumDirtyX =
            this.width;

        let minimumDirtyY =
            this.height;

        let maximumDirtyX =
            -1;

        let maximumDirtyY =
            -1;

        const sourceInfluenceRadius =
            Math.max(
                0.5,
                this.definition
                    .influenceRadiusCells,
            );

        const outputInfluenceRadius =
            sourceInfluenceRadius *
            this.scale;

        for (
            const sourceIndex
            of dirtyIndices
        ) {
            const burn =
                this.clamp01(
                    this.environmentField
                        .getBurnAmountByIndex(
                            sourceIndex,
                        ) /
                    maximumBurn,
                );

            if (
                burn <=
                0
            ) {
                continue;
            }

            /*
             * EnvironmentFieldRenderCache is already designed to prevent
             * repeated presentation work for visually equivalent values.
             */
            const bucketCount =
                Math.max(
                    2,
                    this.environmentField
                        .getDefinition()
                        .visual
                        .burnVisualBucketCount,
                );

            const visualBucket =
                Math.min(
                    bucketCount -
                    1,
                    Math.floor(
                        burn *
                        bucketCount,
                    ),
                );

            if (
                visualBucket ===
                this.environmentField
                    .getVisualBurnBucket(
                        sourceIndex,
                    )
            ) {
                continue;
            }

            this.environmentField
                .setVisualBurnBucket(
                    sourceIndex,
                    visualBucket,
                );

            const sourceX =
                sourceIndex %
                this.sourceColumns;

            const sourceY =
                Math.floor(
                    sourceIndex /
                    this.sourceColumns,
                );

            const centerX =
                (
                    sourceX +
                    0.5
                ) *
                this.scale;

            const centerY =
                (
                    sourceY +
                    0.5
                ) *
                this.scale;

            const minimumX =
                Math.max(
                    0,
                    Math.floor(
                        centerX -
                        outputInfluenceRadius -
                        1,
                    ),
                );

            const maximumX =
                Math.min(
                    this.width -
                    1,
                    Math.ceil(
                        centerX +
                        outputInfluenceRadius +
                        1,
                    ),
                );

            const minimumY =
                Math.max(
                    0,
                    Math.floor(
                        centerY -
                        outputInfluenceRadius -
                        1,
                    ),
                );

            const maximumY =
                Math.min(
                    this.height -
                    1,
                    Math.ceil(
                        centerY +
                        outputInfluenceRadius +
                        1,
                    ),
                );

            for (
                let y =
                    minimumY;

                y <=
                maximumY;

                y +=
                1
            ) {
                for (
                    let x =
                        minimumX;

                    x <=
                    maximumX;

                    x +=
                    1
                ) {
                    const deltaX =
                        (
                            x +
                            0.5 -
                            centerX
                        ) /
                        outputInfluenceRadius;

                    const deltaY =
                        (
                            y +
                            0.5 -
                            centerY
                        ) /
                        outputInfluenceRadius;

                    const distance =
                        Math.sqrt(
                            deltaX *
                            deltaX +
                            deltaY *
                            deltaY,
                        );

                    if (
                        distance >
                        1
                    ) {
                        continue;
                    }

                    const falloff =
                        Math.pow(
                            Math.max(
                                0,
                                1 -
                                distance,
                            ),
                            this.definition
                                .influenceFalloffExponent,
                        );

                    const noise =
                        this.getStableNoise(
                            x,
                            y,
                        );

                    const boundaryNoise =
                        (
                            noise *
                            2 -
                            1
                        ) *
                        this.definition
                            .edgeNoiseStrength;

                    let candidate =
                        burn *
                        falloff;

                    /*
                     * Noise is strongest near the boundary and weak toward
                     * the source centre. This deforms the perimeter without
                     * punching holes through established burned interiors.
                     */
                    candidate +=
                        boundaryNoise *
                        (
                            1 -
                            falloff
                        ) *
                        burn;

                    candidate =
                        this.clamp01(
                            candidate,
                        );

                    const outputIndex =
                        y *
                        this.width +
                        x;

                    const previous =
                        this.coverage[
                        outputIndex
                        ] ??
                        0;

                    /*
                     * Burn is persistent until EnvironmentField.reset(), so
                     * presentation coverage can also increase monotonically.
                     */
                    if (
                        candidate <=
                        previous +
                        0.002
                    ) {
                        continue;
                    }

                    this.coverage[
                        outputIndex
                    ] =
                        candidate;

                    this.writePixel(
                        outputIndex,
                        candidate,
                    );

                    changed =
                        true;

                    minimumDirtyX =
                        Math.min(
                            minimumDirtyX,
                            x,
                        );

                    minimumDirtyY =
                        Math.min(
                            minimumDirtyY,
                            y,
                        );

                    maximumDirtyX =
                        Math.max(
                            maximumDirtyX,
                            x,
                        );

                    maximumDirtyY =
                        Math.max(
                            maximumDirtyY,
                            y,
                        );
                }
            }
        }

        if (!changed) {
            return false;
        }

        /*
         * Only copy the changed rectangle into the canvas. The Pixi source
         * upload still occurs at texture level, but CPU raster work remains
         * local rather than rebuilding the whole scorch field.
         */
        this.context.putImageData(
            this.imageData,
            0,
            0,
            minimumDirtyX,
            minimumDirtyY,
            maximumDirtyX -
            minimumDirtyX +
            1,
            maximumDirtyY -
            minimumDirtyY +
            1,
        );

        const source =
            this.texture.source as unknown as {
                update?: () => void;
            };

        source.update?.();

        return true;
    }

    public reset():
        void {

        if (
            this.destroyed
        ) {
            return;
        }

        this.coverage.fill(
            0,
        );

        this.imageData.data.fill(
            0,
        );

        this.context.clearRect(
            0,
            0,
            this.width,
            this.height,
        );

        this.context.putImageData(
            this.imageData,
            0,
            0,
        );

        const source =
            this.texture.source as unknown as {
                update?: () => void;
            };

        source.update?.();
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

        this.texture.destroy(
            true,
        );
    }

    private writePixel(
        index:
            number,

        coverage:
            number,
    ): void {

        const appearance =
            this.getAppearance(
                coverage,
            );

        const pixelOffset =
            index *
            4;

        this.imageData.data[
            pixelOffset
        ] =
            appearance.r;

        this.imageData.data[
            pixelOffset +
            1
        ] =
            appearance.g;

        this.imageData.data[
            pixelOffset +
            2
        ] =
            appearance.b;

        this.imageData.data[
            pixelOffset +
            3
        ] =
            Math.round(
                appearance.alpha *
                255,
            );
    }

    private getAppearance(
        burn:
            number,
    ): {
        readonly r:
        number;

        readonly g:
        number;

        readonly b:
        number;

        readonly alpha:
        number;
    } {
        const visibleBurn =
            burn <
                this.definition
                    .interiorCoverageThreshold
                ? this.smoothStep(
                    this.definition
                        .minimumVisibleBurn,
                    this.definition
                        .interiorCoverageThreshold,
                    burn,
                )
                : burn;

        if (
            visibleBurn <=
            0
        ) {
            return {
                r:
                    0,
                g:
                    0,
                b:
                    0,
                alpha:
                    0,
            };
        }

        if (
            burn >=
            this.definition
                .heavyBurnThreshold
        ) {
            const amount =
                this.inverseLerp(
                    this.definition
                        .heavyBurnThreshold,
                    1,
                    burn,
                );

            return this.mixColor(
                this.definition
                    .mediumBurnColor,
                this.definition
                    .heavyBurnColor,
                this.definition
                    .mediumBurnAlpha,
                this.definition
                    .heavyBurnAlpha,
                amount,
            );
        }

        if (
            burn >=
            this.definition
                .mediumBurnThreshold
        ) {
            const amount =
                this.inverseLerp(
                    this.definition
                        .mediumBurnThreshold,
                    this.definition
                        .heavyBurnThreshold,
                    burn,
                );

            return this.mixColor(
                this.definition
                    .lightBurnColor,
                this.definition
                    .mediumBurnColor,
                this.definition
                    .lightBurnAlpha,
                this.definition
                    .mediumBurnAlpha,
                amount,
            );
        }

        const amount =
            this.inverseLerp(
                this.definition
                    .minimumVisibleBurn,
                this.definition
                    .mediumBurnThreshold,
                burn,
            );

        return this.mixColor(
            this.definition
                .lightBurnColor,
            this.definition
                .lightBurnColor,
            0,
            this.definition
                .lightBurnAlpha,
            amount,
        );
    }

    private getStableNoise(
        x:
            number,

        y:
            number,
    ): number {

        const scale =
            Math.max(
                0.0001,
                this.definition
                    .edgeNoiseScale,
            );

        const sampleX =
            Math.floor(
                x *
                scale *
                64,
            );

        const sampleY =
            Math.floor(
                y *
                scale *
                64,
            );

        let value =
            (
                Math.imul(
                    sampleX +
                    374761393,
                    668265263,
                ) ^
                Math.imul(
                    sampleY +
                    1274126177,
                    -2048144777,
                )
            ) >>>
            0;

        value ^=
            value >>>
            13;

        value =
            Math.imul(
                value,
                1274126177,
            ) >>>
            0;

        value ^=
            value >>>
            16;

        return (
            value /
            4294967295
        );
    }

    private mixColor(
        startColor:
            number,

        endColor:
            number,

        startAlpha:
            number,

        endAlpha:
            number,

        amount:
            number,
    ): {
        readonly r:
        number;

        readonly g:
        number;

        readonly b:
        number;

        readonly alpha:
        number;
    } {

        const t =
            this.clamp01(
                amount,
            );

        const startRed =
            (
                startColor >>>
                16
            ) &
            0xff;

        const startGreen =
            (
                startColor >>>
                8
            ) &
            0xff;

        const startBlue =
            startColor &
            0xff;

        const endRed =
            (
                endColor >>>
                16
            ) &
            0xff;

        const endGreen =
            (
                endColor >>>
                8
            ) &
            0xff;

        const endBlue =
            endColor &
            0xff;

        return {
            r:
                Math.round(
                    this.lerp(
                        startRed,
                        endRed,
                        t,
                    ),
                ),

            g:
                Math.round(
                    this.lerp(
                        startGreen,
                        endGreen,
                        t,
                    ),
                ),

            b:
                Math.round(
                    this.lerp(
                        startBlue,
                        endBlue,
                        t,
                    ),
                ),

            alpha:
                this.lerp(
                    startAlpha,
                    endAlpha,
                    t,
                ),
        };
    }

    private smoothStep(
        edge0:
            number,

        edge1:
            number,

        value:
            number,
    ): number {

        const t =
            this.inverseLerp(
                edge0,
                edge1,
                value,
            );

        return (
            t *
            t *
            (
                3 -
                2 *
                t
            )
        );
    }

    private inverseLerp(
        start:
            number,

        end:
            number,

        value:
            number,
    ): number {

        return this.clamp01(
            (
                value -
                start
            ) /
            Math.max(
                0.0001,
                end -
                start,
            ),
        );
    }

    private lerp(
        start:
            number,

        end:
            number,

        amount:
            number,
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
        value:
            number,
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

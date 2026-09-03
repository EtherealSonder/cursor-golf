import {
    Container,
    Sprite,
    Texture,
} from "pixi.js";

import {
    DEFAULT_SCORCH_VFX_DEFINITION,
} from "../config/ScorchVfxDefinition";

import type {
    ScorchVfxDefinition,
} from "../config/ScorchVfxDefinition";

import type {
    EnvironmentField,
} from "../environment/EnvironmentField";

import {
    ScorchContourBuilder,
} from "./ScorchContourBuilder";

import type {
    ScorchContour,
    ScorchContourPoint,
} from "./ScorchContourBuilder";

interface ScorchLayer {
    readonly threshold: number;
    readonly color: number;
    readonly alpha: number;
    readonly deformationPixels: number;
}

/**
 * Presentation-only scorch renderer.
 *
 * The authoritative EnvironmentField remains grid based, but this renderer
 * never draws those cells directly. Instead it:
 *
 * 1. samples the complete scalar burn field
 * 2. closes/smooths small cell-sized gaps
 * 3. extracts connected boundaries with Marching Squares
 * 4. subdivides and deforms only those outer boundaries
 * 5. fills each resulting region as a continuous terrain mass
 *
 * This removes the circle, footprint, net and visible-cell problems from
 * earlier scorch attempts.
 */
export class ScorchRenderer {

    private readonly container =
        new Container();

    private readonly contourBuilder =
        new ScorchContourBuilder();

    private readonly canvas:
        HTMLCanvasElement;

    private readonly context:
        CanvasRenderingContext2D;

    private readonly texture:
        Texture;

    private readonly sprite:
        Sprite;

    private readonly columns:
        number;

    private readonly rows:
        number;

    private readonly cellSize:
        number;

    private readonly minimumWorldX:
        number;

    private readonly minimumWorldY:
        number;

    private readonly burnValues:
        Float32Array;

    private readonly scratchValues:
        Float32Array;

    private refreshAccumulator =
        0;

    private lastBurnRevision =
        -1;

    private lastVisualSignature =
        -1;

    private destroyed =
        false;

    public constructor(
        private readonly environmentField:
            EnvironmentField,

        private readonly definition:
            ScorchVfxDefinition =
            DEFAULT_SCORCH_VFX_DEFINITION,
    ) {
        this.columns =
            environmentField
                .getColumnCount();

        this.rows =
            environmentField
                .getRowCount();

        this.cellSize =
            environmentField
                .getDefinition()
                .cellSize;

        this.minimumWorldX =
            environmentField
                .getMinimumWorldX();

        this.minimumWorldY =
            environmentField
                .getMinimumWorldY();

        this.burnValues =
            new Float32Array(
                this.columns *
                this.rows,
            );

        this.scratchValues =
            new Float32Array(
                this.columns *
                this.rows,
            );

        this.canvas =
            document.createElement(
                "canvas",
            );

        /*
         * Draw directly in world-pixel scale. This avoids a second visible
         * raster lattice and keeps contour deformation expressed naturally
         * in world pixels.
         */
        this.canvas.width =
            Math.max(
                1,
                Math.ceil(
                    this.columns *
                    this.cellSize,
                ),
            );

        this.canvas.height =
            Math.max(
                1,
                Math.ceil(
                    this.rows *
                    this.cellSize,
                ),
            );

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
                "ScorchRenderer requires a 2D canvas context.",
            );
        }

        this.context =
            context;

        this.context.imageSmoothingEnabled =
            true;

        this.texture =
            Texture.from(
                this.canvas,
            );

        this.sprite =
            new Sprite(
                this.texture,
            );

        this.sprite.anchor.set(
            0,
        );

        this.sprite.position.set(
            this.minimumWorldX,
            this.minimumWorldY,
        );

        this.container.addChild(
            this.sprite,
        );
    }

    public getContainer():
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
            !Number.isFinite(
                deltaTime,
            ) ||
            deltaTime <= 0
        ) {
            return;
        }

        this.refreshAccumulator +=
            deltaTime;

        const burnRevision =
            this.environmentField
                .getBurnRevision();

        if (
            burnRevision ===
            this.lastBurnRevision
        ) {
            return;
        }

        if (
            this.refreshAccumulator <
            this.definition
                .refreshIntervalSeconds
        ) {
            return;
        }

        this.refreshAccumulator = 0;

        /*
         * BurnRevision may advance every simulation frame. Rebuilding the
         * complete contour for every tiny scalar change caused the recurring
         * frame-time spikes seen during active spread. The signature below
         * changes only when the tracked burn distribution crosses coarse
         * presentation buckets.
         */
        const visualSignature =
            this.calculateVisualSignature();

        this.lastBurnRevision =
            burnRevision;

        if (
            visualSignature ===
            this.lastVisualSignature
        ) {
            return;
        }

        this.lastVisualSignature =
            visualSignature;

        this.rebuild();
    }

    public reset():
        void {

        if (this.destroyed) {
            return;
        }

        this.refreshAccumulator = 0;

        this.lastBurnRevision = -1;

        this.lastVisualSignature = -1;

        this.burnValues.fill(
            0,
        );

        this.scratchValues.fill(
            0,
        );

        this.context.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height,
        );

        this.updateTextureSource();
    }

    public destroy():
        void {

        if (this.destroyed) {
            return;
        }

        this.destroyed = true;

        this.sprite
            .removeFromParent();

        this.sprite.destroy({
            texture:
                false,
        });

        this.texture.destroy(
            true,
        );

        this.container.destroy({
            children:
                false,
        });
    }

    private calculateVisualSignature():
        number {

        const tracked =
            this.environmentField
                .getTrackedBurnIndices();

        const maximumBurn =
            Math.max(
                0.0001,
                this.environmentField
                    .getDefinition()
                    .maximumBurnAmount,
            );

        let signature =
            tracked.length *
            486187739;

        for (
            const index
            of tracked
        ) {
            const burn =
                this.clamp01(
                    this.environmentField
                        .getBurnAmountByIndex(
                            index,
                        ) /
                    maximumBurn,
                );

            /*
             * Eight visual levels are sufficient for slowly accumulating
             * terrain damage. Fire particles remain fully frame-rate driven.
             */
            const bucket =
                Math.min(
                    7,
                    Math.floor(
                        burn *
                        8,
                    ),
                );

            signature =
                (
                    Math.imul(
                        signature ^
                        (
                            index +
                            1
                        ),
                        16777619,
                    ) ^
                    bucket
                ) >>>
                0;
        }

        return signature;
    }

    private rebuild():
        void {

        this.readBurnField();

        this.closeAndSmoothField();

        this.context.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height,
        );

        const layers:
            ScorchLayer[] = [
                {
                    threshold:
                        this.definition
                            .outerBurnThreshold,

                    color:
                        this.definition
                            .outerColor,

                    alpha:
                        this.definition
                            .outerAlpha,

                    deformationPixels:
                        this.definition
                            .outerEdgeDeformationPixels,
                },
                {
                    threshold:
                        this.definition
                            .burnedRegionThreshold,

                    color:
                        this.definition
                            .burnedColor,

                    alpha:
                        this.definition
                            .burnedAlpha,

                    deformationPixels:
                        this.definition
                            .burnedEdgeDeformationPixels,
                },
                {
                    threshold:
                        this.definition
                            .heavyCharThreshold,

                    color:
                        this.definition
                            .heavyColor,

                    alpha:
                        this.definition
                            .heavyAlpha,

                    deformationPixels:
                        this.definition
                            .heavyEdgeDeformationPixels,
                },
            ];

        for (
            const layer
            of layers
        ) {
            const contours =
                this.contourBuilder
                    .build(
                        this.burnValues,
                        this.columns,
                        this.rows,
                        layer.threshold,
                    );

            this.drawLayer(
                contours,
                layer,
            );
        }

        this.updateTextureSource();
    }

    private readBurnField():
        void {

        this.burnValues.fill(
            0,
        );

        const maximumBurn =
            Math.max(
                0.0001,
                this.environmentField
                    .getDefinition()
                    .maximumBurnAmount,
            );

        const tracked =
            this.environmentField
                .getTrackedBurnIndices();

        for (
            const index
            of tracked
        ) {
            this.burnValues[
                index
            ] =
                this.clamp01(
                    this.environmentField
                        .getBurnAmountByIndex(
                            index,
                        ) /
                    maximumBurn,
                );
        }
    }

    private closeAndSmoothField():
        void {

        const passCount =
            Math.max(
                0,
                Math.floor(
                    this.definition
                        .smoothingPasses,
                ),
            );

        for (
            let pass = 0;
            pass < passCount;
            pass += 1
        ) {
            this.smoothPass(
                this.burnValues,
                this.scratchValues,
            );

            this.burnValues.set(
                this.scratchValues,
            );
        }
    }

    private smoothPass(
        source:
            Float32Array,

        destination:
            Float32Array,
    ): void {

        const strength =
            this.clamp01(
                this.definition
                    .smoothingStrength,
            );

        const closingBias =
            Math.max(
                0,
                this.definition
                    .closingBias,
            );

        for (
            let y = 0;
            y < this.rows;
            y += 1
        ) {
            for (
                let x = 0;
                x < this.columns;
                x += 1
            ) {
                const index =
                    y *
                    this.columns +
                    x;

                const current =
                    source[index] ?? 0;

                let weightedSum =
                    current * 2.2;

                let totalWeight =
                    2.2;

                let neighbourMaximum =
                    current;

                for (
                    let offsetY = -1;
                    offsetY <= 1;
                    offsetY += 1
                ) {
                    const sampleY =
                        y + offsetY;

                    if (
                        sampleY < 0 ||
                        sampleY >= this.rows
                    ) {
                        continue;
                    }

                    for (
                        let offsetX = -1;
                        offsetX <= 1;
                        offsetX += 1
                    ) {
                        if (
                            offsetX === 0 &&
                            offsetY === 0
                        ) {
                            continue;
                        }

                        const sampleX =
                            x + offsetX;

                        if (
                            sampleX < 0 ||
                            sampleX >=
                            this.columns
                        ) {
                            continue;
                        }

                        const diagonal =
                            offsetX !== 0 &&
                            offsetY !== 0;

                        const weight =
                            diagonal
                                ? 0.62
                                : 1;

                        const sample =
                            source[
                            sampleY *
                            this.columns +
                            sampleX
                            ] ?? 0;

                        weightedSum +=
                            sample *
                            weight;

                        totalWeight +=
                            weight;

                        neighbourMaximum =
                            Math.max(
                                neighbourMaximum,
                                sample *
                                (
                                    diagonal
                                        ? 0.76
                                        : 0.90
                                ),
                            );
                    }
                }

                const average =
                    weightedSum /
                    totalWeight;

                const merged =
                    this.lerp(
                        current,
                        Math.max(
                            average,
                            neighbourMaximum,
                        ),
                        strength,
                    );

                /*
                 * A small bias closes cell-sized pinholes but is only applied
                 * where neighbouring burn already exists.
                 */
                destination[index] =
                    neighbourMaximum > 0
                        ? this.clamp01(
                            merged +
                            closingBias *
                            neighbourMaximum,
                        )
                        : 0;
            }
        }
    }

    private drawLayer(
        contours:
            ScorchContour[],

        layer:
            ScorchLayer,
    ): void {

        if (
            contours.length === 0
        ) {
            return;
        }

        const color =
            this.toCssColor(
                layer.color,
                layer.alpha,
            );

        this.context.fillStyle =
            color;

        for (
            let contourIndex = 0;
            contourIndex <
            contours.length;
            contourIndex += 1
        ) {
            const contour =
                contours[
                contourIndex
                ];

            if (
                !contour ||
                contour.length < 3
            ) {
                continue;
            }

            const worldContour =
                this.buildDeformedWorldContour(
                    contour,
                    layer
                        .deformationPixels,
                    contourIndex,
                );

            if (
                worldContour.length < 3
            ) {
                continue;
            }

            this.context.beginPath();

            const first =
                worldContour[0];

            if (!first) {
                continue;
            }

            this.context.moveTo(
                first.x,
                first.y,
            );

            /*
             * Quadratic midpoint smoothing removes the final piecewise-linear
             * look from Marching Squares while retaining the deformed shape.
             */
            for (
                let index = 1;
                index <=
                worldContour.length;
                index += 1
            ) {
                const current =
                    worldContour[
                    index %
                    worldContour.length
                    ];

                const next =
                    worldContour[
                    (
                        index + 1
                    ) %
                    worldContour.length
                    ];

                if (
                    !current ||
                    !next
                ) {
                    continue;
                }

                const midpointX =
                    (
                        current.x +
                        next.x
                    ) *
                    0.5;

                const midpointY =
                    (
                        current.y +
                        next.y
                    ) *
                    0.5;

                this.context
                    .quadraticCurveTo(
                        current.x,
                        current.y,
                        midpointX,
                        midpointY,
                    );
            }

            this.context.closePath();

            this.context.fill();
        }
    }

    private buildDeformedWorldContour(
        contour:
            ScorchContour,

        deformationPixels:
            number,

        contourIndex:
            number,
    ): ScorchContourPoint[] {

        const subdivisionCount =
            Math.max(
                1,
                Math.floor(
                    this.definition
                        .contourSubdivisions,
                ),
            );

        const subdivided:
            ScorchContourPoint[] = [];

        for (
            let index = 0;
            index < contour.length;
            index += 1
        ) {
            const current =
                contour[index];

            const next =
                contour[
                (
                    index + 1
                ) %
                contour.length
                ];

            if (
                !current ||
                !next
            ) {
                continue;
            }

            for (
                let step = 0;
                step < subdivisionCount;
                step += 1
            ) {
                const amount =
                    step /
                    subdivisionCount;

                subdivided.push({
                    x:
                        this.lerp(
                            current.x,
                            next.x,
                            amount,
                        ) *
                        this.cellSize,

                    y:
                        this.lerp(
                            current.y,
                            next.y,
                            amount,
                        ) *
                        this.cellSize,
                });
            }
        }

        if (
            subdivided.length < 3
        ) {
            return subdivided;
        }

        const result:
            ScorchContourPoint[] = [];

        for (
            let index = 0;
            index <
            subdivided.length;
            index += 1
        ) {
            const previous =
                subdivided[
                (
                    index -
                    1 +
                    subdivided.length
                ) %
                subdivided.length
                ];

            const current =
                subdivided[index];

            const next =
                subdivided[
                (
                    index + 1
                ) %
                subdivided.length
                ];

            if (
                !previous ||
                !current ||
                !next
            ) {
                continue;
            }

            const tangentX =
                next.x -
                previous.x;

            const tangentY =
                next.y -
                previous.y;

            const tangentLength =
                Math.max(
                    0.0001,
                    Math.sqrt(
                        tangentX *
                        tangentX +
                        tangentY *
                        tangentY,
                    ),
                );

            const normalX =
                -tangentY /
                tangentLength;

            const normalY =
                tangentX /
                tangentLength;

            const worldX =
                current.x +
                this.minimumWorldX;

            const worldY =
                current.y +
                this.minimumWorldY;

            const noise =
                this.smoothNoise(
                    worldX *
                    this.definition
                        .edgeNoiseFrequency,
                    worldY *
                    this.definition
                        .edgeNoiseFrequency,
                    contourIndex,
                );

            const wave =
                Math.sin(
                    worldX *
                    this.definition
                        .edgeWaveFrequency +
                    worldY *
                    this.definition
                        .edgeWaveFrequency *
                    0.73 +
                    contourIndex *
                    1.913,
                ) *
                this.definition
                    .edgeWaveAmplitudePixels;

            const displacement =
                (
                    noise *
                    2 -
                    1
                ) *
                deformationPixels +
                wave;

            result.push({
                /*
                 * Canvas coordinates are local to the field origin.
                 */
                x:
                    current.x +
                    normalX *
                    displacement,

                y:
                    current.y +
                    normalY *
                    displacement,
            });
        }

        return result;
    }

    private smoothNoise(
        x:
            number,

        y:
            number,

        seed:
            number,
    ): number {

        const x0 =
            Math.floor(
                x,
            );

        const y0 =
            Math.floor(
                y,
            );

        const x1 =
            x0 + 1;

        const y1 =
            y0 + 1;

        const tx =
            this.smoothStep01(
                x - x0,
            );

        const ty =
            this.smoothStep01(
                y - y0,
            );

        const a =
            this.hash(
                x0,
                y0,
                seed,
            );

        const b =
            this.hash(
                x1,
                y0,
                seed,
            );

        const c =
            this.hash(
                x0,
                y1,
                seed,
            );

        const d =
            this.hash(
                x1,
                y1,
                seed,
            );

        return this.lerp(
            this.lerp(
                a,
                b,
                tx,
            ),
            this.lerp(
                c,
                d,
                tx,
            ),
            ty,
        );
    }

    private hash(
        x:
            number,

        y:
            number,

        seed:
            number,
    ): number {

        let value =
            (
                Math.imul(
                    x +
                    seed *
                    131,
                    374761393,
                ) +
                Math.imul(
                    y -
                    seed *
                    197,
                    668265263,
                )
            ) >>>
            0;

        value =
            Math.imul(
                value ^
                (
                    value >>>
                    13
                ),
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

    private toCssColor(
        color:
            number,

        alpha:
            number,
    ): string {

        const red =
            (
                color >>>
                16
            ) &
            0xff;

        const green =
            (
                color >>>
                8
            ) &
            0xff;

        const blue =
            color &
            0xff;

        return `rgba(${red}, ${green}, ${blue}, ${this.clamp01(alpha)})`;
    }

    private updateTextureSource():
        void {

        const source =
            this.texture.source as unknown as {
                update?: () => void;
            };

        source.update?.();
    }

    private smoothStep01(
        value:
            number,
    ): number {

        const t =
            this.clamp01(
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

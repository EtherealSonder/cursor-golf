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
 * FIRE-VFX-8B presentation-only scorch renderer.
 *
 * EnvironmentField burn remains authoritative.
 *
 * The renderer keeps a separate visual burn field that approaches the
 * authoritative burn values smoothly. Marching Squares is still responsible
 * for converting that scalar field into connected scorch masses.
 *
 * Important stability rules:
 *
 * - Finished visual burn values do not continue changing.
 * - Only dirty/actively growing burn indices are interpolated every frame.
 * - Contours are rebuilt at a bounded presentation cadence, not every frame.
 * - Edge deformation is deterministic from world position only.
 * - Contour ordering is never used as a deformation seed.
 *
 * This preserves the connected Marching-Squares scorch shape while avoiding
 * the previous behaviour where unrelated new Fire could make historical
 * scorch boundaries visibly crawl or reshape.
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

    /**
     * Visual burn values consumed by Marching Squares.
     *
     * These values approach EnvironmentField burn rather than snapping to it.
     */
    private readonly visualBurnValues:
        Float32Array;

    /**
     * Temporary field used by the existing closing/smoothing pass.
     */
    private readonly contourBurnValues:
        Float32Array;

    private readonly scratchValues:
        Float32Array;

    /**
     * Only indices whose visual burn is still approaching authoritative burn.
     */
    private readonly activeGrowthIndices:
        number[] = [];

    private readonly activeGrowthFlags:
        Uint8Array;

    private refreshAccumulator =
        0;

    private contourRebuildPending =
        false;

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

        const cellCount =
            this.columns *
            this.rows;

        this.visualBurnValues =
            new Float32Array(
                cellCount,
            );

        this.contourBurnValues =
            new Float32Array(
                cellCount,
            );

        this.scratchValues =
            new Float32Array(
                cellCount,
            );

        this.activeGrowthFlags =
            new Uint8Array(
                cellCount,
            );

        this.canvas =
            document.createElement(
                "canvas",
            );

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

        /*
         * If the renderer is created after burn already exists, initialize
         * from the authoritative field rather than waiting for a new dirty
         * event.
         */
        this.synchronizeImmediatelyFromEnvironment();
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

        this.collectDirtyBurnIndices();

        this.updateVisualBurnGrowth(
            deltaTime,
        );

        if (
            !this.contourRebuildPending
        ) {
            this.refreshAccumulator = 0;

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

        this.refreshAccumulator = 0;

        this.rebuild();

        this.contourRebuildPending =
            false;
    }

    /**
     * Resynchronizes presentation from authoritative burn.
     *
     * This deliberately does not assume that reset() means "remove scorch".
     * If active Fire is cleared while EnvironmentField burn remains, the
     * historical scorch is rebuilt from that authoritative burn. If the full
     * environment was reset first, the authoritative burn is zero and scorch
     * is cleared naturally.
     */
    public reset():
        void {

        if (this.destroyed) {
            return;
        }

        this.refreshAccumulator = 0;

        this.activeGrowthIndices.length =
            0;

        this.activeGrowthFlags.fill(
            0,
        );

        this.visualBurnValues.fill(
            0,
        );

        this.contourBurnValues.fill(
            0,
        );

        this.scratchValues.fill(
            0,
        );

        this.synchronizeImmediatelyFromEnvironment();
    }

    public destroy():
        void {

        if (this.destroyed) {
            return;
        }

        this.destroyed = true;

        this.activeGrowthIndices.length =
            0;

        this.activeGrowthFlags.fill(
            0,
        );

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

    private collectDirtyBurnIndices():
        void {

        const dirtyIndices =
            this.environmentField
                .consumeDirtyBurnIndices();

        for (
            const index
            of dirtyIndices
        ) {
            if (
                index < 0 ||
                index >=
                this.visualBurnValues.length
            ) {
                continue;
            }

            const targetBurn =
                this.getNormalizedAuthoritativeBurn(
                    index,
                );

            const currentBurn =
                this.visualBurnValues[
                index
                ] ?? 0;

            if (
                targetBurn <=
                currentBurn +
                this.definition
                    .visualBurnCompletionEpsilon
            ) {
                /*
                 * Burn is monotonic in the current Fire simulation. Ignore
                 * insignificant repeated dirty notifications once visual burn
                 * has already caught up.
                 */
                continue;
            }

            this.activateGrowthIndex(
                index,
            );
        }
    }

    private activateGrowthIndex(
        index:
            number,
    ): void {

        if (
            this.activeGrowthFlags[
            index
            ] !== 0
        ) {
            return;
        }

        this.activeGrowthFlags[
            index
        ] = 1;

        this.activeGrowthIndices.push(
            index,
        );
    }

    private updateVisualBurnGrowth(
        deltaTime:
            number,
    ): void {

        if (
            this.activeGrowthIndices
                .length === 0
        ) {
            return;
        }

        const response =
            Math.max(
                0.01,
                this.definition
                    .visualBurnGrowthResponse,
            );

        /*
         * Delta-time-independent exponential response.
         *
         * A higher response makes scorch catch the simulation more quickly,
         * while still avoiding abrupt scalar-field jumps.
         */
        const interpolationAmount =
            1 -
            Math.exp(
                -response *
                deltaTime,
            );

        const epsilon =
            Math.max(
                0.000001,
                this.definition
                    .visualBurnCompletionEpsilon,
            );

        let writeIndex =
            0;

        for (
            let readIndex = 0;
            readIndex <
            this.activeGrowthIndices
                .length;
            readIndex += 1
        ) {
            const index =
                this.activeGrowthIndices[
                readIndex
                ];

            if (
                index === undefined
            ) {
                continue;
            }

            const targetBurn =
                this.getNormalizedAuthoritativeBurn(
                    index,
                );

            const currentBurn =
                this.visualBurnValues[
                index
                ] ?? 0;

            if (
                targetBurn <=
                currentBurn +
                epsilon
            ) {
                this.visualBurnValues[
                    index
                ] =
                    Math.max(
                        currentBurn,
                        targetBurn,
                    );

                this.activeGrowthFlags[
                    index
                ] = 0;

                continue;
            }

            const nextBurn =
                this.lerp(
                    currentBurn,
                    targetBurn,
                    interpolationAmount,
                );

            if (
                targetBurn -
                nextBurn <=
                epsilon
            ) {
                this.visualBurnValues[
                    index
                ] =
                    targetBurn;

                this.activeGrowthFlags[
                    index
                ] = 0;
            } else {
                this.visualBurnValues[
                    index
                ] =
                    nextBurn;

                this.activeGrowthIndices[
                    writeIndex
                ] =
                    index;

                writeIndex += 1;
            }

            this.contourRebuildPending =
                true;
        }

        this.activeGrowthIndices.length =
            writeIndex;
    }

    private getNormalizedAuthoritativeBurn(
        index:
            number,
    ): number {

        const maximumBurn =
            Math.max(
                0.0001,
                this.environmentField
                    .getDefinition()
                    .maximumBurnAmount,
            );

        return this.clamp01(
            this.environmentField
                .getBurnAmountByIndex(
                    index,
                ) /
            maximumBurn,
        );
    }

    private synchronizeImmediatelyFromEnvironment():
        void {

        const tracked =
            this.environmentField
                .getTrackedBurnIndices();

        let hasBurn =
            false;

        for (
            const index
            of tracked
        ) {
            if (
                index < 0 ||
                index >=
                this.visualBurnValues.length
            ) {
                continue;
            }

            const burn =
                this.getNormalizedAuthoritativeBurn(
                    index,
                );

            this.visualBurnValues[
                index
            ] =
                burn;

            if (
                burn >
                this.definition
                    .outerBurnThreshold
            ) {
                hasBurn =
                    true;
            }
        }

        /*
         * Consume any stale presentation-dirty notifications. The complete
         * authoritative state has just been synchronized above.
         */
        this.environmentField
            .consumeDirtyBurnIndices();

        if (hasBurn) {
            this.rebuild();
        } else {
            this.context.clearRect(
                0,
                0,
                this.canvas.width,
                this.canvas.height,
            );

            this.updateTextureSource();
        }

        this.contourRebuildPending =
            false;
    }

    private rebuild():
        void {

        this.contourBurnValues.set(
            this.visualBurnValues,
        );

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
                        this.contourBurnValues,
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
                this.contourBurnValues,
                this.scratchValues,
            );

            this.contourBurnValues.set(
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
                        sampleY >=
                        this.rows
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

        this.context.fillStyle =
            this.toCssColor(
                layer.color,
                layer.alpha,
            );

        for (
            const contour
            of contours
        ) {
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

    /**
     * Deforms only the exposed contour boundary.
     *
     * There is intentionally no per-cell deformation. Adjacent burned cells
     * therefore remain one continuous mass and only the final Marching-Squares
     * perimeter receives irregularity.
     *
     * All deformation is derived exclusively from world position. This is the
     * temporal-stability fix: adding another contour elsewhere cannot change
     * the seed of an already existing boundary.
     */
    private buildDeformedWorldContour(
        contour:
            ScorchContour,

        deformationPixels:
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

            const broadNoise =
                this.smoothNoise(
                    worldX *
                    this.definition
                        .broadEdgeNoiseFrequency,
                    worldY *
                    this.definition
                        .broadEdgeNoiseFrequency,
                    0,
                );

            const detailNoise =
                this.smoothNoise(
                    worldX *
                    this.definition
                        .detailEdgeNoiseFrequency,
                    worldY *
                    this.definition
                        .detailEdgeNoiseFrequency,
                    1,
                );

            const broadDisplacement =
                (
                    broadNoise *
                    2 -
                    1
                ) *
                deformationPixels;

            const detailDisplacement =
                (
                    detailNoise *
                    2 -
                    1
                ) *
                this.definition
                    .detailEdgeDeformationPixels;

            const wave =
                Math.sin(
                    worldX *
                    this.definition
                        .edgeWaveFrequency +
                    worldY *
                    this.definition
                        .edgeWaveFrequency *
                    0.73
                ) *
                this.definition
                    .edgeWaveAmplitudePixels;

            const displacement =
                broadDisplacement +
                detailDisplacement +
                wave;

            result.push({
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

import {
    Texture,
} from "pixi.js";

export interface FireParticleTextureGenerationDefinition {
    readonly outputSize: number;
    readonly noiseScale: number;
    readonly breakupStrength: number;
    readonly edgeBreakupStrength: number;
    readonly noiseOffsetX: number;
    readonly noiseOffsetY: number;
}

/**
 * FIRE-VFX-2B
 *
 * Generates one irregular Fire particle texture once during initialization.
 *
 * The original soft mask remains the dominant particle material.
 * Noise is deliberately secondary and is used mainly to disturb the softer
 * outer regions of the mask.
 *
 * This preserves the dense overlapping Fire volume established in
 * FIRE-VFX-1 while reducing the obvious oval/capsule silhouette.
 *
 * No texture generation occurs during normal gameplay.
 */
export class FireParticleTextureGenerator {

    public static generate(
        maskTexture: Texture,
        noiseTexture: Texture,
        definition: FireParticleTextureGenerationDefinition,
    ): Texture {

        const outputSize =
            Math.max(
                16,
                Math.floor(
                    definition.outputSize,
                ),
            );

        const maskCanvas =
            document.createElement(
                "canvas",
            );

        maskCanvas.width =
            outputSize;

        maskCanvas.height =
            outputSize;

        const maskContext =
            maskCanvas.getContext(
                "2d",
                {
                    willReadFrequently: true,
                },
            );

        if (!maskContext) {
            throw new Error(
                "FireParticleTextureGenerator could not create the mask canvas context.",
            );
        }

        const noiseCanvas =
            document.createElement(
                "canvas",
            );

        noiseCanvas.width =
            outputSize;

        noiseCanvas.height =
            outputSize;

        const noiseContext =
            noiseCanvas.getContext(
                "2d",
                {
                    willReadFrequently: true,
                },
            );

        if (!noiseContext) {
            throw new Error(
                "FireParticleTextureGenerator could not create the noise canvas context.",
            );
        }

        const outputCanvas =
            document.createElement(
                "canvas",
            );

        outputCanvas.width =
            outputSize;

        outputCanvas.height =
            outputSize;

        const outputContext =
            outputCanvas.getContext(
                "2d",
                {
                    willReadFrequently: true,
                },
            );

        if (!outputContext) {
            throw new Error(
                "FireParticleTextureGenerator could not create the output canvas context.",
            );
        }

        const maskResource =
            this.getDrawableResource(
                maskTexture,
                "mask",
            );

        const noiseResource =
            this.getDrawableResource(
                noiseTexture,
                "noise",
            );

        maskContext.clearRect(
            0,
            0,
            outputSize,
            outputSize,
        );

        maskContext.drawImage(
            maskResource,
            0,
            0,
            outputSize,
            outputSize,
        );

        this.drawNoise(
            noiseContext,
            noiseResource,
            outputSize,
            definition,
        );

        const maskImage =
            maskContext.getImageData(
                0,
                0,
                outputSize,
                outputSize,
            );

        const noiseImage =
            noiseContext.getImageData(
                0,
                0,
                outputSize,
                outputSize,
            );

        const outputImage =
            outputContext.createImageData(
                outputSize,
                outputSize,
            );

        const breakupStrength =
            this.clamp01(
                definition.breakupStrength,
            );

        const edgeBreakupStrength =
            this.clamp01(
                definition.edgeBreakupStrength,
            );

        for (
            let pixelIndex = 0;
            pixelIndex <
            outputSize *
            outputSize;
            pixelIndex += 1
        ) {
            const channelIndex =
                pixelIndex *
                4;

            const maskAlpha =
                maskImage.data[
                channelIndex +
                3
                ] /
                255;

            const noiseValue =
                (
                    noiseImage.data[
                    channelIndex
                    ] +
                    noiseImage.data[
                    channelIndex +
                    1
                    ] +
                    noiseImage.data[
                    channelIndex +
                    2
                    ]
                ) /
                (
                    255 *
                    3
                );

            /*
             * FIRE-VFX-2B correction:
             *
             * Preserve the dense center and increasingly expose the soft
             * perimeter to noise.
             *
             * maskAlpha 1.0 -> almost no edge influence
             * maskAlpha 0.0 -> maximum edge influence
             */
            const edgeAmount =
                1 -
                this.smoothStep(
                    0.18,
                    0.62,
                    maskAlpha,
                );

            const localBreakup =
                this.clamp01(
                    breakupStrength +
                    edgeBreakupStrength *
                    edgeAmount,
                );

            /*
             * Remap grayscale noise around a neutral midpoint.
             *
             * Values above 0.5 can preserve/slightly reinforce material.
             * Values below 0.5 erode it.
             *
             * The effect is deliberately bounded so the source mask remains
             * visually dominant.
             */
            const centeredNoise =
                (
                    noiseValue -
                    0.5
                ) *
                2;

            const modulation =
                1 +
                centeredNoise *
                localBreakup;

            let finalAlpha =
                maskAlpha *
                modulation;

            /*
             * Dense-center preservation.
             *
             * Once the source mask becomes substantially opaque, blend most
             * of the generated result back toward the original mask alpha.
             * This prevents noise from hollowing out the Fire core.
             */
            const centerPreservation =
                this.smoothStep(
                    0.42,
                    0.78,
                    maskAlpha,
                );

            finalAlpha =
                this.lerp(
                    finalAlpha,
                    maskAlpha,
                    centerPreservation *
                    0.92,
                );

            /*
             * Very faint mask pixels may be eroded further. This is where
             * most of the visible silhouette breakup should happen.
             */
            if (
                maskAlpha <
                0.22
            ) {
                const faintEdgeFactor =
                    this.smoothStep(
                        0.0,
                        0.22,
                        maskAlpha,
                    );

                const edgeNoiseGate =
                    this.lerp(
                        0.72 +
                        noiseValue *
                        0.28,
                        1.0,
                        faintEdgeFactor,
                    );

                finalAlpha *=
                    edgeNoiseGate;
            }

            finalAlpha =
                this.clamp01(
                    finalAlpha,
                );

            /*
             * Keep generated particle RGB white.
             * FireVfxParticle tint remains responsible for the thermal
             * yellow/orange/red palette.
             */
            outputImage.data[
                channelIndex
            ] =
                255;

            outputImage.data[
                channelIndex +
                1
            ] =
                255;

            outputImage.data[
                channelIndex +
                2
            ] =
                255;

            outputImage.data[
                channelIndex +
                3
            ] =
                Math.round(
                    finalAlpha *
                    255,
                );
        }

        outputContext.putImageData(
            outputImage,
            0,
            0,
        );

        return Texture.from(
            outputCanvas,
        );
    }

    private static drawNoise(
        context: CanvasRenderingContext2D,
        noiseResource: CanvasImageSource,
        outputSize: number,
        definition: FireParticleTextureGenerationDefinition,
    ): void {

        context.clearRect(
            0,
            0,
            outputSize,
            outputSize,
        );

        const safeNoiseScale =
            Math.max(
                0.10,
                definition.noiseScale,
            );

        const drawSize =
            outputSize *
            safeNoiseScale;

        const offsetX =
            this.wrap01(
                definition.noiseOffsetX,
            ) *
            drawSize;

        const offsetY =
            this.wrap01(
                definition.noiseOffsetY,
            ) *
            drawSize;

        /*
         * The downloaded noise textures are tileable. Draw enough copies to
         * keep the temporary output fully covered after applying offsets.
         */
        for (
            let tileY = -2;
            tileY <= 2;
            tileY += 1
        ) {
            for (
                let tileX = -2;
                tileX <= 2;
                tileX += 1
            ) {
                context.drawImage(
                    noiseResource,
                    tileX *
                    drawSize -
                    offsetX,
                    tileY *
                    drawSize -
                    offsetY,
                    drawSize,
                    drawSize,
                );
            }
        }
    }

    private static getDrawableResource(
        texture: Texture,
        label: string,
    ): CanvasImageSource {

        const source =
            texture.source as unknown as {
                readonly resource?: unknown;
            };

        const resource =
            source.resource;

        if (!resource) {
            throw new Error(
                `FireParticleTextureGenerator could not access the ${label} Texture resource.`,
            );
        }

        return resource as CanvasImageSource;
    }

    private static smoothStep(
        edge0: number,
        edge1: number,
        value: number,
    ): number {

        if (
            edge0 ===
            edge1
        ) {
            return (
                value <
                    edge0
                    ? 0
                    : 1
            );
        }

        const normalized =
            this.clamp01(
                (
                    value -
                    edge0
                ) /
                (
                    edge1 -
                    edge0
                ),
            );

        return (
            normalized *
            normalized *
            (
                3 -
                2 *
                normalized
            )
        );
    }

    private static lerp(
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

    private static clamp01(
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

    private static wrap01(
        value: number,
    ): number {

        const wrapped =
            value %
            1;

        return (
            wrapped <
                0
                ? wrapped +
                1
                : wrapped
        );
    }
}

import { Assets, Texture } from "pixi.js";
import hoseFlowNoiseUrl from "../../../assets/textures/water/hose-flow-noise.png";

/**
 * 8I-6B.3 Hose flow-material helper.
 *
 * The source PNG remains a grayscale technical mask. This helper converts it
 * once into the locked Cursor Golf Water palette, then exposes the resulting
 * repeatable Pixi texture to WaterStreamRenderer. It is presentation-only.
 *
 * Keeping palette conversion here also leaves the stream geometry independent
 * from the authored texture and from Water simulation.
 */
export class HoseWaterShader {
    /**
     * Presentation transport must never reverse because of a bad estimate.
     * Keeping this normalization beside the Hose material prevents invalid
     * UV motion from reaching the textured mesh.
     */
    public static sanitizeFlowSpeed(
        value: number,
    ): number {
        if (
            !Number.isFinite(value) ||
            value <= 0
        ) {
            return 0;
        }

        return value;
    }

    private texture: Texture | null = null;
    private loading = false;

    public constructor(
        private readonly bodyColor: number,
        private readonly highlightColor: number,
        private readonly contrast: number,
        private readonly strength: number,
        private readonly midColor: number,
        private readonly midThreshold: number,
        private readonly highlightThreshold: number,
        private readonly maskBlurPixels: number,
        private readonly massCount: number,
        private readonly massLengthFraction: number,
        private readonly massWidthFraction: number,
        private readonly massAsymmetry: number,
    ) { }

    public getTexture(): Texture | null {
        if (!this.texture && !this.loading) {
            this.beginLoad();
        }

        return this.texture;
    }

    public destroy(): void {
        if (this.texture) {
            this.texture.destroy(true);
            this.texture = null;
        }
    }

    private beginLoad(): void {
        this.loading = true;

        void Assets.load<Texture>(hoseFlowNoiseUrl)
            .then((sourceTexture): void => {
                this.texture = this.createPaletteTexture(sourceTexture);
                this.loading = false;
            })
            .catch((error: unknown): void => {
                this.loading = false;
                console.error(
                    "[8I-6B.5] Failed to load Hose flow-noise texture.",
                    error,
                );
            });
    }

    private createPaletteTexture(sourceTexture: Texture): Texture {
        const resource = sourceTexture.source.resource;
        const width = Math.max(1, sourceTexture.width);
        const height = Math.max(1, sourceTexture.height);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d", {
            willReadFrequently: true,
        });

        if (!context) {
            throw new Error("Unable to create Hose Water texture canvas.");
        }

        /*
         * The authored grayscale asset contains far more detail than an
         * 18 px gameplay stream can display cleanly. Blur it once before the
         * toon remap so nearby marks merge into broad Water-shaped masses.
         */
        const blurPixels = Math.max(0, this.maskBlurPixels);
        context.save();
        if (blurPixels > 0) {
            context.filter = `blur(${blurPixels}px)`;
        }
        context.drawImage(
            resource as CanvasImageSource,
            0,
            0,
            width,
            height,
        );
        context.restore();

        const image = context.getImageData(0, 0, width, height);
        const body = this.unpackColor(this.bodyColor);
        const mid = this.unpackColor(this.midColor);
        const highlight = this.unpackColor(this.highlightColor);
        const contrast = Math.max(0.1, this.contrast);
        const strength = this.clamp01(this.strength);
        const midThreshold = this.clamp01(this.midThreshold);
        const highlightThreshold = Math.max(
            midThreshold,
            this.clamp01(this.highlightThreshold),
        );

        for (let index = 0; index < image.data.length; index += 4) {
            const gray =
                (
                    image.data[index] +
                    image.data[index + 1] +
                    image.data[index + 2]
                ) /
                (255 * 3);

            const value =
                this.clamp01(
                    (gray - 0.5) * contrast + 0.5,
                ) *
                strength;

            /*
             * 8I-6B.5A keeps the authored noise as broad low-frequency
             * modulation, but deliberately suppresses its brightest thin
             * streaks. Explicit liquid masses are drawn below after this pass.
             */
            const selected =
                value >= highlightThreshold
                    ? mid
                    : value >= midThreshold
                        ? mid
                        : body;

            image.data[index] = selected.r;
            image.data[index + 1] = selected.g;
            image.data[index + 2] = selected.b;
            image.data[index + 3] = 255;
        }

        context.putImageData(image, 0, 0);

        /*
         * Large illustrated highlight masses.
         *
         * The Hose mesh is only about 15-18 px wide on screen, so fine detail
         * collapses into wires. These tapered patches occupy a meaningful
         * fraction of the stream width and therefore continue to read as
         * liquid when the texture is squeezed into the production mesh.
         *
         * They live in repeating stream UV space, so the existing transport-
         * matched UV scroll carries them downstream automatically, including
         * while the authoritative tail drains after shutoff.
         */
        const count = Math.max(2, Math.floor(this.massCount));
        const massLength =
            width *
            Math.max(
                0.06,
                Math.min(0.34, this.massLengthFraction),
            );
        const massHalfHeight =
            height *
            0.5 *
            Math.max(
                0.20,
                Math.min(0.92, this.massWidthFraction),
            );
        const asymmetry =
            Math.max(
                0,
                Math.min(0.65, this.massAsymmetry),
            );

        context.fillStyle = this.colorToCss(mid);
        for (let index = 0; index < count; index += 1) {
            const seed = index + 1;
            const centerX =
                ((seed * 0.61803398875) % 1) * width;
            const centerY =
                height *
                (
                    0.50 +
                    Math.sin(seed * 2.37) *
                    0.12 *
                    asymmetry
                );
            const lengthScale =
                0.78 +
                ((seed * 0.371) % 1) * 0.44;
            const widthScale =
                0.72 +
                ((seed * 0.527) % 1) * 0.42;
            const halfLength = massLength * lengthScale * 0.5;
            const halfHeight = massHalfHeight * widthScale;

            context.beginPath();
            context.moveTo(
                centerX - halfLength,
                centerY,
            );
            context.bezierCurveTo(
                centerX - halfLength * 0.55,
                centerY - halfHeight * (0.55 + asymmetry * 0.25),
                centerX + halfLength * 0.18,
                centerY - halfHeight,
                centerX + halfLength,
                centerY - halfHeight * 0.08,
            );
            context.bezierCurveTo(
                centerX + halfLength * 0.48,
                centerY + halfHeight * (0.72 + asymmetry * 0.18),
                centerX - halfLength * 0.28,
                centerY + halfHeight,
                centerX - halfLength,
                centerY,
            );
            context.closePath();
            context.fill();

            /*
             * A smaller bright core appears only on alternating masses.
             * This avoids recreating a continuous white centre-line.
             */
            if (index % 2 === 0) {
                context.fillStyle = this.colorToCss(highlight);
                context.beginPath();
                context.ellipse(
                    centerX + halfLength * 0.08,
                    centerY - halfHeight * 0.08,
                    halfLength * 0.34,
                    halfHeight * 0.28,
                    Math.sin(seed * 1.91) * 0.12,
                    0,
                    Math.PI * 2,
                );
                context.fill();
                context.fillStyle = this.colorToCss(mid);
            }
        }

        const texture = Texture.from(canvas);

        // The Hose UV coordinate deliberately exceeds 1 along its length.
        // Repeat addressing lets the authored 512 px flow scale remain stable
        // instead of stretching one copy over an arbitrarily long jet.
        texture.source.style.addressMode = "repeat";

        return texture;
    }

    private unpackColor(color: number): {
        readonly r: number;
        readonly g: number;
        readonly b: number;
    } {
        return {
            r: (color >> 16) & 0xFF,
            g: (color >> 8) & 0xFF,
            b: color & 0xFF,
        };
    }

    private colorToCss(color: {
        readonly r: number;
        readonly g: number;
        readonly b: number;
    }): string {
        return `rgb(${color.r}, ${color.g}, ${color.b})`;
    }

    private clamp01(value: number): number {
        return Math.max(0, Math.min(1, value));
    }
}

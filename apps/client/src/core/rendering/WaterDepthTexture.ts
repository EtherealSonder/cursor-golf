import {
    Texture,
} from "pixi.js";

import type {
    WaterField,
} from "../game/environment/WaterField";

/**
 * Presentation-only bridge from WaterField depth values to a GPU scalar
 * texture.
 *
 * This class does not create a visible Sprite. The texture is data only.
 * WaterSurfaceShader samples it explicitly through uWaterDepthTexture.
 */
export class WaterDepthTexture {

    private readonly canvas:
        HTMLCanvasElement;

    private readonly context:
        CanvasRenderingContext2D;

    private readonly imageData:
        ImageData;

    private readonly texture:
        Texture;

    private readonly touchedFlags:
        Uint8Array;

    private readonly touchedIndices:
        number[] = [];

    private destroyed =
        false;

    public constructor(
        private readonly waterField:
            WaterField,

        private readonly fullScaleDepth:
            number,
    ) {
        if (
            !Number.isFinite(fullScaleDepth) ||
            fullScaleDepth <= 0
        ) {
            throw new Error(
                "WaterDepthTexture fullScaleDepth must be greater than zero.",
            );
        }

        const columnCount =
            waterField.getColumnCount();

        const rowCount =
            waterField.getRowCount();

        this.canvas =
            document.createElement(
                "canvas",
            );

        this.canvas.width =
            columnCount;

        this.canvas.height =
            rowCount;

        const context =
            this.canvas.getContext(
                "2d",
                {
                    alpha: true,
                    willReadFrequently: false,
                },
            );

        if (!context) {
            throw new Error(
                "WaterDepthTexture could not create a 2D canvas context.",
            );
        }

        this.context =
            context;

        this.imageData =
            context.createImageData(
                columnCount,
                rowCount,
            );

        /*
         * Keep every texel opaque because alpha is not Water coverage.
         * The shader reads only the red channel as normalized Water depth.
         */
        for (
            let offset = 3;
            offset < this.imageData.data.length;
            offset += 4
        ) {
            this.imageData.data[offset] =
                255;
        }

        this.context.putImageData(
            this.imageData,
            0,
            0,
        );

        this.texture =
            Texture.from(
                this.canvas,
            );

        const textureSource =
            this.texture.source as unknown as {
                scaleMode?: string;
                update?: () => void;
            };

        /*
         * This is the key spatial reconstruction step. The authoritative
         * simulation remains one value per 8 px cell, while the GPU samples
         * smoothly between neighbouring texels.
         */
        textureSource.scaleMode =
            "linear";

        this.touchedFlags =
            new Uint8Array(
                waterField.getCellCount(),
            );

        this.redraw();
    }

    public getTexture():
        Texture {

        return this.texture;
    }

    public redraw():
        void {

        if (this.destroyed) {
            return;
        }

        const pixels =
            this.imageData.data;

        /*
         * Clear only cells written by the previous presentation update.
         */
        for (
            const index of
            this.touchedIndices
        ) {
            const offset =
                index * 4;

            pixels[offset] = 0;
            pixels[offset + 1] = 0;
            pixels[offset + 2] = 0;
            pixels[offset + 3] = 255;

            this.touchedFlags[index] =
                0;
        }

        this.touchedIndices.length =
            0;

        this.waterField
            .forEachTrackedWaterCell(
                (
                    cell,
                ): void => {

                    const normalizedDepth =
                        Math.max(
                            0,
                            Math.min(
                                1,
                                cell.depth /
                                this.fullScaleDepth,
                            ),
                        );

                    if (
                        normalizedDepth <= 0
                    ) {
                        return;
                    }

                    const encodedDepth =
                        Math.max(
                            1,
                            Math.min(
                                255,
                                Math.round(
                                    normalizedDepth *
                                    255,
                                ),
                            ),
                        );

                    const offset =
                        cell.index * 4;

                    pixels[offset] =
                        encodedDepth;

                    pixels[offset + 1] =
                        encodedDepth;

                    pixels[offset + 2] =
                        encodedDepth;

                    pixels[offset + 3] =
                        255;

                    if (
                        this.touchedFlags[
                        cell.index
                        ] === 0
                    ) {
                        this.touchedFlags[
                            cell.index
                        ] =
                            1;

                        this.touchedIndices.push(
                            cell.index,
                        );
                    }
                },
            );

        this.upload();
    }

    public clear():
        void {

        if (this.destroyed) {
            return;
        }

        for (
            const index of
            this.touchedIndices
        ) {
            const offset =
                index * 4;

            this.imageData.data[offset] = 0;
            this.imageData.data[offset + 1] = 0;
            this.imageData.data[offset + 2] = 0;
            this.imageData.data[offset + 3] = 255;

            this.touchedFlags[index] =
                0;
        }

        this.touchedIndices.length =
            0;

        this.upload();
    }

    public destroy():
        void {

        if (this.destroyed) {
            return;
        }

        this.destroyed =
            true;

        this.texture
            .destroy(true);

        this.touchedIndices.length =
            0;
    }

    private upload():
        void {

        this.context.putImageData(
            this.imageData,
            0,
            0,
        );

        const textureSource =
            this.texture.source as unknown as {
                update?: () => void;
            };

        textureSource.update?.();
    }
}

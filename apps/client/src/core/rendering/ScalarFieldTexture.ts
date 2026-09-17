import {
    Sprite,
    Texture,
} from "pixi.js";

export interface ScalarFieldTextureDefinition {
    readonly columnCount:
    number;

    readonly rowCount:
    number;

    readonly cellSize:
    number;

    readonly minimumWorldX:
    number;

    readonly minimumWorldY:
    number;
}

/**
 * Small CPU-authored scalar-field texture used for Water and ground moisture
 * presentation.
 *
 * One texel represents one simulation cell. Pixi stretches this texture over
 * the world using linear sampling, so neighbouring scalar samples blend on
 * the GPU instead of exposing the 8 px simulation grid.
 *
 * The class reuses one ImageData buffer and one Texture for its lifetime.
 * Only cells written in the previous update are cleared, avoiding a full
 * world-sized Canvas/Graphics rebuild.
 */
export class ScalarFieldTexture {
    private readonly canvas:
        HTMLCanvasElement;

    private readonly context:
        CanvasRenderingContext2D;

    private readonly imageData:
        ImageData;

    private readonly texture:
        Texture;

    private readonly sprite:
        Sprite;

    private readonly touchedFlags:
        Uint8Array;

    private readonly touchedIndices:
        number[] = [];

    private destroyed =
        false;

    public constructor(
        private readonly definition:
            ScalarFieldTextureDefinition,
    ) {
        this.validateDefinition(
            definition,
        );

        this.canvas =
            document.createElement(
                "canvas",
            );

        this.canvas.width =
            definition.columnCount;

        this.canvas.height =
            definition.rowCount;

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
                "ScalarFieldTexture requires a 2D canvas context.",
            );
        }

        this.context =
            context;

        this.context.imageSmoothingEnabled =
            true;

        this.imageData =
            this.context.createImageData(
                definition.columnCount,
                definition.rowCount,
            );

        this.touchedFlags =
            new Uint8Array(
                definition.columnCount *
                definition.rowCount,
            );

        this.texture =
            Texture.from(
                this.canvas,
            );

        /*
         * Pixi v8 CanvasSource supports scaleMode. Keep this assignment
         * intentionally narrow so the code is tolerant of source typing.
         */
        const source =
            this.texture.source as unknown as {
                scaleMode?:
                "linear" |
                "nearest";

                update?:
                () => void;
            };

        source.scaleMode =
            "linear";

        this.sprite =
            new Sprite(
                this.texture,
            );

        this.sprite.anchor.set(
            0,
        );

        this.sprite.position.set(
            definition.minimumWorldX,
            definition.minimumWorldY,
        );

        this.sprite.width =
            definition.columnCount *
            definition.cellSize;

        this.sprite.height =
            definition.rowCount *
            definition.cellSize;
    }

    public getSprite():
        Sprite {
        return this.sprite;
    }

    /**
     * Clear texels written by the previous presentation update.
     *
     * Call this before writing the current sparse field state.
     */
    public beginUpdate():
        void {
        if (this.destroyed) {
            return;
        }

        const pixels =
            this.imageData.data;

        for (
            const index
            of this.touchedIndices
        ) {
            const offset =
                index *
                4;

            pixels[
                offset
            ] =
                0;

            pixels[
                offset +
                1
            ] =
                0;

            pixels[
                offset +
                2
            ] =
                0;

            pixels[
                offset +
                3
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

    public writeColorByIndex(
        index:
            number,

        color:
            number,

        alpha:
            number,
    ): void {
        if (
            this.destroyed ||
            !Number.isInteger(
                index,
            ) ||
            index <
            0 ||
            index >=
            this.touchedFlags.length
        ) {
            return;
        }

        const clampedAlpha =
            Math.max(
                0,
                Math.min(
                    1,
                    alpha,
                ),
            );

        if (
            clampedAlpha <=
            0
        ) {
            return;
        }

        if (
            this.touchedFlags[
            index
            ] ===
            0
        ) {
            this.touchedFlags[
                index
            ] =
                1;

            this.touchedIndices.push(
                index,
            );
        }

        const offset =
            index *
            4;

        const pixels =
            this.imageData.data;

        pixels[
            offset
        ] =
            (
                color >>>
                16
            ) &
            0xff;

        pixels[
            offset +
            1
        ] =
            (
                color >>>
                8
            ) &
            0xff;

        pixels[
            offset +
            2
        ] =
            color &
            0xff;

        pixels[
            offset +
            3
        ] =
            Math.round(
                clampedAlpha *
                255,
            );
    }

    /**
     * Upload the reused grid-resolution RGBA buffer to the existing texture.
     */
    public commit():
        void {
        if (this.destroyed) {
            return;
        }

        this.context.putImageData(
            this.imageData,
            0,
            0,
        );

        const source =
            this.texture.source as unknown as {
                update?:
                () => void;
            };

        source.update?.();
    }

    public clear():
        void {
        if (this.destroyed) {
            return;
        }

        this.beginUpdate();
        this.commit();
    }

    public destroy():
        void {
        if (this.destroyed) {
            return;
        }

        this.destroyed =
            true;

        this.sprite
            .removeFromParent();

        this.sprite
            .destroy({
                texture:
                    false,
            });

        this.texture
            .destroy(
                true,
            );

        this.touchedIndices.length =
            0;
    }

    private validateDefinition(
        definition:
            ScalarFieldTextureDefinition,
    ): void {
        if (
            !Number.isInteger(
                definition.columnCount,
            ) ||
            definition.columnCount <=
            0 ||
            !Number.isInteger(
                definition.rowCount,
            ) ||
            definition.rowCount <=
            0
        ) {
            throw new Error(
                "ScalarFieldTexture dimensions must be positive integers.",
            );
        }

        if (
            !Number.isFinite(
                definition.cellSize,
            ) ||
            definition.cellSize <=
            0
        ) {
            throw new Error(
                "ScalarFieldTexture cellSize must be finite and positive.",
            );
        }

        if (
            !Number.isFinite(
                definition.minimumWorldX,
            ) ||
            !Number.isFinite(
                definition.minimumWorldY,
            )
        ) {
            throw new Error(
                "ScalarFieldTexture world origin must be finite.",
            );
        }
    }
}

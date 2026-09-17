import {
    Texture,
} from "pixi.js";

export interface WaterVfxTextures {
    readonly droplet: Texture;
    readonly elongatedDroplet: Texture;
    readonly splash: Texture;
}

/**
 * Owns the small generated texture vocabulary used by Water secondary VFX.
 *
 * These textures are generated with browser Canvas rather than Graphics
 * texture-generation helpers. That keeps this factory independent of a Pixi
 * Renderer and avoids relying on Graphics.generateCanvasTexture(), which is
 * not part of the PixiJS v8 Graphics API used by this project.
 *
 * The abstraction remains compatible with replacing/supplementing these
 * procedural textures with authored Water masks/noise assets later.
 */
export class WaterVfxTextureFactory {
    public static create(): WaterVfxTextures {
        return {
            droplet:
                this.createDropletTexture(),
            elongatedDroplet:
                this.createElongatedDropletTexture(),
            splash:
                this.createSplashTexture(),
        };
    }

    public static destroy(
        textures:
            WaterVfxTextures,
    ): void {

        textures.droplet.destroy(
            true,
        );

        textures.elongatedDroplet.destroy(
            true,
        );

        textures.splash.destroy(
            true,
        );
    }

    private static createDropletTexture():
        Texture {

        return this.createCanvasTexture(
            16,
            16,
            (
                context,
            ): void => {

                context.fillStyle =
                    "#ffffff";

                context.beginPath();

                context.arc(
                    8,
                    8,
                    6,
                    0,
                    Math.PI * 2,
                );

                context.fill();
            },
        );
    }

    private static createElongatedDropletTexture():
        Texture {

        return this.createCanvasTexture(
            32,
            20,
            (
                context,
            ): void => {

                context.fillStyle =
                    "#ffffff";

                context.beginPath();

                context.roundRect(
                    3,
                    6,
                    26,
                    8,
                    4,
                );

                context.fill();
            },
        );
    }

    private static createSplashTexture():
        Texture {

        return this.createCanvasTexture(
            32,
            32,
            (
                context,
            ): void => {

                context.fillStyle =
                    "#ffffff";

                context.beginPath();

                context.moveTo(
                    2,
                    16,
                );

                context.lineTo(
                    9,
                    10,
                );

                context.lineTo(
                    13,
                    2,
                );

                context.lineTo(
                    17,
                    10,
                );

                context.lineTo(
                    30,
                    13,
                );

                context.lineTo(
                    19,
                    18,
                );

                context.lineTo(
                    14,
                    29,
                );

                context.lineTo(
                    10,
                    19,
                );

                context.closePath();
                context.fill();
            },
        );
    }

    private static createCanvasTexture(
        width:
            number,

        height:
            number,

        draw:
            (
                context:
                    CanvasRenderingContext2D,
            ) => void,
    ): Texture {

        const canvas =
            document.createElement(
                "canvas",
            );

        canvas.width =
            width;

        canvas.height =
            height;

        const context =
            canvas.getContext(
                "2d",
            );

        if (!context) {
            throw new Error(
                "WaterVfxTextureFactory could not create a 2D Canvas rendering context.",
            );
        }

        context.clearRect(
            0,
            0,
            width,
            height,
        );

        draw(
            context,
        );

        /*
         * PixiJS v8 accepts CanvasImageSource values through Texture.from().
         * The resulting Texture owns its Canvas-backed source and is destroyed
         * by WaterVfxTextureFactory.destroy().
         */
        return Texture.from(
            canvas,
        );
    }
}

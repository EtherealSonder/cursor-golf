import { Texture } from "pixi.js";
import {
    DEFAULT_WATER_IMPACT_VFX_DEFINITION,
    type WaterImpactVfxDefinition,
} from "../config/WaterImpactVfxDefinition";
import type { WaterImpactTextureSet } from "./WaterImpactTextureSet";
import { destroyWaterImpactTextureSet } from "./WaterImpactTextureSet";

export interface WaterVfxTextures {
    readonly droplet: Texture;
    readonly elongatedDroplet: Texture;
    readonly splash: Texture;
}

/** Canvas-backed generated Water texture vocabulary. No runtime Renderer is required. */
export class WaterVfxTextureFactory {
    private static cachedImpactTextures: WaterImpactTextureSet | null = null;

    public static create(): WaterVfxTextures {
        return {
            droplet: this.createDropletTexture(),
            elongatedDroplet: this.createElongatedDropletTexture(),
            splash: this.createSplashTexture(),
        };
    }

    public static destroy(textures: WaterVfxTextures): void {
        textures.droplet.destroy(true);
        textures.elongatedDroplet.destroy(true);
        textures.splash.destroy(true);
    }

    public static getImpactTextureSet(
        definition: WaterImpactVfxDefinition = DEFAULT_WATER_IMPACT_VFX_DEFINITION,
    ): WaterImpactTextureSet {
        if (this.cachedImpactTextures) return this.cachedImpactTextures;
        const color = (value: number): string => `#${value.toString(16).padStart(6, "0")}`;
        const primary = color(definition.primaryColor);
        const light = color(definition.lightColor);
        const highlight = color(definition.highlightColor);

        this.cachedImpactTextures = {
            splashLobes: [
                this.createSplashLobe(definition.splashTextureSize, primary, 0),
                this.createSplashLobe(definition.splashTextureSize, light, 1),
                this.createSplashLobe(definition.splashTextureSize, primary, 2),
            ],
            roundDroplets: [
                this.createRoundDroplet(definition.dropletTextureSize, primary, 0.36),
                this.createRoundDroplet(definition.dropletTextureSize, light, 0.29),
            ],
            teardropDroplets: [
                this.createTeardrop(definition.dropletTextureSize, primary, 0),
                this.createTeardrop(definition.dropletTextureSize, highlight, 1),
            ],
            elongatedDroplets: [
                this.createElongated(definition.elongatedDropletWidth, definition.elongatedDropletHeight, primary, 0),
                this.createElongated(definition.elongatedDropletWidth, definition.elongatedDropletHeight, light, 1),
            ],
            surfaceDisturbances: [
                this.createSurfaceDisturbance(definition.surfaceDisturbanceWidth, definition.surfaceDisturbanceHeight, primary, 0),
                this.createSurfaceDisturbance(definition.surfaceDisturbanceWidth, definition.surfaceDisturbanceHeight, light, 1),
            ],
            ripples: [
                this.createRipple(definition.rippleWidth, definition.rippleHeight, primary, 0),
                this.createRipple(definition.rippleWidth, definition.rippleHeight, light, 1),
            ],
        };
        return this.cachedImpactTextures;
    }

    public static destroyImpactTextureSet(): void {
        if (!this.cachedImpactTextures) return;
        destroyWaterImpactTextureSet(this.cachedImpactTextures);
        this.cachedImpactTextures = null;
    }

    private static createDropletTexture(): Texture {
        return this.createCanvasTexture(16, 16, (c) => {
            c.fillStyle = "#ffffff"; c.beginPath(); c.arc(8, 8, 6, 0, Math.PI * 2); c.fill();
        });
    }

    private static createElongatedDropletTexture(): Texture {
        return this.createCanvasTexture(32, 20, (c) => {
            c.fillStyle = "#ffffff"; c.beginPath(); c.roundRect(3, 6, 26, 8, 4); c.fill();
        });
    }

    private static createSplashTexture(): Texture {
        return this.createCanvasTexture(32, 32, (c) => {
            c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(2, 16); c.lineTo(9, 10); c.lineTo(13, 2);
            c.lineTo(17, 10); c.lineTo(30, 13); c.lineTo(19, 18); c.lineTo(14, 29); c.lineTo(10, 19);
            c.closePath(); c.fill();
        });
    }

    private static createSplashLobe(size: number, fill: string, variant: number): Texture {
        return this.createCanvasTexture(size, size, (c) => {
            const s = size;
            c.fillStyle = fill;
            c.beginPath();

            // Rounded, asymmetric liquid masses. These deliberately avoid the
            // pointed/star silhouette used by the first 8I-7C draft.
            if (variant === 0) {
                c.moveTo(.10 * s, .62 * s);
                c.bezierCurveTo(.08 * s, .49 * s, .18 * s, .41 * s, .31 * s, .43 * s);
                c.bezierCurveTo(.29 * s, .30 * s, .36 * s, .20 * s, .45 * s, .22 * s);
                c.bezierCurveTo(.55 * s, .24 * s, .54 * s, .38 * s, .61 * s, .40 * s);
                c.bezierCurveTo(.70 * s, .35 * s, .83 * s, .39 * s, .88 * s, .49 * s);
                c.bezierCurveTo(.94 * s, .61 * s, .82 * s, .69 * s, .69 * s, .68 * s);
                c.bezierCurveTo(.59 * s, .82 * s, .43 * s, .80 * s, .36 * s, .70 * s);
                c.bezierCurveTo(.24 * s, .76 * s, .12 * s, .72 * s, .10 * s, .62 * s);
            } else if (variant === 1) {
                c.moveTo(.08 * s, .59 * s);
                c.bezierCurveTo(.10 * s, .47 * s, .21 * s, .42 * s, .33 * s, .45 * s);
                c.bezierCurveTo(.34 * s, .35 * s, .39 * s, .29 * s, .47 * s, .30 * s);
                c.bezierCurveTo(.55 * s, .30 * s, .58 * s, .39 * s, .62 * s, .43 * s);
                c.bezierCurveTo(.69 * s, .32 * s, .80 * s, .29 * s, .86 * s, .37 * s);
                c.bezierCurveTo(.93 * s, .45 * s, .89 * s, .56 * s, .81 * s, .61 * s);
                c.bezierCurveTo(.73 * s, .66 * s, .66 * s, .64 * s, .61 * s, .69 * s);
                c.bezierCurveTo(.52 * s, .79 * s, .38 * s, .78 * s, .31 * s, .69 * s);
                c.bezierCurveTo(.20 * s, .73 * s, .09 * s, .69 * s, .08 * s, .59 * s);
            } else {
                c.moveTo(.09 * s, .63 * s);
                c.bezierCurveTo(.06 * s, .52 * s, .15 * s, .44 * s, .27 * s, .44 * s);
                c.bezierCurveTo(.30 * s, .33 * s, .39 * s, .26 * s, .48 * s, .30 * s);
                c.bezierCurveTo(.56 * s, .34 * s, .55 * s, .44 * s, .63 * s, .46 * s);
                c.bezierCurveTo(.70 * s, .39 * s, .79 * s, .40 * s, .84 * s, .47 * s);
                c.bezierCurveTo(.91 * s, .55 * s, .88 * s, .66 * s, .77 * s, .69 * s);
                c.bezierCurveTo(.67 * s, .72 * s, .59 * s, .68 * s, .53 * s, .75 * s);
                c.bezierCurveTo(.44 * s, .85 * s, .31 * s, .80 * s, .28 * s, .70 * s);
                c.bezierCurveTo(.19 * s, .76 * s, .10 * s, .72 * s, .09 * s, .63 * s);
            }

            c.closePath();
            c.fill();
        });
    }

    private static createRoundDroplet(size: number, fill: string, radius: number): Texture {
        return this.createCanvasTexture(size, size, (c) => {
            c.fillStyle = fill; c.beginPath(); c.ellipse(size * .5, size * .52, size * radius, size * (radius * .86), 0, 0, Math.PI * 2); c.fill();
        });
    }

    private static createTeardrop(size: number, fill: string, variant: number): Texture {
        return this.createCanvasTexture(size, size, (c) => {
            c.fillStyle = fill; c.beginPath(); c.moveTo(size * (variant ? .28 : .22), size * .52);
            c.quadraticCurveTo(size * .52, size * .30, size * .82, size * .50);
            c.quadraticCurveTo(size * .58, size * .82, size * .28, size * .69);
            c.quadraticCurveTo(size * .17, size * .61, size * (variant ? .28 : .22), size * .52); c.fill();
        });
    }

    private static createElongated(w: number, h: number, fill: string, variant: number): Texture {
        return this.createCanvasTexture(w, h, (c) => {
            c.fillStyle = fill; c.beginPath(); c.moveTo(w * .06, h * .52); c.quadraticCurveTo(w * .22, h * (variant ? .20 : .30), w * .72, h * .31);
            c.quadraticCurveTo(w * .91, h * .35, w * .96, h * .50); c.quadraticCurveTo(w * .78, h * .73, w * .27, h * .69);
            c.quadraticCurveTo(w * .10, h * .69, w * .06, h * .52); c.fill();
        });
    }

    private static createSurfaceDisturbance(w: number, h: number, fill: string, variant: number): Texture {
        return this.createCanvasTexture(w, h, (c) => {
            // A low top-down splash skirt, not a decorative sine-wave stroke.
            c.fillStyle = fill;
            c.beginPath();
            if (variant === 0) {
                c.moveTo(w * .06, h * .62);
                c.bezierCurveTo(w * .16, h * .52, w * .23, h * .57, w * .31, h * .49);
                c.bezierCurveTo(w * .39, h * .39, w * .45, h * .42, w * .51, h * .49);
                c.bezierCurveTo(w * .58, h * .39, w * .68, h * .43, w * .73, h * .52);
                c.bezierCurveTo(w * .82, h * .47, w * .91, h * .51, w * .95, h * .59);
                c.bezierCurveTo(w * .86, h * .69, w * .72, h * .68, w * .62, h * .64);
                c.bezierCurveTo(w * .49, h * .72, w * .35, h * .69, w * .27, h * .64);
                c.bezierCurveTo(w * .18, h * .69, w * .10, h * .68, w * .06, h * .62);
            } else {
                c.moveTo(w * .05, h * .60);
                c.bezierCurveTo(w * .14, h * .48, w * .25, h * .54, w * .32, h * .50);
                c.bezierCurveTo(w * .39, h * .45, w * .43, h * .34, w * .51, h * .40);
                c.bezierCurveTo(w * .57, h * .45, w * .60, h * .54, w * .68, h * .50);
                c.bezierCurveTo(w * .78, h * .43, w * .89, h * .48, w * .96, h * .57);
                c.bezierCurveTo(w * .90, h * .67, w * .78, h * .69, w * .66, h * .64);
                c.bezierCurveTo(w * .56, h * .71, w * .42, h * .72, w * .33, h * .65);
                c.bezierCurveTo(w * .21, h * .71, w * .10, h * .68, w * .05, h * .60);
            }
            c.closePath();
            c.fill();
        });
    }

    private static createRipple(w: number, h: number, stroke: string, variant: number): Texture {
        return this.createCanvasTexture(w, h, (c) => {
            // Broken, slightly asymmetric top-down ripple arcs. Avoid a perfect
            // mathematical ellipse so the mark shares the puddle art language.
            c.strokeStyle = stroke;
            c.lineWidth = Math.max(2, h * .075);
            c.lineCap = "round";
            c.lineJoin = "round";

            if (variant === 0) {
                c.beginPath();
                c.moveTo(w * .12, h * .55);
                c.bezierCurveTo(w * .15, h * .28, w * .34, h * .18, w * .52, h * .20);
                c.bezierCurveTo(w * .66, h * .20, w * .80, h * .28, w * .87, h * .42);
                c.stroke();

                c.beginPath();
                c.moveTo(w * .90, h * .54);
                c.bezierCurveTo(w * .85, h * .75, w * .67, h * .82, w * .51, h * .80);
                c.bezierCurveTo(w * .35, h * .82, w * .20, h * .74, w * .13, h * .64);
                c.stroke();
            } else {
                c.beginPath();
                c.moveTo(w * .09, h * .51);
                c.bezierCurveTo(w * .15, h * .31, w * .31, h * .22, w * .45, h * .23);
                c.stroke();

                c.beginPath();
                c.moveTo(w * .54, h * .21);
                c.bezierCurveTo(w * .72, h * .22, w * .87, h * .34, w * .91, h * .51);
                c.stroke();

                c.beginPath();
                c.moveTo(w * .88, h * .61);
                c.bezierCurveTo(w * .78, h * .78, w * .60, h * .82, w * .45, h * .79);
                c.bezierCurveTo(w * .29, h * .78, w * .17, h * .70, w * .12, h * .61);
                c.stroke();
            }
        });
    }

    private static createCanvasTexture(width: number, height: number, draw: (context: CanvasRenderingContext2D) => void): Texture {
        const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("WaterVfxTextureFactory could not create a 2D Canvas rendering context.");
        context.clearRect(0, 0, width, height); draw(context); return Texture.from(canvas);
    }
}

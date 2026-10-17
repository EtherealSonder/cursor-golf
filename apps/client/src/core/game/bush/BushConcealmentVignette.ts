import { Sprite, Texture, type Container } from "pixi.js";
import { BUSH_CONCEALMENT_PRESENTATION as CONFIG } from "./BushConcealmentPresentationDefinition";

/** A single cached radial alpha texture, screen-space and behind the HUD. */
export class BushConcealmentVignette {
    private readonly texture: Texture;
    private readonly sprite: Sprite;
    private strength = 0;

    public constructor(parent: Container) {
        // Generate only once, never rasterize the gradient during frame updates.
        const size = 384;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Bush vignette requires a 2D canvas context");
        const image = ctx.createImageData(size, size);
        const color = CONFIG.vignetteColor;
        const r = (color >>> 16) & 255;
        const g = (color >>> 8) & 255;
        const b = color & 255;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const nx = (x + 0.5 - size / 2) / (size / 2);
                const ny = (y + 0.5 - size / 2) / (size / 2);
                // Smooth elliptical falloff, with a clear centre and no bands.
                const distance = Math.sqrt(nx * nx + ny * ny);
                const t = Math.max(0, Math.min(1, (distance - 0.28) / 0.92));
                const smooth = t * t * (3 - 2 * t);
                const i = (y * size + x) * 4;
                image.data[i] = r;
                image.data[i + 1] = g;
                image.data[i + 2] = b;
                image.data[i + 3] = Math.round(255 * smooth);
            }
        }
        ctx.putImageData(image, 0, 0);
        this.texture = Texture.from(canvas);
        this.sprite = new Sprite(this.texture);
        this.sprite.eventMode = "none";
        this.sprite.visible = false;
        parent.addChildAt(this.sprite, 0);
    }

    public update(deltaTime: number, coverage: number, width: number, height: number): void {
        const start = 0.2;
        const full = CONFIG.activationCoverage;
        const target = Math.max(0, Math.min(1, (coverage - start) / (full - start)));
        const duration = target > this.strength ? CONFIG.fadeInSeconds : CONFIG.fadeOutSeconds;
        const step = Math.max(0, deltaTime) / Math.max(0.001, duration);
        this.strength += Math.max(-step, Math.min(step, target - this.strength));
        this.sprite.visible = this.strength > 0.001 && width > 0 && height > 0;
        if (!this.sprite.visible) return;
        this.sprite.position.set(0, 0);
        this.sprite.width = width;
        this.sprite.height = height;
        this.sprite.alpha = CONFIG.vignetteMaxAlpha * this.strength;
    }

    public clear(): void { this.strength = 0; this.sprite.visible = false; }
    public destroy(): void {
        this.sprite.destroy();
        this.texture.destroy(true);
    }
}

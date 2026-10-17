import { Graphics, type Container } from "pixi.js";
import { BUSH_CONCEALMENT_PRESENTATION as CONFIG } from "./BushConcealmentPresentationDefinition";

/** Single world-space silhouette; never duplicates for overlapping bushes. */
export class BushBallSilhouetteRenderer {
    private readonly graphic = new Graphics();
    public constructor(parent: Container) {
        this.graphic.eventMode = "none";
        this.graphic.visible = false;
        parent.addChild(this.graphic);
    }
    public update(x: number, y: number, radius: number, coverage: number): void {
        const opacity = Math.max(0, Math.min(1, (coverage - 0.1) / 0.6));
        this.graphic.visible = opacity > 0.001;
        if (!this.graphic.visible) return;
        this.graphic.clear();
        this.graphic.circle(0, 0, radius * 0.93)
            .fill({ color: CONFIG.silhouetteFill, alpha: CONFIG.silhouetteMaxAlpha * opacity })
            .stroke({ color: CONFIG.silhouetteStroke, alpha: 0.85 * opacity, width: 1.8 });
        this.graphic.position.set(x, y);
    }
    public clear(): void { this.graphic.visible = false; }
    public destroy(): void { this.graphic.destroy(); }
}

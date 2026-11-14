import { Container, Graphics } from "pixi.js";
/** Screen-space black cover behind the persistent lives HUD. */
export class LevelCompletionTransitionRenderer {
    private readonly graphics = new Graphics();
    constructor(stage: Container, beforeHud: Container) {
        this.graphics.label = "LevelCompletionBlackout";
        stage.addChildAt(this.graphics, Math.max(0, stage.getChildIndex(beforeHud)));
        this.graphics.visible = false;
    }
    /** LCT-2B fades the cover away as the destination hole expands into view. */
    public render(alpha: number, width: number, height: number): void {
        this.graphics.clear();
        if (alpha <= 0) { this.graphics.visible = false; return; }
        this.graphics.visible = true;
        this.graphics.rect(0, 0, width, height).fill({ color: 0x000000, alpha: Math.min(1, alpha) });
    }
    public destroy(): void { this.graphics.destroy(); }
}

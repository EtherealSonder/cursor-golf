import type { Sprite } from "pixi.js";
import golfClubImage from "../../../assets/sprites/golf/golf_club_temp.png";

/**
 * DOM presentation of the existing club sprite above React HUD elements.
 * Its pose comes from the authoritative Pixi sprite after each world render.
 * Gameplay, hit testing and animation continue to use the original Club.
 */
export class GolfClubForegroundOverlay {
    private readonly element: HTMLImageElement;
    private currentSprite: Sprite | null = null;

    constructor(private readonly host: HTMLElement) {
        this.element = document.createElement("img");
        this.element.src = golfClubImage;
        this.element.alt = "";
        this.element.draggable = false;
        this.element.className = "golf-club-foreground";
        this.element.style.cssText = "position:absolute;left:0;top:0;z-index:1000;pointer-events:none;user-select:none;transform-origin:0 0;display:none;";
        host.appendChild(this.element);
    }

    public update(sprite: Sprite | null, viewportWidth: number, viewportHeight: number): void {
        if (this.currentSprite !== sprite) {
            if (this.currentSprite && !this.currentSprite.destroyed) this.currentSprite.alpha = 1;
            this.currentSprite = sprite;
        }
        if (!sprite || sprite.destroyed || !sprite.worldVisible || !sprite.visible || !sprite.renderable) {
            this.element.style.display = "none";
            return;
        }
        const width = sprite.texture.width;
        const height = sprite.texture.height;
        if (!(width > 0 && height > 0 && viewportWidth > 0 && viewportHeight > 0)) {
            this.element.style.display = "none";
            return;
        }
        const t = sprite.worldTransform;
        const sx = this.host.clientWidth / viewportWidth;
        const sy = this.host.clientHeight / viewportHeight;
        const anchorX = sprite.anchor.x * width;
        const anchorY = sprite.anchor.y * height;
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
        this.element.style.transform = `matrix(${t.a * sx},${t.b * sy},${t.c * sx},${t.d * sy},${(t.tx - t.a * anchorX - t.c * anchorY) * sx},${(t.ty - t.b * anchorX - t.d * anchorY) * sy})`;
        this.element.style.display = "block";
        // Hide only the original artwork, never the authoritative entity.
        sprite.alpha = 0;
    }

    public destroy(): void {
        if (this.currentSprite && !this.currentSprite.destroyed) this.currentSprite.alpha = 1;
        this.currentSprite = null;
        this.element.remove();
    }
}

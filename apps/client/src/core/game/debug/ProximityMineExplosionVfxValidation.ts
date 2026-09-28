import { PROXIMITY_MINE_EXPLOSION_VFX as VFX, type ExplosionIllustratedMask } from "../config/ProximityMineExplosionVfxDefinition";
import { ExplosionRenderer } from "../explosion-vfx/ExplosionRenderer";
/** Development-only static inspection. Never fires a mine or changes simulation. */
export class ProximityMineExplosionVfxValidation {
    private readonly masks: readonly ExplosionIllustratedMask[] = [
        "ignition", "fireBody", "blastRing", "pressureRing", "flameFragment", "ember",
    ];
    public constructor(private readonly renderer: ExplosionRenderer) {}
    public showGallery(): void {
        this.renderer.hideAll();
        const { x, y } = VFX.previewOrigin;
        for (let i = 0; i < this.masks.length; i++) {
            const sprite = this.renderer.getMaskSprite(this.masks[i]);
            // Two rows of three. This is a world-space diagnostic, not an explosion animation.
            sprite.position.set(x + (i % 3) * VFX.previewSpacing, y + Math.floor(i / 3) * VFX.previewSpacing);
            sprite.visible = true;
        }
    }
    /** Cycle through A/B/C while the gallery is visible. */
    public showBlastRingVariation(index: 0 | 1 | 2): void {
        this.renderer.setPreviewBlastRingVariation(index);
        this.showGallery();
    }
    public hide(): void { this.renderer.hideAll(); }
}

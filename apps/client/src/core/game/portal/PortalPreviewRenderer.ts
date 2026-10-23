import { Assets, Container, Graphics, Sprite, type Texture } from "pixi.js";
import portal1Url from "../../../assets/sprites/portals/portal_1.png";
import portal2Url from "../../../assets/sprites/portals/portal_2.png";
import portal3Url from "../../../assets/sprites/portals/portal_3.png";
import { PortalAnimationController } from "./PortalAnimationController";
import { PORTAL_PREVIEW, type PortalPreviewVariant } from "./PortalPresentationDefinition";

// Vite preserves every original PNG filename. Glob URLs are statically bundled.
const frameModules = import.meta.glob<string>(
    "../../../assets/sprites/portals/portal_spritesheet_*/*.png",
    { eager: true, query: "?url", import: "default" },
);
const holderUrls = [portal1Url, portal2Url, portal3Url];
interface Preview { root: Container; vortex: Sprite; frames: Texture[]; animation: PortalAnimationController; }
export class PortalPreviewRenderer {
    private readonly previews: Preview[] = [];
    private disposed = false;
    private constructor() {}
    public static async create(parent: Container, positions: readonly {x:number;y:number}[]): Promise<PortalPreviewRenderer> {
        const renderer = new PortalPreviewRenderer();
        const groups: string[][] = [[], [], []];
        for (let variant = 1 as PortalPreviewVariant; variant <= 3; variant++) {
            const prefix = `portal_spritesheet_${variant}`;
            const urls = Array.from({length: 16}, (_, i) => {
                const filename = `${String(i).padStart(2, "0")}_${prefix}.png`;
                const entry = Object.entries(frameModules).find(([path]) => path.endsWith(`/${prefix}/${filename}`));
                if (!entry) throw new Error(`Missing portal animation frame: ${prefix}/${filename}`);
                return entry[1];
            });
            groups[variant - 1] = urls;
        }
        const textures = await Promise.all([...holderUrls, ...groups.flat()].map(url => Assets.load<Texture>(url)));
        for (let i = 0; i < 3; i++) {
            const position = positions[i];
            if (!position) continue;
            const root = new Container();
            root.label = `PortalPreview:${i + 1}`;
            root.position.set(position.x, position.y);
            const frames = textures.slice(3 + i * 16, 3 + (i + 1) * 16);
            const vortex = new Sprite(frames[0]);
            vortex.anchor.set(0.5);
            vortex.position.set(PORTAL_PREVIEW.openingOffsetX, PORTAL_PREVIEW.openingOffsetY);
            // Do not squash the square 256x256 frames into the wide ellipse.
            // All frames retain the same source canvas and common scale/anchor.
            // The ellipse below reveals the correctly proportioned artwork.
            vortex.width = PORTAL_PREVIEW.artworkWidth;
            vortex.height = PORTAL_PREVIEW.artworkHeight;
            vortex.position.set(
                PORTAL_PREVIEW.openingOffsetX + PORTAL_PREVIEW.artworkOffsetX,
                PORTAL_PREVIEW.openingOffsetY + PORTAL_PREVIEW.artworkOffsetY,
            );
            const mask = new Graphics().ellipse(
                PORTAL_PREVIEW.openingOffsetX, PORTAL_PREVIEW.openingOffsetY,
                PORTAL_PREVIEW.openingWidth / 2, PORTAL_PREVIEW.openingHeight / 2,
            ).fill(0xffffff);
            const holder = new Sprite(textures[i]);
            holder.anchor.set(0.5);
            holder.width = PORTAL_PREVIEW.holderWidth;
            holder.height = PORTAL_PREVIEW.holderHeight;
            // The holder PNG has an opaque black center, so the vortex MUST render above it.
            // Restrict the animated layer to the opening using a stable elliptical mask.
            root.addChild(holder, mask, vortex);
            vortex.mask = mask;
            parent.addChild(root);
            renderer.previews.push({root, vortex, frames, animation: new PortalAnimationController(16, PORTAL_PREVIEW.framesPerSecond)});
        }
        return renderer;
    }
    public update(dt: number): void {
        if (this.disposed) return;
        for (const p of this.previews) if (p.animation.update(dt)) p.vortex.texture = p.frames[p.animation.getFrameIndex()];
    }
    public destroy(): void {
        this.disposed = true;
        for (const p of this.previews) { p.root.removeFromParent(); p.root.destroy({children:true}); }
        this.previews.length = 0;
    }
}

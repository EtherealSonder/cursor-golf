import { Container, Graphics, TilingSprite, Texture } from "pixi.js";
import type { ProceduralSandPatch } from "./ProceduralSandController";

/** Tiled world-space sand, clipped to the exact physics polygon. */
export class ProceduralSandRenderer {
    private readonly root = new Container();
    constructor(parent: Container, private readonly texture: Texture, private readonly tileScale: number, private readonly alpha: number) {
        parent.addChild(this.root);
    }
    public render(patches: readonly ProceduralSandPatch[]): void {
        for (const child of this.root.removeChildren()) child.destroy();
        for (const patch of patches) {
            const v = patch.vertices;
            if (v.length < 3) continue;
            const minX = Math.min(...v.map(p=>p.x)), maxX = Math.max(...v.map(p=>p.x));
            const minY = Math.min(...v.map(p=>p.y)), maxY = Math.max(...v.map(p=>p.y));
            const tile = new TilingSprite({ texture: this.texture, width: maxX-minX, height: maxY-minY });
            tile.position.set(minX,minY);
            tile.tileScale.set(this.tileScale);
            // Offset tiling by the patch origin so the texture has stable world coordinates.
            tile.tilePosition.set(-minX/this.tileScale, -minY/this.tileScale);
            tile.alpha = this.alpha;
            const mask = new Graphics();
            mask.moveTo(v[0].x,v[0].y);
            for (let i=1;i<v.length;i++) mask.lineTo(v[i].x,v[i].y);
            mask.closePath().fill(0xffffff);
            this.root.addChild(tile,mask);
            tile.mask = mask;
        }
    }
    public destroy(): void { this.root.destroy({children:true}); }
}

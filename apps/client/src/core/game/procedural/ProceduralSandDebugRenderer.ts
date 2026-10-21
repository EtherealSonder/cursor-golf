import { Graphics, Container } from "pixi.js";
import type { SandShape } from "./ProceduralSandShapeGenerator";

/** Temporary Phase 2 overlay. It does not register gameplay terrain. */
export class ProceduralSandDebugRenderer {
    private readonly graphics = new Graphics();
    constructor(parent: Container) { parent.addChild(this.graphics); }
    public render(patches: readonly SandShape[]): void {
        this.graphics.clear();
        for (const patch of patches) {
            const [first, ...rest] = patch.vertices;
            if (!first) continue;
            this.graphics.moveTo(first.x,first.y);
            for (const p of rest) this.graphics.lineTo(p.x,p.y);
            this.graphics.closePath().fill({color:0xf4d27a,alpha:0.56}).stroke({color:0xb77d3c,width:2,alpha:0.95});
        }
    }
    public destroy(): void { this.graphics.destroy(); }
}

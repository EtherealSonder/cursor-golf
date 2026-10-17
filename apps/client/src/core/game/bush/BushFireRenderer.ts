import { Container, Graphics } from "pixi.js";
import type { Bush } from "./Bush";
import { BUSH_FIRE } from "./BushFireDefinition";
/** Lightweight deterministic top-down flame shapes sampled inside the foliage alpha. */
export class BushFireRenderer {
    private readonly graphics = new Map<string, Graphics>();
    public constructor(private readonly parent: Container) {}
    public update(bush: Bush, progress: number, time: number): void {
        if (this.parent.destroyed) return;
        let graphic = this.graphics.get(bush.id);
        if (!graphic) {
            graphic = new Graphics(); graphic.eventMode = "none";
            this.parent.addChild(graphic); this.graphics.set(bush.id, graphic);
        }
        graphic.clear();
        const total = BUSH_FIRE.perimeterFlames + BUSH_FIRE.interiorFlames;
        const radius = bush.geometry.size * .5;
        for (let i=0; i<total; i++) {
            const outer = i < BUSH_FIRE.perimeterFlames;
            const angle = i*2.399963229728653;
            const r = radius * (outer ? .75 : .50*Math.sqrt((i+0.5)/total));
            const x = bush.x + Math.cos(angle)*r, y = bush.y + Math.sin(angle)*r;
            if (!bush.geometry.contains({x,y})) continue;
            const flicker = .82 + .18*Math.sin(time*9+i*2.2);
            const height = BUSH_FIRE.flameHeight*flicker*(outer ? 1 : .75);
            graphic.moveTo(x-5,y+5).lineTo(x-3,y-3).lineTo(x,y-height).lineTo(x+4,y-4).lineTo(x+6,y+5).closePath().fill({color:BUSH_FIRE.flameColor,alpha:.83});
            graphic.moveTo(x-2,y+3).lineTo(x,y-height*.56).lineTo(x+3,y+3).closePath().fill({color:BUSH_FIRE.flameHighlight,alpha:.72});
        }
        graphic.alpha = Math.min(1, .3 + progress*2);
    }
    public remove(id: string): void { const g = this.graphics.get(id); if (!g) return; this.graphics.delete(id); g.destroy(); }
    public destroy(): void { for (const id of [...this.graphics.keys()]) this.remove(id); }
}

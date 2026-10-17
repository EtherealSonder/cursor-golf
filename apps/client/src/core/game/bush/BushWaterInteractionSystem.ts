import type { Bush } from "./Bush";
import { BUSH_WATER } from "./BushWaterDefinition";

export interface BushWaterContact {
    readonly bush: Bush;
    readonly x: number;
    readonly y: number;
    readonly pathLength: number;
    readonly normalX: number;
    readonly normalY: number;
}

/** Shared swept foliage contact for sprinkler and hose authoritative packets. */
export class BushWaterInteractionSystem {
    public constructor(private readonly getBushes: () => readonly Bush[]) {}

    public firstContact(x0: number, y0: number, x1: number, y1: number): BushWaterContact | null {
        const distance = Math.hypot(x1 - x0, y1 - y0);
        if (distance < 0.001) return null;
        const steps = Math.max(1, Math.ceil(distance / BUSH_WATER.sampleStepPx));
        const bushes = this.getBushes();
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x0 + (x1 - x0) * t;
            const y = y0 + (y1 - y0) * t;
            for (const bush of bushes) {
                if (bush.isDestroyed || !bush.geometry.containsFoliageWorld(x, y)) continue;
                const dx = x - bush.geometry.center.x;
                const dy = y - bush.geometry.center.y;
                const magnitude = Math.hypot(dx, dy);
                const normalX = magnitude > 0.001 ? dx / magnitude : -(x1 - x0) / distance;
                const normalY = magnitude > 0.001 ? dy / magnitude : -(y1 - y0) / distance;
                return { bush, x, y, pathLength: distance * (1 - t), normalX, normalY };
            }
        }
        return null;
    }

    public foliageLength(x0: number, y0: number, x1: number, y1: number): number {
        const length = Math.hypot(x1-x0,y1-y0);
        if (length <= 0) return 0;
        const steps = Math.max(1,Math.ceil(length/BUSH_WATER.sampleStepPx));
        let inside = 0;
        const bushes = this.getBushes();
        for(let i=0;i<steps;i++) {
            const t=(i+0.5)/steps, x=x0+(x1-x0)*t, y=y0+(y1-y0)*t;
            if(bushes.some(b=>!b.isDestroyed && b.geometry.containsFoliageWorld(x,y))) inside++;
        }
        return length*inside/steps;
    }

    public transmission(pathLength: number): number {
        if(pathLength<=0)return 1;
        return Math.exp(Math.log(1-BUSH_WATER.centerCrossingAbsorption)*pathLength/136);
    }

    public inside(x:number,y:number):boolean {
        return this.getBushes().some(b=>!b.isDestroyed && b.geometry.containsFoliageWorld(x,y));
    }
}

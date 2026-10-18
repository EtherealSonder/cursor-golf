import type { Rotator } from "../entities/mechanisms/Rotator";
import { rotatorDynamicShapes } from "./RotatorDynamicCollisionGeometry";

/** R7: cached kinematic obstacles. A segment is tested against the current arm pose,
 * without inserting changing shapes into the static wind spatial index. */
export class RotatorElementalObstacleSystem {
    private readonly shapes: ReturnType<typeof rotatorDynamicShapes> = [];
    public synchronize(rotators: readonly Rotator[]): void {
        this.shapes.length = 0;
        for (const rotator of rotators) this.shapes.push(...rotatorDynamicShapes(rotator));
    }
    public blocksSegment(x0: number, y0: number, x1: number, y1: number, padding = 0): boolean {
        for (const shape of this.shapes) {
            const bound = shape.shape === "circle" ? shape.radius : Math.hypot(shape.width, shape.height) * 0.5;
            const dx = x1 - x0, dy = y1 - y0;
            const len2 = dx * dx + dy * dy;
            const t = len2 > 1e-10 ? Math.max(0, Math.min(1, ((shape.positionX-x0)*dx+(shape.positionY-y0)*dy)/len2)) : 0;
            const px = x0 + dx*t - shape.positionX, py = y0 + dy*t - shape.positionY;
            if (px*px + py*py > (bound+padding)*(bound+padding)) continue;
            if (shape.shape === "circle") return true;
            const c = Math.cos(shape.rotationRadians), s = Math.sin(shape.rotationRadians);
            const ax = (x0-shape.positionX)*c+(y0-shape.positionY)*s;
            const ay = -(x0-shape.positionX)*s+(y0-shape.positionY)*c;
            const bx = (x1-shape.positionX)*c+(y1-shape.positionY)*s;
            const by = -(x1-shape.positionX)*s+(y1-shape.positionY)*c;
            const vx = bx-ax, vy = by-ay;
            let lo = 0, hi = 1;
            const hx = shape.width/2+padding, hy = shape.height/2+padding;
            if (Math.abs(vx)<1e-10) { if (Math.abs(ax)>hx) continue; }
            else { const t0=(-hx-ax)/vx, t1=(hx-ax)/vx; lo=Math.max(lo,Math.min(t0,t1)); hi=Math.min(hi,Math.max(t0,t1)); }
            if (lo>hi) continue;
            if (Math.abs(vy)<1e-10) { if (Math.abs(ay)>hy) continue; }
            else { const t0=(-hy-ay)/vy, t1=(hy-ay)/vy; lo=Math.max(lo,Math.min(t0,t1)); hi=Math.min(hi,Math.max(t0,t1)); }
            if (lo<=hi) return true;
        }
        return false;
    }
}

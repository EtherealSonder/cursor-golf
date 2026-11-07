import { HOLE_OBJECT_CAPTURE } from "../config/HoleObjectCaptureDefinition";
/** Returns a bounded change in velocity, not a teleport or unconditional magnet. */
export class HoleObjectAttractionSystem {
    public static calculate(x: number, y: number, vx: number, vy: number, hx: number, hy: number, dt: number): { x: number; y: number } {
        const dx = hx - x, dy = hy - y, distance = Math.hypot(dx, dy);
        const speed = Math.hypot(vx, vy), c = HOLE_OBJECT_CAPTURE;
        if (dt <= 0 || distance < 0.001 || distance >= c.attractionRadius || speed >= c.fadeOutSpeed) return { x: 0, y: 0 };
        if (speed < 0.5 && distance > 30) return { x: 0, y: 0 };
        const nx = dx / distance, ny = dy / distance;
        const t = 1 - distance / c.attractionRadius;
        const spatial = t * t * (3 - 2 * t);
        const speedFactor = speed <= c.fullAttractionSpeed ? 1 : Math.max(0, (c.fadeOutSpeed - speed) / (c.fadeOutSpeed - c.fullAttractionSpeed));
        const alignment = speed > 0.001 ? (vx * nx + vy * ny) / speed : 0;
        const departure = alignment < 0 ? 0.15 + 0.85 * (1 + alignment) : 1;
        const amount = c.maximumAcceleration * spatial * speedFactor * departure * Math.min(dt, 1 / 30);
        return { x: nx * amount, y: ny * amount };
    }
}

import { HOLE_OBJECT_CAPTURE } from "../config/HoleObjectCaptureDefinition";
import { HoleObjectAttractionSystem } from "../physics/HoleObjectAttractionSystem";
import type { HoleCaptureTarget } from "./HoleCaptureTarget";
interface Capture { target: HoleCaptureTarget; elapsed: number; startX: number; startY: number; }
/** Non-ball capture. Never completes the level or changes the player's hole state. */
export class HoleObjectCaptureController {
    private readonly active = new Map<string, Capture>();
    public update(dt: number, holeX: number, holeY: number, openingRadius: number, targets: readonly HoleCaptureTarget[]): void {
        if (!(dt > 0)) return;
        const c = HOLE_OBJECT_CAPTURE;
        for (const target of targets) {
            if (this.active.has(target.id) || !target.isAvailable()) continue;
            if (target.radius > openingRadius - c.rockClearance) continue;
            const x = target.getX(), y = target.getY();
            const speed = Math.hypot(target.getVelocityX(), target.getVelocityY());
            const distance = Math.hypot(holeX - x, holeY - y);
            if (distance <= Math.max(0, openingRadius - target.radius + c.captureMargin) && speed <= c.captureSpeed) {
                target.beginCapture();
                this.active.set(target.id, { target, elapsed: 0, startX: x, startY: y });
                continue;
            }
            const dv = HoleObjectAttractionSystem.calculate(x, y, target.getVelocityX(), target.getVelocityY(), holeX, holeY, dt);
            if (dv.x || dv.y) target.applyAttraction(dv.x, dv.y);
        }
        for (const [id, capture] of this.active) {
            capture.elapsed += dt;
            const t = Math.min(1, capture.elapsed / c.captureDuration);
            const eased = t * t * (3 - 2 * t);
            capture.target.moveTo(capture.startX + (holeX - capture.startX) * eased, capture.startY + (holeY - capture.startY) * eased);
            capture.target.setScale((1 - eased) * (1 - eased));
            if (t >= 1) { this.active.delete(id); capture.target.remove(); }
        }
    }
    public clear(): void { this.active.clear(); }
}

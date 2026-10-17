import type { Crate } from "./Crate";
import type { LocalWindSystem } from "../environment/LocalWindSystem";
import { CRATE_WIND } from "./CrateWindDefinition";

/**
 * Apply a single center-of-mass wind impulse, plus a torque-only differential.
 * Samples opposite sides of the rotated crate. Equal wind on both sides produces
 * no artificial spin; an off-axis gust or suction cone generates a real moment.
 * The differential impulses cancel translationally and use the existing rigid body.
 */
export function applyCrateWindImpulse(
    crate: Crate, wind: LocalWindSystem, sourceIds: readonly string[],
    impulseX: number, impulseY: number, deltaTime: number,
): void {
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;
    const sources = wind.getSources();
    const isSuction = sourceIds.some(id => sources.some(s => s.id === id && s.flowMode === "pull"));
    const multiplier = isSuction ? CRATE_WIND.suctionImpulseMultiplier : CRATE_WIND.fanImpulseMultiplier;
    const cx = crate.x, cy = crate.y;
    crate.applyImpulseAtWorldPoint(impulseX * multiplier, impulseY * multiplier, cx, cy);

    // Sample the wind field at opposing points along each local axis.
    const angle = crate.getRotationRadians();
    const c = Math.cos(angle), s = Math.sin(angle);
    const axes = [
        { x: c * CRATE_WIND.sampleHalfWidth, y: s * CRATE_WIND.sampleHalfWidth },
        { x: -s * CRATE_WIND.sampleHalfHeight, y: c * CRATE_WIND.sampleHalfHeight },
    ];
    for (const axis of axes) {
        const plus = wind.sampleAt(cx + axis.x, cy + axis.y).acceleration;
        const minus = wind.sampleAt(cx - axis.x, cy - axis.y).acceleration;
        const dx = plus.x - minus.x, dy = plus.y - minus.y;
        if (Math.hypot(dx, dy) < CRATE_WIND.minimumSampleAcceleration) continue;
        // Use opposite impulses to create pure torque, not a second net wind force.
        let jx = dx * deltaTime * CRATE_WIND.torqueFraction * multiplier;
        let jy = dy * deltaTime * CRATE_WIND.torqueFraction * multiplier;
        const magnitude = Math.hypot(jx, jy);
        if (magnitude > CRATE_WIND.maximumTangentialImpulsePerStep) {
            const scale = CRATE_WIND.maximumTangentialImpulsePerStep / magnitude;
            jx *= scale; jy *= scale;
        }
        crate.applyImpulseAtWorldPoint(jx, jy, cx + axis.x, cy + axis.y);
        crate.applyImpulseAtWorldPoint(-jx, -jy, cx - axis.x, cy - axis.y);
    }
}

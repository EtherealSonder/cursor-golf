import type { DynamicCollidable } from "../physics/DynamicCollidable";
import { CRATE_WATER } from "./CrateWaterDefinition";

/** Applies a high-pressure jet at the upstream face of a rotating crate. */
export function applyCrateJetImpulse(
    crate: DynamicCollidable,
    impulseX: number, impulseY: number,
    nozzleX: number, nozzleY: number,
): void {
    const shape = crate.getDefinition();
    if (shape.shape !== "rectangle") return;
    const x = crate.getX(), y = crate.getY();
    const angle = crate.getRotationRadians();
    const c = Math.cos(angle), s = Math.sin(angle);
    const dx = nozzleX - x, dy = nozzleY - y;
    const localX = dx * c + dy * s;
    const localY = -dx * s + dy * c;
    const halfX = shape.width * 0.5, halfY = shape.height * 0.5;
    // Intersect the incoming nozzle ray with the upstream rectangle face.
    // Clamp lateral contact to prevent excessive torque at grazing incidence.
    const clamp = (v: number, limit: number): number => Math.max(-limit, Math.min(limit, v));
    const travelX = -impulseX * c - impulseY * s;
    const travelY = impulseX * s - impulseY * c;
    const alongX = Math.abs(travelX) >= Math.abs(travelY);
    const hitX = alongX ? Math.sign(localX || travelX) * halfX : clamp(localX, halfX * CRATE_WATER.maximumContactOffsetFraction);
    const hitY = alongX ? clamp(localY, halfY * CRATE_WATER.maximumContactOffsetFraction) : Math.sign(localY || travelY) * halfY;
    crate.applyImpulseAtWorldPoint(
        impulseX * CRATE_WATER.jetImpulseMultiplier,
        impulseY * CRATE_WATER.jetImpulseMultiplier,
        x + hitX * c - hitY * s,
        y + hitX * s + hitY * c,
    );
}

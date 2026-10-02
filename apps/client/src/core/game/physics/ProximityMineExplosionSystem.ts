import { PROXIMITY_MINE_EXPLOSION_DEFINITION as SPIN } from "../config/ProximityMineExplosionDefinition";
/** Shared minimal blast receiver: Ball need not implement DynamicCollidable. */
export interface ProximityMineImpulseReceiver {
    getX(): number;
    getY(): number;
    getInverseMass(): number;
    applyImpulseAtWorldPoint(impulseX: number, impulseY: number, contactPointX: number, contactPointY: number): void;
}
import type { ProximityMineExplosionEvent } from "../config/ProximityMineExplosionDefinition";

export interface ProximityMineBlastTarget {
    readonly id: string;
    readonly body: ProximityMineImpulseReceiver;
    /** Conservative bounding radius for non-circular rigid bodies. */
    readonly radius: number;
}

export function calculateProximityMineBlastSurfaceDistance(
    event: ProximityMineExplosionEvent, bodyX: number, bodyY: number, radius: number,
): number {
    return Math.max(0, Math.hypot(bodyX-event.x, bodyY-event.y)-Math.max(0,radius));
}

/** Pure impulse calculation, separately testable from the World lifecycle. */
export function calculateProximityMineBlastImpulse(
    event: ProximityMineExplosionEvent,
    bodyX: number, bodyY: number, radius: number, inverseMass: number,
): { x: number; y: number; surfaceDistance: number } | null {
    if (!(inverseMass > 0) || !(event.blastRadius > 0)) return null;
    const dx = bodyX - event.x;
    const dy = bodyY - event.y;
    const centerDistance = Math.hypot(dx, dy);
    const surfaceDistance = calculateProximityMineBlastSurfaceDistance(event, bodyX, bodyY, radius);
    if (surfaceDistance >= event.blastRadius) return null;
    // Arcade blast: substantial kick throughout the inner radius, but zero at the edge.
    const normalizedDistance = surfaceDistance / event.blastRadius;
    const falloff = normalizedDistance < 0.65
        ? 1 - 0.55 * normalizedDistance
        : (1 - 0.55 * 0.65) * (1 - normalizedDistance) / 0.35;
    const magnitude = Math.min(
        event.maximumImpulse * falloff,
        event.maximumAddedSpeed / inverseMass,
    );
    if (!(magnitude > 0)) return null;
    // Deterministic direction for a body precisely centered on the mine.
    const nx = centerDistance > 0.000001 ? dx / centerDistance : 1;
    const ny = centerDistance > 0.000001 ? dy / centerDistance : 0;
    return { x: nx * magnitude, y: ny * magnitude, surfaceDistance };
}

/** Tangential contact creates torque without altering the existing radial impulse. */
export function calculateProximityMineSpinImpulse(
    event: ProximityMineExplosionEvent,
    impulse: { x: number; y: number; surfaceDistance: number },
    radius: number,
): { impulseX: number; impulseY: number; offsetX: number; offsetY: number } | null {
    const outwardMagnitude = Math.hypot(impulse.x, impulse.y);
    if (!(outwardMagnitude > 0) || !(event.blastRadius > 0)) return null;
    const normalizedDistance = Math.min(1, impulse.surfaceDistance / event.blastRadius);
    const spinFalloff = Math.pow(1 - normalizedDistance, SPIN.spinFalloffPower);
    const magnitude = outwardMagnitude * SPIN.spinImpulseFraction * spinFalloff;
    if (!(magnitude > 0)) return null;
    const nx = impulse.x / outwardMagnitude;
    const ny = impulse.y / outwardMagnitude;
    const leverArm = Math.max(SPIN.minimumSpinLeverArm, Math.max(0, radius) * SPIN.spinLeverArmFraction);
    // Contact lies on the outward radial axis; tangential force gives clockwise torque.
    // Opposite mine-relative sides naturally have opposite world-space force vectors.
    return { impulseX: -ny * magnitude, impulseY: nx * magnitude,
        offsetX: nx * leverArm, offsetY: ny * leverArm };
}

/** One-shot event application. World owns event consumption and mine removal. */
export class ProximityMineExplosionSystem {
    public apply(event: ProximityMineExplosionEvent, targets: readonly ProximityMineBlastTarget[]): number {
        const visited = new Set<ProximityMineImpulseReceiver>();
        let affected = 0;
        for (const { id, body, radius } of targets) {
            if (visited.has(body)) continue;
            visited.add(body);
            const impulse = calculateProximityMineBlastImpulse(
                event, body.getX(), body.getY(), radius, body.getInverseMass(),
            );
            if (!impulse) continue;
            // Preserve full radial knockback; add a separate tangential impulse for spin.
            const spin = calculateProximityMineSpinImpulse(event, impulse, radius);
            // Robots must suspend walking and orientation correction during recovery.
            const blastAware = body as ProximityMineImpulseReceiver & {
                receiveProximityMineBlast?: (impulseX: number, impulseY: number, recoverySeconds: number) => void;
            };
            if (blastAware.receiveProximityMineBlast) {
                blastAware.receiveProximityMineBlast(impulse.x, impulse.y, 0.75);
            } else {
                body.applyImpulseAtWorldPoint(impulse.x, impulse.y, body.getX(), body.getY());
            }
            // A tangential impulse at an off-center contact produces angular velocity.
            // Ball is deliberately excluded: its visual destruction is a later phase.
            if (spin && id !== "ball") {
                body.applyImpulseAtWorldPoint(spin.impulseX, spin.impulseY,
                    body.getX() + spin.offsetX, body.getY() + spin.offsetY);
            }
            affected += 1;
        }
        return affected;
    }
}

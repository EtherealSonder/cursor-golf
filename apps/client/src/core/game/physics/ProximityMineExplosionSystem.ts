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

/** Pure impulse calculation, separately testable from the World lifecycle. */
export function calculateProximityMineBlastImpulse(
    event: ProximityMineExplosionEvent,
    bodyX: number, bodyY: number, radius: number, inverseMass: number,
): { x: number; y: number; surfaceDistance: number } | null {
    if (!(inverseMass > 0) || !(event.blastRadius > 0)) return null;
    const dx = bodyX - event.x;
    const dy = bodyY - event.y;
    const centerDistance = Math.hypot(dx, dy);
    const surfaceDistance = Math.max(0, centerDistance - Math.max(0, radius));
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

/** One-shot event application. World owns event consumption and mine removal. */
export class ProximityMineExplosionSystem {
    public apply(event: ProximityMineExplosionEvent, targets: readonly ProximityMineBlastTarget[]): number {
        const visited = new Set<ProximityMineImpulseReceiver>();
        let affected = 0;
        for (const { body, radius } of targets) {
            if (visited.has(body)) continue;
            visited.add(body);
            const impulse = calculateProximityMineBlastImpulse(
                event, body.getX(), body.getY(), radius, body.getInverseMass(),
            );
            if (!impulse) continue;
            // Center-of-mass impulse: outward knockback without introducing spin.
            // Robots must suspend walking while the blast's external velocity integrates.
            const blastAware = body as ProximityMineImpulseReceiver & {
                receiveProximityMineBlast?: (impulseX: number, impulseY: number, recoverySeconds: number) => void;
            };
            if (blastAware.receiveProximityMineBlast) {
                blastAware.receiveProximityMineBlast(impulse.x, impulse.y, 0.75);
            } else {
                body.applyImpulseAtWorldPoint(impulse.x, impulse.y, body.getX(), body.getY());
            }
            if (import.meta.env.DEV) {
                console.info('[PM-2B] Blast impulse', { mine: event.mineId, target: body.constructor.name,
                    surfaceDistance: Math.round(impulse.surfaceDistance),
                    deltaSpeed: Math.round(Math.hypot(impulse.x, impulse.y) * body.getInverseMass()) });
            }
            affected += 1;
        }
        return affected;
    }
}

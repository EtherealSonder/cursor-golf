/** Pure proximity selection. Radii account for the target's physical footprint. */
export interface ProximityMineTarget {
    readonly id: string;
    readonly label: string;
    readonly x: number;
    readonly y: number;
    readonly radius: number;
}
export type ProximityMineZone = 'NONE' | 'DETECTED' | 'ARMING' | 'CONTACT';
export interface ProximityMineDetectionResult {
    readonly target: ProximityMineTarget | null;
    readonly distanceToSurface: number;
    readonly zone: ProximityMineZone;
    /** 0 at arming boundary, 1 at contact boundary; zero outside arming zone. */
    readonly armingProximity: number;
    /** 0 at detection boundary, 1 at contact boundary. */
    readonly detectionProximity: number;
    readonly contact: boolean;
}
export function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
export function countdownDuration(proximity: number, outerSeconds: number, innerSeconds: number): number {
    return outerSeconds + (innerSeconds - outerSeconds) * clamp01(proximity);
}
export function advanceArmingProgress(
    progress: number, dt: number, zone: ProximityMineZone, proximity: number,
    outerSeconds: number, innerSeconds: number, decayPerSecond: number,
): number {
    const delta = Math.max(0, dt);
    if (zone === 'CONTACT') return 1;
    if (zone === 'ARMING') return clamp01(progress + delta / countdownDuration(proximity, outerSeconds, innerSeconds));
    return clamp01(progress - delta * decayPerSecond);
}
export function detectProximityMineTarget(
    x: number, y: number, targets: readonly ProximityMineTarget[],
    detectionRadius: number, contactRadius: number, armingRadius: number = detectionRadius,
): ProximityMineDetectionResult {
    let contactTarget: ProximityMineTarget | null = null;
    let nearest: ProximityMineTarget | null = null;
    let nearestSurface = Infinity;
    for (const target of targets) {
        const distance = Math.hypot(target.x - x, target.y - y);
        const surface = Math.max(0, distance - Math.max(0, target.radius));
        if (surface <= contactRadius && (!contactTarget || surface < Math.max(0, Math.hypot(contactTarget.x - x, contactTarget.y - y) - contactTarget.radius))) contactTarget = target;
        if (surface <= detectionRadius && surface < nearestSurface) {
            nearest = target;
            nearestSurface = surface;
        }
    }
    if (contactTarget) { nearest = contactTarget; nearestSurface = Math.max(0, Math.hypot(contactTarget.x - x, contactTarget.y - y) - contactTarget.radius); }
    const contact = contactTarget !== null;
    const zone: ProximityMineZone = !nearest ? 'NONE' : contact ? 'CONTACT'
        : nearestSurface <= armingRadius ? 'ARMING' : 'DETECTED';
    return {
        target: nearest, distanceToSurface: nearestSurface, zone, contact,
        armingProximity: zone === 'ARMING' || contact
            ? clamp01((armingRadius - nearestSurface) / Math.max(0.001, armingRadius - contactRadius)) : 0,
        detectionProximity: nearest
            ? clamp01((detectionRadius - nearestSurface) / Math.max(0.001, detectionRadius - contactRadius)) : 0,
    };
}

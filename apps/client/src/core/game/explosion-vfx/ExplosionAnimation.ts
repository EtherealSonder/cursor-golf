import { PROXIMITY_MINE_EXPLOSION_VFX as VFX } from "../config/ProximityMineExplosionVfxDefinition";
/** Pure presentation math; time is measured in seconds after detonation. */
export function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
export function progress(time: number, start: number, end: number): number { return clamp01((time - start) / (end - start)); }
export function easeOutCubic(t: number): number { return 1 - (1 - t) ** 3; }
export function layerState(time: number, settings: {
    readonly start: number;
    readonly end: number;
    readonly from: number;
    readonly to: number;
    /** Optional independent expansion and fade timing, currently used by the pressure wave. */
    readonly expansionEnd?: number;
    readonly fadeStart?: number;
}): { visible: boolean; scale: number; alpha: number } {
    if (time < settings.start || time >= settings.end) return { visible: false, scale: settings.from, alpha: 0 };
    const expansionEnd = settings.expansionEnd ?? settings.end;
    const expansionProgress = progress(time, settings.start, expansionEnd);
    const scale = settings.from + (settings.to - settings.from) * easeOutCubic(expansionProgress);
    // Preserve existing layer behavior unless separate pressure-wave timing is configured.
    const alpha = settings.fadeStart === undefined
        ? (expansionProgress < 0.42 ? 1 : 1 - progress(expansionProgress, 0.42, 1))
        : 1 - progress(time, settings.fadeStart, settings.end);
    return { visible: true, scale, alpha };
}
export function particleState(time: number, start: number, end: number, speed: number, angle: number, spin: number, size: number, spawnRadius = 0, spawnDelay = 0, isLargeFragment = false) {
    start += spawnDelay;
    if (time < start || time >= end) return { visible: false, x: 0, y: 0, rotation: angle, alpha: 0, size };
    const elapsed = time - start;
    const t = progress(time, start, end);
    // Fragments leave the center quickly and then coast outward; embers retain
    // the original particle travel curve. Both begin at their configured origin.
    const travel = isLargeFragment ? (0.83 * elapsed + 0.17 * elapsed * elapsed / (end - start)) : elapsed * (1 - 0.34 * t);
    const distance = spawnRadius + speed * travel;
    const alpha = isLargeFragment
        ? (t < 0.16 ? 1 : 1 - progress(t, 0.16, 1) ** 1.65)
        : 1 - t * t;
    const scale = isLargeFragment ? 1 - 0.56 * t : 1 - 0.48 * t;
    return { visible: true, x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, rotation: angle + spin * elapsed, alpha, size: size * scale };
}
/** Deterministic particle variation: simultaneous explosions never depend on Math.random. */
export function hashUnit(seed: number): number {
    const value = Math.sin(seed * 127.1 + 78.233) * 43758.5453123;
    return value - Math.floor(value);
}
export const EXPLOSION_DURATION = VFX.totalDuration;

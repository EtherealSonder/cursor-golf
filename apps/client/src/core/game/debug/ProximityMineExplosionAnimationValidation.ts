import { PROXIMITY_MINE_EXPLOSION_VFX as VFX } from "../config/ProximityMineExplosionVfxDefinition";
import type { ProximityMineExplosionEvent } from "../config/ProximityMineExplosionDefinition";
import { hashUnit, layerState, particleState } from "../explosion-vfx/ExplosionAnimation";
import { ExplosionRenderer } from "../explosion-vfx/ExplosionRenderer";
/** Pure timeline checks plus optional live renderer validation; no mine or physics mutations. */
export function validateProximityMineExplosionAnimation(): void {
    const check = (ok: boolean, name: string) => { if (!ok) throw new Error(`[PM-2D] ${name}: FAIL`); };
    check(VFX.layers.blastRing.size === 420, "blast ring enlarged");
    check(VFX.layers.fireBody.size === 354, "fire body enlarged");
    check(VFX.blastRingInitialRotationMax > 0, "blast ring rotation variation configured");
    const flash = layerState(0, VFX.timings.ignition);
    check(flash.visible && flash.alpha > 0, "immediate ignition");
    check(!layerState(0, VFX.timings.blastRing).visible, "blast ring delayed");
    check(layerState(0.10, VFX.timings.blastRing).visible, "blast ring expands");
    check(!layerState(0.30, VFX.timings.pressureRing).visible, "pressure ring ends first");
    check(!layerState(0.50, VFX.timings.fireBody).visible, "fire body expires");
    check(particleState(0.15, 0.075, 0.6, 100, 0, 2, 20).x > 0, "fragments travel outward");
    check(hashUnit(42) === hashUnit(42), "deterministic variation");
    console.info("[PM-2D] Timeline and particle validation: PASS");
}
export function validateExplosionRendererLifecycle(renderer: ExplosionRenderer, event: ProximityMineExplosionEvent): void {
    const baseline = renderer.getActiveCount();
    renderer.detonate(event);
    renderer.detonate({ ...event, mineId: `${event.mineId}-second`, x: event.x + 60 });
    if (renderer.getActiveCount() !== Math.min(VFX.maxActiveExplosions, baseline + 2)) throw new Error("[PM-2D] simultaneous explosions: FAIL");
    renderer.update(VFX.totalDuration + 0.01);
    if (renderer.getActiveCount() !== 0) throw new Error("[PM-2D] cleanup: FAIL");
    console.info("[PM-2D] Simultaneous explosions and cleanup: PASS");
}

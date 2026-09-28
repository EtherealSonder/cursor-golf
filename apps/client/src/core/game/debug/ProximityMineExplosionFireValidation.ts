import { PROXIMITY_MINE_EXPLOSION_FIRE } from "../config/ProximityMineExplosionFireDefinition";
import type { ProximityMineExplosionEvent } from "../config/ProximityMineExplosionDefinition";
import { ProximityMineExplosionFireController } from "../environment/ProximityMineExplosionFireController";

/** Pure scheduling checks; no graphics or real FireManager required. */
export function runProximityMineExplosionFireValidation(): void {
    const calls: Array<{ x: number; y: number; radius: number; count: number }> = [];
    const controller = new ProximityMineExplosionFireController({
        igniteArea(x, y, radius, count) {
            calls.push({ x, y, radius, count });
            return count;
        },
    });
    const check = (ok: boolean, message: string): void => {
        if (!ok) throw new Error(`[PM-2F] ${message}`);
    };
    const event: ProximityMineExplosionEvent = {
        mineId: "mine-1", target: "ball", x: 125, y: 270,
        blastRadius: 220, maximumImpulse: 14000, maximumAddedSpeed: 950,
    };
    const delay = PROXIMITY_MINE_EXPLOSION_FIRE.ignitionDelaySeconds;
    check(controller.schedule(event), "first detonation must schedule");
    check(!controller.schedule(event), "duplicate detonation must be ignored");
    controller.update(delay * 0.5);
    check(calls.length === 0, "must not ignite during animation");
    controller.update(delay * 0.5);
    check(calls.length === 1, "must ignite exactly once after animation");
    check(calls[0].x === event.x && calls[0].y === event.y, "must use mine position");
    check(calls[0].radius === PROXIMITY_MINE_EXPLOSION_FIRE.initialIgnitionRadius &&
        calls[0].count === PROXIMITY_MINE_EXPLOSION_FIRE.initialIgnitionCount,
        "must request configured larger initial ignition");
    controller.update(delay);
    check(calls.length === 1, "completed detonation must never repeat");
    check(controller.schedule({ ...event, mineId: "mine-2" }), "second mine must schedule independently");
    controller.reset();
    controller.update(delay);
    check(calls.length === 1 && controller.getPendingCount() === 0, "reset must cancel pending fire");
    check(controller.schedule(event), "reset must permit fresh scheduling");
    controller.update(delay);
    check(calls.length === 2, "fresh scheduling after reset must work");
    console.info("[PM-2F] Delayed mine point-fire scheduling: PASS");
}

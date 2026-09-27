import { calculateProximityMineBlastImpulse, ProximityMineExplosionSystem } from "../physics/ProximityMineExplosionSystem";
import type { ProximityMineExplosionEvent } from "../config/ProximityMineExplosionDefinition";
import type { DynamicCollidable } from "../physics/DynamicCollidable";

/** Pure PM-2A/B validation; call runProximityMineExplosionValidation() from a test harness. */
export function runProximityMineExplosionValidation(): void {
    const event: ProximityMineExplosionEvent = {
        mineId: "test-mine-1", target: "ball", x: 0, y: 0,
        blastRadius: 220, maximumImpulse: 14000, maximumAddedSpeed: 950,
    };
    const check = (condition: boolean, message: string): void => {
        if (!condition) throw new Error(`[PM-2] ${message}`);
    };
    const near = calculateProximityMineBlastImpulse(event, 30, 0, 10, 1);
    const far = calculateProximityMineBlastImpulse(event, 100, 0, 10, 1);
    check(!!near && !!far && near.x > far.x, "Nearer target must receive stronger impulse");
    check(calculateProximityMineBlastImpulse(event, 240, 0, 10, 1) === null, "Outside radius must be unaffected");
    check(calculateProximityMineBlastImpulse(event, 30, 0, 10, 0) === null, "Static target must be unaffected");
    const light = calculateProximityMineBlastImpulse(event, 50, 0, 10, 1);
    const heavy = calculateProximityMineBlastImpulse(event, 50, 0, 10, 0.025);
    check(!!light && !!heavy && light.x * 1 > heavy.x * 0.025, "Lighter target must gain more velocity");
    const center = calculateProximityMineBlastImpulse(event, 0, 0, 10, 1);
    check(!!center && Number.isFinite(center.x) && center.y === 0, "Center overlap must be finite");
    let calls = 0;
    const body = {
        getX: () => 50, getY: () => 0, getInverseMass: () => 1,
        applyImpulseAtWorldPoint: () => { calls += 1; },
    } as unknown as DynamicCollidable;
    const system = new ProximityMineExplosionSystem();
    check(system.apply(event, [{ id: "ball", body, radius: 10 }, { id: "duplicate", body, radius: 10 }]) === 1,
        "Same body must receive one impulse per event");
    check(calls === 1, "Duplicate target registration must not double-apply");
    check(system.apply({ ...event, mineId: "test-mine-2" }, [{ id: "ball", body, radius: 10 }]) === 1,
        "Independent second explosion must affect target");
    check(calls === 2, "Independent mine events must each apply once");
    // One-shot consumption and actual entity removal are owned by ProximityMine/World.
    console.info("[PM-2] Pure blast calculation and target deduplication: PASS");
}

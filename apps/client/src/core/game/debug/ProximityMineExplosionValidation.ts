import { calculateProximityMineBlastImpulse, calculateProximityMineSpinImpulse, ProximityMineExplosionSystem } from "../physics/ProximityMineExplosionSystem";
import type { ProximityMineExplosionEvent } from "../config/ProximityMineExplosionDefinition";

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
    const nearSpin = calculateProximityMineSpinImpulse(event, near!, 24);
    const farSpin = calculateProximityMineSpinImpulse(event, far!, 24);
    check(!!nearSpin && !!farSpin, "In-range targets must receive spin");
    check(Math.hypot(nearSpin!.impulseX, nearSpin!.impulseY) >
        Math.hypot(farSpin!.impulseX, farSpin!.impulseY), "Spin must diminish with distance");
    check(nearSpin!.offsetX > 0 && nearSpin!.impulseY > 0, "Right-side target must spin tangentially");
    const opposite = calculateProximityMineBlastImpulse(event, -30, 0, 10, 1);
    const oppositeSpin = calculateProximityMineSpinImpulse(event, opposite!, 24);
    check(!!oppositeSpin && oppositeSpin.offsetX < 0 && oppositeSpin.impulseY < 0,
        "Opposite-side target must reverse world-space tangential force");
    check(calculateProximityMineSpinImpulse(event, { x: 0, y: 0, surfaceDistance: 220 }, 24) === null,
        "Zero radial impulse must produce no spin");
    let calls = 0;
    class TestBody {
        getX(): number { return 50; }
        getY(): number { return 0; }
        getInverseMass(): number { return 1; }
        applyImpulseAtWorldPoint(): void { calls += 1; }
    }
    const body = new TestBody();
    const system = new ProximityMineExplosionSystem();
    check(system.apply(event, [{ id: "ball", body, radius: 10 }, { id: "duplicate", body, radius: 10 }]) === 1,
        "Same body must receive one impulse per event");
    check(calls === 2, "Each unique rigid body must receive radial and tangential impulses");
    check(system.apply({ ...event, mineId: "test-mine-2" }, [{ id: "ball", body, radius: 10 }]) === 1,
        "Independent second explosion must affect target");
    check(calls === 4, "Independent mine events must each apply radial and spin once");
    // One-shot consumption and actual entity removal are owned by ProximityMine/World.
    console.info("[PM-2] Pure blast calculation and target deduplication: PASS");
}

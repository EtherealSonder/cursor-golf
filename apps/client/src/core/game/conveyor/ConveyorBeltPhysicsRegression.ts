import { conveyorBallContactWeight, conveyorDirectionalDeltaSpeed } from "./ConveyorBeltBallTransportSystem";
import { CONVEYOR_BELT_PHYSICS } from "./ConveyorBeltPhysicsDefinition";

export function assertConveyorBeltPhysicsRegression(): void {
    const weight = (x: number, y: number, r: number, angle = 0) =>
        conveyorBallContactWeight(x, y, r, 0, 0, angle, 200, 89);
    const assert = (condition: boolean, message: string): void => {
        if (!condition) throw new Error(`CB3 regression: ${message}`);
    };
    assert(weight(0, 0, 10) === 1, "centre must have full transport");
    assert(weight(200, 0, 10) === 0, "distant ball must have no transport");
    assert(weight(105, 0, 10) > 0 && weight(105, 0, 10) < 1, "partial edge contact must be weighted");
    assert(weight(0, 100, 10, Math.PI / 2) > 0, "rotated conveyor contact must work");
    assert(weight(0, 200, 10, Math.PI / 2) === 0, "rotated conveyor must reject distant balls");
    assert(CONVEYOR_BELT_PHYSICS.targetDirectionalSpeed === 900, "target transport speed must remain tuned");
    assert(CONVEYOR_BELT_PHYSICS.acceleration === 12000, "opposing-shot reversal must remain strong");
    assert(conveyorDirectionalDeltaSpeed(1400, 1 / 60, 1) === 0, "fast forward shot must not be braked");
    assert(conveyorDirectionalDeltaSpeed(0, 1 / 60, 0) === 0, "no contact must produce no impulse");
    assert(conveyorDirectionalDeltaSpeed(0, 1 / 60, 0.5) < conveyorDirectionalDeltaSpeed(0, 1 / 60, 1),
        "partial contact must reduce acceleration");

    // Simulate a maximum-power 1200 units/s shot against the conveyor, entering
    // at the downstream edge of the 200-unit footprint. No ground friction is
    // assumed, so this is a conservative stopping-distance test.
    const dt = 1 / 240;
    let x = 100 + 10; // radius 10, first touch at the downstream edge
    let velocity = -1200;
    let reversed = false;
    let furthestX = x;
    for (let step = 0; step < 240 && !reversed; step++) {
        const contact = weight(x, 0, 10);
        velocity += conveyorDirectionalDeltaSpeed(velocity, dt, contact);
        x += velocity * dt;
        furthestX = Math.min(furthestX, x);
        if (velocity >= 0) reversed = true;
    }
    assert(reversed, "maximum opposite shot must reverse on the belt");
    assert(furthestX > -100, "maximum opposite shot must reverse before crossing the far edge");
    assert(furthestX < 65, "maximum opposite shot must penetrate visibly before reversing");
}

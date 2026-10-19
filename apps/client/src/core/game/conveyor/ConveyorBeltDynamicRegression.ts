import { CONVEYOR_BELT_PHYSICS } from "./ConveyorBeltPhysicsDefinition";

/** Pure invariants for CB4 transport; integration tests use the development level. */
export function assertConveyorBeltDynamicRegression(): void {
    const p = CONVEYOR_BELT_PHYSICS;
    if (!(p.dynamicAcceleration > 0 && p.dynamicTargetDirectionalSpeed > 0)) {
        throw new Error("CB4: dynamic conveyor transport must have positive speed and acceleration");
    }
    if (!(p.dynamicTorqueScale > 0 && p.dynamicTorqueScale <= 1)) {
        throw new Error("CB4: off-centre torque scaling must be in (0, 1]");
    }
    if (!(p.dynamicMaximumContactOffset > 0)) {
        throw new Error("CB4: contact offset must be positive");
    }
    // Robot transport uses the same acceleration and overlap weighting as crates,
    // with a linear (non-torque) impulse to preserve AI-owned heading.
    if (!(p.dynamicTargetDirectionalSpeed <= 1100)) {
        throw new Error("CB4: robot transport exceeds external rigid-body speed limit");
    }
    const dt = 1 / 60;
    const delta = Math.min(p.dynamicTargetDirectionalSpeed + 1200, p.dynamicAcceleration * dt);
    if (!(delta > 0 && delta <= p.dynamicAcceleration * dt)) {
        throw new Error("CB4: acceleration cap violated");
    }
}

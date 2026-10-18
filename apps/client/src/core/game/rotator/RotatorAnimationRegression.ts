import { ROTATOR_DEFINITION } from "../config/RotatorDefinition";
import { advanceRotatorAngle, ROTATOR_ANIMATION, rotatorAngularVelocity, TWO_PI } from "./RotatorAnimationDefinition";

function near(a: number, b: number, tolerance = 1e-9): boolean {
    return Math.abs(a - b) < tolerance;
}

/** Pure R2 regression checks; does not create Pixi sprites or depend on WebGL. */
export function assertRotatorAnimationRegression(): void {
    const cw = rotatorAngularVelocity("clockwise");
    const ccw = rotatorAngularVelocity("counterClockwise");
    if (!(cw > 0 && ccw < 0 && near(cw, -ccw))) throw new Error("[R2] Directional angular velocity invalid");
    if (!near(cw, ROTATOR_ANIMATION.radiansPerSecond)) throw new Error("[R2] Speed mismatch");
    const once = advanceRotatorAngle(0, cw, 1);
    let stepped = 0;
    for (let i = 0; i < 60; i++) stepped = advanceRotatorAngle(stepped, cw, 1 / 60);
    if (!near(once, stepped)) throw new Error("[R2] Rotation depends on timestep subdivision");
    if (!near(advanceRotatorAngle(0, cw, 3), 0)) throw new Error("[R2] Full revolution should wrap");
    if (!near(advanceRotatorAngle(0, ccw, 1), TWO_PI - cw)) throw new Error("[R2] Reverse rotation invalid");
    if (ROTATOR_DEFINITION.hubDiameter >= ROTATOR_DEFINITION.diameter) throw new Error("[R2] Hub obscures arms");
}

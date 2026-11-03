import type { RotatorDirection } from "../config/RotatorDefinition";

/** R2: animation-only angular speed; R3 will reuse this for surface velocities. */
export const ROTATOR_ANIMATION = Object.freeze({
    degreesPerSecond: 120,
    radiansPerSecond: (120 * Math.PI) / 180,
});

export const TWO_PI = Math.PI * 2;

export function rotatorAngularVelocity(direction: RotatorDirection, degreesPerSecond: number = ROTATOR_ANIMATION.degreesPerSecond): number {
    // Pixi screen coordinates have positive Y downward: positive angle is clockwise.
    return direction === "clockwise"
        ? (degreesPerSecond * Math.PI) / 180
        : -(degreesPerSecond * Math.PI) / 180;
}

/** WM-7D: 210 degrees/s stays inside the existing swept-contact substep budget at 60 FPS. */
export const ROTATOR_OVERDRIVE_TARGET_DEGREES_PER_SECOND = 210;

/** Stable angle normalization for arbitrarily long sessions. */
export function wrapRotatorAngle(angle: number): number {
    return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

export function advanceRotatorAngle(angle: number, angularVelocity: number, deltaSeconds: number): number {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return angle;
    return wrapRotatorAngle(angle + angularVelocity * deltaSeconds);
}

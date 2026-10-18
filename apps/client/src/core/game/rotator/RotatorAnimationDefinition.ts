import type { RotatorDirection } from "../config/RotatorDefinition";

/** R2: animation-only angular speed; R3 will reuse this for surface velocities. */
export const ROTATOR_ANIMATION = Object.freeze({
    degreesPerSecond: 120,
    radiansPerSecond: (120 * Math.PI) / 180,
});

export const TWO_PI = Math.PI * 2;

export function rotatorAngularVelocity(direction: RotatorDirection): number {
    // Pixi screen coordinates have positive Y downward: positive angle is clockwise.
    return direction === "clockwise"
        ? ROTATOR_ANIMATION.radiansPerSecond
        : -ROTATOR_ANIMATION.radiansPerSecond;
}

/** Stable angle normalization for arbitrarily long sessions. */
export function wrapRotatorAngle(angle: number): number {
    return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

export function advanceRotatorAngle(angle: number, angularVelocity: number, deltaSeconds: number): number {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return angle;
    return wrapRotatorAngle(angle + angularVelocity * deltaSeconds);
}

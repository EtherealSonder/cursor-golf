/** R1: fixed, visual-only rotator footprint. Collision geometry arrives in R3. */
export const ROTATOR_DEFINITION = Object.freeze({
    diameter: 200,
    hubDiameter: 65,
    armWidth: 23, // +6 world units: oversized shaft collision envelope
    armEndRadius: 14,
    // Rounded transverse end cap, measured against the 200-unit arm artwork.
    armCapHalfWidth: 20, // +10 total width for the purple end-cap envelope
    armCapHalfThickness: 10.5, // +8 total length along the arm axis
    armTipSafetyMargin: 1.75,
    armInnerRadius: 28,
    armOuterRadius: 102, // +8 world units of radial collider reach
    restitution: 0.04,
    tangentialCouplingPerSecond: 18,
    contactCaptureDistance: 2.5,
    contactSkin: 0.5,
    maxCollisionSubsteps: 16,
    maxAngularStep: Math.PI / 48,
    shakeImpactThreshold: 220,
    armsTextureKey: "rotatorArms",
    hubTextureKey: "rotatorHub",
});
export const ROTATOR_DIRECTIONS = ["clockwise", "counterClockwise"] as const;
export type RotatorDirection = typeof ROTATOR_DIRECTIONS[number];
export function isRotatorDirection(value: unknown): value is RotatorDirection {
    return value === "clockwise" || value === "counterClockwise";
}

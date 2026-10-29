/** P2-A collider geometry; P2-B1 adds motion only (no contact resolution). */
export const PORTAL_COLLIDER = {
    /** Matches the 320 x 103.4 world-unit portal holder artwork. */
    width: 320,
    height: 103.4,
    /** Arc centerlines are elliptical; segments approximate the visible curved housing. */
    arcRadiusX: 87,
    arcRadiusY: 39,
    arcThickness: 17,
    arcSegments: 12,
    /** Handles are represented by local, axis-aligned boxes. */
    handleCenterX: 125,
    handleWidth: 67,
    handleHeight: 19,
    debugColor: 0x35f4a9,
    debugHandleColor: 0xffd85e,
    debugCenterColor: 0xff587a,
} as const;


/** P2-C1: fixed-center, angular-only portal physics tuning. */
export const PORTAL_BODY = {
    mass: 16,
    /** Approximate elliptical-frame moment of inertia, in mass * world-units squared. */
    inertiaFactor: 0.04,
    /** Linear motion is constrained at the portal adapter boundary. */
    linearDamping: 1.9,
    angularDamping: 2.2,
    sleepLinearSpeedThreshold: 1.5,
    sleepAngularSpeedThreshold: 0.018,
    sleepDelay: 0.65,
    maximumLinearSpeed: 500,
    maximumAngularSpeed: 4.0,
    /** Reserved for C3 handle-only wind torque; not applied in C1. */
    windImpulseMultiplier: 8.0,
    windMinimumAcceleration: 0.005,
    windMaximumAngularImpulsePerStep: 950,
    waterImpulseMultiplier: 0.045,
    waterMinimumMomentum: 0.025,
    waterMaximumAngularImpulsePerHit: 1400,
    /** Approximate circular water packet target at each handle. */
    waterHandleTargetRadius: 15,
    /** Maximum angle tested at once to prevent long handles tunnelling through walls. */
    maximumRotationStepRadians: 0.025,
    /** Probe only newly created penetration, allowing authored overlapping placements to escape. */
    rotationContactTolerance: 0.025,
    /** Blocked contacts cancel angular velocity into the obstruction. */
    blockedAngularVelocityRetention: 0,

    /** Contact coefficients for the compound housing and handles. */
    restitution: 0.25,
    friction: 0.55,
    /** Existing solver correction settings, retained for consistent contacts. */
    positionalCorrectionPercent: 0.85,
    positionalCorrectionSlop: 0.01,
} as const;

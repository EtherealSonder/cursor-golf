/**
 * Immutable configuration for the golf Ball's:
 *
 * - launch behaviour
 * - rolling behaviour
 * - stopping behaviour
 * - course-boundary collision
 * - obstacle collision
 * - dynamic rigid-body response
 */
export interface BallPhysicsDefinition {

    // -------------------------------------------------------------------------
    // Shot Validation
    // -------------------------------------------------------------------------

    readonly minimumLaunchPower: number;

    readonly minimumShotPreparationTime:
    number;

    // -------------------------------------------------------------------------
    // Launch Velocity
    // -------------------------------------------------------------------------

    readonly minimumLaunchSpeed: number;

    readonly maximumBallSpeed: number;

    readonly shotPowerExponent: number;

    // -------------------------------------------------------------------------
    // Rolling Resistance
    // -------------------------------------------------------------------------

    /**
     * Constant speed reduction measured in pixels
     * per second squared.
     */
    readonly rollingDeceleration: number;

    /**
     * Ball speed at or below which motion is
     * converted to an exact stationary state.
     */
    readonly stopSpeedThreshold: number;

    // -------------------------------------------------------------------------
    // Ball Rigid-Body Properties
    // -------------------------------------------------------------------------

    /**
     * Ball mass in gameplay mass units.
     *
     * The current dynamic obstacles are tuned
     * relative to a Ball mass of 1.
     */
    readonly mass: number;

    /**
     * Ball material restitution used when combining
     * the Ball and dynamic obstacle materials.
     */
    readonly obstacleRestitution: number;

    /**
     * Ball collision friction coefficient used by
     * impulse-based obstacle collision.
     */
    readonly obstacleFriction: number;

    // -------------------------------------------------------------------------
    // Course Boundary Collision
    // -------------------------------------------------------------------------

    /**
     * Percentage of boundary-normal speed preserved
     * after the Ball strikes a course edge.
     */
    readonly boundaryRestitution: number;

    /**
     * Small positional separation applied when
     * correcting boundary or obstacle penetration.
     */
    readonly boundarySafetyMargin: number;

    // -------------------------------------------------------------------------
    // Collision Integration
    // -------------------------------------------------------------------------

    /**
     * Maximum distance that the Ball may travel
     * during one internal physics sub-step.
     *
     * Smaller values reduce tunnelling through
     * obstacles at high speed.
     */
    readonly maximumMovementPerPhysicsStep:
    number;

    /**
     * Maximum number of penetration-resolution
     * passes performed during one movement step.
     */
    readonly maximumObstacleResolutionPasses:
    number;

    /**
     * Percentage of detected penetration corrected
     * during dynamic collision response.
     *
     * A value below 1 reduces aggressive correction
     * and helps prevent jitter.
     */
    readonly dynamicPositionCorrectionPercent:
    number;

    /**
     * Small overlap tolerated before positional
     * correction is applied.
     */
    readonly dynamicPositionCorrectionSlop:
    number;

    /**
     * Maximum collision impulse allowed during one
     * Ball-to-obstacle impact.
     *
     * This provides defensive protection against
     * extreme numerical impulses.
     */
    readonly maximumCollisionImpulse:
    number;

    // -------------------------------------------------------------------------
    // Frame Safety
    // -------------------------------------------------------------------------

    readonly maximumDeltaTime: number;
}

export const DEFAULT_BALL_PHYSICS_DEFINITION:
    BallPhysicsDefinition = {

    // -------------------------------------------------------------------------
    // Shot Validation
    // -------------------------------------------------------------------------

    minimumLaunchPower: 0.10,

    minimumShotPreparationTime: 0.15,

    // -------------------------------------------------------------------------
    // Launch Velocity
    // -------------------------------------------------------------------------

    /*
     * These remain at the currently tested
     * Milestone 4A values.
     *
     * They can be replaced by the later arcade
     * tuning profile after the dynamic collision
     * system is verified.
     */
    minimumLaunchSpeed: 120,

    maximumBallSpeed: 1200,

    shotPowerExponent: 1.65,

    // -------------------------------------------------------------------------
    // Rolling Resistance
    // -------------------------------------------------------------------------

    rollingDeceleration: 600,

    stopSpeedThreshold: 12,

    // -------------------------------------------------------------------------
    // Ball Rigid-Body Properties
    // -------------------------------------------------------------------------

    /*
     * Dynamic obstacle masses are configured
     * relative to this value.
     *
     * Triangle:  2.5
     * Rectangle: 6
     * Circle:    10
     */
    mass: 1,

    /*
     * A moderately lively Ball material.
     *
     * Effective restitution will later be combined
     * with the contacted obstacle's restitution.
     */
    obstacleRestitution: 0.72,

    /*
     * Low friction keeps glancing impacts readable
     * and avoids making the Ball stick to obstacle
     * surfaces.
     */
    obstacleFriction: 0.10,

    // -------------------------------------------------------------------------
    // Course Boundary Collision
    // -------------------------------------------------------------------------

    boundaryRestitution: 0.72,

    boundarySafetyMargin: 0.1,

    // -------------------------------------------------------------------------
    // Collision Integration
    // -------------------------------------------------------------------------

    /*
     * The current Ball radius is 10 pixels.
     *
     * Limiting one internal movement step to
     * 5 pixels means collision detection is run
     * after no more than half a Ball radius of
     * movement.
     */
    maximumMovementPerPhysicsStep: 5,

    maximumObstacleResolutionPasses: 3,

    /*
     * Correct most, but not necessarily all, of
     * the penetration during an impulse response.
     *
     * This is a common stabilization technique for
     * avoiding overly aggressive position changes.
     */
    dynamicPositionCorrectionPercent: 0.85,

    /*
     * Ignore extremely small overlaps that can
     * result from floating-point precision.
     */
    dynamicPositionCorrectionSlop: 0.01,

    /*
     * Defensive impulse cap.
     *
     * Under normal gameplay collisions, calculated
     * impulses should remain well below this value.
     */
    maximumCollisionImpulse: 2000,

    // -------------------------------------------------------------------------
    // Frame Safety
    // -------------------------------------------------------------------------

    maximumDeltaTime: 1 / 30,
};
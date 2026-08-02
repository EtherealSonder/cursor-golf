export type RigidBodyType =
    | "static"
    | "dynamic";

export interface RigidBodyDefinition {
    readonly bodyType: RigidBodyType;

    /**
     * Body mass in arbitrary gameplay mass units.
     *
     * Static bodies ignore this value and use an
     * inverse mass of zero.
     */
    readonly mass: number;

    /**
     * Fraction of linear velocity removed per
     * second through exponential damping.
     */
    readonly linearDamping: number;

    /**
     * Fraction of angular velocity removed per
     * second through exponential damping.
     */
    readonly angularDamping: number;

    /** Linear speed below which sleeping is allowed. */
    readonly sleepLinearSpeedThreshold: number;

    /** Angular speed below which sleeping is allowed. */
    readonly sleepAngularSpeedThreshold: number;

    /**
     * Continuous low-motion duration required
     * before the body enters its sleeping state.
     */
    readonly sleepDelay: number;

    readonly maximumLinearSpeed: number;

    /** Maximum absolute angular speed in radians per second. */
    readonly maximumAngularSpeed: number;
}

export const DEFAULT_DYNAMIC_RIGID_BODY_DEFINITION:
    RigidBodyDefinition = {

    bodyType: "dynamic",

    mass: 4,

    linearDamping: 1.8,
    angularDamping: 2.4,

    sleepLinearSpeedThreshold: 4,
    sleepAngularSpeedThreshold: 0.08,
    sleepDelay: 0.45,

    maximumLinearSpeed: 850,
    maximumAngularSpeed: 10,
};

export const DEFAULT_STATIC_RIGID_BODY_DEFINITION:
    RigidBodyDefinition = {

    bodyType: "static",

    mass: 1,

    linearDamping: 0,
    angularDamping: 0,

    sleepLinearSpeedThreshold: 0,
    sleepAngularSpeedThreshold: 0,
    sleepDelay: 0,

    maximumLinearSpeed: 0,
    maximumAngularSpeed: 0,
};

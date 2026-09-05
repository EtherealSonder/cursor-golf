import type {
    PhysicsMaterial,
} from "../physics/PhysicsMaterial";

import type {
    RigidBodyDefinition,
} from "./RigidBodyDefinition";

export interface FanDefinition {

    readonly bodyTextureKey: string;
    readonly rotorTextureKey: string;

    /** Final world-space presentation size. */
    readonly bodyRenderWidth: number;
    readonly bodyRenderHeight: number;

    readonly rotorRenderSize: number;
    readonly rotorOffsetX: number;
    readonly rotorOffsetY: number;

    /** Simple fair oriented-rectangle collider. */
    readonly colliderWidth: number;
    readonly colliderHeight: number;

    /**
     * Local offset from the Fan rigid-body pivot to the airflow origin.
     * Fan art is authored facing right, so positive X is the outlet side.
     */
    readonly windOutletOffset: number;

    /** Presentation-only rotor spin speed in radians per second. */
    readonly rotorRotationSpeed: number;

    readonly material: PhysicsMaterial;
    readonly rigidBody: RigidBodyDefinition;
}

export const DEFAULT_FAN_DEFINITION:
    FanDefinition = {

    bodyTextureKey: "fanBody",
    rotorTextureKey: "fanRotor",

    /*
     * The source artwork is 488 x 359. These values preserve that aspect
     * ratio while keeping the mechanism readable beside the 20 px Ball.
     */
    bodyRenderWidth: 84,
    bodyRenderHeight: 61.8,

    /*
     * The approved body's opening sits toward the right side. The rotor is
     * rendered behind the body so the transparent opening reveals it.
     */
    rotorRenderSize: 43,
    rotorOffsetX: 25.5,
    rotorOffsetY: 0,

    /*
     * The collider is deliberately simpler and slightly smaller than the
     * irregular painted silhouette.
     */
    colliderWidth: 68,
    colliderHeight: 46,

    windOutletOffset: 39,

    rotorRotationSpeed: 5.8,

    material: {
        restitution: 0.52,
        friction: 0.24,
    },

    rigidBody: {
        bodyType: "dynamic",
        mass: 6,

        linearDamping: 2.2,
        angularDamping: 3.0,

        sleepLinearSpeedThreshold: 3,
        sleepAngularSpeedThreshold: 0.06,
        sleepDelay: 0.50,

        maximumLinearSpeed: 520,
        maximumAngularSpeed: 7,
    },
};

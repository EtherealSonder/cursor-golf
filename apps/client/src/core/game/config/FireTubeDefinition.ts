import type {
    PhysicsMaterial,
} from "../physics/PhysicsMaterial";

import type {
    RigidBodyDefinition,
} from "./RigidBodyDefinition";

export interface FireTubeDefinition {

    readonly textureKey: string;

    /** Final world-space presentation size. */
    readonly renderWidth: number;
    readonly renderHeight: number;

    /** Simple fair oriented-rectangle collider. */
    readonly colliderWidth: number;
    readonly colliderHeight: number;

    /**
     * Local offset from the rigid-body pivot to the Fire outlet.
     * The artwork is authored facing right, so positive X is the nozzle side.
     */
    readonly fireOutletOffset: number;

    readonly minimumFiringDuration: number;
    readonly maximumFiringDuration: number;
    readonly minimumCooldownDuration: number;
    readonly maximumCooldownDuration: number;

    readonly material: PhysicsMaterial;
    readonly rigidBody: RigidBodyDefinition;
}

export const DEFAULT_FIRE_TUBE_DEFINITION:
    FireTubeDefinition = {

    textureKey: "fireTube",

    /*
     * Source artwork is 1396 x 965. 112 world px wide preserves the source
     * aspect ratio at approximately 77.4 world px high.
     */
    renderWidth: 112,
    renderHeight: 77.4,

    /*
     * The T-shaped artwork uses one deliberately simple collider so the
     * mechanism can reuse the existing DynamicCollidable pipeline.
     */
    colliderWidth: 92,
    colliderHeight: 66,

    /*
     * Approximate local pivot-to-nozzle distance for the approved artwork.
     * Tune only if the runtime Fire origin does not visually meet the outlet.
     */
    fireOutletOffset: 50,

    minimumFiringDuration: 2,
    maximumFiringDuration: 3,
    minimumCooldownDuration: 2,
    maximumCooldownDuration: 3,

    material: {
        restitution: 0.48,
        friction: 0.28,
    },

    rigidBody: {
        bodyType: "dynamic",
        mass: 8,

        linearDamping: 2.35,
        angularDamping: 3.15,

        sleepLinearSpeedThreshold: 3,
        sleepAngularSpeedThreshold: 0.06,
        sleepDelay: 0.50,

        maximumLinearSpeed: 480,
        maximumAngularSpeed: 6.5,
    },
};

import type { RigidBodyDefinition } from "./RigidBodyDefinition";
import type { PhysicsMaterial } from "../physics/PhysicsMaterial";

export interface SmallRockPhysicsDefinition {
    readonly referenceRadius: number;
    readonly referenceMass: number;
    readonly material: PhysicsMaterial;
    readonly linearDamping: number;
    readonly angularDamping: number;
    readonly sleepLinearSpeedThreshold: number;
    readonly sleepAngularSpeedThreshold: number;
    readonly sleepDelay: number;
    readonly roughSettleLinearSpeed: number;
    readonly roughSettleAngularSpeed: number;
    readonly maximumLinearSpeed: number;
    readonly maximumAngularSpeed: number;
}

/**
 * R-ROCK-2 physical material contract.
 *
 * Rocks deliberately trade smooth travel for a short, dull, rotational
 * "clunk": low restitution, high friction, strong damping and early settling.
 * Mass scales with projected area (radius squared), so larger small-rocks are
 * disproportionately harder to accelerate with Ball, Water and Wind impulses.
 */
export const DEFAULT_SMALL_ROCK_PHYSICS_DEFINITION:
    SmallRockPhysicsDefinition = {
        referenceRadius: 11,
        referenceMass: 2.85,

        material: {
            restitution: 0.12,
            friction: 0.82,
        },

        linearDamping: 4.8,
        angularDamping: 6.2,

        sleepLinearSpeedThreshold: 5.5,
        sleepAngularSpeedThreshold: 0.16,
        sleepDelay: 0.18,

        roughSettleLinearSpeed: 2.4,
        roughSettleAngularSpeed: 0.08,

        maximumLinearSpeed: 520,
        maximumAngularSpeed: 7.5,
    };

export function calculateSmallRockMass(
    radius: number,
    definition: SmallRockPhysicsDefinition =
        DEFAULT_SMALL_ROCK_PHYSICS_DEFINITION,
): number {
    const normalizedRadius =
        radius / definition.referenceRadius;

    return definition.referenceMass *
        normalizedRadius *
        normalizedRadius;
}

export function createSmallRockRigidBodyDefinition(
    radius: number,
    definition: SmallRockPhysicsDefinition =
        DEFAULT_SMALL_ROCK_PHYSICS_DEFINITION,
): RigidBodyDefinition {
    return {
        bodyType: "dynamic",
        mass: calculateSmallRockMass(radius, definition),
        linearDamping: definition.linearDamping,
        angularDamping: definition.angularDamping,
        sleepLinearSpeedThreshold:
            definition.sleepLinearSpeedThreshold,
        sleepAngularSpeedThreshold:
            definition.sleepAngularSpeedThreshold,
        sleepDelay: definition.sleepDelay,
        maximumLinearSpeed: definition.maximumLinearSpeed,
        maximumAngularSpeed: definition.maximumAngularSpeed,
    };
}

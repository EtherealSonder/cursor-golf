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
    readonly minimumLinearDampingMultiplier: number;
    readonly maximumLinearDampingMultiplier: number;
    readonly minimumAngularDampingMultiplier: number;
    readonly maximumAngularDampingMultiplier: number;
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

        linearDamping: 3.9,
        angularDamping: 5.5,

        sleepLinearSpeedThreshold: 5.5,
        sleepAngularSpeedThreshold: 0.16,
        sleepDelay: 0.18,

        roughSettleLinearSpeed: 2.4,
        roughSettleAngularSpeed: 0.08,

        maximumLinearSpeed: 520,
        maximumAngularSpeed: 7.5,
        minimumLinearDampingMultiplier: 0.85,
        maximumLinearDampingMultiplier: 1.30,
        minimumAngularDampingMultiplier: 0.90,
        maximumAngularDampingMultiplier: 1.20,
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
    // Pebbles lose momentum relatively quickly; medium rocks carry their
    // momentum farther, but their greater mass makes them harder to launch.
    const sizeRatio = Math.max(0, Math.min(1, (radius - 4) / 16));
    const linearMultiplier = definition.maximumLinearDampingMultiplier +
        (definition.minimumLinearDampingMultiplier - definition.maximumLinearDampingMultiplier) * sizeRatio;
    const angularMultiplier = definition.maximumAngularDampingMultiplier +
        (definition.minimumAngularDampingMultiplier - definition.maximumAngularDampingMultiplier) * sizeRatio;
    return {
        bodyType: "dynamic",
        mass: calculateSmallRockMass(radius, definition),
        linearDamping: definition.linearDamping * linearMultiplier,
        angularDamping: definition.angularDamping * angularMultiplier,
        sleepLinearSpeedThreshold:
            definition.sleepLinearSpeedThreshold,
        sleepAngularSpeedThreshold:
            definition.sleepAngularSpeedThreshold,
        sleepDelay: definition.sleepDelay,
        maximumLinearSpeed: definition.maximumLinearSpeed,
        maximumAngularSpeed: definition.maximumAngularSpeed,
    };
}

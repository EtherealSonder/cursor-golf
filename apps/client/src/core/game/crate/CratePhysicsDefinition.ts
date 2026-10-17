import type { DynamicRectangleObstacleDefinition } from "../config/ObstacleDefinition";

/** C2 physics tuning. Collider fits inside the artwork's exterior contour. */
export const CRATE_PHYSICS = {
    width: 62,
    height: 58,
    mass: 2.6,
    restitution: 0.18,
    friction: 0.58,
    linearDamping: 2.0,
    angularDamping: 2.8,
    maximumLinearSpeed: 750,
    maximumAngularSpeed: 9,
} as const;

export function createCrateCollisionDefinition(id: string, x: number, y: number): DynamicRectangleObstacleDefinition {
    return {
        id: `crate-${id}`,
        shape: "rectangle",
        positionX: x,
        positionY: y,
        rotationRadians: 0,
        width: CRATE_PHYSICS.width,
        height: CRATE_PHYSICS.height,
        fillColor: 0,
        outlineColor: 0,
        outlineWidth: 0,
        material: { restitution: CRATE_PHYSICS.restitution, friction: CRATE_PHYSICS.friction },
        rigidBody: {
            bodyType: "dynamic",
            mass: CRATE_PHYSICS.mass,
            linearDamping: CRATE_PHYSICS.linearDamping,
            angularDamping: CRATE_PHYSICS.angularDamping,
            sleepLinearSpeedThreshold: 3,
            sleepAngularSpeedThreshold: 0.07,
            sleepDelay: 0.4,
            maximumLinearSpeed: CRATE_PHYSICS.maximumLinearSpeed,
            maximumAngularSpeed: CRATE_PHYSICS.maximumAngularSpeed,
        },
    };
}


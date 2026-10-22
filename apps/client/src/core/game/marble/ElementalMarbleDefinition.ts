import type { DynamicCircleObstacleDefinition } from "../config/ObstacleDefinition";
export type ElementalMarbleKind = "fire" | "water";
export const ELEMENTAL_MARBLE_PHYSICS = {
    radius: 7.5, mass: 0.35, restitution: 0.90, friction: 0.12,
    linearDamping: 0.65, angularDamping: 1.2,
    maximumLinearSpeed: 950, maximumAngularSpeed: 16,
} as const;
/** M1: test diameter 15 world px; the authored 10 Figma units use the level coordinate transform. */
export function createElementalMarbleDefinition(id: string, x: number, y: number): DynamicCircleObstacleDefinition {
    const p = ELEMENTAL_MARBLE_PHYSICS;
    return {
        id: `elemental-marble-${id}`, shape: "circle", positionX: x, positionY: y,
        rotationRadians: 0, radius: p.radius, fillColor: 0, outlineColor: 0, outlineWidth: 0,
        material: { restitution: p.restitution, friction: p.friction, marbleBounce: true },
        rigidBody: {
            bodyType: "dynamic", mass: p.mass, linearDamping: p.linearDamping,
            angularDamping: p.angularDamping, sleepLinearSpeedThreshold: 3,
            sleepAngularSpeedThreshold: 0.08, sleepDelay: 0.4,
            maximumLinearSpeed: p.maximumLinearSpeed, maximumAngularSpeed: p.maximumAngularSpeed,
        },
    };
}

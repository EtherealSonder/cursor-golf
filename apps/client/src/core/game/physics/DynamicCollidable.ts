import type {
    DynamicObstacleDefinition,
} from "../config/ObstacleDefinition";

/**
 * Minimal contract required by Ball's existing dynamic collision solver.
 *
 * DynamicObstacle and interactive mechanisms such as Fan can satisfy this
 * interface without Ball depending on their concrete entity classes.
 */
export interface DynamicCollidable {

    getDefinition():
        DynamicObstacleDefinition;

    getX(): number;
    getY(): number;

    getRotationRadians(): number;

    getVelocityX(): number;
    getVelocityY(): number;
    getAngularVelocity(): number;

    getInverseMass(): number;
    getInverseMomentOfInertia(): number;

    applyImpulseAtWorldPoint(
        impulseX: number,
        impulseY: number,
        contactPointX: number,
        contactPointY: number,
    ): void;

    translate(
        deltaX: number,
        deltaY: number,
    ): void;
}

import type { DynamicObstacleDefinition } from "../config/ObstacleDefinition";

/**
 * Generic moving/interactive rigid collider contract.
 *
 * R-9 adds an optional impact-awareness hook. Physics remains authoritative:
 * callers report a contact after resolving it, while the receiver decides
 * whether the contact has any gameplay/AI meaning.
 */
export interface DynamicCollidable {
    getDefinition(): DynamicObstacleDefinition;
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
    translate(deltaX: number, deltaY: number): void;

    /** Optional non-physical awareness notification. */
    notifyExternalImpact?(impact: DynamicCollidableImpact): void;
}

export interface DynamicCollidableImpact {
    readonly sourceKind: "ball" | "water" | "fire" | "wind" | "other";
    readonly sourceId?: string;
    readonly positionX: number;
    readonly positionY: number;
}

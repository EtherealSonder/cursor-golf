import type { DynamicObstacleDefinition } from "../config/ObstacleDefinition";

/**
 * Generic moving/interactive rigid collider contract.
 *
 * R-9 adds an optional impact-awareness hook. Physics remains authoritative:
 * callers report a contact after resolving it, while the receiver decides
 * whether the contact has any gameplay/AI meaning.
 */
/** Local-space compound primitives. Each capsule includes its round end caps. */
export type DynamicCompoundPrimitive =
    | { readonly kind: "capsule"; readonly id: string; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly radius: number }
    | { readonly kind: "rectangle"; readonly id: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly rotationRadians?: number };

export interface DynamicCollidable {
    getDefinition(): DynamicObstacleDefinition;
    /** Optional fixed-center rotational constraint; absent for ordinary bodies. */
    isFixedPivot?(): boolean;
    /** Optional: replaces the ordinary single collider during narrow-phase detection. */
    getCompoundCollisionGeometry?(): readonly DynamicCompoundPrimitive[];
    /** C2: per-contact rotational freedom (housing contacts can be rotationally locked). */
    getContactInverseMomentOfInertia?(partId: string | undefined): number;
    /** C2: apply an impulse only if the contacted part permits angular motion. */
    applyContactImpulseAtWorldPoint?(impulseX: number, impulseY: number, contactPointX: number, contactPointY: number, partId: string | undefined): void;
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
    readonly closingNormalSpeed?: number;
    readonly effectiveMass?: number;
    readonly normalImpulseMagnitude?: number;
}

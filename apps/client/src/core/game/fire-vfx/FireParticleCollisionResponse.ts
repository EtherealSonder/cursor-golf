import type {
    FireParticleCollisionHit,
} from "./FireParticleCollisionField";

export interface FireParticleCollisionResponseDefinition {
    readonly contactInset: number;
    readonly edgeSlideStrength: number;
    readonly maximumEdgeTravel: number;
    readonly collisionVelocityRetention: number;
    readonly contactLifetimeSeconds: number;
}

export interface FireParticleCollisionResponseResult {
    readonly positionX: number;
    readonly positionY: number;
    readonly velocityX: number;
    readonly velocityY: number;
    readonly edgeTravel: number;
}

/**
 * Presentation-only Fire contact response.
 *
 * Forward velocity into the obstacle is removed. A bounded tangential
 * component is retained so the visible flame can curl slightly around an
 * obstacle edge instead of either penetrating it or forming a perfectly flat
 * cut. No gameplay Fire, heat or object reaction is created here.
 */
export function resolveFireParticleCollisionResponse(
    hit: FireParticleCollisionHit,
    velocityX: number,
    velocityY: number,
    definition: FireParticleCollisionResponseDefinition,
    accumulatedEdgeTravel: number,
): FireParticleCollisionResponseResult {
    const normalLength =
        Math.max(
            0.0001,
            Math.hypot(
                hit.normalX,
                hit.normalY,
            ),
        );

    const normalX =
        hit.normalX /
        normalLength;

    const normalY =
        hit.normalY /
        normalLength;

    const tangentX =
        -normalY;

    const tangentY =
        normalX;

    const tangentVelocity =
        velocityX * tangentX +
        velocityY * tangentY;

    const retainedTangentVelocity =
        tangentVelocity *
        Math.max(
            0,
            definition.edgeSlideStrength,
        ) *
        Math.max(
            0,
            definition.collisionVelocityRetention,
        );

    const remainingEdgeTravel =
        Math.max(
            0,
            definition.maximumEdgeTravel -
            accumulatedEdgeTravel,
        );

    const boundedTangentVelocity =
        Math.sign(
            retainedTangentVelocity,
        ) *
        Math.min(
            Math.abs(
                retainedTangentVelocity,
            ),
            remainingEdgeTravel /
            Math.max(
                0.001,
                definition.contactLifetimeSeconds,
            ),
        );

    return {
        positionX:
            hit.positionX +
            normalX *
            Math.max(
                0,
                definition.contactInset,
            ),
        positionY:
            hit.positionY +
            normalY *
            Math.max(
                0,
                definition.contactInset,
            ),
        velocityX:
            tangentX *
            boundedTangentVelocity,
        velocityY:
            tangentY *
            boundedTangentVelocity,
        edgeTravel:
            accumulatedEdgeTravel,
    };
}

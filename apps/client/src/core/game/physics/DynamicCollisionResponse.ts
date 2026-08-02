import type {
    DynamicCollisionManifold,
} from "./DynamicCollisionManifold";

import {
    crossVectorVector,
    dot,
    magnitude,
    normalize,
    PHYSICS_EPSILON,
} from "./RigidBodyMath";

export interface DynamicCollisionBody {
    readonly positionX: number;
    readonly positionY: number;

    readonly velocityX: number;
    readonly velocityY: number;

    readonly angularVelocity: number;

    readonly inverseMass: number;
    readonly inverseMomentOfInertia: number;

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

export interface DynamicCollisionResolutionResult {
    readonly resolved: boolean;
    readonly normalImpulseMagnitude: number;
    readonly frictionImpulseMagnitude: number;
}

export function resolveDynamicCollision(
    firstBody: DynamicCollisionBody,
    secondBody: DynamicCollisionBody,
    manifold: DynamicCollisionManifold,
    positionalCorrectionPercent = 0.85,
    positionalCorrectionSlop = 0.01,
): DynamicCollisionResolutionResult {

    const normal =
        normalize(
            manifold.normalX,
            manifold.normalY,
        );

    correctPenetration(
        firstBody,
        secondBody,
        normal.x,
        normal.y,
        manifold.penetrationDepth,
        positionalCorrectionPercent,
        positionalCorrectionSlop,
    );

    const firstContactOffsetX =
        manifold.contactPointX -
        firstBody.positionX;

    const firstContactOffsetY =
        manifold.contactPointY -
        firstBody.positionY;

    const secondContactOffsetX =
        manifold.contactPointX -
        secondBody.positionX;

    const secondContactOffsetY =
        manifold.contactPointY -
        secondBody.positionY;

    const firstContactVelocityX =
        firstBody.velocityX -
        firstBody.angularVelocity *
        firstContactOffsetY;

    const firstContactVelocityY =
        firstBody.velocityY +
        firstBody.angularVelocity *
        firstContactOffsetX;

    const secondContactVelocityX =
        secondBody.velocityX -
        secondBody.angularVelocity *
        secondContactOffsetY;

    const secondContactVelocityY =
        secondBody.velocityY +
        secondBody.angularVelocity *
        secondContactOffsetX;

    const relativeVelocityX =
        firstContactVelocityX -
        secondContactVelocityX;

    const relativeVelocityY =
        firstContactVelocityY -
        secondContactVelocityY;

    const normalVelocity =
        dot(
            relativeVelocityX,
            relativeVelocityY,
            normal.x,
            normal.y,
        );

    /*
     * The manifold normal points from the second
     * body toward the first. A positive value
     * therefore means the bodies are already
     * separating.
     */
    if (normalVelocity >= 0) {
        return {
            resolved: true,
            normalImpulseMagnitude: 0,
            frictionImpulseMagnitude: 0,
        };
    }

    const firstNormalCross =
        crossVectorVector(
            firstContactOffsetX,
            firstContactOffsetY,
            normal.x,
            normal.y,
        );

    const secondNormalCross =
        crossVectorVector(
            secondContactOffsetX,
            secondContactOffsetY,
            normal.x,
            normal.y,
        );

    const normalDenominator =
        firstBody.inverseMass +
        secondBody.inverseMass +
        firstNormalCross *
        firstNormalCross *
        firstBody.inverseMomentOfInertia +
        secondNormalCross *
        secondNormalCross *
        secondBody.inverseMomentOfInertia;

    if (
        normalDenominator <=
        PHYSICS_EPSILON
    ) {
        return {
            resolved: false,
            normalImpulseMagnitude: 0,
            frictionImpulseMagnitude: 0,
        };
    }

    const normalImpulseMagnitude =
        -(
            1 +
            manifold.restitution
        ) *
        normalVelocity /
        normalDenominator;

    const normalImpulseX =
        normal.x *
        normalImpulseMagnitude;

    const normalImpulseY =
        normal.y *
        normalImpulseMagnitude;

    firstBody.applyImpulseAtWorldPoint(
        normalImpulseX,
        normalImpulseY,
        manifold.contactPointX,
        manifold.contactPointY,
    );

    secondBody.applyImpulseAtWorldPoint(
        -normalImpulseX,
        -normalImpulseY,
        manifold.contactPointX,
        manifold.contactPointY,
    );

    const tangentVelocityX =
        relativeVelocityX -
        normalVelocity *
        normal.x;

    const tangentVelocityY =
        relativeVelocityY -
        normalVelocity *
        normal.y;

    const tangentSpeed =
        magnitude(
            tangentVelocityX,
            tangentVelocityY,
        );

    if (
        tangentSpeed <=
        PHYSICS_EPSILON
    ) {
        return {
            resolved: true,
            normalImpulseMagnitude,
            frictionImpulseMagnitude: 0,
        };
    }

    const tangentX =
        tangentVelocityX /
        tangentSpeed;

    const tangentY =
        tangentVelocityY /
        tangentSpeed;

    const firstTangentCross =
        crossVectorVector(
            firstContactOffsetX,
            firstContactOffsetY,
            tangentX,
            tangentY,
        );

    const secondTangentCross =
        crossVectorVector(
            secondContactOffsetX,
            secondContactOffsetY,
            tangentX,
            tangentY,
        );

    const tangentDenominator =
        firstBody.inverseMass +
        secondBody.inverseMass +
        firstTangentCross *
        firstTangentCross *
        firstBody.inverseMomentOfInertia +
        secondTangentCross *
        secondTangentCross *
        secondBody.inverseMomentOfInertia;

    if (
        tangentDenominator <=
        PHYSICS_EPSILON
    ) {
        return {
            resolved: true,
            normalImpulseMagnitude,
            frictionImpulseMagnitude: 0,
        };
    }

    const unconstrainedFrictionImpulse =
        -dot(
            relativeVelocityX,
            relativeVelocityY,
            tangentX,
            tangentY,
        ) /
        tangentDenominator;

    const maximumFrictionImpulse =
        Math.abs(
            normalImpulseMagnitude,
        ) *
        manifold.friction;

    const frictionImpulseMagnitude =
        Math.max(
            -maximumFrictionImpulse,
            Math.min(
                unconstrainedFrictionImpulse,
                maximumFrictionImpulse,
            ),
        );

    const frictionImpulseX =
        tangentX *
        frictionImpulseMagnitude;

    const frictionImpulseY =
        tangentY *
        frictionImpulseMagnitude;

    firstBody.applyImpulseAtWorldPoint(
        frictionImpulseX,
        frictionImpulseY,
        manifold.contactPointX,
        manifold.contactPointY,
    );

    secondBody.applyImpulseAtWorldPoint(
        -frictionImpulseX,
        -frictionImpulseY,
        manifold.contactPointX,
        manifold.contactPointY,
    );

    return {
        resolved: true,
        normalImpulseMagnitude,
        frictionImpulseMagnitude,
    };
}

function correctPenetration(
    firstBody: DynamicCollisionBody,
    secondBody: DynamicCollisionBody,
    normalX: number,
    normalY: number,
    penetrationDepth: number,
    correctionPercent: number,
    correctionSlop: number,
): void {

    const totalInverseMass =
        firstBody.inverseMass +
        secondBody.inverseMass;

    if (
        totalInverseMass <=
        PHYSICS_EPSILON
    ) {
        return;
    }

    const correctionMagnitude =
        Math.max(
            penetrationDepth -
            correctionSlop,
            0,
        ) /
        totalInverseMass *
        Math.max(
            0,
            Math.min(
                correctionPercent,
                1,
            ),
        );

    const correctionX =
        normalX *
        correctionMagnitude;

    const correctionY =
        normalY *
        correctionMagnitude;

    firstBody.translate(
        correctionX *
        firstBody.inverseMass,
        correctionY *
        firstBody.inverseMass,
    );

    secondBody.translate(
        -correctionX *
        secondBody.inverseMass,
        -correctionY *
        secondBody.inverseMass,
    );
}

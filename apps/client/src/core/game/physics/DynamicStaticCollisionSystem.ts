import type {
    DynamicCollidable,
} from "./DynamicCollidable";

import {
    detectDynamicCollidableAgainstFixedCollision,
} from "./DynamicCollidableCollision";

import type {
    FixedCollisionShape,
} from "./DynamicCollidableCollision";

import type {
    PhysicsWorld,
} from "./PhysicsWorld";

import type {
    DynamicCollisionBody,
} from "./DynamicCollisionResponse";

import {
    resolveDynamicCollision,
} from "./DynamicCollisionResponse";

export interface DynamicStaticCollisionSystemDefinition {
    readonly maximumResolutionPasses: number;
    readonly positionalCorrectionPercent: number;
    readonly positionalCorrectionSlop: number;
}

export const DEFAULT_DYNAMIC_STATIC_COLLISION_SYSTEM_DEFINITION:
    DynamicStaticCollisionSystemDefinition = {

    maximumResolutionPasses: 3,
    positionalCorrectionPercent: 0.85,
    positionalCorrectionSlop: 0.01,
};

/**
 * Resolves movable DynamicCollidable bodies against fixed world geometry.
 *
 * Static obstacle definitions and extra fixed shapes such as the Hydrant are
 * converted into one common collider contract. The impulse solver receives a
 * zero-inverse-mass body for the fixed side, so only the movable object is
 * translated or accelerated.
 */
export class DynamicStaticCollisionSystem {

    private readonly definition:
        DynamicStaticCollisionSystemDefinition;

    public constructor(
        definition:
            DynamicStaticCollisionSystemDefinition =
            DEFAULT_DYNAMIC_STATIC_COLLISION_SYSTEM_DEFINITION,
    ) {
        this.validateDefinition(
            definition,
        );

        this.definition =
            definition;
    }

    public resolve(
        physicsWorld:
            PhysicsWorld,
    ): number {

        const collidables =
            physicsWorld
                .getRigidDynamicCollidables();

        const staticObstacles =
            physicsWorld
                .getRigidStaticDefinitions();

        const fixedShapes:
            FixedCollisionShape[] = [
                ...physicsWorld
                    .getRigidFixedShapes(),
            ];

        if (
            collidables.length === 0 ||
            (
                staticObstacles.length === 0 &&
                fixedShapes.length === 0
            )
        ) {
            return 0;
        }

        for (
            const obstacle
            of staticObstacles
        ) {
            const converted =
                this.convertStaticObstacle(
                    obstacle,
                );

            if (converted) {
                fixedShapes.push(
                    converted,
                );
            }
        }

        let resolvedCollisionCount =
            0;

        for (
            let passIndex = 0;
            passIndex <
            this.definition
                .maximumResolutionPasses;
            passIndex += 1
        ) {
            let overlapFound =
                false;

            for (
                const collidable
                of collidables
            ) {
                for (
                    const fixedShape
                    of fixedShapes
                ) {
                    const manifold =
                        detectDynamicCollidableAgainstFixedCollision(
                            collidable,
                            fixedShape,
                        );

                    if (!manifold) {
                        continue;
                    }

                    overlapFound =
                        true;

                    const result =
                        resolveDynamicCollision(
                            this.createDynamicBody(
                                collidable,
                            ),
                            this.createFixedBody(
                                fixedShape,
                            ),
                            manifold,
                            this.definition
                                .positionalCorrectionPercent,
                            this.definition
                                .positionalCorrectionSlop,
                        );

                    if (result.resolved) {
                        resolvedCollisionCount +=
                            1;
                    }
                }
            }

            if (!overlapFound) {
                break;
            }
        }

        return resolvedCollisionCount;
    }

    private convertStaticObstacle(
        obstacle:
            StaticObstacleDefinition,
    ): FixedCollisionShape | null {

        if (
            obstacle.shape ===
            "rectangle"
        ) {
            return {
                id:
                    obstacle.id,
                shape:
                    "rectangle",
                positionX:
                    obstacle.positionX,
                positionY:
                    obstacle.positionY,
                rotationRadians:
                    0,
                width:
                    obstacle.width,
                height:
                    obstacle.height,
                material: {
                    restitution:
                        obstacle.material
                            .restitution,
                    friction:
                        obstacle.material
                            .collisionFriction,
                },
            };
        }

        if (
            obstacle.shape ===
            "circle"
        ) {
            return {
                id:
                    obstacle.id,
                shape:
                    "circle",
                positionX:
                    obstacle.positionX,
                positionY:
                    obstacle.positionY,
                radius:
                    obstacle.radius,
                material: {
                    restitution:
                        obstacle.material
                            .restitution,
                    friction:
                        obstacle.material
                            .collisionFriction,
                },
            };
        }

        /*
         * Current procedural gameplay obstacles are rectangles. Static
         * triangle support remains in Ball's older collision path and can be
         * moved into the common shape dispatcher when a new sandbox object
         * actually needs it.
         */
        return null;
    }

    private createDynamicBody(
        collidable:
            DynamicCollidable,
    ): DynamicCollisionBody {

        return {
            positionX:
                collidable.getX(),
            positionY:
                collidable.getY(),
            velocityX:
                collidable
                    .getVelocityX(),
            velocityY:
                collidable
                    .getVelocityY(),
            angularVelocity:
                collidable
                    .getAngularVelocity(),
            inverseMass:
                collidable
                    .getInverseMass(),
            inverseMomentOfInertia:
                collidable
                    .getInverseMomentOfInertia(),
            applyImpulseAtWorldPoint:
                (
                    impulseX:
                        number,
                    impulseY:
                        number,
                    contactPointX:
                        number,
                    contactPointY:
                        number,
                ): void => {
                    collidable
                        .applyImpulseAtWorldPoint(
                            impulseX,
                            impulseY,
                            contactPointX,
                            contactPointY,
                        );
                },
            translate:
                (
                    deltaX:
                        number,
                    deltaY:
                        number,
                ): void => {
                    collidable.translate(
                        deltaX,
                        deltaY,
                    );
                },
        };
    }

    private createFixedBody(
        shape:
            FixedCollisionShape,
    ): DynamicCollisionBody {

        return {
            positionX:
                shape.positionX,
            positionY:
                shape.positionY,
            velocityX:
                0,
            velocityY:
                0,
            angularVelocity:
                0,
            inverseMass:
                0,
            inverseMomentOfInertia:
                0,
            applyImpulseAtWorldPoint:
                (): void => {
                    // Fixed bodies intentionally ignore impulses.
                },
            translate:
                (): void => {
                    // Fixed bodies intentionally ignore positional correction.
                },
        };
    }

    private validateDefinition(
        definition:
            DynamicStaticCollisionSystemDefinition,
    ): void {

        if (
            !Number.isInteger(
                definition
                    .maximumResolutionPasses,
            ) ||
            definition
                .maximumResolutionPasses <=
            0
        ) {
            throw new Error(
                "DynamicStaticCollisionSystem maximumResolutionPasses must be a positive integer.",
            );
        }

        if (
            !Number.isFinite(
                definition
                    .positionalCorrectionPercent,
            ) ||
            definition
                .positionalCorrectionPercent <
            0 ||
            definition
                .positionalCorrectionPercent >
            1
        ) {
            throw new Error(
                "DynamicStaticCollisionSystem positionalCorrectionPercent must be between 0 and 1.",
            );
        }

        if (
            !Number.isFinite(
                definition
                    .positionalCorrectionSlop,
            ) ||
            definition
                .positionalCorrectionSlop <
            0
        ) {
            throw new Error(
                "DynamicStaticCollisionSystem positionalCorrectionSlop must be non-negative.",
            );
        }
    }
}

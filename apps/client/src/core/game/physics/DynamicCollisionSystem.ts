import type {
    DynamicCollidable,
} from "./DynamicCollidable";

import {
    detectDynamicCollidableCollision,
} from "./DynamicCollidableCollision";

import type {
    DynamicCollisionBody,
} from "./DynamicCollisionResponse";

import {
    resolveDynamicCollision,
} from "./DynamicCollisionResponse";

export interface DynamicCollisionSystemDefinition {
    readonly maximumResolutionPasses:
    number;

    readonly positionalCorrectionPercent:
    number;

    readonly positionalCorrectionSlop:
    number;
}

export const DEFAULT_DYNAMIC_COLLISION_SYSTEM_DEFINITION:
    DynamicCollisionSystemDefinition = {

    maximumResolutionPasses:
        3,

    positionalCorrectionPercent:
        0.85,

    positionalCorrectionSlop:
        0.01,
};

/**
 * Pairwise mechanism collision orchestration.
 *
 * World supplies only Fan and FireTube collidables during Phase G. Ball
 * collisions keep using Ball's existing dynamic-collision path.
 *
 * With the planned 5 Fan + 5 FireTube stress test this is at most 45 unique
 * candidate pairs per pass, so a spatial broad phase is intentionally avoided.
 */
export class DynamicCollisionSystem {

    private readonly definition:
        DynamicCollisionSystemDefinition;

    constructor(
        definition:
            DynamicCollisionSystemDefinition =
            DEFAULT_DYNAMIC_COLLISION_SYSTEM_DEFINITION,
    ) {
        this.validateDefinition(
            definition,
        );

        this.definition =
            definition;
    }

    public resolve(
        collidables:
            readonly DynamicCollidable[],
    ): number {

        if (
            collidables.length <
            2
        ) {
            return 0;
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
                let firstIndex = 0;
                firstIndex <
                collidables.length - 1;
                firstIndex += 1
            ) {
                const first =
                    collidables[
                    firstIndex
                    ];

                for (
                    let secondIndex =
                        firstIndex + 1;
                    secondIndex <
                    collidables.length;
                    secondIndex += 1
                ) {
                    const second =
                        collidables[
                        secondIndex
                        ];

                    const manifold =
                        detectDynamicCollidableCollision(
                            first,
                            second,
                        );

                    if (!manifold) {
                        continue;
                    }

                    overlapFound =
                        true;

                    const result =
                        resolveDynamicCollision(
                            this.createCollisionBody(
                                first,
                            ),

                            this.createCollisionBody(
                                second,
                            ),

                            manifold,

                            this.definition
                                .positionalCorrectionPercent,

                            this.definition
                                .positionalCorrectionSlop,
                        );

                    if (
                        result.resolved
                    ) {
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

    private createCollisionBody(
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

    private validateDefinition(
        definition:
            DynamicCollisionSystemDefinition,
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
                "DynamicCollisionSystem maximumResolutionPasses must be a positive integer.",
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
                "DynamicCollisionSystem positionalCorrectionPercent must be between 0 and 1.",
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
                "DynamicCollisionSystem positionalCorrectionSlop must be a finite non-negative value.",
            );
        }
    }
}

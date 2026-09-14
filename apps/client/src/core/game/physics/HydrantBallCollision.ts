import type { Ball } from "../entities/Ball";
import type { HydrantHoseDefinition } from "../config/HydrantHoseDefinition";

export interface HydrantBallCollisionResult {
    readonly collided: boolean;
    readonly enteredContact: boolean;
    readonly impactNormalSpeed: number;
    readonly normalX: number;
    readonly normalY: number;
}

/**
 * Solid Ball-vs-Hydrant response.
 *
 * The Hydrant is treated as a fixed, infinite-mass circular obstacle.
 * Damage logic consumes only the incoming velocity component along the
 * collision normal, so fast glancing contacts do not count as hard direct hits.
 */
export class HydrantBallCollision {
    private contactActive =
        false;

    public constructor(
        private readonly definition:
            HydrantHoseDefinition,
    ) {}

    public resolve(
        ball:
            Ball,

        hydrantX:
            number,

        hydrantY:
            number,
    ): HydrantBallCollisionResult {
        const deltaX =
            ball.getX() -
            hydrantX;

        const deltaY =
            ball.getY() -
            hydrantY;

        const combinedRadius =
            this.definition
                .hydrantCollisionRadius +
            ball.getRadius();

        const distanceSquared =
            deltaX * deltaX +
            deltaY * deltaY;

        if (
            distanceSquared >
            combinedRadius *
                combinedRadius
        ) {
            /*
             * A tiny release margin prevents contact-state chatter when the
             * Ball rests exactly on the corrected collider boundary.
             */
            const releaseRadius =
                combinedRadius +
                this.definition
                    .hydrantCollisionPositionSlop +
                0.25;

            if (
                distanceSquared >
                releaseRadius *
                    releaseRadius
            ) {
                this.contactActive =
                    false;
            }

            return {
                collided: false,
                enteredContact: false,
                impactNormalSpeed: 0,
                normalX: 0,
                normalY: 0,
            };
        }

        const enteredContact =
            !this.contactActive;

        this.contactActive =
            true;

        const distance =
            Math.sqrt(
                Math.max(
                    distanceSquared,
                    0,
                ),
            );

        let normalX:
            number;

        let normalY:
            number;

        if (
            distance >
            1e-8
        ) {
            normalX =
                deltaX /
                distance;

            normalY =
                deltaY /
                distance;
        } else {
            /*
             * Degenerate centre overlap: push opposite to the incoming Ball
             * velocity. Fall back to +X if the Ball is also stationary.
             */
            const velocityX =
                ball.getVelocityX();

            const velocityY =
                ball.getVelocityY();

            const speed =
                Math.hypot(
                    velocityX,
                    velocityY,
                );

            if (
                speed >
                1e-8
            ) {
                normalX =
                    -velocityX /
                    speed;

                normalY =
                    -velocityY /
                    speed;
            } else {
                normalX = 1;
                normalY = 0;
            }
        }

        const velocityX =
            ball.getVelocityX();

        const velocityY =
            ball.getVelocityY();

        const normalVelocity =
            velocityX *
                normalX +
            velocityY *
                normalY;

        /*
         * Normal points from Hydrant -> Ball. A negative normal velocity means
         * the Ball is moving into the Hydrant.
         */
        const impactNormalSpeed =
            Math.max(
                0,
                -normalVelocity,
            );

        const penetration =
            Math.max(
                0,
                combinedRadius -
                    distance,
            );

        if (
            penetration >
            0
        ) {
            const correction =
                penetration +
                this.definition
                    .hydrantCollisionPositionSlop;

            ball.translate(
                normalX *
                    correction,
                normalY *
                    correction,
            );
        }

        if (
            impactNormalSpeed >
            this.definition
                .hydrantCollisionRestingNormalSpeed
        ) {
            const inverseMass =
                ball.getInverseMass();

            if (
                inverseMass >
                0
            ) {
                const normalImpulseMagnitude =
                    (
                        1 +
                        this.definition
                            .hydrantCollisionRestitution
                    ) *
                    impactNormalSpeed /
                    inverseMass;

                let impulseX =
                    normalX *
                    normalImpulseMagnitude;

                let impulseY =
                    normalY *
                    normalImpulseMagnitude;

                const tangentVelocityX =
                    velocityX -
                    normalVelocity *
                        normalX;

                const tangentVelocityY =
                    velocityY -
                    normalVelocity *
                        normalY;

                const tangentSpeed =
                    Math.hypot(
                        tangentVelocityX,
                        tangentVelocityY,
                    );

                if (
                    tangentSpeed >
                    1e-8
                ) {
                    const tangentX =
                        tangentVelocityX /
                        tangentSpeed;

                    const tangentY =
                        tangentVelocityY /
                        tangentSpeed;

                    const desiredFrictionImpulse =
                        -tangentSpeed /
                        inverseMass;

                    const maximumFrictionImpulse =
                        normalImpulseMagnitude *
                        this.definition
                            .hydrantCollisionFriction;

                    const frictionImpulse =
                        Math.max(
                            -maximumFrictionImpulse,
                            Math.min(
                                maximumFrictionImpulse,
                                desiredFrictionImpulse,
                            ),
                        );

                    impulseX +=
                        tangentX *
                        frictionImpulse;

                    impulseY +=
                        tangentY *
                        frictionImpulse;
                }

                ball.applyImpulseAtWorldPoint(
                    impulseX,
                    impulseY,
                    ball.getX(),
                    ball.getY(),
                );
            }
        }

        return {
            collided: true,
            enteredContact,
            impactNormalSpeed,
            normalX,
            normalY,
        };
    }

    public reset():
        void {
        this.contactActive =
            false;
    }
}

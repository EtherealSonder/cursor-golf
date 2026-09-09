import type { Ball } from "../../entities/Ball";
import type { HydrantHoseDefinition } from "../../config/HydrantHoseDefinition";
import type { HoseRope } from "./HoseRope";
import type { HoseRopePoint } from "./HoseRopePoint";

export interface HoseCapsuleContact {
    readonly segmentIndex: number;
    readonly interpolation: number;
    readonly closestX: number;
    readonly closestY: number;
    readonly normalX: number;
    readonly normalY: number;
    readonly penetration: number;
    readonly hoseRadius: number;
}

export class HoseBallCollision {
    constructor(
        private readonly rope: HoseRope,
        private readonly definition: HydrantHoseDefinition,
    ) { }

    public resolve(
        ball: Ball,
    ): boolean {
        if (
            !ball.isAvailableForInteraction()
        ) {
            return false;
        }

        let resolvedAny =
            false;

        /*
         * Resolve only the deepest contact per pass.
         *
         * Adjacent Hose capsules overlap around their shared endpoints. If
         * every overlap is resolved immediately, neighbouring segments can
         * push the Ball in competing directions and trap it. A small bounded
         * number of deepest-contact passes gives the Ball one coherent escape
         * direction at a time.
         */
        for (
            let pass = 0;
            pass <
            this.definition
                .collisionIterations;
            pass += 1
        ) {
            const contact =
                this.getDeepestContactForCircle(
                    ball.getX(),
                    ball.getY(),
                    ball.getRadius(),
                );

            if (
                !contact
            ) {
                break;
            }

            this.resolveContact(
                ball,
                contact,
            );

            this.rope
                .resolveConstraintsImmediately();

            resolvedAny =
                true;
        }

        return resolvedAny;
    }

    /**
     * Geometry-only capsule query used by runtime collision and validation.
     *
     * Each adjacent pair of rope points forms one continuous Hose capsule.
     */
    public getDeepestContactForCircle(
        circleX: number,
        circleY: number,
        circleRadius: number,
    ): HoseCapsuleContact | null {
        const points =
            this.rope.getPoints();

        let deepestContact:
            HoseCapsuleContact | null =
            null;

        for (
            let segmentIndex = 0;
            segmentIndex <
            points.length - 1;
            segmentIndex += 1
        ) {
            const a =
                points[segmentIndex]!;

            const b =
                points[
                segmentIndex + 1
                ]!;

            const segmentX =
                b.x - a.x;

            const segmentY =
                b.y - a.y;

            const segmentLengthSquared =
                segmentX *
                segmentX +
                segmentY *
                segmentY;

            let interpolation = 0;

            if (
                segmentLengthSquared >
                0.000001
            ) {
                interpolation =
                    (
                        (
                            circleX -
                            a.x
                        ) *
                        segmentX +
                        (
                            circleY -
                            a.y
                        ) *
                        segmentY
                    ) /
                    segmentLengthSquared;

                interpolation =
                    Math.max(
                        0,
                        Math.min(
                            interpolation,
                            1,
                        ),
                    );
            }

            const closestX =
                a.x +
                segmentX *
                interpolation;

            const closestY =
                a.y +
                segmentY *
                interpolation;

            let dx =
                circleX -
                closestX;

            let dy =
                circleY -
                closestY;

            let distance =
                Math.hypot(
                    dx,
                    dy,
                );

            /*
             * The nozzle is slightly wider than the Hose body. Blend toward
             * nozzleRadius along the final segment so collision remains
             * continuous rather than suddenly changing at point 24.
             */
            const isFinalSegment =
                segmentIndex ===
                points.length - 2;

            const hoseRadius =
                isFinalSegment
                    ? (
                        this.definition
                            .pointRadius +
                        (
                            this.definition
                                .nozzleRadius -
                            this.definition
                                .pointRadius
                        ) *
                        interpolation
                    )
                    : this.definition
                        .pointRadius;

            const combinedRadius =
                circleRadius +
                hoseRadius;

            if (
                distance >=
                combinedRadius
            ) {
                continue;
            }

            if (
                distance <=
                0.000001
            ) {
                /*
                 * If the Ball centre lies exactly on the segment centreline,
                 * use a stable perpendicular normal instead of an arbitrary
                 * world axis.
                 */
                const segmentLength =
                    Math.hypot(
                        segmentX,
                        segmentY,
                    );

                if (
                    segmentLength >
                    0.000001
                ) {
                    dx =
                        -segmentY /
                        segmentLength;

                    dy =
                        segmentX /
                        segmentLength;
                } else {
                    dx = 1;
                    dy = 0;
                }

                distance = 1;
            }

            const penetration =
                combinedRadius -
                Math.hypot(
                    circleX -
                    closestX,
                    circleY -
                    closestY,
                );

            const normalLength =
                Math.hypot(
                    dx,
                    dy,
                );

            const contact:
                HoseCapsuleContact = {
                segmentIndex,
                interpolation,
                closestX,
                closestY,
                normalX:
                    dx /
                    normalLength,
                normalY:
                    dy /
                    normalLength,
                penetration,
                hoseRadius,
            };

            if (
                !deepestContact ||
                contact.penetration >
                deepestContact
                    .penetration
            ) {
                deepestContact =
                    contact;
            }
        }

        return deepestContact;
    }

    private resolveContact(
        ball: Ball,
        contact: HoseCapsuleContact,
    ): void {
        const points =
            this.rope.getPoints();

        const a =
            points[
            contact.segmentIndex
            ]!;

        const b =
            points[
            contact.segmentIndex + 1
            ]!;

        const weightA =
            1 -
            contact.interpolation;

        const weightB =
            contact.interpolation;

        /*
         * Effective inverse mass of the contacted point on the segment.
         * Squared interpolation weights are the standard impulse weighting
         * for a point distributed between two particles.
         */
        const segmentInverseMass =
            a.inverseMass *
            weightA *
            weightA +
            b.inverseMass *
            weightB *
            weightB;

        const ballInverseMass =
            ball.getInverseMass();

        const totalInverseMass =
            ballInverseMass +
            segmentInverseMass;

        if (
            totalInverseMass <=
            0
        ) {
            return;
        }

        // -------------------------------------------------------------
        // Positional separation
        // -------------------------------------------------------------

        const correctionDepth =
            Math.max(
                0,
                contact.penetration -
                this.definition
                    .collisionPositionSlop,
            );

        if (
            correctionDepth >
            0
        ) {
            const ballShare =
                ballInverseMass /
                totalInverseMass;

            ball.translate(
                contact.normalX *
                correctionDepth *
                ballShare,
                contact.normalY *
                correctionDepth *
                ballShare,
            );

            if (
                !a.isFixed()
            ) {
                const share =
                    (
                        a.inverseMass *
                        weightA
                    ) /
                    totalInverseMass;

                a.x -=
                    contact.normalX *
                    correctionDepth *
                    share;

                a.y -=
                    contact.normalY *
                    correctionDepth *
                    share;
            }

            if (
                !b.isFixed()
            ) {
                const share =
                    (
                        b.inverseMass *
                        weightB
                    ) /
                    totalInverseMass;

                b.x -=
                    contact.normalX *
                    correctionDepth *
                    share;

                b.y -=
                    contact.normalY *
                    correctionDepth *
                    share;
            }
        }

        // -------------------------------------------------------------
        // Relative velocity at the contacted point
        // -------------------------------------------------------------

        const velocityA =
            a.getVelocity(
                this.definition
                    .fixedTimeStep,
            );

        const velocityB =
            b.getVelocity(
                this.definition
                    .fixedTimeStep,
            );

        const hoseVelocityX =
            velocityA.x *
            weightA +
            velocityB.x *
            weightB;

        const hoseVelocityY =
            velocityA.y *
            weightA +
            velocityB.y *
            weightB;

        const relativeVelocityX =
            ball.getVelocityX() -
            hoseVelocityX;

        const relativeVelocityY =
            ball.getVelocityY() -
            hoseVelocityY;

        const normalVelocity =
            relativeVelocityX *
            contact.normalX +
            relativeVelocityY *
            contact.normalY;

        /*
         * A positive normal velocity means the Ball is already separating.
         * Very small approaching velocities are treated as resting contact.
         * In both cases positional separation is enough and no new impulse is
         * generated, preventing persistent micro-motion.
         */
        if (
            normalVelocity >=
            -this.definition
                .collisionRestingNormalSpeed
        ) {
            return;
        }

        // -------------------------------------------------------------
        // Normal impulse
        // -------------------------------------------------------------

        const impulseMagnitude =
            -(
                1 +
                this.definition
                    .collisionRestitution
            ) *
            normalVelocity /
            totalInverseMass;

        const impulseX =
            contact.normalX *
            impulseMagnitude;

        const impulseY =
            contact.normalY *
            impulseMagnitude;

        ball.applyImpulseAtWorldPoint(
            impulseX,
            impulseY,
            contact.closestX,
            contact.closestY,
        );

        this.applyImpulseToSegment(
            a,
            b,
            weightA,
            weightB,
            -impulseX,
            -impulseY,
        );

        // -------------------------------------------------------------
        // Tangential friction
        // -------------------------------------------------------------

        const tangentX =
            -contact.normalY;

        const tangentY =
            contact.normalX;

        const tangentVelocity =
            relativeVelocityX *
            tangentX +
            relativeVelocityY *
            tangentY;

        const unconstrainedFrictionImpulse =
            -tangentVelocity /
            totalInverseMass;

        const maximumFrictionImpulse =
            impulseMagnitude *
            this.definition
                .collisionFriction;

        const frictionImpulseMagnitude =
            Math.max(
                -maximumFrictionImpulse,
                Math.min(
                    unconstrainedFrictionImpulse,
                    maximumFrictionImpulse,
                ),
            );

        const frictionX =
            tangentX *
            frictionImpulseMagnitude;

        const frictionY =
            tangentY *
            frictionImpulseMagnitude;

        ball.applyImpulseAtWorldPoint(
            frictionX,
            frictionY,
            contact.closestX,
            contact.closestY,
        );

        this.applyImpulseToSegment(
            a,
            b,
            weightA,
            weightB,
            -frictionX,
            -frictionY,
        );
    }

    private applyImpulseToSegment(
        a: HoseRopePoint,
        b: HoseRopePoint,
        weightA: number,
        weightB: number,
        impulseX: number,
        impulseY: number,
    ): void {
        if (
            !a.isFixed()
        ) {
            a.applyVelocityDelta(
                impulseX *
                a.inverseMass *
                weightA,
                impulseY *
                a.inverseMass *
                weightA,
                this.definition
                    .fixedTimeStep,
            );
        }

        if (
            !b.isFixed()
        ) {
            b.applyVelocityDelta(
                impulseX *
                b.inverseMass *
                weightB,
                impulseY *
                b.inverseMass *
                weightB,
                this.definition
                    .fixedTimeStep,
            );
        }
    }
}

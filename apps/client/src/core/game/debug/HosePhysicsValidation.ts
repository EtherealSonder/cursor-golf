import { DEFAULT_HYDRANT_HOSE_DEFINITION } from "../config/HydrantHoseDefinition";
import { HoseBallCollision } from "../physics/rope/HoseBallCollision";
import { HoseRope } from "../physics/rope/HoseRope";

export interface HosePhysicsValidationState {
    readonly pointCountPassed: boolean;
    readonly totalLengthPassed: boolean;
    readonly anchorPassed: boolean;
    readonly segmentLengthPassed: boolean;
    readonly dampingPassed: boolean;
    readonly nozzleMovablePassed: boolean;
    readonly capsuleCollisionPassed: boolean;
    readonly restingContactPassed: boolean;
    readonly boundaryPassed: boolean;
    readonly finitePassed: boolean;
    readonly passed: boolean;
}

export class HosePhysicsValidation {
    private state:
        HosePhysicsValidationState | null =
        null;

    public run():
        HosePhysicsValidationState {
        const definition =
            DEFAULT_HYDRANT_HOSE_DEFINITION;

        const rope =
            new HoseRope(
                400,
                360,
                definition,
                0.25,
            );

        const points =
            rope.getPoints();

        const pointCountPassed =
            points.length ===
            25 &&
            rope.getSegmentCount() ===
            24;

        const expectedTotalLength =
            definition.segmentCount *
            definition.segmentLength;

        const totalLengthPassed =
            Math.abs(
                rope.getTotalLength() -
                expectedTotalLength,
            ) <
            1e-6;

        const anchorX =
            points[0]!.x;

        const anchorY =
            points[0]!.y;

        rope.applyVelocityDeltaToPoint(
            0,
            1000,
            1000,
        );

        rope.update(
            1 / 30,
        );

        const anchorPassed =
            Math.abs(
                points[0]!.x -
                anchorX,
            ) <
            1e-6 &&
            Math.abs(
                points[0]!.y -
                anchorY,
            ) <
            1e-6;

        let maximumLengthError = 0;

        for (
            let index = 0;
            index <
            points.length - 1;
            index += 1
        ) {
            const a =
                points[index]!;

            const b =
                points[
                index + 1
                ]!;

            maximumLengthError =
                Math.max(
                    maximumLengthError,
                    Math.abs(
                        Math.hypot(
                            b.x - a.x,
                            b.y - a.y,
                        ) -
                        definition
                            .segmentLength,
                    ),
                );
        }

        const segmentLengthPassed =
            maximumLengthError <=
            1.5;

        const nozzle =
            rope.getNozzlePoint();

        const beforeX =
            nozzle.x;

        const beforeY =
            nozzle.y;

        rope.applyVelocityDeltaToPoint(
            definition.segmentCount,
            180,
            -90,
        );

        rope.update(
            1 / 60,
        );

        const firstVelocity =
            nozzle.getVelocity(
                definition
                    .fixedTimeStep,
            );

        const firstSpeed =
            Math.hypot(
                firstVelocity.x,
                firstVelocity.y,
            );

        const nozzleMovablePassed =
            Math.hypot(
                nozzle.x - beforeX,
                nozzle.y - beforeY,
            ) >
            0.01;

        for (
            let index = 0;
            index <
            240;
            index += 1
        ) {
            rope.update(
                1 / 120,
            );
        }

        const finalVelocity =
            nozzle.getVelocity(
                definition
                    .fixedTimeStep,
            );

        const finalSpeed =
            Math.hypot(
                finalVelocity.x,
                finalVelocity.y,
            );

        const dampingPassed =
            finalSpeed <
            firstSpeed;

        /*
         * Geometry-only capsule validation.
         *
         * Probe a circle immediately beside the middle of a Hose segment.
         * The continuous segment should report a contact even though the
         * probe is not centred on either rope point.
         */
        const collision =
            new HoseBallCollision(
                rope,
                definition,
            );

        const testSegmentIndex =
            Math.floor(
                definition.segmentCount /
                2,
            );

        const testA =
            points[
            testSegmentIndex
            ]!;

        const testB =
            points[
            testSegmentIndex + 1
            ]!;

        const midpointX =
            (
                testA.x +
                testB.x
            ) *
            0.5;

        const midpointY =
            (
                testA.y +
                testB.y
            ) *
            0.5;

        const segmentX =
            testB.x -
            testA.x;

        const segmentY =
            testB.y -
            testA.y;

        const segmentLength =
            Math.max(
                Math.hypot(
                    segmentX,
                    segmentY,
                ),
                0.000001,
            );

        const normalX =
            -segmentY /
            segmentLength;

        const normalY =
            segmentX /
            segmentLength;

        const testBallRadius =
            10;

        const overlapDistance =
            definition.pointRadius +
            testBallRadius -
            2;

        const probeX =
            midpointX +
            normalX *
            overlapDistance;

        const probeY =
            midpointY +
            normalY *
            overlapDistance;

        const capsuleContact =
            collision
                .getDeepestContactForCircle(
                    probeX,
                    probeY,
                    testBallRadius,
                );

        const capsuleCollisionPassed =
            capsuleContact !==
            null &&
            capsuleContact.penetration >
            0 &&
            capsuleContact.interpolation >
            0.1 &&
            capsuleContact.interpolation <
            0.9;

        /*
         * Resting-contact policy validation.
         *
         * The configured threshold must be positive and lower than ordinary
         * gameplay impact speeds. Runtime collision uses this threshold to
         * perform positional separation without generating tiny bounce
         * impulses that can keep the Ball artificially "Moving".
         */
        const restingContactPassed =
            Number.isFinite(
                definition
                    .collisionRestingNormalSpeed,
            ) &&
            definition
                .collisionRestingNormalSpeed >
            0 &&
            definition
                .collisionRestingNormalSpeed <
            120 &&
            definition
                .collisionPositionSlop >=
            0;

        const boundary =
            definition
                .courseBoundary;

        const boundaryPassed =
            points.every(
                (
                    point,
                    index,
                ) => {
                    if (
                        index ===
                        0
                    ) {
                        return true;
                    }

                    const radius =
                        index ===
                            points.length - 1
                            ? definition
                                .nozzleRadius
                            : definition
                                .pointRadius;

                    return (
                        point.x >=
                        boundary.minimumX +
                        radius &&
                        point.x <=
                        boundary.maximumX -
                        radius &&
                        point.y >=
                        boundary.minimumY +
                        radius &&
                        point.y <=
                        boundary.maximumY -
                        radius
                    );
                },
            );

        const finitePassed =
            points.every(
                (
                    point,
                ) =>
                    Number.isFinite(
                        point.x,
                    ) &&
                    Number.isFinite(
                        point.y,
                    ) &&
                    Number.isFinite(
                        point.previousX,
                    ) &&
                    Number.isFinite(
                        point.previousY,
                    ),
            );

        const passed =
            pointCountPassed &&
            totalLengthPassed &&
            anchorPassed &&
            segmentLengthPassed &&
            dampingPassed &&
            nozzleMovablePassed &&
            capsuleCollisionPassed &&
            restingContactPassed &&
            boundaryPassed &&
            finitePassed;

        this.state = {
            pointCountPassed,
            totalLengthPassed,
            anchorPassed,
            segmentLengthPassed,
            dampingPassed,
            nozzleMovablePassed,
            capsuleCollisionPassed,
            restingContactPassed,
            boundaryPassed,
            finitePassed,
            passed,
        };

        console.group(
            "Phase 8B-10A.8 Hose Length + Collision Refinement Validation",
        );

        console.log(
            "Point Count",
            {
                points:
                    points.length,
                segments:
                    rope.getSegmentCount(),
                pointCountPassed,
            },
        );

        console.log(
            "Total Length",
            {
                totalLength:
                    rope.getTotalLength(),
                expectedTotalLength,
                totalLengthPassed,
            },
        );

        console.log(
            "Fixed Anchor",
            {
                anchorX:
                    points[0]!.x,
                anchorY:
                    points[0]!.y,
                anchorPassed,
            },
        );

        console.log(
            "Distance Constraints",
            {
                maximumLengthError,
                segmentLengthPassed,
            },
        );

        console.log(
            "Nozzle Mobility",
            {
                nozzleMovablePassed,
            },
        );

        console.log(
            "Settling / Damping",
            {
                firstSpeed,
                finalSpeed,
                dampingPassed,
            },
        );

        console.log(
            "Capsule Collision",
            {
                capsuleCollisionPassed,
                contact:
                    capsuleContact,
            },
        );

        console.log(
            "Resting Contact Policy",
            {
                collisionRestingNormalSpeed:
                    definition
                        .collisionRestingNormalSpeed,
                collisionPositionSlop:
                    definition
                        .collisionPositionSlop,
                restingContactPassed,
            },
        );

        console.log(
            "Course Boundary",
            {
                boundaryPassed,
            },
        );

        console.log(
            "Finite State",
            {
                finitePassed,
            },
        );

        console.log(
            "RESULT",
            passed
                ? "PASS"
                : "FAIL",
        );

        console.groupEnd();

        return this.state;
    }

    public getState():
        HosePhysicsValidationState | null {
        return this.state;
    }
}

import {
    DEFAULT_FAN_DEFINITION,
} from "../config/FanDefinition";

import {
    DEFAULT_FIRE_TUBE_DEFINITION,
} from "../config/FireTubeDefinition";

import {
    DEFAULT_SPRINKLER_DEFINITION,
} from "../config/SprinklerDefinition";

import {
    calculateSolidCircleMomentOfInertia,
} from "../physics/RigidBodyMath";

import {
    RigidBody2D,
} from "../physics/RigidBody2D";

export interface SprinklerPhysicsValidationState {
    readonly bodySizePassed: boolean;
    readonly lowerMassPassed: boolean;
    readonly centralImpactPassed: boolean;
    readonly offCentreImpactPassed: boolean;
    readonly dampingPassed: boolean;
    readonly speedBoundsPassed: boolean;
    readonly passed: boolean;
}

/**
 * Phase 8B-5 numerical validation for the lightweight Sprinkler rigid body.
 * Collision geometry itself is exercised by the existing DynamicCollidable
 * pipeline during gameplay; this test protects the intended response tuning.
 */
export class SprinklerPhysicsValidation {
    private state:
        SprinklerPhysicsValidationState | null =
        null;

    public run():
        SprinklerPhysicsValidationState {

        const definition =
            DEFAULT_SPRINKLER_DEFINITION;

        const createBody =
            (): RigidBody2D =>
                new RigidBody2D(
                    definition.rigidBody,
                    calculateSolidCircleMomentOfInertia(
                        definition.rigidBody.mass,
                        definition.collisionRadius,
                    ),
                );

        /*
         * Ball.ts currently uses a 10 px physics radius. Keep this explicit
         * here so a future Ball-size change makes the validation fail loudly.
         */
        const expectedBallRadius = 10;

        const bodySizePassed =
            Math.abs(
                definition.bodyRadius -
                expectedBallRadius,
            ) <= 1e-9 &&
            Math.abs(
                definition.collisionRadius -
                expectedBallRadius,
            ) <= 1e-9;

        const lowerMassPassed =
            definition.rigidBody.mass <
            DEFAULT_FAN_DEFINITION
                .rigidBody.mass &&
            definition.rigidBody.mass <
            DEFAULT_FIRE_TUBE_DEFINITION
                .rigidBody.mass;

        const centralBody =
            createBody();

        centralBody.applyImpulseAtWorldPoint(
            120,
            0,
            0,
            0,
        );

        const centralImpactPassed =
            centralBody.getVelocityX() > 0 &&
            Math.abs(
                centralBody.getAngularVelocity(),
            ) <= 1e-9;

        const edgeBody =
            createBody();

        edgeBody.applyImpulseAtWorldPoint(
            120,
            0,
            0,
            definition.collisionRadius,
        );

        const offCentreImpactPassed =
            edgeBody.getVelocityX() > 0 &&
            Math.abs(
                edgeBody.getAngularVelocity(),
            ) > 0;

        const initialSpeed =
            edgeBody.getLinearSpeed();

        const initialAngularSpeed =
            Math.abs(
                edgeBody.getAngularVelocity(),
            );

        for (
            let step = 0;
            step < 120;
            step += 1
        ) {
            edgeBody.integrate(
                1 / 60,
            );
        }

        const dampingPassed =
            edgeBody.getLinearSpeed() <
            initialSpeed &&
            Math.abs(
                edgeBody.getAngularVelocity(),
            ) <
            initialAngularSpeed;

        const boundedBody =
            createBody();

        boundedBody.setVelocity(
            100000,
            -100000,
        );

        boundedBody.setAngularVelocity(
            100000,
        );

        const speedBoundsPassed =
            boundedBody.getLinearSpeed() <=
            definition.rigidBody
                .maximumLinearSpeed +
            1e-6 &&
            Math.abs(
                boundedBody
                    .getAngularVelocity(),
            ) <=
            definition.rigidBody
                .maximumAngularSpeed +
            1e-6;

        const passed =
            bodySizePassed &&
            lowerMassPassed &&
            centralImpactPassed &&
            offCentreImpactPassed &&
            dampingPassed &&
            speedBoundsPassed;

        this.state = {
            bodySizePassed,
            lowerMassPassed,
            centralImpactPassed,
            offCentreImpactPassed,
            dampingPassed,
            speedBoundsPassed,
            passed,
        };

        console.group(
            "Phase 8B-5 Sprinkler physics validation",
        );

        console.log(
            "Body Size",
            {
                bodyRadius:
                    definition.bodyRadius,
                collisionRadius:
                    definition.collisionRadius,
                expectedBallRadius,
                bodySizePassed,
            },
        );

        console.log(
            "Lower Mass",
            {
                sprinklerMass:
                    definition.rigidBody.mass,
                fanMass:
                    DEFAULT_FAN_DEFINITION
                        .rigidBody.mass,
                fireTubeMass:
                    DEFAULT_FIRE_TUBE_DEFINITION
                        .rigidBody.mass,
                lowerMassPassed,
            },
        );

        console.log(
            "Central Impact",
            {
                velocityX:
                    centralBody.getVelocityX(),
                angularVelocity:
                    centralBody.getAngularVelocity(),
                centralImpactPassed,
            },
        );

        console.log(
            "Off-Centre Impact",
            {
                velocityX:
                    edgeBody.getVelocityX(),
                angularVelocity:
                    edgeBody.getAngularVelocity(),
                offCentreImpactPassed,
            },
        );

        console.log(
            "Damping",
            {
                initialSpeed,
                finalSpeed:
                    edgeBody.getLinearSpeed(),
                initialAngularSpeed,
                finalAngularSpeed:
                    Math.abs(
                        edgeBody
                            .getAngularVelocity(),
                    ),
                dampingPassed,
            },
        );

        console.log(
            "Speed Bounds",
            {
                linearSpeed:
                    boundedBody
                        .getLinearSpeed(),
                angularSpeed:
                    boundedBody
                        .getAngularVelocity(),
                speedBoundsPassed,
            },
        );

        console.log(
            `RESULT: ${passed ? "PASS" : "FAIL"}`,
        );

        console.groupEnd();

        return this.state;
    }

    public getState():
        SprinklerPhysicsValidationState | null {

        return this.state;
    }
}

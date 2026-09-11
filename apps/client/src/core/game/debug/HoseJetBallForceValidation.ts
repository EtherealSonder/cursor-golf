import {
    DEFAULT_HOSE_JET_BALL_FORCE_DEFINITION,
} from "../config/HoseJetBallForceDefinition";

import {
    HoseJetBallForceSystem,
} from "../physics/water/HoseJetBallForceSystem";

export interface HoseJetBallForceValidationState {
    readonly behindNozzleRejectedPassed: boolean;
    readonly beyondRangeRejectedPassed: boolean;
    readonly outsideWidthRejectedPassed: boolean;

    readonly centrelineCollisionPassed: boolean;
    readonly directionPassed: boolean;

    readonly nearStrongerThanFarPassed: boolean;
    readonly centreStrongerThanEdgePassed: boolean;

    readonly flowScalingPassed: boolean;
    readonly launchSpeedScalingPassed: boolean;
    readonly maximumAccelerationPassed: boolean;

    readonly frameRateStabilityPassed: boolean;
    readonly finiteStatePassed: boolean;

    readonly passed: boolean;
}

export class HoseJetBallForceValidation {
    private readonly state:
        HoseJetBallForceValidationState;

    public constructor() {
        this.state =
            this.run();
    }

    public getState():
        HoseJetBallForceValidationState {
        return this.state;
    }

    private run():
        HoseJetBallForceValidationState {
        const definition =
            DEFAULT_HOSE_JET_BALL_FORCE_DEFINITION;

        const flowRate =
            definition.referenceFlowRate;

        const launchSpeed =
            definition.referenceLaunchSpeed;

        const radius =
            10;

        const behind =
            HoseJetBallForceSystem
                .calculateSample(
                    0,
                    0,
                    0,
                    -20,
                    0,
                    radius,
                    flowRate,
                    launchSpeed,
                    definition,
                );

        const behindNozzleRejectedPassed =
            !behind.insideJet &&
            behind.accelerationMagnitude === 0;

        const beyond =
            HoseJetBallForceSystem
                .calculateSample(
                    0,
                    0,
                    0,
                    definition.jetLength +
                        20,
                    0,
                    radius,
                    flowRate,
                    launchSpeed,
                    definition,
                );

        const beyondRangeRejectedPassed =
            !beyond.insideJet &&
            beyond.accelerationMagnitude ===
                0;

        const outside =
            HoseJetBallForceSystem
                .calculateSample(
                    0,
                    0,
                    0,
                    definition.jetLength *
                        0.5,
                    definition.endRadius +
                        radius +
                        20,
                    radius,
                    flowRate,
                    launchSpeed,
                    definition,
                );

        const outsideWidthRejectedPassed =
            !outside.insideJet &&
            outside.accelerationMagnitude ===
                0;

        const nearCentre =
            HoseJetBallForceSystem
                .calculateSample(
                    0,
                    0,
                    0,
                    definition.jetLength *
                        0.15,
                    0,
                    radius,
                    flowRate,
                    launchSpeed,
                    definition,
                );

        const farCentre =
            HoseJetBallForceSystem
                .calculateSample(
                    0,
                    0,
                    0,
                    definition.jetLength *
                        0.85,
                    0,
                    radius,
                    flowRate,
                    launchSpeed,
                    definition,
                );

        const edgeSample =
            HoseJetBallForceSystem
                .calculateSample(
                    0,
                    0,
                    0,
                    definition.jetLength *
                        0.15,
                    (
                        definition.startRadius +
                        radius
                    ) *
                        0.8,
                    radius,
                    flowRate,
                    launchSpeed,
                    definition,
                );

        const centrelineCollisionPassed =
            nearCentre.insideJet &&
            nearCentre.accelerationMagnitude >
                0;

        const directionPassed =
            nearCentre.accelerationX >
                0 &&
            Math.abs(
                nearCentre.accelerationY,
            ) <
                1e-9;

        const nearStrongerThanFarPassed =
            nearCentre.accelerationMagnitude >
            farCentre.accelerationMagnitude;

        const centreStrongerThanEdgePassed =
            nearCentre.accelerationMagnitude >
            edgeSample.accelerationMagnitude;

        const lowFlow =
            HoseJetBallForceSystem
                .calculateSample(
                    0,
                    0,
                    0,
                    definition.jetLength *
                        0.3,
                    0,
                    radius,
                    flowRate * 0.5,
                    launchSpeed,
                    definition,
                );

        const highFlow =
            HoseJetBallForceSystem
                .calculateSample(
                    0,
                    0,
                    0,
                    definition.jetLength *
                        0.3,
                    0,
                    radius,
                    flowRate,
                    launchSpeed,
                    definition,
                );

        const flowScalingPassed =
            highFlow.accelerationMagnitude >
            lowFlow.accelerationMagnitude;

        const lowLaunch =
            HoseJetBallForceSystem
                .calculateSample(
                    0,
                    0,
                    0,
                    definition.jetLength *
                        0.3,
                    0,
                    radius,
                    flowRate,
                    launchSpeed * 0.5,
                    definition,
                );

        const highLaunch =
            HoseJetBallForceSystem
                .calculateSample(
                    0,
                    0,
                    0,
                    definition.jetLength *
                        0.3,
                    0,
                    radius,
                    flowRate,
                    launchSpeed,
                    definition,
                );

        const launchSpeedScalingPassed =
            highLaunch.accelerationMagnitude >
            lowLaunch.accelerationMagnitude;

        const extreme =
            HoseJetBallForceSystem
                .calculateSample(
                    0,
                    0,
                    Math.PI / 4,
                    5,
                    5,
                    radius,
                    flowRate * 50,
                    launchSpeed * 50,
                    definition,
                );

        const maximumAccelerationPassed =
            extreme.accelerationMagnitude <=
                definition.maximumAcceleration +
                    1e-9;

        const simulatedDeltaVelocity =
            (
                framesPerSecond:
                    number,
            ): number => {
                const deltaTime =
                    1 /
                    framesPerSecond;

                let velocity =
                    0;

                for (
                    let frame = 0;
                    frame <
                    framesPerSecond;
                    frame += 1
                ) {
                    velocity +=
                        nearCentre
                            .accelerationMagnitude *
                        deltaTime;
                }

                return velocity;
            };

        const velocity30 =
            simulatedDeltaVelocity(
                30,
            );

        const velocity60 =
            simulatedDeltaVelocity(
                60,
            );

        const velocity120 =
            simulatedDeltaVelocity(
                120,
            );

        const frameRateStabilityPassed =
            Math.abs(
                velocity30 -
                velocity60,
            ) <
                1e-9 &&
            Math.abs(
                velocity60 -
                velocity120,
            ) <
                1e-9;

        const finiteStatePassed = [
            nearCentre,
            farCentre,
            edgeSample,
            lowFlow,
            highFlow,
            lowLaunch,
            highLaunch,
            extreme,
        ].every(
            (sample): boolean =>
                [
                    sample.accelerationX,
                    sample.accelerationY,
                    sample.accelerationMagnitude,
                    sample.distanceAlongJet,
                    sample.lateralDistance,
                    sample.jetRadius,
                    sample.distanceInfluence,
                    sample.edgeInfluence,
                    sample.flowInfluence,
                    sample.launchSpeedInfluence,
                ].every(
                    (value): boolean =>
                        Number.isFinite(
                            value,
                        ),
                ),
        );

        const passed =
            behindNozzleRejectedPassed &&
            beyondRangeRejectedPassed &&
            outsideWidthRejectedPassed &&
            centrelineCollisionPassed &&
            directionPassed &&
            nearStrongerThanFarPassed &&
            centreStrongerThanEdgePassed &&
            flowScalingPassed &&
            launchSpeedScalingPassed &&
            maximumAccelerationPassed &&
            frameRateStabilityPassed &&
            finiteStatePassed;

        const state = {
            behindNozzleRejectedPassed,
            beyondRangeRejectedPassed,
            outsideWidthRejectedPassed,
            centrelineCollisionPassed,
            directionPassed,
            nearStrongerThanFarPassed,
            centreStrongerThanEdgePassed,
            flowScalingPassed,
            launchSpeedScalingPassed,
            maximumAccelerationPassed,
            frameRateStabilityPassed,
            finiteStatePassed,
            passed,
        };

        console.group(
            "Phase 8B-12 Hose Jet -> Ball Force Validation",
        );

        console.log(
            "Inactive / Outside Region",
            {
                behindNozzleRejectedPassed,
                beyondRangeRejectedPassed,
                outsideWidthRejectedPassed,
            },
        );

        console.log(
            "Jet Collision / Direction",
            {
                centrelineCollisionPassed,
                directionPassed,
            },
        );

        console.log(
            "Spatial Falloff",
            {
                nearStrongerThanFarPassed,
                centreStrongerThanEdgePassed,
            },
        );

        console.log(
            "Source Strength Scaling",
            {
                flowScalingPassed,
                launchSpeedScalingPassed,
                maximumAccelerationPassed,
            },
        );

        console.log(
            "Frame-rate Stability",
            {
                frameRateStabilityPassed,
            },
        );

        console.log(
            "Finite State",
            {
                finiteStatePassed,
            },
        );

        console.log(
            "RESULT",
            passed
                ? "PASS"
                : "FAIL",
        );

        console.groupEnd();

        return state;
    }
}

import {
    DEFAULT_SPRINKLER_DEFINITION,
} from "../config/SprinklerDefinition";

import {
    WaterSourceType,
} from "../config/WaterSourceDefinition";

import {
    AirborneWaterSystem,
} from "../environment/AirborneWaterSystem";

import {
    WaterField,
} from "../environment/WaterField";

import {
    WaterSourceSystem,
} from "../environment/WaterSourceSystem";

export interface SprinklerImpactValidationState {
    readonly preImpactDryPassed: boolean;
    readonly impactTimingPassed: boolean;
    readonly reducedDepositPassed: boolean;
    readonly reducedMomentumPassed: boolean;
    readonly gradualAccumulationPassed: boolean;
    readonly passed: boolean;
}

/**
 * Phase 8B-4B corrective validation.
 *
 * Verifies the exact behavioral contract exposed by the first combined
 * sprinkler + airborne + standing-Water visual test:
 *
 * 1. WaterField stays dry while a packet is airborne.
 * 2. Water appears only when the packet reaches the ground.
 * 3. Sprinkler-scale deposits are intentionally small.
 * 4. Only a small fraction of airborne horizontal momentum reaches WaterField.
 * 5. Repeated impacts accumulate Water gradually and linearly.
 */
export class SprinklerImpactValidation {
    private state:
        SprinklerImpactValidationState | null =
        null;

    public run(): SprinklerImpactValidationState {
        const sourceSystem =
            new WaterSourceSystem();

        const waterField =
            new WaterField();

        const airborneSystem =
            new AirborneWaterSystem(
                waterField,
            );

        const waterPerPulse =
            DEFAULT_SPRINKLER_DEFINITION.flowRate *
            DEFAULT_SPRINKLER_DEFINITION.emissionInterval;

        const waterPerNozzle =
            waterPerPulse /
            DEFAULT_SPRINKLER_DEFINITION.nozzleCount;

        const queuePacket =
            (
                sequence: number,
            ): void => {
                sourceSystem.queueEmissionRequest({
                    sourceId:
                        "8B-4B-impact-validation",

                    sourceType:
                        WaterSourceType.Sprinkler,

                    sequence,

                    positionX: 0,
                    positionY: 0,
                    directionRadians: 0,

                    launchSpeed:
                        DEFAULT_SPRINKLER_DEFINITION
                            .launchSpeed,

                    launchElevationRadians:
                        DEFAULT_SPRINKLER_DEFINITION
                            .launchElevationRadians,

                    waterAmount:
                        waterPerNozzle,

                    windResponse:
                        DEFAULT_SPRINKLER_DEFINITION
                            .windResponse,

                    impactMomentumRetention:
                        DEFAULT_SPRINKLER_DEFINITION
                            .impactMomentumRetention,
                });

                airborneSystem.consumeEmissionRequests(
                    sourceSystem
                        .drainEmissionRequests(),
                );
            };

        queuePacket(1);

        /*
         * The configured 45-degree, 420 px/s packet remains airborne for
         * roughly 0.606 s under the current 980 px/s^2 gravity. Advance only
         * 0.30 s first and prove that WaterField is still completely dry.
         */
        for (
            let step = 0;
            step < 18;
            step += 1
        ) {
            airborneSystem.update(
                1 / 60,
            );
        }

        const waterBeforeImpact =
            waterField.getTotalWaterAmount();

        const preImpactDryPassed =
            airborneSystem.getActivePacketCount() === 1 &&
            airborneSystem.getTotalImpactedPacketCount() === 0 &&
            Math.abs(
                waterBeforeImpact,
            ) <= 1e-9;

        let firstImpactFrame = -1;

        for (
            let step = 18;
            step < 180 &&
            airborneSystem.getActivePacketCount() > 0;
            step += 1
        ) {
            airborneSystem.update(
                1 / 60,
            );

            if (
                airborneSystem.getTotalImpactedPacketCount() > 0
            ) {
                firstImpactFrame =
                    step + 1;
            }
        }

        const waterAfterFirstImpact =
            waterField.getTotalWaterAmount();

        const impactTimingPassed =
            firstImpactFrame > 18 &&
            airborneSystem.getActivePacketCount() === 0 &&
            airborneSystem.getTotalImpactedPacketCount() === 1 &&
            waterBeforeImpact === 0 &&
            waterAfterFirstImpact > 0;

        /*
         * Previous Phase 8B-3 tuning produced 0.288 Water per four-nozzle
         * pulse. The corrected sprinkler produces 0.048, one sixth as much.
         */
        const previousPulseAmount =
            2.4 *
            DEFAULT_SPRINKLER_DEFINITION
                .emissionInterval;

        const reducedDepositPassed =
            waterPerPulse <
            previousPulseAmount &&
            Math.abs(
                waterAfterFirstImpact -
                waterPerNozzle,
            ) <= 1e-6;

        const horizontalLaunchSpeed =
            Math.cos(
                DEFAULT_SPRINKLER_DEFINITION
                    .launchElevationRadians,
            ) *
            DEFAULT_SPRINKLER_DEFINITION
                .launchSpeed;

        const flightTime =
            (
                2 *
                Math.sin(
                    DEFAULT_SPRINKLER_DEFINITION
                        .launchElevationRadians,
                ) *
                DEFAULT_SPRINKLER_DEFINITION
                    .launchSpeed
            ) /
            980;

        const landingX =
            horizontalLaunchSpeed *
            flightTime;

        const landingVelocity =
            waterField.getVelocityAt(
                landingX,
                0,
            );

        const expectedGroundSpeed =
            horizontalLaunchSpeed *
            DEFAULT_SPRINKLER_DEFINITION
                .impactMomentumRetention;

        const actualGroundSpeed =
            Math.hypot(
                landingVelocity.x,
                landingVelocity.y,
            );

        const reducedMomentumPassed =
            actualGroundSpeed <
            horizontalLaunchSpeed *
            0.2 &&
            Math.abs(
                actualGroundSpeed -
                expectedGroundSpeed,
            ) <= 0.01;

        /*
         * Add three more identical impacts without advancing WaterField flow.
         * This isolates source accumulation from solver spreading.
         */
        for (
            let sequence = 2;
            sequence <= 4;
            sequence += 1
        ) {
            queuePacket(
                sequence,
            );

            for (
                let step = 0;
                step < 180 &&
                airborneSystem.getActivePacketCount() > 0;
                step += 1
            ) {
                airborneSystem.update(
                    1 / 60,
                );
            }
        }

        const expectedFourImpactWater =
            waterPerNozzle * 4;

        const gradualAccumulationPassed =
            airborneSystem.getTotalImpactedPacketCount() === 4 &&
            Math.abs(
                waterField.getTotalWaterAmount() -
                expectedFourImpactWater,
            ) <= 1e-6;

        const passed =
            preImpactDryPassed &&
            impactTimingPassed &&
            reducedDepositPassed &&
            reducedMomentumPassed &&
            gradualAccumulationPassed;

        this.state = {
            preImpactDryPassed,
            impactTimingPassed,
            reducedDepositPassed,
            reducedMomentumPassed,
            gradualAccumulationPassed,
            passed,
        };

        console.group(
            "Phase 8B-4B Sprinkler impact validation",
        );

        console.log(
            "Pre-Impact Dry",
            {
                waterBeforeImpact,
                activePackets:
                    preImpactDryPassed
                        ? 1
                        : airborneSystem
                            .getActivePacketCount(),
                preImpactDryPassed,
            },
        );

        console.log(
            "Impact Timing",
            {
                firstImpactFrame,
                waterAfterFirstImpact,
                impactTimingPassed,
            },
        );

        console.log(
            "Reduced Deposit",
            {
                previousFourNozzlePulse:
                    previousPulseAmount,
                currentFourNozzlePulse:
                    waterPerPulse,
                currentPerNozzle:
                    waterPerNozzle,
                reducedDepositPassed,
            },
        );

        console.log(
            "Reduced Momentum",
            {
                airborneHorizontalSpeed:
                    horizontalLaunchSpeed,
                impactMomentumRetention:
                    DEFAULT_SPRINKLER_DEFINITION
                        .impactMomentumRetention,
                expectedGroundSpeed,
                actualGroundSpeed,
                reducedMomentumPassed,
            },
        );

        console.log(
            "Gradual Accumulation",
            {
                impactCount:
                    airborneSystem
                        .getTotalImpactedPacketCount(),
                expectedWater:
                    expectedFourImpactWater,
                actualWater:
                    waterField
                        .getTotalWaterAmount(),
                gradualAccumulationPassed,
            },
        );

        console.log(
            `RESULT: ${passed ? "PASS" : "FAIL"}`,
        );

        console.groupEnd();

        return this.state;
    }

    public getState():
        SprinklerImpactValidationState | null {
        return this.state;
    }
}

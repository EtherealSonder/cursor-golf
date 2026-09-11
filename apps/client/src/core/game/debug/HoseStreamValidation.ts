import {
    DEFAULT_HOSE_WATER_DEFINITION,
    createHoseWaterSourceDefinition,
} from "../config/HoseWaterDefinition";

import {
    WaterSourceType,
} from "../config/WaterSourceDefinition";

import {
    WaterSourceSystem,
} from "../environment/WaterSourceSystem";

export interface HoseStreamValidationState {
    readonly sourceEnabledPassed: boolean;
    readonly emissionCountPassed: boolean;
    readonly sequencePassed: boolean;
    readonly transformPassed: boolean;
    readonly tuningPassed: boolean;
    readonly waterAmountPassed: boolean;
    readonly momentumOverridePassed: boolean;
    readonly disableStopsEmissionPassed: boolean;
    readonly passed: boolean;
}

/**
 * Phase 8B-10B.4 authoritative Hose stream validation.
 *
 * This uses an isolated WaterSourceSystem. It validates the immutable emission
 * handoff that the normal World pipeline forwards into AirborneWaterSystem,
 * without draining or mutating the live gameplay stream.
 */
export class HoseStreamValidation {
    private state:
        HoseStreamValidationState | null =
        null;

    public run():
        HoseStreamValidationState {

        const system =
            new WaterSourceSystem();

        const sourceId =
            "hose-stream-validation";

        const positionX =
            420;

        const positionY =
            260;

        const directionRadians =
            Math.PI /
            5;

        const source =
            system.addSource(
                createHoseWaterSourceDefinition(
                    sourceId,
                    positionX,
                    positionY,
                    directionRadians,
                    true,
                ),
            );

        const sourceEnabledPassed =
            source.isEnabled();

        /*
         * 0.20 seconds at a 0.04 second interval must produce exactly five
         * authoritative representative emissions.
         */
        system.update(
            0.20,
        );

        const requests =
            system.drainEmissionRequests();

        const expectedEmissionCount =
            Math.floor(
                (
                    0.20 +
                    1e-12
                ) /
                DEFAULT_HOSE_WATER_DEFINITION
                    .emissionInterval,
            );

        const emissionCountPassed =
            requests.length ===
            expectedEmissionCount;

        const sequencePassed =
            requests.every(
                (
                    request,
                    index,
                ): boolean =>
                    request.sequence ===
                    index +
                    1,
            ) &&
            source.getEmissionSequence() ===
            expectedEmissionCount;

        const epsilon =
            1e-9;

        const transformPassed =
            requests.every(
                (request): boolean =>
                    Math.abs(
                        request.positionX -
                        positionX,
                    ) <=
                    epsilon &&
                    Math.abs(
                        request.positionY -
                        positionY,
                    ) <=
                    epsilon &&
                    Math.abs(
                        this.angleDifference(
                            request.directionRadians,
                            directionRadians,
                        ),
                    ) <=
                    epsilon,
            );

        const tuningPassed =
            requests.every(
                (request): boolean =>
                    request.sourceType ===
                    WaterSourceType
                        .DirectionalJet &&
                    Math.abs(
                        request.launchSpeed -
                        DEFAULT_HOSE_WATER_DEFINITION
                            .launchSpeed,
                    ) <=
                    epsilon &&
                    Math.abs(
                        request.launchElevationRadians -
                        DEFAULT_HOSE_WATER_DEFINITION
                            .launchElevationRadians,
                    ) <=
                    epsilon &&
                    Math.abs(
                        request.windResponse -
                        DEFAULT_HOSE_WATER_DEFINITION
                            .windResponse,
                    ) <=
                    epsilon,
            );

        const expectedWaterPerEmission =
            DEFAULT_HOSE_WATER_DEFINITION
                .flowRate *
            DEFAULT_HOSE_WATER_DEFINITION
                .emissionInterval;

        const waterAmountPassed =
            requests.every(
                (request): boolean =>
                    Math.abs(
                        request.waterAmount -
                        expectedWaterPerEmission,
                    ) <=
                    epsilon,
            );

        const momentumOverridePassed =
            requests.every(
                (request): boolean =>
                    Math.abs(
                        (
                            request
                                .impactMomentumRetention ??
                            -1
                        ) -
                        DEFAULT_HOSE_WATER_DEFINITION
                            .impactMomentumRetention,
                    ) <=
                    epsilon,
            );

        source.setEnabled(
            false,
        );

        const sequenceBeforeDisabledUpdate =
            source.getEmissionSequence();

        system.update(
            0.20,
        );

        const disabledRequests =
            system.drainEmissionRequests();

        const disableStopsEmissionPassed =
            disabledRequests.length ===
            0 &&
            source.getEmissionSequence() ===
            sequenceBeforeDisabledUpdate;

        const passed =
            sourceEnabledPassed &&
            emissionCountPassed &&
            sequencePassed &&
            transformPassed &&
            tuningPassed &&
            waterAmountPassed &&
            momentumOverridePassed &&
            disableStopsEmissionPassed;

        this.state = {
            sourceEnabledPassed,
            emissionCountPassed,
            sequencePassed,
            transformPassed,
            tuningPassed,
            waterAmountPassed,
            momentumOverridePassed,
            disableStopsEmissionPassed,
            passed,
        };

        console.group(
            "Phase 8B-10B.4 Coherent Hose Stream Validation",
        );

        console.log(
            "Enabled Source",
            {
                sourceEnabledPassed,
            },
        );

        console.log(
            "Sustained Emission",
            {
                expectedEmissionCount,
                actualEmissionCount:
                    requests.length,
                emissionCountPassed,
                sequencePassed,
            },
        );

        console.log(
            "Stream Transform",
            {
                positionX,
                positionY,
                directionRadians,
                transformPassed,
            },
        );

        console.log(
            "Hose Stream Tuning",
            {
                launchSpeed:
                    DEFAULT_HOSE_WATER_DEFINITION
                        .launchSpeed,
                launchElevationRadians:
                    DEFAULT_HOSE_WATER_DEFINITION
                        .launchElevationRadians,
                windResponse:
                    DEFAULT_HOSE_WATER_DEFINITION
                        .windResponse,
                waterPerEmission:
                    expectedWaterPerEmission,
                impactMomentumRetention:
                    DEFAULT_HOSE_WATER_DEFINITION
                        .impactMomentumRetention,
                tuningPassed,
                waterAmountPassed,
                momentumOverridePassed,
            },
        );

        console.log(
            "Disable Stops Emission",
            {
                disableStopsEmissionPassed,
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
        HoseStreamValidationState | null {

        return this.state;
    }

    private angleDifference(
        first:
            number,

        second:
            number,
    ): number {

        return Math.atan2(
            Math.sin(
                first -
                second,
            ),
            Math.cos(
                first -
                second,
            ),
        );
    }
}

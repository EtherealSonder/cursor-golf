import {
    DEFAULT_HOSE_WATER_DEFINITION,
} from "../config/HoseWaterDefinition";

import {
    WaterSourceType,
} from "../config/WaterSourceDefinition";

import {
    WaterField,
} from "../environment/WaterField";

import {
    AirborneWaterSystem,
} from "../environment/AirborneWaterSystem";

import type {
    WaterEmissionRequest,
} from "../environment/WaterSourceSystem";

export interface HoseImpactMomentumValidationState {
    readonly positiveXImpactPassed: boolean;
    readonly positiveYImpactPassed: boolean;
    readonly retainedSpeedPassed: boolean;
    readonly directionalDominancePassed: boolean;
    readonly repeatedImpactPassed: boolean;
    readonly finiteVelocityPassed: boolean;
    readonly maximumVelocityPassed: boolean;
    readonly conservationPassed: boolean;
    readonly passed: boolean;
}

interface ImpactScenarioResult {
    readonly requestedWater: number;
    readonly depositedWater: number;
    readonly totalWater: number;
    readonly dominantVelocityX: number;
    readonly dominantVelocityY: number;
    readonly dominantSpeed: number;
    readonly expectedRetainedHorizontalSpeed: number;
    readonly impactCount: number;
    readonly finiteVelocity: boolean;
    readonly maximumVelocityRespected: boolean;
}

/**
 * Phase 8B-10B.5 validation for Hose airborne -> WaterField momentum transfer.
 *
 * Each scenario owns an isolated WaterField and AirborneWaterSystem, so the
 * validation cannot contaminate the live course. The requests use the real
 * Hose launch speed, elevation, Water amount and 0.90 momentum retention.
 */
export class HoseImpactMomentumValidation {
    private state:
        HoseImpactMomentumValidationState | null =
        null;

    public run():
        HoseImpactMomentumValidationState {

        const positiveX =
            this.runScenario(
                0,
                1,
            );

        const positiveY =
            this.runScenario(
                Math.PI / 2,
                1,
            );

        const repeatedPositiveX =
            this.runScenario(
                0,
                5,
            );

        const positiveXImpactPassed =
            positiveX.impactCount === 1 &&
            positiveX.depositedWater > 0 &&
            positiveX.dominantVelocityX > 0;

        const positiveYImpactPassed =
            positiveY.impactCount === 1 &&
            positiveY.depositedWater > 0 &&
            positiveY.dominantVelocityY > 0;

        const retainedSpeedTolerance =
            1e-3;

        const retainedSpeedPassed =
            Math.abs(
                positiveX.dominantSpeed -
                positiveX.expectedRetainedHorizontalSpeed,
            ) <=
            retainedSpeedTolerance &&
            Math.abs(
                positiveY.dominantSpeed -
                positiveY.expectedRetainedHorizontalSpeed,
            ) <=
            retainedSpeedTolerance;

        const directionalDominancePassed =
            Math.abs(
                positiveX.dominantVelocityX,
            ) >
            Math.abs(
                positiveX.dominantVelocityY,
            ) *
            10 &&
            Math.abs(
                positiveY.dominantVelocityY,
            ) >
            Math.abs(
                positiveY.dominantVelocityX,
            ) *
            10;

        const repeatedImpactPassed =
            repeatedPositiveX.impactCount === 5 &&
            repeatedPositiveX.totalWater >
            positiveX.totalWater &&
            repeatedPositiveX.dominantVelocityX > 0;

        const finiteVelocityPassed =
            positiveX.finiteVelocity &&
            positiveY.finiteVelocity &&
            repeatedPositiveX.finiteVelocity;

        const maximumVelocityPassed =
            positiveX.maximumVelocityRespected &&
            positiveY.maximumVelocityRespected &&
            repeatedPositiveX.maximumVelocityRespected;

        const conservationTolerance =
            1e-5;

        const conservationPassed =
            Math.abs(
                positiveX.requestedWater -
                positiveX.totalWater,
            ) <=
            conservationTolerance &&
            Math.abs(
                positiveY.requestedWater -
                positiveY.totalWater,
            ) <=
            conservationTolerance &&
            Math.abs(
                repeatedPositiveX.requestedWater -
                repeatedPositiveX.totalWater,
            ) <=
            conservationTolerance;

        const passed =
            positiveXImpactPassed &&
            positiveYImpactPassed &&
            retainedSpeedPassed &&
            directionalDominancePassed &&
            repeatedImpactPassed &&
            finiteVelocityPassed &&
            maximumVelocityPassed &&
            conservationPassed;

        this.state = {
            positiveXImpactPassed,
            positiveYImpactPassed,
            retainedSpeedPassed,
            directionalDominancePassed,
            repeatedImpactPassed,
            finiteVelocityPassed,
            maximumVelocityPassed,
            conservationPassed,
            passed,
        };

        console.group(
            "Phase 8B-10B.5 Hose Impact Momentum Validation",
        );

        console.log(
            "Positive X Impact",
            {
                depositedWater:
                    positiveX.depositedWater,
                velocityX:
                    positiveX.dominantVelocityX,
                velocityY:
                    positiveX.dominantVelocityY,
                expectedRetainedHorizontalSpeed:
                    positiveX.expectedRetainedHorizontalSpeed,
                positiveXImpactPassed,
            },
        );

        console.log(
            "Positive Y Impact",
            {
                depositedWater:
                    positiveY.depositedWater,
                velocityX:
                    positiveY.dominantVelocityX,
                velocityY:
                    positiveY.dominantVelocityY,
                expectedRetainedHorizontalSpeed:
                    positiveY.expectedRetainedHorizontalSpeed,
                positiveYImpactPassed,
            },
        );

        console.log(
            "Momentum Retention",
            {
                positiveXRetainedSpeed:
                    positiveX.dominantSpeed,
                positiveYRetainedSpeed:
                    positiveY.dominantSpeed,
                expected:
                    positiveX.expectedRetainedHorizontalSpeed,
                retainedSpeedPassed,
                directionalDominancePassed,
            },
        );

        console.log(
            "Repeated Impacts",
            {
                singleImpactWater:
                    positiveX.totalWater,
                repeatedImpactWater:
                    repeatedPositiveX.totalWater,
                impactCount:
                    repeatedPositiveX.impactCount,
                velocityX:
                    repeatedPositiveX.dominantVelocityX,
                velocityY:
                    repeatedPositiveX.dominantVelocityY,
                repeatedImpactPassed,
            },
        );

        console.log(
            "Safety / Conservation",
            {
                finiteVelocityPassed,
                maximumVelocityPassed,
                conservationPassed,
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
        HoseImpactMomentumValidationState | null {

        return this.state;
    }

    private runScenario(
        directionRadians:
            number,

        emissionCount:
            number,
    ): ImpactScenarioResult {

        const waterField =
            new WaterField();

        const airborneWaterSystem =
            new AirborneWaterSystem(
                waterField,
            );

        const waterPerEmission =
            DEFAULT_HOSE_WATER_DEFINITION
                .flowRate *
            DEFAULT_HOSE_WATER_DEFINITION
                .emissionInterval;

        const requests:
            WaterEmissionRequest[] = [];

        for (
            let index = 0;
            index < emissionCount;
            index += 1
        ) {
            requests.push({
                sourceId:
                    "hose-impact-momentum-validation",

                sourceType:
                    WaterSourceType.DirectionalJet,

                sequence:
                    index + 1,

                positionX:
                    0,

                positionY:
                    0,

                directionRadians,

                launchSpeed:
                    DEFAULT_HOSE_WATER_DEFINITION
                        .launchSpeed,

                launchElevationRadians:
                    DEFAULT_HOSE_WATER_DEFINITION
                        .launchElevationRadians,

                waterAmount:
                    waterPerEmission,

                windResponse:
                    DEFAULT_HOSE_WATER_DEFINITION
                        .windResponse,

                impactMomentumRetention:
                    DEFAULT_HOSE_WATER_DEFINITION
                        .impactMomentumRetention,
            });
        }

        airborneWaterSystem
            .consumeEmissionRequests(
                requests,
            );

        /*
         * Advance only airborne transport. WaterField.update() is deliberately
         * not called because this phase measures momentum at the exact
         * deposition boundary before ground-flow damping/advection modifies it.
         */
        const simulationStep =
            1 / 120;

        const maximumSteps =
            600;

        for (
            let step = 0;
            step < maximumSteps;
            step += 1
        ) {
            airborneWaterSystem
                .update(
                    simulationStep,
                );

            if (
                airborneWaterSystem
                    .getActivePacketCount() ===
                0
            ) {
                break;
            }
        }

        let dominantVelocityX =
            0;

        let dominantVelocityY =
            0;

        let dominantSpeed =
            0;

        let finiteVelocity =
            true;

        let maximumVelocityRespected =
            true;

        const maximumVelocity =
            waterField
                .getDefinition()
                .maximumVelocity;

        for (
            let gridY = 0;
            gridY < waterField.getRowCount();
            gridY += 1
        ) {
            for (
                let gridX = 0;
                gridX < waterField.getColumnCount();
                gridX += 1
            ) {
                const cell =
                    waterField.getCell(
                        gridX,
                        gridY,
                    );

                if (
                    !cell ||
                    cell.depth <= 0
                ) {
                    continue;
                }

                const speed =
                    Math.hypot(
                        cell.velocityX,
                        cell.velocityY,
                    );

                if (
                    !Number.isFinite(
                        cell.velocityX,
                    ) ||
                    !Number.isFinite(
                        cell.velocityY,
                    )
                ) {
                    finiteVelocity =
                        false;
                }

                if (
                    Math.abs(
                        cell.velocityX,
                    ) >
                    maximumVelocity +
                    1e-6 ||
                    Math.abs(
                        cell.velocityY,
                    ) >
                    maximumVelocity +
                    1e-6
                ) {
                    maximumVelocityRespected =
                        false;
                }

                if (
                    speed >
                    dominantSpeed
                ) {
                    dominantSpeed =
                        speed;

                    dominantVelocityX =
                        cell.velocityX;

                    dominantVelocityY =
                        cell.velocityY;
                }
            }
        }

        const expectedRetainedHorizontalSpeed =
            Math.cos(
                DEFAULT_HOSE_WATER_DEFINITION
                    .launchElevationRadians,
            ) *
            DEFAULT_HOSE_WATER_DEFINITION
                .launchSpeed *
            DEFAULT_HOSE_WATER_DEFINITION
                .impactMomentumRetention;

        const requestedWater =
            waterPerEmission *
            emissionCount;

        return {
            requestedWater,
            depositedWater:
                airborneWaterSystem
                    .getTotalDepositedWaterAmount(),
            totalWater:
                waterField
                    .getTotalWaterAmount(),
            dominantVelocityX,
            dominantVelocityY,
            dominantSpeed,
            expectedRetainedHorizontalSpeed,
            impactCount:
                airborneWaterSystem
                    .getTotalImpactedPacketCount(),
            finiteVelocity,
            maximumVelocityRespected,
        };
    }
}

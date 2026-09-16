import type {
    FireManager,
} from "../environment/FireManager";

import type {
    AirborneWaterSystem,
    AirborneWaterSweep,
} from "../environment/AirborneWaterSystem";

import type {
    WaterField,
} from "../environment/WaterField";

import type {
    WaterFireInteraction,
} from "../environment/WaterFireInteraction";

import {
    WaterSourceType,
} from "../config/WaterSourceDefinition";

interface ValidationCheck {
    readonly name: string;
    readonly passed: boolean;
}

/**
 * Phase 8F-3 isolated Airborne Water x Ground Fire validation.
 *
 * The suite validates the actual AirborneWaterSystem sweep records and the
 * WaterFireInteraction swept-contact response. Authoritative systems are reset
 * before returning so startup validation does not leak Fire or Water state
 * into gameplay.
 */
export class AirborneWaterFireValidation {
    public static run(
        interaction: WaterFireInteraction,
        airborneWaterSystem: AirborneWaterSystem,
        waterField: WaterField,
        fireManager: FireManager,
    ): boolean {
        const checks: ValidationCheck[] = [];

        const reset = (): void => {
            airborneWaterSystem.reset();
            waterField.reset();
            fireManager.reset();
        };

        const igniteOne = (
            x = 520,
            y = 400,
        ): {
            readonly gridX: number;
            readonly gridY: number;
            readonly x: number;
            readonly y: number;
        } | null => {
            if (!fireManager.ignite(x, y)) {
                return null;
            }

            const cell =
                fireManager
                    .getActiveCells()[0];

            return cell
                ? {
                    gridX:
                        cell.getGridX(),
                    gridY:
                        cell.getGridY(),
                    x:
                        cell.getWorldCenterX(),
                    y:
                        cell.getWorldCenterY(),
                }
                : null;
        };

        const makeSweep = (
            startX: number,
            startY: number,
            endX: number,
            endY: number,
            startHeight: number,
            endHeight: number,
            waterAmount:
                number =
                interaction
                    .getDefinition()
                    .minimumMeaningfulAirborneWaterAmount,
        ): AirborneWaterSweep => ({
            sourceId:
                "8f3-validation",
            sequence:
                1,
            waterAmount,
            startX,
            startY,
            startHeight,
            endX,
            endY,
            endHeight,
        });

        reset();
        let fire =
            igniteOne();

        const noSweepResult =
            interaction
                .updateAirborneWaterGroundFire(
                    [],
                    fireManager,
                );

        checks.push({
            name:
                "No airborne Water leaves Ground Fire active",
            passed:
                fire !== null &&
                noSweepResult.extinguishedFireCellCount === 0 &&
                fireManager.getActiveCellCount() === 1,
        });

        reset();
        fire =
            igniteOne();

        if (fire) {
            const threshold =
                interaction
                    .getDefinition()
                    .minimumMeaningfulAirborneWaterAmount;

            const result =
                interaction
                    .updateAirborneWaterGroundFire(
                        [
                            makeSweep(
                                fire.x - 80,
                                fire.y,
                                fire.x + 80,
                                fire.y,
                                20,
                                20,
                                threshold * 0.5,
                            ),
                        ],
                        fireManager,
                    );

            checks.push({
                name:
                    "Sub-threshold airborne Water does not extinguish",
                passed:
                    result.extinguishedFireCellCount === 0 &&
                    fireManager.getActiveCellCount() === 1,
            });
        } else {
            checks.push({
                name:
                    "Sub-threshold airborne Water does not extinguish",
                passed:
                    false,
            });
        }

        reset();
        fire =
            igniteOne();

        if (fire) {
            const result =
                interaction
                    .updateAirborneWaterGroundFire(
                        [
                            makeSweep(
                                fire.x - 120,
                                fire.y,
                                fire.x + 120,
                                fire.y,
                                24,
                                24,
                            ),
                        ],
                        fireManager,
                    );

            checks.push({
                name:
                    "Swept airborne Water extinguishes crossed Ground Fire",
                passed:
                    result.contactCount === 1 &&
                    result.extinguishedFireCellCount === 1 &&
                    fireManager.getActiveCellCount() === 0,
            });
        } else {
            checks.push({
                name:
                    "Swept airborne Water extinguishes crossed Ground Fire",
                passed:
                    false,
            });
        }

        reset();
        fire =
            igniteOne();

        if (fire) {
            const result =
                interaction
                    .updateAirborneWaterGroundFire(
                        [
                            makeSweep(
                                fire.x - 120,
                                fire.y + 100,
                                fire.x + 120,
                                fire.y + 100,
                                20,
                                20,
                            ),
                        ],
                        fireManager,
                    );

            checks.push({
                name:
                    "Nearby non-crossing airborne Water leaves Ground Fire active",
                passed:
                    result.extinguishedFireCellCount === 0 &&
                    fireManager.getActiveCellCount() === 1,
            });
        } else {
            checks.push({
                name:
                    "Nearby non-crossing airborne Water leaves Ground Fire active",
                passed:
                    false,
            });
        }

        reset();
        fire =
            igniteOne();

        if (fire) {
            const high =
                interaction
                    .getDefinition()
                    .airborneWaterGroundFireMaximumContactHeight +
                20;

            const result =
                interaction
                    .updateAirborneWaterGroundFire(
                        [
                            makeSweep(
                                fire.x - 120,
                                fire.y,
                                fire.x + 120,
                                fire.y,
                                high,
                                high,
                            ),
                        ],
                        fireManager,
                    );

            checks.push({
                name:
                    "Projected crossing above Ground Fire height does not extinguish",
                passed:
                    result.extinguishedFireCellCount === 0 &&
                    fireManager.getActiveCellCount() === 1,
            });
        } else {
            checks.push({
                name:
                    "Projected crossing above Ground Fire height does not extinguish",
                passed:
                    false,
            });
        }

        /*
         * Validate that the real transport system publishes fixed-step swept
         * movement records. The packet is intentionally kept airborne.
         */
        reset();

        airborneWaterSystem
            .consumeEmissionRequests([
                {
                    sourceId:
                        "8f3-sweep-validation",
                    sourceType:
                        WaterSourceType.DirectionalJet,
                    sequence:
                        1,
                    positionX:
                        300,
                    positionY:
                        300,
                    directionRadians:
                        0,
                    launchSpeed:
                        600,
                    launchElevationRadians:
                        Math.PI / 6,
                    waterAmount:
                        0.1,
                    windResponse:
                        0,
                    impactMomentumRetention:
                        0.85,
                },
            ]);

        airborneWaterSystem.update(
            1 / 60,
        );

        const transportSweeps =
            airborneWaterSystem
                .getLastMovementSweeps();

        checks.push({
            name:
                "AirborneWaterSystem publishes current fixed-step movement sweeps",
            passed:
                transportSweeps.length > 0 &&
                transportSweeps.every(
                    (sweep): boolean =>
                        Number.isFinite(sweep.startX) &&
                        Number.isFinite(sweep.startY) &&
                        Number.isFinite(sweep.startHeight) &&
                        Number.isFinite(sweep.endX) &&
                        Number.isFinite(sweep.endY) &&
                        Number.isFinite(sweep.endHeight) &&
                        sweep.waterAmount > 0,
                ),
        });

        /*
         * A direct Water/Fire interaction must not consume the packet. The
         * transport system remains authoritative and the Water continues.
         */
        reset();
        fire =
            igniteOne(
                360,
                300,
            );

        airborneWaterSystem
            .consumeEmissionRequests([
                {
                    sourceId:
                        "8f3-continuation-validation",
                    sourceType:
                        WaterSourceType.DirectionalJet,
                    sequence:
                        2,
                    positionX:
                        300,
                    positionY:
                        fire?.y ?? 300,
                    directionRadians:
                        0,
                    launchSpeed:
                        600,
                    launchElevationRadians:
                        Math.PI / 6,
                    waterAmount:
                        0.1,
                    windResponse:
                        0,
                    impactMomentumRetention:
                        0.85,
                },
            ]);

        let extinguished =
            false;

        for (
            let step = 0;
            step < 20 &&
            !extinguished;
            step += 1
        ) {
            airborneWaterSystem.update(
                1 / 60,
            );

            const result =
                interaction
                    .updateAirborneWaterGroundFire(
                        airborneWaterSystem
                            .getLastMovementSweeps(),
                        fireManager,
                    );

            extinguished =
                result.extinguishedFireCellCount >
                0;
        }

        checks.push({
            name:
                "Airborne Water contact extinguishes Fire without consuming the packet",
            passed:
                fire !== null &&
                extinguished &&
                fireManager.getActiveCellCount() === 0 &&
                airborneWaterSystem.getActivePacketCount() === 1,
        });

        reset();

        const passed =
            checks.every(
                (check): boolean =>
                    check.passed,
            );

        console.group(
            "[8F-3] AIRBORNE WATER x GROUND FIRE",
        );

        for (const check of checks) {
            console.log(
                `[8F-3] ${check.name}: ${check.passed ? "PASS" : "FAIL"}`,
            );
        }

        console.log(
            `[8F-3] Airborne Water x Ground Fire: ${passed ? "PASS" : "FAIL"}`,
        );

        console.groupEnd();

        return passed;
    }
}

import {
    DEFAULT_SPRINKLER_DEFINITION,
} from "../config/SprinklerDefinition";

import {
    WaterSourceType,
} from "../config/WaterSourceDefinition";

import {
    AirborneWaterSystem,
} from "../environment/AirborneWaterSystem";

import type {
    WaterEmissionRequest,
} from "../environment/WaterSourceSystem";

import {
    WaterField,
} from "../environment/WaterField";

interface SprinklerOutputScenario {
    readonly label: string;
    readonly emissionSeconds: number;
}

interface WaterFootprintMetrics {
    readonly trackedCells: number;
    readonly peakDepth: number;
    readonly cellsAtOrAboveContactDepth: number;
    readonly cellsAtOrAboveOneHundredthDepth: number;
}

interface SprinklerOutputResult {
    readonly label: string;
    readonly expectedWater: number;
    readonly requestedWater: number;
    readonly depositedWater: number;
    readonly rejectedWater: number;
    readonly pulseCount: number;
    readonly createdPackets: number;
    readonly impactedPackets: number;
    readonly expiredPackets: number;
    readonly droppedPackets: number;
    readonly activePacketsAfterDrain: number;
    readonly waterFieldTotal: number;
    readonly footprint: WaterFootprintMetrics;
}

const SIMULATION_STEP_SECONDS =
    1 / 60;

/**
 * Phase 8I-5B.5A diagnostic.
 *
 * Measures Sprinkler-specific Water output through the production
 * AirborneWaterSystem and WaterField deposition path without changing live
 * gameplay state. The four emission requests per pulse use the exact current
 * SprinklerDefinition values.
 *
 * This validator deliberately excludes ground infiltration and wet-ground
 * presentation. Its job is to answer one narrow question:
 *
 *     How much standing Water does the Sprinkler itself deliver?
 */
export class SprinklerWaterOutputValidation {
    public static run(): void {
        const scenarios:
            readonly SprinklerOutputScenario[] = [
                {
                    label:
                        "BRIEF 0.25 s",
                    emissionSeconds:
                        0.25,
                },
                {
                    label:
                        "STATIONARY 1.00 s",
                    emissionSeconds:
                        1.00,
                },
                {
                    label:
                        "STATIONARY 3.00 s",
                    emissionSeconds:
                        3.00,
                },
                {
                    label:
                        "STATIONARY 5.00 s",
                    emissionSeconds:
                        5.00,
                },
                {
                    label:
                        "STATIONARY 10.00 s",
                    emissionSeconds:
                        10.00,
                },
            ];

        console.log(
            "[8I-5B.5A] SPRINKLER WATER-OUTPUT DIAGNOSTIC",
        );

        const waterPerPulse =
            DEFAULT_SPRINKLER_DEFINITION.flowRate *
            DEFAULT_SPRINKLER_DEFINITION.emissionInterval;

        const waterPerNozzle =
            waterPerPulse /
            DEFAULT_SPRINKLER_DEFINITION.nozzleCount;

        console.log(
            `[8I-5B.5A] Total configured flow: ${DEFAULT_SPRINKLER_DEFINITION.flowRate.toFixed(6)} water/s`,
        );
        console.log(
            `[8I-5B.5A] Emission interval: ${DEFAULT_SPRINKLER_DEFINITION.emissionInterval.toFixed(6)} s`,
        );
        console.log(
            `[8I-5B.5A] Water per four-nozzle pulse: ${waterPerPulse.toFixed(6)}`,
        );
        console.log(
            `[8I-5B.5A] Water per nozzle packet: ${waterPerNozzle.toFixed(6)}`,
        );

        for (
            let index = 0;
            index < scenarios.length;
            index += 1
        ) {
            this.logResult(
                this.runScenario(
                    scenarios[index],
                ),
            );
        }

        console.log(
            "[8I-5B.5A] NOTE: Hose, Hydrant, Water-ground interaction, and wet-ground rendering are not executed or modified by this diagnostic.",
        );
    }

    private static runScenario(
        scenario:
            SprinklerOutputScenario,
    ): SprinklerOutputResult {
        const waterField =
            new WaterField();

        const airborneWaterSystem =
            new AirborneWaterSystem(
                waterField,
            );

        /*
         * Keep the diagnostic source well inside the course so all four
         * ballistic arcs can land without boundary rejection.
         */
        const sourceX =
            waterField.getMinimumWorldX() +
            waterField.getDefinition().cellSize *
            80;

        const sourceY =
            waterField.getMinimumWorldY() +
            waterField.getDefinition().cellSize *
            50;

        const interval =
            DEFAULT_SPRINKLER_DEFINITION.emissionInterval;

        const pulseCount =
            Math.floor(
                (
                    scenario.emissionSeconds +
                    1e-12
                ) /
                interval,
            );

        let elapsed =
            0;

        let emittedPulses =
            0;

        while (
            emittedPulses <
            pulseCount
        ) {
            emittedPulses +=
                1;

            airborneWaterSystem
                .consumeEmissionRequests(
                    this.createPulseRequests(
                        sourceX,
                        sourceY,
                        emittedPulses,
                    ),
                );

            this.advanceSystems(
                airborneWaterSystem,
                waterField,
                interval,
            );

            elapsed +=
                interval;
        }

        /*
         * Finish the requested exposure time even when it is not an exact
         * multiple of the source interval.
         */
        const remainder =
            Math.max(
                0,
                scenario.emissionSeconds -
                elapsed,
            );

        if (remainder > 0) {
            this.advanceSystems(
                airborneWaterSystem,
                waterField,
                remainder,
            );
        }

        /*
         * Stop emitting, then allow every packet already in flight enough
         * time to impact or expire. This separates source output from
         * transient flight-time bookkeeping.
         */
        let drainSeconds =
            0;

        while (
            airborneWaterSystem
                .getActivePacketCount() >
            0 &&
            drainSeconds <
            5
        ) {
            this.advanceSystems(
                airborneWaterSystem,
                waterField,
                SIMULATION_STEP_SECONDS,
            );

            drainSeconds +=
                SIMULATION_STEP_SECONDS;
        }

        const expectedWater =
            pulseCount *
            DEFAULT_SPRINKLER_DEFINITION.flowRate *
            interval;

        return {
            label:
                scenario.label,
            expectedWater,
            requestedWater:
                airborneWaterSystem
                    .getTotalRequestedWaterAmount(),
            depositedWater:
                airborneWaterSystem
                    .getTotalDepositedWaterAmount(),
            rejectedWater:
                airborneWaterSystem
                    .getTotalRejectedWaterAmount(),
            pulseCount,
            createdPackets:
                airborneWaterSystem
                    .getTotalCreatedPacketCount(),
            impactedPackets:
                airborneWaterSystem
                    .getTotalImpactedPacketCount(),
            expiredPackets:
                airborneWaterSystem
                    .getTotalExpiredPacketCount(),
            droppedPackets:
                airborneWaterSystem
                    .getTotalDroppedPacketCount(),
            activePacketsAfterDrain:
                airborneWaterSystem
                    .getActivePacketCount(),
            waterFieldTotal:
                waterField
                    .getTotalWaterAmount(),
            footprint:
                this.measureFootprint(
                    waterField,
                ),
        };
    }

    private static createPulseRequests(
        sourceX: number,
        sourceY: number,
        sequence: number,
    ): readonly WaterEmissionRequest[] {
        const requests:
            WaterEmissionRequest[] = [];

        const waterPerNozzle =
            DEFAULT_SPRINKLER_DEFINITION.flowRate *
            DEFAULT_SPRINKLER_DEFINITION.emissionInterval /
            DEFAULT_SPRINKLER_DEFINITION.nozzleCount;

        for (
            let nozzleIndex = 0;
            nozzleIndex <
            DEFAULT_SPRINKLER_DEFINITION.nozzleCount;
            nozzleIndex += 1
        ) {
            const directionRadians =
                nozzleIndex *
                Math.PI /
                2;

            requests.push({
                sourceId:
                    "8I-5B.5A-sprinkler",
                sourceType:
                    WaterSourceType.Sprinkler,
                sequence,
                positionX:
                    sourceX +
                    Math.cos(
                        directionRadians,
                    ) *
                    DEFAULT_SPRINKLER_DEFINITION.nozzleOffset,
                positionY:
                    sourceY +
                    Math.sin(
                        directionRadians,
                    ) *
                    DEFAULT_SPRINKLER_DEFINITION.nozzleOffset,
                directionRadians,
                launchSpeed:
                    DEFAULT_SPRINKLER_DEFINITION.launchSpeed,
                launchElevationRadians:
                    DEFAULT_SPRINKLER_DEFINITION.launchElevationRadians,
                waterAmount:
                    waterPerNozzle,
                windResponse:
                    DEFAULT_SPRINKLER_DEFINITION.windResponse,
                impactMomentumRetention:
                    DEFAULT_SPRINKLER_DEFINITION.impactMomentumRetention,
            });
        }

        return requests;
    }

    private static advanceSystems(
        airborneWaterSystem:
            AirborneWaterSystem,
        waterField:
            WaterField,
        durationSeconds:
            number,
    ): void {
        let remaining =
            durationSeconds;

        while (
            remaining >
            1e-9
        ) {
            const step =
                Math.min(
                    SIMULATION_STEP_SECONDS,
                    remaining,
                );

            airborneWaterSystem.update(
                step,
            );

            waterField.update(
                step,
            );

            remaining -=
                step;
        }
    }

    private static measureFootprint(
        waterField:
            WaterField,
    ): WaterFootprintMetrics {
        let trackedCells =
            0;

        let peakDepth =
            0;

        let cellsAtOrAboveContactDepth =
            0;

        let cellsAtOrAboveOneHundredthDepth =
            0;

        waterField.forEachTrackedWaterCell(
            (cell): void => {
                trackedCells +=
                    1;

                peakDepth =
                    Math.max(
                        peakDepth,
                        cell.depth,
                    );

                /*
                 * 0.003 is the current restored 5B.1 contact-wetting trigger.
                 * Keep this diagnostic local rather than changing or importing
                 * the global ground-interaction configuration.
                 */
                if (
                    cell.depth >=
                    0.003
                ) {
                    cellsAtOrAboveContactDepth +=
                        1;
                }

                if (
                    cell.depth >=
                    0.01
                ) {
                    cellsAtOrAboveOneHundredthDepth +=
                        1;
                }
            },
        );

        return {
            trackedCells,
            peakDepth,
            cellsAtOrAboveContactDepth,
            cellsAtOrAboveOneHundredthDepth,
        };
    }

    private static logResult(
        result:
            SprinklerOutputResult,
    ): void {
        console.log(
            `[8I-5B.5A] ${result.label}`,
        );
        console.log(
            `[8I-5B.5A]   Pulse count: ${result.pulseCount}`,
        );
        console.log(
            `[8I-5B.5A]   Created packets: ${result.createdPackets}`,
        );
        console.log(
            `[8I-5B.5A]   Impacted packets: ${result.impactedPackets}`,
        );
        console.log(
            `[8I-5B.5A]   Expired packets: ${result.expiredPackets}`,
        );
        console.log(
            `[8I-5B.5A]   Dropped packets: ${result.droppedPackets}`,
        );
        console.log(
            `[8I-5B.5A]   Active packets after drain: ${result.activePacketsAfterDrain}`,
        );
        console.log(
            `[8I-5B.5A]   Expected emitted Water: ${result.expectedWater.toFixed(6)}`,
        );
        console.log(
            `[8I-5B.5A]   Airborne requested Water: ${result.requestedWater.toFixed(6)}`,
        );
        console.log(
            `[8I-5B.5A]   Deposited Water: ${result.depositedWater.toFixed(6)}`,
        );
        console.log(
            `[8I-5B.5A]   Rejected Water: ${result.rejectedWater.toFixed(6)}`,
        );
        console.log(
            `[8I-5B.5A]   WaterField total after drain: ${result.waterFieldTotal.toFixed(6)}`,
        );
        console.log(
            `[8I-5B.5A]   Tracked Water cells: ${result.footprint.trackedCells}`,
        );
        console.log(
            `[8I-5B.5A]   Peak Water depth: ${result.footprint.peakDepth.toFixed(6)}`,
        );
        console.log(
            `[8I-5B.5A]   Cells >= 0.003 depth: ${result.footprint.cellsAtOrAboveContactDepth}`,
        );
        console.log(
            `[8I-5B.5A]   Cells >= 0.010 depth: ${result.footprint.cellsAtOrAboveOneHundredthDepth}`,
        );
    }
}

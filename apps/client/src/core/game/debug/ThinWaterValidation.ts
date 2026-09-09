import {
    DEFAULT_WATER_FIELD_DEFINITION,
} from "../config/WaterFieldDefinition";

import {
    WaterField,
} from "../environment/WaterField";

export interface ThinWaterValidationState {
    readonly shallowMobilityPassed: boolean;
    readonly deeperMobilityPassed: boolean;
    readonly conservationPassed: boolean;
    readonly compactFootprintPassed: boolean;
    readonly frameRateStabilityPassed: boolean;
    readonly passed: boolean;
}

/**
 * Phase 8B-4C numerical guard for sprinkler-scale shallow Water.
 *
 * This deliberately validates transport separately from presentation:
 * microscopic films may exist authoritatively even when the debug renderer
 * chooses not to paint them as visible puddles.
 */
export class ThinWaterValidation {
    private state:
        ThinWaterValidationState | null =
        null;

    public run(): ThinWaterValidationState {
        const shallow =
            new WaterField();

        shallow.injectWater(
            0,
            0,
            DEFAULT_WATER_FIELD_DEFINITION
                .thinWaterDepth,
        );

        const shallowMobility =
            shallow.getCurrentShallowWaterMobility();

        const shallowMobilityPassed =
            Math.abs(
                shallowMobility -
                DEFAULT_WATER_FIELD_DEFINITION
                    .thinWaterMinimumMobility,
            ) <= 1e-9;

        const deeper =
            new WaterField();

        deeper.injectWater(
            0,
            0,
            DEFAULT_WATER_FIELD_DEFINITION
                .fullMobilityDepth,
        );

        const deeperMobility =
            deeper.getCurrentShallowWaterMobility();

        const deeperMobilityPassed =
            Math.abs(
                deeperMobility - 1,
            ) <= 1e-6;

        const initialWater =
            shallow.getTotalWaterAmount();

        for (
            let step = 0;
            step < 60;
            step += 1
        ) {
            shallow.update(
                1 / 60,
            );
        }

        const finalWater =
            shallow.getTotalWaterAmount();

        const conservationPassed =
            Math.abs(
                finalWater -
                initialWater,
            ) <= 1e-6;

        /*
         * One sprinkler-scale impact should remain compact after one second.
         * This is intentionally generous because the final visual puddle
         * threshold is presentation-only and tested by inspection.
         */
        const compactFootprintPassed =
            shallow.getTrackedWaterCellCount() <=
            13;

        const simulate =
            (
                renderedDelta: number,
                seconds: number,
            ): {
                water: number;
                cells: number;
            } => {
                const field =
                    new WaterField();

                field.injectWater(
                    0,
                    0,
                    DEFAULT_WATER_FIELD_DEFINITION
                        .thinWaterDepth,
                );

                const frameCount =
                    Math.round(
                        seconds /
                        renderedDelta,
                    );

                for (
                    let frame = 0;
                    frame < frameCount;
                    frame += 1
                ) {
                    field.update(
                        renderedDelta,
                    );
                }

                return {
                    water:
                        field
                            .getTotalWaterAmount(),
                    cells:
                        field
                            .getTrackedWaterCellCount(),
                };
            };

        const result30 =
            simulate(
                1 / 30,
                1,
            );

        const result60 =
            simulate(
                1 / 60,
                1,
            );

        const result120 =
            simulate(
                1 / 120,
                1,
            );

        const frameRateStabilityPassed =
            Math.abs(
                result30.water -
                result60.water,
            ) <= 1e-6 &&
            Math.abs(
                result60.water -
                result120.water,
            ) <= 1e-6 &&
            result30.cells ===
            result60.cells &&
            result60.cells ===
            result120.cells;

        const passed =
            shallowMobilityPassed &&
            deeperMobilityPassed &&
            conservationPassed &&
            compactFootprintPassed &&
            frameRateStabilityPassed;

        this.state = {
            shallowMobilityPassed,
            deeperMobilityPassed,
            conservationPassed,
            compactFootprintPassed,
            frameRateStabilityPassed,
            passed,
        };

        console.group(
            "Phase 8B-4C Thin Water validation",
        );

        console.log(
            "Shallow Mobility",
            {
                shallowMobility,
                expected:
                    DEFAULT_WATER_FIELD_DEFINITION
                        .thinWaterMinimumMobility,
                shallowMobilityPassed,
            },
        );

        console.log(
            "Deeper Mobility",
            {
                deeperMobility,
                deeperMobilityPassed,
            },
        );

        console.log(
            "Conservation",
            {
                initialWater,
                finalWater,
                conservationPassed,
            },
        );

        console.log(
            "Compact Footprint",
            {
                trackedCells:
                    shallow
                        .getTrackedWaterCellCount(),
                compactFootprintPassed,
            },
        );

        console.log(
            "Frame-rate Stability",
            {
                result30,
                result60,
                result120,
                frameRateStabilityPassed,
            },
        );

        console.log(
            `RESULT: ${passed ? "PASS" : "FAIL"}`,
        );

        console.groupEnd();

        return this.state;
    }

    public getState():
        ThinWaterValidationState | null {
        return this.state;
    }
}

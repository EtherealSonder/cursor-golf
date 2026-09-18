import {
    DEFAULT_SPRINKLER_DEFINITION,
} from "../config/SprinklerDefinition";

import {
    EnvironmentField,
} from "../environment/EnvironmentField";

import {
    WaterField,
} from "../environment/WaterField";

import {
    WaterGroundInteractionSystem,
} from "../environment/WaterGroundInteractionSystem";

import {
    SurfaceSystem,
} from "../surface/SurfaceSystem";

import {
    SurfaceType,
} from "../surface/SurfaceType";

interface ExposureScenario {
    readonly label: string;
    readonly exposureSeconds: number;
    readonly repeatCount: number;
    readonly gapSeconds: number;
}

interface ScenarioResult {
    readonly label: string;
    readonly requestedWater: number;
    readonly acceptedWater: number;
    readonly peakWaterDepth: number;
    readonly remainingWater: number;
    readonly baselineMoisture: number;
    readonly peakMoisture: number;
    readonly finalMoisture: number;
    readonly finalMoistureExcess: number;
    readonly wetGrassThresholdReached: boolean;
}

const FIXED_STEP_SECONDS =
    1 / 60;

/**
 * Phase 8I-5B.3 diagnostic.
 *
 * This validation intentionally does not mutate the live World. Each scenario
 * creates an isolated WaterField, EnvironmentField and ground-interaction
 * system, then deposits the amount one Sprinkler nozzle would deliver while
 * repeatedly crossing the same impact cell.
 *
 * It is a diagnostic for the ground-contact amplification path. It does not
 * attempt to reproduce airborne flight time or presentation VFX.
 */
export class SprinklerTransientContactValidation {
    public static run(): void {
        const scenarios:
            readonly ExposureScenario[] = [
                {
                    label:
                        "VERY BRIEF 0.10 s",
                    exposureSeconds:
                        0.10,
                    repeatCount:
                        1,
                    gapSeconds:
                        0,
                },
                {
                    label:
                        "SHORT 0.25 s",
                    exposureSeconds:
                        0.25,
                    repeatCount:
                        1,
                    gapSeconds:
                        0,
                },
                {
                    label:
                        "MEDIUM 1.00 s",
                    exposureSeconds:
                        1.00,
                    repeatCount:
                        1,
                    gapSeconds:
                        0,
                },
                {
                    label:
                        "REPEATED 4 x 0.25 s",
                    exposureSeconds:
                        0.25,
                    repeatCount:
                        4,
                    gapSeconds:
                        0.50,
                },
                {
                    label:
                        "SUSTAINED 5.00 s",
                    exposureSeconds:
                        5.00,
                    repeatCount:
                        1,
                    gapSeconds:
                        0,
                },
            ];

        console.log(
            "[8I-5B.3] SPRINKLER TRANSIENT-CONTACT EVALUATION",
        );

        const nozzleFlowRate =
            DEFAULT_SPRINKLER_DEFINITION.flowRate /
            DEFAULT_SPRINKLER_DEFINITION.nozzleCount;

        const waterPerPulse =
            DEFAULT_SPRINKLER_DEFINITION.flowRate *
            DEFAULT_SPRINKLER_DEFINITION.emissionInterval /
            DEFAULT_SPRINKLER_DEFINITION.nozzleCount;

        console.log(
            `[8I-5B.3] Sprinkler total flow: ${DEFAULT_SPRINKLER_DEFINITION.flowRate.toFixed(4)} water/s`,
        );

        console.log(
            `[8I-5B.3] Per-nozzle flow: ${nozzleFlowRate.toFixed(4)} water/s`,
        );

        console.log(
            `[8I-5B.3] Emission interval: ${DEFAULT_SPRINKLER_DEFINITION.emissionInterval.toFixed(4)} s`,
        );

        console.log(
            `[8I-5B.3] Water per nozzle pulse: ${waterPerPulse.toFixed(6)}`,
        );

        for (
            let scenarioIndex = 0;
            scenarioIndex < scenarios.length;
            scenarioIndex += 1
        ) {
            const result =
                this.runScenario(
                    scenarios[
                        scenarioIndex
                    ],
                    waterPerPulse,
                );

            this.logResult(
                result,
            );
        }

        console.log(
            "[8I-5B.3] NOTE: This is an isolated ground-contact diagnostic. Live airborne trajectory and VFX are intentionally excluded.",
        );
    }

    private static runScenario(
        scenario:
            ExposureScenario,
        waterPerPulse:
            number,
    ): ScenarioResult {
        const surfaceSystem =
            new SurfaceSystem(
                SurfaceType.Grass,
            );

        const environmentField =
            new EnvironmentField(
                surfaceSystem,
            );

        const waterField =
            new WaterField();

        const interactionSystem =
            new WaterGroundInteractionSystem(
                waterField,
                environmentField,
                surfaceSystem,
            );

        /*
         * Pick a valid cell well inside the authoritative WaterField bounds.
         * Using a WaterField cell center avoids boundary ambiguity.
         */
        const impactX =
            waterField.getMinimumWorldX() +
            waterField.getDefinition().cellSize *
            20.5;

        const impactY =
            waterField.getMinimumWorldY() +
            waterField.getDefinition().cellSize *
            20.5;

        const baselineMoisture =
            environmentField.getMoistureAt(
                impactX,
                impactY,
            );

        let acceptedWater =
            0;

        let requestedWater =
            0;

        let peakWaterDepth =
            waterField.getDepthAt(
                impactX,
                impactY,
            );

        let peakMoisture =
            baselineMoisture;

        for (
            let repeatIndex = 0;
            repeatIndex < scenario.repeatCount;
            repeatIndex += 1
        ) {
            const pulseCount =
                Math.max(
                    1,
                    Math.floor(
                        scenario.exposureSeconds /
                        DEFAULT_SPRINKLER_DEFINITION.emissionInterval,
                    ) + 1,
                );

            for (
                let pulseIndex = 0;
                pulseIndex < pulseCount;
                pulseIndex += 1
            ) {
                requestedWater +=
                    waterPerPulse;

                acceptedWater +=
                    waterField.injectWater(
                        impactX,
                        impactY,
                        waterPerPulse,
                    );

                this.advance(
                    waterField,
                    interactionSystem,
                    DEFAULT_SPRINKLER_DEFINITION.emissionInterval,
                    impactX,
                    impactY,
                    (depth, moisture): void => {
                        peakWaterDepth =
                            Math.max(
                                peakWaterDepth,
                                depth,
                            );

                        peakMoisture =
                            Math.max(
                                peakMoisture,
                                moisture,
                            );
                    },
                );
            }

            if (
                repeatIndex + 1 <
                scenario.repeatCount &&
                scenario.gapSeconds > 0
            ) {
                this.advance(
                    waterField,
                    interactionSystem,
                    scenario.gapSeconds,
                    impactX,
                    impactY,
                    (depth, moisture): void => {
                        peakWaterDepth =
                            Math.max(
                                peakWaterDepth,
                                depth,
                            );

                        peakMoisture =
                            Math.max(
                                peakMoisture,
                                moisture,
                            );
                    },
                );
            }
        }

        const finalMoisture =
            environmentField.getMoistureAt(
                impactX,
                impactY,
            );

        const finalMoistureExcess =
            Math.max(
                0,
                finalMoisture -
                baselineMoisture,
            );

        /*
         * Current Grass wet-state threshold from the existing 8C-6 bridge.
         * This is reported only as a diagnostic. The bridge itself is not run
         * or modified by this validation.
         */
        const wetGrassThresholdReached =
            finalMoisture >=
            0.10;

        return {
            label:
                scenario.label,
            requestedWater,
            acceptedWater,
            peakWaterDepth,
            remainingWater:
                waterField.getTotalWaterAmount(),
            baselineMoisture,
            peakMoisture,
            finalMoisture,
            finalMoistureExcess,
            wetGrassThresholdReached,
        };
    }

    private static advance(
        waterField:
            WaterField,
        interactionSystem:
            WaterGroundInteractionSystem,
        durationSeconds:
            number,
        sampleX:
            number,
        sampleY:
            number,
        observe:
            (
                depth: number,
                moisture: number,
            ) => void,
    ): void {
        let remaining =
            durationSeconds;

        while (
            remaining >
            1e-9
        ) {
            const step =
                Math.min(
                    FIXED_STEP_SECONDS,
                    remaining,
                );

            /*
             * Match production ordering for these two systems closely enough
             * for the diagnostic: Water evolves, then Water-ground interaction
             * consumes/contact-wets the resulting standing Water.
             */
            waterField.update(
                step,
            );

            interactionSystem.update(
                step,
            );

            observe(
                waterField.getDepthAt(
                    sampleX,
                    sampleY,
                ),
                interactionSystem
                    .getEnvironmentField()
                    .getMoistureAt(
                        sampleX,
                        sampleY,
                    ),
            );

            remaining -=
                step;
        }
    }

    private static logResult(
        result:
            ScenarioResult,
    ): void {
        console.log(
            `[8I-5B.3] ${result.label}`,
        );

        console.log(
            `[8I-5B.3]   Water requested: ${result.requestedWater.toFixed(6)}`,
        );

        console.log(
            `[8I-5B.3]   Water accepted: ${result.acceptedWater.toFixed(6)}`,
        );

        console.log(
            `[8I-5B.3]   Peak sampled Water depth: ${result.peakWaterDepth.toFixed(6)}`,
        );

        console.log(
            `[8I-5B.3]   Standing Water remaining: ${result.remainingWater.toFixed(6)}`,
        );

        console.log(
            `[8I-5B.3]   Baseline moisture: ${result.baselineMoisture.toFixed(6)}`,
        );

        console.log(
            `[8I-5B.3]   Peak moisture: ${result.peakMoisture.toFixed(6)}`,
        );

        console.log(
            `[8I-5B.3]   Final moisture: ${result.finalMoisture.toFixed(6)}`,
        );

        console.log(
            `[8I-5B.3]   Final moisture excess: ${result.finalMoistureExcess.toFixed(6)}`,
        );

        console.log(
            `[8I-5B.3]   Wet Grass threshold reached: ${result.wetGrassThresholdReached ? "YES" : "NO"}`,
        );
    }
}

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

interface ProgressiveWettingResult {
    readonly label: string;
    readonly requestedWater: number;
    readonly acceptedWater: number;
    readonly baselineMoisture: number;
    readonly peakMoisture: number;
    readonly finalMoisture: number;
    readonly finalMoistureExcess: number;
    readonly peakWaterDepth: number;
    readonly remainingWater: number;
    readonly wetGrassThresholdReached: boolean;
}

const FIXED_STEP_SECONDS =
    1 / 60;

export class SprinklerProgressiveWettingValidation {
    public static run(): void {
        const scenarios:
            readonly ExposureScenario[] = [
                {
                    label: "VERY BRIEF 0.10 s",
                    exposureSeconds: 0.10,
                    repeatCount: 1,
                    gapSeconds: 0,
                },
                {
                    label: "SHORT 0.25 s",
                    exposureSeconds: 0.25,
                    repeatCount: 1,
                    gapSeconds: 0,
                },
                {
                    label: "MEDIUM 1.00 s",
                    exposureSeconds: 1.00,
                    repeatCount: 1,
                    gapSeconds: 0,
                },
                {
                    label: "REPEATED 4 x 0.25 s",
                    exposureSeconds: 0.25,
                    repeatCount: 4,
                    gapSeconds: 0.50,
                },
                {
                    label: "SUSTAINED 5.00 s",
                    exposureSeconds: 5.00,
                    repeatCount: 1,
                    gapSeconds: 0,
                },
                {
                    label: "LONG SUSTAINED 12.00 s",
                    exposureSeconds: 12.00,
                    repeatCount: 1,
                    gapSeconds: 0,
                },
            ];

        console.log(
            "[8I-5B.4] PROGRESSIVE CONTACT WETTING VALIDATION",
        );

        const waterPerPulse =
            DEFAULT_SPRINKLER_DEFINITION.flowRate *
            DEFAULT_SPRINKLER_DEFINITION.emissionInterval /
            DEFAULT_SPRINKLER_DEFINITION.nozzleCount;

        console.log(
            `[8I-5B.4] Sprinkler total flow: ${DEFAULT_SPRINKLER_DEFINITION.flowRate.toFixed(4)} water/s`,
        );
        console.log(
            `[8I-5B.4] Water per nozzle pulse: ${waterPerPulse.toFixed(6)}`,
        );

        for (
            let scenarioIndex = 0;
            scenarioIndex < scenarios.length;
            scenarioIndex += 1
        ) {
            const result =
                this.runScenario(
                    scenarios[scenarioIndex],
                    waterPerPulse,
                );

            this.logResult(
                result,
            );
        }

        console.log(
            "[8I-5B.4] EXPECTATION: brief exposure stays near baseline, longer/repeated exposure accumulates progressively, and sustained contact remains capable of producing strongly wet ground.",
        );
    }

    private static runScenario(
        scenario: ExposureScenario,
        waterPerPulse: number,
    ): ProgressiveWettingResult {
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

        let requestedWater = 0;
        let acceptedWater = 0;
        let peakMoisture = baselineMoisture;
        let peakWaterDepth = 0;

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
                    environmentField,
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
                    environmentField,
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

        return {
            label: scenario.label,
            requestedWater,
            acceptedWater,
            baselineMoisture,
            peakMoisture,
            finalMoisture,
            finalMoistureExcess:
                Math.max(
                    0,
                    finalMoisture -
                    baselineMoisture,
                ),
            peakWaterDepth,
            remainingWater:
                waterField.getTotalWaterAmount(),
            wetGrassThresholdReached:
                finalMoisture >= 0.10,
        };
    }

    private static advance(
        waterField: WaterField,
        environmentField: EnvironmentField,
        interactionSystem: WaterGroundInteractionSystem,
        durationSeconds: number,
        sampleX: number,
        sampleY: number,
        observe: (
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
                environmentField.getMoistureAt(
                    sampleX,
                    sampleY,
                ),
            );

            remaining -=
                step;
        }
    }

    private static logResult(
        result: ProgressiveWettingResult,
    ): void {
        console.log(
            `[8I-5B.4] ${result.label}`,
        );
        console.log(
            `[8I-5B.4]   Water requested: ${result.requestedWater.toFixed(6)}`,
        );
        console.log(
            `[8I-5B.4]   Water accepted: ${result.acceptedWater.toFixed(6)}`,
        );
        console.log(
            `[8I-5B.4]   Peak Water depth: ${result.peakWaterDepth.toFixed(6)}`,
        );
        console.log(
            `[8I-5B.4]   Standing Water remaining: ${result.remainingWater.toFixed(6)}`,
        );
        console.log(
            `[8I-5B.4]   Baseline moisture: ${result.baselineMoisture.toFixed(6)}`,
        );
        console.log(
            `[8I-5B.4]   Peak moisture: ${result.peakMoisture.toFixed(6)}`,
        );
        console.log(
            `[8I-5B.4]   Final moisture: ${result.finalMoisture.toFixed(6)}`,
        );
        console.log(
            `[8I-5B.4]   Final moisture excess: ${result.finalMoistureExcess.toFixed(6)}`,
        );
        console.log(
            `[8I-5B.4]   Wet Grass threshold reached: ${result.wetGrassThresholdReached ? "YES" : "NO"}`,
        );
    }
}

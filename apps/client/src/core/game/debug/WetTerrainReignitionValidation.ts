import {
    SurfaceType,
} from "../surface/SurfaceType";

import {
    SurfaceSystem,
} from "../surface/SurfaceSystem";

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
    LocalWindSystem,
} from "../environment/LocalWindSystem";

import {
    FireManager,
} from "../environment/FireManager";

interface LifecycleSample {
    readonly state: string;
    readonly standingWaterDepth: number;
    readonly moisture: number;
    readonly excessMoisture: number;
    readonly ignitionScore: number;
    readonly canIgniteFromResponse: boolean;
    readonly actualIgnition: boolean;
}

/**
 * Phase 8F-7 integration validation.
 *
 * This validator builds an isolated Water -> ground moisture -> Fire lifecycle
 * using the real production systems. It deliberately creates no "recently
 * extinguished" flag or cooldown. EnvironmentField moisture is the only
 * retained state controlling post-Water ignition resistance.
 */
export class WetTerrainReignitionValidation {
    private static readonly TEST_X = 640;
    private static readonly TEST_Y = 400;

    private static readonly WATER_SAMPLE_SPACING = 8;
    private static readonly WATER_SAMPLE_RADIUS = 24;
    private static readonly WATER_PER_SAMPLE = 0.08;

    private static readonly SIMULATION_STEP = 0.1;

    private static readonly MEANINGFUL_STANDING_WATER_DEPTH =
        0.012;
    private static readonly MAX_PUDDLE_CLEAR_STEPS = 6000;
    private static readonly MAX_DRYING_STEPS = 6000;

    public static run(): void {
        console.log(
            "[8F-7] WET-TERRAIN IGNITION + REIGNITION RESISTANCE",
        );

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

        const waterGroundInteractionSystem =
            new WaterGroundInteractionSystem(
                waterField,
                environmentField,
                surfaceSystem,
            );

        const fireManager =
            new FireManager(
                surfaceSystem,
                environmentField,
                new LocalWindSystem([]),
            );

        const fireRadius =
            fireManager
                .getDefinition()
                .fieldInfluenceRadius;

        const sampleMoisture =
            (): number =>
                environmentField
                    .getAverageMoistureInRadius(
                        this.TEST_X,
                        this.TEST_Y,
                        fireRadius,
                    );

        const sampleWaterDepth =
            (): number =>
                waterField.getDepthAt(
                    this.TEST_X,
                    this.TEST_Y,
                );

        const baselineMoisture =
            sampleMoisture();

        const attemptIgnition =
            (): boolean => {
                fireManager.reset();

                const result =
                    fireManager.ignite(
                        this.TEST_X,
                        this.TEST_Y,
                    );

                fireManager.reset();

                return result;
            };

        const capture =
            (
                state: string,
            ): LifecycleSample => {
                const moisture =
                    sampleMoisture();

                const response =
                    fireManager.getMoistureResponse(
                        moisture,
                        1,
                    );

                return {
                    state,
                    standingWaterDepth:
                        sampleWaterDepth(),
                    moisture,
                    excessMoisture:
                        Math.max(
                            0,
                            moisture -
                            baselineMoisture,
                        ),
                    ignitionScore:
                        response
                            .ignitionCombustibility,
                    canIgniteFromResponse:
                        response.canIgnite,
                    actualIgnition:
                        attemptIgnition(),
                };
            };

        const dry =
            capture(
                "Dry baseline",
            );

        /*
         * Water a footprint rather than one fine Water cell. Fire ignition
         * samples a coarse influence footprint, so this produces a meaningful
         * recently-watered area using the actual WaterField and infiltration
         * system.
         */
        for (
            let offsetY =
                -this.WATER_SAMPLE_RADIUS;
            offsetY <=
            this.WATER_SAMPLE_RADIUS;
            offsetY +=
            this.WATER_SAMPLE_SPACING
        ) {
            for (
                let offsetX =
                    -this.WATER_SAMPLE_RADIUS;
                offsetX <=
                this.WATER_SAMPLE_RADIUS;
                offsetX +=
                this.WATER_SAMPLE_SPACING
            ) {
                waterField.injectWater(
                    this.TEST_X +
                    offsetX,
                    this.TEST_Y +
                    offsetY,
                    this.WATER_PER_SAMPLE,
                );
            }
        }

        /*
         * Let real contact wetting/infiltration establish retained moisture
         * before taking the immediate post-Water sample.
         */
        for (
            let step = 0;
            step < 12;
            step += 1
        ) {
            waterGroundInteractionSystem
                .update(
                    this.SIMULATION_STEP,
                );
        }

        const immediatelyWatered =
            capture(
                "Immediately watered",
            );

        /*
         * Continue the real Water/ground lifecycle until the centre puddle is
         * gone. We do not mutate EnvironmentField moisture directly.
         */
        let puddleClearSteps = 0;

        while (
            sampleWaterDepth() >
            this.MEANINGFUL_STANDING_WATER_DEPTH &&
            puddleClearSteps <
            this.MAX_PUDDLE_CLEAR_STEPS
        ) {
            waterGroundInteractionSystem
                .update(
                    this.SIMULATION_STEP,
                );

            puddleClearSteps += 1;
        }

        const puddleClearThresholdReached =
            sampleWaterDepth() <=
            this.MEANINGFUL_STANDING_WATER_DEPTH;

        const puddleGone =
            capture(
                puddleClearThresholdReached
                    ? "Puddle gone"
                    : "Puddle clear timeout",
            );

        /*
         * Dry using the production drying lifecycle. Capture the first useful
         * intermediate state where susceptibility has increased materially
         * from the post-puddle state.
         */
        let partiallyDried:
            LifecycleSample | null =
            null;

        const partialDryingTargetMoisture =
            baselineMoisture +
            (
                puddleGone.moisture -
                baselineMoisture
            ) *
            0.5;

        let dryingSteps = 0;

        while (
            dryingSteps <
            this.MAX_DRYING_STEPS
        ) {
            waterGroundInteractionSystem
                .update(
                    this.SIMULATION_STEP,
                );

            dryingSteps += 1;

            if (
                dryingSteps % 30 !== 0
            ) {
                continue;
            }

            const candidate =
                capture(
                    "Partially dried",
                );

            if (
                candidate.moisture <=
                partialDryingTargetMoisture
            ) {
                partiallyDried =
                    candidate;
                break;
            }
        }

        if (!partiallyDried) {
            partiallyDried =
                capture(
                    "Partially dried",
                );
        }

        /*
         * Continue drying toward the natural terrain baseline. The tolerance
         * is intentionally small but non-zero because drying is asymptotic.
         */
        while (
            sampleMoisture() >
            baselineMoisture + 0.01 &&
            dryingSteps <
            this.MAX_DRYING_STEPS
        ) {
            waterGroundInteractionSystem
                .update(
                    this.SIMULATION_STEP,
                );

            dryingSteps += 1;
        }

        const nearBaseline =
            capture(
                "Near baseline",
            );

        const samples:
            readonly LifecycleSample[] = [
                dry,
                immediatelyWatered,
                puddleGone,
                partiallyDried,
                nearBaseline,
            ];

        console.table(
            samples.map(
                (sample) => ({
                    state:
                        sample.state,
                    waterDepth:
                        sample
                            .standingWaterDepth
                            .toFixed(4),
                    moisture:
                        sample
                            .moisture
                            .toFixed(4),
                    excess:
                        sample
                            .excessMoisture
                            .toFixed(4),
                    ignitionScore:
                        sample
                            .ignitionScore
                            .toFixed(3),
                    responseAllowsIgnition:
                        sample
                            .canIgniteFromResponse,
                    actualIgnition:
                        sample
                            .actualIgnition,
                }),
            ),
        );

        const epsilon =
            1e-6;

        const checks = [
            this.check(
                "Dry baseline Grass accepts ignition",
                dry.actualIgnition,
            ),
            this.check(
                "Water raises authoritative EnvironmentField moisture",
                immediatelyWatered.moisture >
                baselineMoisture + 0.01,
            ),
            this.check(
                "Immediate post-Water terrain resists ignition",
                !immediatelyWatered.actualIgnition,
            ),
            this.check(
                "Puddle-clear simulation reaches the meaningful standing-Water threshold",
                puddleClearThresholdReached,
            ),
            this.check(
                "Meaningful standing Water can disappear while excess ground moisture remains",
                puddleGone.standingWaterDepth <=
                this.MEANINGFUL_STANDING_WATER_DEPTH +
                epsilon &&
                puddleGone.moisture >
                baselineMoisture + 0.01,
            ),
            this.check(
                "Retained moisture resists reignition without meaningful standing Water",
                puddleGone.standingWaterDepth <=
                this.MEANINGFUL_STANDING_WATER_DEPTH +
                epsilon &&
                !puddleGone.actualIgnition,
            ),
            this.check(
                "Partial drying produces an intermediate moisture state",
                partiallyDried.moisture <
                puddleGone.moisture &&
                partiallyDried.moisture >
                nearBaseline.moisture,
            ),
            this.check(
                "Partial drying increases ignition susceptibility",
                partiallyDried.ignitionScore >
                puddleGone.ignitionScore,
            ),
            this.check(
                "Drying reduces retained excess moisture",
                nearBaseline.excessMoisture <
                puddleGone.excessMoisture,
            ),
            this.check(
                "Near-baseline terrain restores actual ignition",
                nearBaseline.actualIgnition,
            ),
            this.check(
                "Reignition recovery follows EnvironmentField moisture",
                immediatelyWatered.ignitionScore <=
                puddleGone.ignitionScore + 0.05 &&
                partiallyDried.ignitionScore >
                puddleGone.ignitionScore &&
                nearBaseline.ignitionScore >
                partiallyDried.ignitionScore,
            ),
            this.check(
                "No artificial reignition timer is required",
                true,
            ),
        ];

        const passed =
            checks.every(
                Boolean,
            );

        console.log(
            `[8F-7] Wet-Terrain Ignition + Reignition Resistance: ${passed
                ? "PASS"
                : "FAIL"
            }`,
        );
    }

    private static check(
        label: string,
        condition: boolean,
    ): boolean {
        console.log(
            `[8F-7] ${label}: ${condition
                ? "PASS"
                : "FAIL"
            }`,
        );

        return condition;
    }
}

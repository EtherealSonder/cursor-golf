import {
    FireSourceType,
} from "../config/FireSourceDefinition";

import type {
    AirborneWaterSweep,
} from "../environment/AirborneWaterSystem";

import {
    EnvironmentField,
} from "../environment/EnvironmentField";

import {
    FireSourceSystem,
} from "../environment/FireSourceSystem";

import {
    WaterField,
} from "../environment/WaterField";

import {
    WaterFireInteraction,
} from "../environment/WaterFireInteraction";

import {
    WaterGroundInteractionSystem,
} from "../environment/WaterGroundInteractionSystem";

import {
    FireManager,
} from "../environment/FireManager";

import {
    LocalWindSystem,
} from "../environment/LocalWindSystem";

import {
    SurfaceSystem,
} from "../surface/SurfaceSystem";

import {
    SurfaceType,
} from "../surface/SurfaceType";

interface ValidationCheck {
    readonly name: string;
    readonly passed: boolean;
}

/**
 * Phase 8F-9 integration validation.
 *
 * This suite composes the production directional Fire-source contract used by
 * Fire Tube with the authoritative airborne-Water, standing-Water and retained
 * ground-moisture systems established by 8F-4 through 8F-8.
 *
 * Hose and Sprinkler transport are represented by the same immutable
 * AirborneWaterSweep contract their real packets expose to WaterFireInteraction.
 * The purpose here is not to revalidate those mechanisms, but to prove that a
 * continuous directional Fire source recovers correctly as transient Water
 * contacts appear and disappear.
 */
export class ContinuousFireSourceCompetitionValidation {
    private static readonly SOURCE_X = 400;
    private static readonly SOURCE_Y = 400;
    private static readonly SOURCE_LENGTH = 400;
    private static readonly SOURCE_HALF_WIDTH = 14;

    private static readonly CONTACT_X = 600;
    private static readonly CONTACT_Y = 400;

    private static readonly SIMULATION_STEP = 0.1;

    public static run(): void {
        console.log(
            "[8F-9] CONTINUOUS FIRE SOURCE COMPETITION",
        );

        const checks: ValidationCheck[] = [];

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

        const groundInteraction =
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

        const fireSourceSystem =
            new FireSourceSystem(
                environmentField,
            );

        const interaction =
            new WaterFireInteraction();

        const sourceId =
            "8f9-fire-tube-competition";

        const fireTubeSource =
            fireSourceSystem.addSource({
                id:
                    sourceId,
                type:
                    FireSourceType.Directional,
                enabled:
                    true,
                positionX:
                    this.SOURCE_X,
                positionY:
                    this.SOURCE_Y,
                directionRadians:
                    0,
                length:
                    this.SOURCE_LENGTH,
                halfWidth:
                    this.SOURCE_HALF_WIDTH,
                heatPerSecond:
                    0.72,
                endHeatMultiplier:
                    0.58,
            });

        const airborneThreshold =
            interaction
                .getDefinition()
                .minimumMeaningfulAirborneWaterAmount;

        const standingThreshold =
            interaction
                .getDefinition()
                .minimumMeaningfulStandingWaterDepth;

        const makeCrossingSweep =
            (
                sourceName: string,
                x: number,
                sequence: number,
            ): AirborneWaterSweep => ({
                sourceId:
                    sourceName,
                sequence,
                waterAmount:
                    airborneThreshold,
                startX:
                    x,
                startY:
                    300,
                startHeight:
                    24,
                endX:
                    x,
                endY:
                    500,
                endHeight:
                    24,
            });

        const rebuildAirborne =
            (
                sweeps:
                    readonly AirborneWaterSweep[],
            ) => {
                fireSourceSystem
                    .beginDirectionalWaterSuppressionFrame();

                return interaction
                    .updateAirborneWaterDirectionalFire(
                        sweeps,
                        fireSourceSystem,
                    );
            };

        /*
         * HOSE x FIRE TUBE
         *
         * A continuous crossing contracts the effective jet but does not
         * disable the source. Once the crossing is absent on the next frame,
         * the transient suppression map clears and the jet returns.
         */
        rebuildAirborne([]);

        const fullDryLength =
            fireSourceSystem
                .getDirectionalEffectiveLength(
                    sourceId,
                );

        const hoseResult =
            rebuildAirborne([
                makeCrossingSweep(
                    "8f9-hose",
                    this.CONTACT_X,
                    1,
                ),
            ]);

        const hoseSuppressedLength =
            fireSourceSystem
                .getDirectionalEffectiveLength(
                    sourceId,
                );

        checks.push({
            name:
                "Hose crossing temporarily suppresses the Fire Tube jet",
            passed:
                hoseResult.suppressedSourceCount === 1 &&
                hoseSuppressedLength > 0 &&
                hoseSuppressedLength <
                fullDryLength,
        });

        checks.push({
            name:
                "Hose suppression does not disable the Fire Tube",
            passed:
                fireTubeSource.isEnabled(),
        });

        rebuildAirborne([]);

        const afterHoseLength =
            fireSourceSystem
                .getDirectionalEffectiveLength(
                    sourceId,
                );

        checks.push({
            name:
                "Fire Tube jet recovers after Hose Water stops crossing",
            passed:
                fireTubeSource.isEnabled() &&
                afterHoseLength ===
                this.SOURCE_LENGTH,
        });

        /*
         * SPRINKLER x FIRE TUBE
         *
         * One rotation crosses the jet. The following rotation is represented
         * by a sweep outside the authored Fire length. Because suppression is
         * rebuilt every frame, Fire must recover automatically.
         */
        const sprinklerCrossResult =
            rebuildAirborne([
                makeCrossingSweep(
                    "8f9-sprinkler",
                    this.CONTACT_X,
                    1,
                ),
            ]);

        const sprinklerSuppressedLength =
            fireSourceSystem
                .getDirectionalEffectiveLength(
                    sourceId,
                );

        checks.push({
            name:
                "Sprinkler crossing temporarily suppresses the Fire Tube jet",
            passed:
                sprinklerCrossResult.suppressedSourceCount ===
                1 &&
                sprinklerSuppressedLength <
                this.SOURCE_LENGTH,
        });

        const sprinklerAwayResult =
            rebuildAirborne([
                makeCrossingSweep(
                    "8f9-sprinkler",
                    900,
                    2,
                ),
            ]);

        const sprinklerAwayLength =
            fireSourceSystem
                .getDirectionalEffectiveLength(
                    sourceId,
                );

        checks.push({
            name:
                "Fire Tube returns when the rotating Sprinkler moves away",
            passed:
                sprinklerAwayResult.suppressedSourceCount ===
                0 &&
                sprinklerAwayLength ===
                this.SOURCE_LENGTH &&
                fireTubeSource.isEnabled(),
        });

        /*
         * FIRE TUBE x PUDDLE
         *
         * Direct standing Water owns only transient jet truncation. Ground
         * moisture is allowed to outlive the meaningful standing-Water depth.
         */
        waterField.reset();

        waterField.injectWater(
            this.CONTACT_X,
            this.CONTACT_Y,
            Math.max(
                0.08,
                standingThreshold *
                4,
            ),
        );

        fireSourceSystem
            .beginDirectionalWaterSuppressionFrame();

        const puddleResult =
            interaction
                .updateStandingWaterDirectionalFire(
                    waterField,
                    fireSourceSystem,
                );

        const puddleSuppressedLength =
            fireSourceSystem
                .getDirectionalEffectiveLength(
                    sourceId,
                );

        checks.push({
            name:
                "Standing puddle directly suppresses the Fire Tube jet",
            passed:
                puddleResult.suppressedSourceCount ===
                1 &&
                puddleSuppressedLength <
                this.SOURCE_LENGTH &&
                fireTubeSource.isEnabled(),
        });

        /*
         * Water a footprint around the jet contact so the real infiltration
         * system creates retained moisture at the Fire influence scale.
         */
        for (
            let offsetY = -24;
            offsetY <= 24;
            offsetY += 8
        ) {
            for (
                let offsetX = -24;
                offsetX <= 24;
                offsetX += 8
            ) {
                waterField.injectWater(
                    this.CONTACT_X +
                    offsetX,
                    this.CONTACT_Y +
                    offsetY,
                    0.08,
                );
            }
        }

        const fireRadius =
            fireManager
                .getDefinition()
                .fieldInfluenceRadius;

        const baselineMoisture =
            environmentField
                .getAverageMoistureInRadius(
                    this.CONTACT_X,
                    this.CONTACT_Y,
                    fireRadius,
                );

        let puddleClearReached =
            false;

        for (
            let step = 0;
            step < 6000;
            step += 1
        ) {
            waterField.update(
                this.SIMULATION_STEP,
            );

            groundInteraction.update(
                this.SIMULATION_STEP,
            );

            if (
                waterField.getDepthAt(
                    this.CONTACT_X,
                    this.CONTACT_Y,
                ) <=
                standingThreshold
            ) {
                puddleClearReached =
                    true;

                break;
            }
        }

        const retainedMoisture =
            environmentField
                .getAverageMoistureInRadius(
                    this.CONTACT_X,
                    this.CONTACT_Y,
                    fireRadius,
                );

        fireSourceSystem
            .beginDirectionalWaterSuppressionFrame();

        const afterPuddleResult =
            interaction
                .updateStandingWaterDirectionalFire(
                    waterField,
                    fireSourceSystem,
                );

        checks.push({
            name:
                "Direct standing-Water jet suppression ends after the puddle clears",
            passed:
                puddleClearReached &&
                afterPuddleResult.suppressedSourceCount ===
                0 &&
                fireSourceSystem
                    .getDirectionalEffectiveLength(
                        sourceId,
                    ) ===
                this.SOURCE_LENGTH,
        });

        checks.push({
            name:
                "Retained ground moisture outlives direct puddle suppression",
            passed:
                puddleClearReached &&
                retainedMoisture >
                baselineMoisture,
        });

        const wetResponse =
            fireManager
                .getMoistureResponse(
                    retainedMoisture,
                    1,
                );

        checks.push({
            name:
                "Retained wet ground still resists Fire susceptibility",
            passed:
                !wetResponse.canIgnite ||
                wetResponse
                    .ignitionCombustibility <
                0.5,
        });

        let recoveredMoisture =
            retainedMoisture;

        for (
            let step = 0;
            step < 6000;
            step += 1
        ) {
            waterField.update(
                this.SIMULATION_STEP,
            );

            groundInteraction.update(
                this.SIMULATION_STEP,
            );

            recoveredMoisture =
                environmentField
                    .getAverageMoistureInRadius(
                        this.CONTACT_X,
                        this.CONTACT_Y,
                        fireRadius,
                    );

            const response =
                fireManager
                    .getMoistureResponse(
                        recoveredMoisture,
                        1,
                    );

            if (
                response.canIgnite &&
                response
                    .ignitionCombustibility >=
                0.75
            ) {
                break;
            }
        }

        const recoveredResponse =
            fireManager
                .getMoistureResponse(
                    recoveredMoisture,
                    1,
                );

        checks.push({
            name:
                "Drying restores normal Fire susceptibility",
            passed:
                recoveredMoisture <
                retainedMoisture &&
                recoveredResponse.canIgnite &&
                recoveredResponse
                    .ignitionCombustibility >=
                0.75,
        });

        checks.push({
            name:
                "Continuous Fire Tube remains enabled through all Water competition",
            passed:
                fireTubeSource.isEnabled(),
        });

        console.table([
            {
                state:
                    "Dry Fire Tube",
                effectiveJetLength:
                    fullDryLength.toFixed(
                        2,
                    ),
            },
            {
                state:
                    "Hose crossing",
                effectiveJetLength:
                    hoseSuppressedLength.toFixed(
                        2,
                    ),
            },
            {
                state:
                    "Hose removed",
                effectiveJetLength:
                    afterHoseLength.toFixed(
                        2,
                    ),
            },
            {
                state:
                    "Sprinkler crossing",
                effectiveJetLength:
                    sprinklerSuppressedLength.toFixed(
                        2,
                    ),
            },
            {
                state:
                    "Sprinkler rotated away",
                effectiveJetLength:
                    sprinklerAwayLength.toFixed(
                        2,
                    ),
            },
            {
                state:
                    "Standing puddle",
                effectiveJetLength:
                    puddleSuppressedLength.toFixed(
                        2,
                    ),
            },
            {
                state:
                    "Puddle cleared / retained moisture",
                effectiveJetLength:
                    fireSourceSystem
                        .getDirectionalEffectiveLength(
                            sourceId,
                        )
                        .toFixed(
                            2,
                        ),
                moisture:
                    retainedMoisture.toFixed(
                        4,
                    ),
            },
            {
                state:
                    "Ground dried",
                effectiveJetLength:
                    fireSourceSystem
                        .getDirectionalEffectiveLength(
                            sourceId,
                        )
                        .toFixed(
                            2,
                        ),
                moisture:
                    recoveredMoisture.toFixed(
                        4,
                    ),
            },
        ]);

        const passed =
            checks.every(
                (check) =>
                    check.passed,
            );

        for (const check of checks) {
            console.log(
                `[8F-9] ${check.name}: ${
                    check.passed
                        ? "PASS"
                        : "FAIL"
                }`,
            );
        }

        console.log(
            `[8F-9] Continuous Fire Source Competition: ${
                passed
                    ? "PASS"
                    : "FAIL"
            }`,
        );
    }
}

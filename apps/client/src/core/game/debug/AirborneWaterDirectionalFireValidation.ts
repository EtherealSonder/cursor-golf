import {
    FireSourceType,
} from "../config/FireSourceDefinition";

import {
    EnvironmentField,
} from "../environment/EnvironmentField";

import {
    FireSourceSystem,
} from "../environment/FireSourceSystem";

import type {
    AirborneWaterSweep,
} from "../environment/AirborneWaterSystem";

import type {
    WaterFireInteraction,
} from "../environment/WaterFireInteraction";

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
 * Phase 8F-4 isolated Airborne Water x Directional Fire validation.
 *
 * The suite uses the real FireSourceSystem directional-source geometry and the
 * same immutable airborne sweep contract used by Hose and Sprinkler packets.
 * No gameplay source is disabled and no validation state leaks into World.
 */
export class AirborneWaterDirectionalFireValidation {
    public static run(
        interaction: WaterFireInteraction,
    ): boolean {
        const checks: ValidationCheck[] = [];

        const surfaceSystem =
            new SurfaceSystem(
                SurfaceType.Grass,
            );

        const environmentField =
            new EnvironmentField(
                surfaceSystem,
            );

        const fireSourceSystem =
            new FireSourceSystem(
                environmentField,
            );

        const sourceId =
            "8f4-directional-validation";

        const source =
            fireSourceSystem.addSource({
                id: sourceId,
                type: FireSourceType.Directional,
                enabled: true,
                positionX: 400,
                positionY: 400,
                directionRadians: 0,
                length: 400,
                halfWidth: 14,
                heatPerSecond: 0.72,
                endHeatMultiplier: 0.58,
            });

        const threshold =
            interaction
                .getDefinition()
                .minimumMeaningfulAirborneWaterAmount;

        const makeCrossingSweep = (
            sourceName: string,
            x: number,
            height = 24,
            waterAmount = threshold,
        ): AirborneWaterSweep => ({
            sourceId: sourceName,
            sequence: 1,
            waterAmount,
            startX: x,
            startY: 300,
            startHeight: height,
            endX: x,
            endY: 500,
            endHeight: height,
        });

        fireSourceSystem
            .beginDirectionalWaterSuppressionFrame();

        let result =
            interaction
                .updateAirborneWaterDirectionalFire(
                    [],
                    fireSourceSystem,
                );

        checks.push({
            name:
                "No airborne Water leaves complete directional Fire jet active",
            passed:
                result.suppressedSourceCount === 0 &&
                source.isEnabled() &&
                Math.abs(
                    fireSourceSystem
                        .getDirectionalEffectiveLength(
                            sourceId,
                        ) -
                    400,
                ) < 0.000001,
        });

        fireSourceSystem
            .beginDirectionalWaterSuppressionFrame();

        result =
            interaction
                .updateAirborneWaterDirectionalFire(
                    [
                        makeCrossingSweep(
                            "hose-validation",
                            600,
                            24,
                            threshold * 0.5,
                        ),
                    ],
                    fireSourceSystem,
                );

        checks.push({
            name:
                "Sub-threshold airborne Water does not suppress directional Fire",
            passed:
                result.suppressedSourceCount === 0 &&
                fireSourceSystem
                    .getDirectionalEffectiveLength(
                        sourceId,
                    ) === 400,
        });

        fireSourceSystem
            .beginDirectionalWaterSuppressionFrame();

        result =
            interaction
                .updateAirborneWaterDirectionalFire(
                    [
                        makeCrossingSweep(
                            "hose-validation",
                            600,
                        ),
                    ],
                    fireSourceSystem,
                );

        const hoseCutoff =
            fireSourceSystem
                .getDirectionalEffectiveLength(
                    sourceId,
                );

        checks.push({
            name:
                "Hose-style airborne sweep suppresses Fire at and beyond contact",
            passed:
                result.contactCount === 1 &&
                result.suppressedSourceCount === 1 &&
                hoseCutoff > 0 &&
                hoseCutoff < 200,
        });

        checks.push({
            name:
                "Directional Fire source remains enabled while suppressed",
            passed:
                source.isEnabled() &&
                fireSourceSystem
                    .isDirectionalSourceWaterSuppressed(
                        sourceId,
                    ),
        });

        fireSourceSystem.update(
            1 / 60,
        );

        checks.push({
            name:
                "Suppressed directional simulation deposits heat before contact but not beyond it",
            passed:
                environmentField
                    .getHeatAt(
                        480,
                        400,
                    ) > 0 &&
                environmentField
                    .getHeatAt(
                        700,
                        400,
                    ) === 0,
        });

        fireSourceSystem
            .beginDirectionalWaterSuppressionFrame();

        interaction
            .updateAirborneWaterDirectionalFire(
                [
                    makeCrossingSweep(
                        "sprinkler-validation",
                        700,
                    ),
                ],
                fireSourceSystem,
            );

        const sprinklerCutoff =
            fireSourceSystem
                .getDirectionalEffectiveLength(
                    sourceId,
                );

        checks.push({
            name:
                "Moving the Water crossing moves the suppression point",
            passed:
                sprinklerCutoff >
                hoseCutoff + 80 &&
                sprinklerCutoff < 300,
        });

        checks.push({
            name:
                "Sprinkler and Hose sweeps use the same systemic interaction",
            passed:
                fireSourceSystem
                    .isDirectionalSourceWaterSuppressed(
                        sourceId,
                    ) &&
                source.isEnabled(),
        });

        fireSourceSystem
            .beginDirectionalWaterSuppressionFrame();

        interaction
            .updateAirborneWaterDirectionalFire(
                [],
                fireSourceSystem,
            );

        checks.push({
            name:
                "Stopping or moving Water away restores the complete Fire jet",
            passed:
                !fireSourceSystem
                    .isDirectionalSourceWaterSuppressed(
                        sourceId,
                    ) &&
                source.isEnabled() &&
                fireSourceSystem
                    .getDirectionalEffectiveLength(
                        sourceId,
                    ) === 400,
        });

        fireSourceSystem.update(
            1 / 60,
        );

        checks.push({
            name:
                "Restored directional simulation resumes heat beyond the old contact point",
            passed:
                environmentField
                    .getHeatAt(
                        700,
                        400,
                    ) > 0,
        });

        fireSourceSystem
            .beginDirectionalWaterSuppressionFrame();

        const highSweepResult =
            interaction
                .updateAirborneWaterDirectionalFire(
                    [
                        makeCrossingSweep(
                            "high-water-validation",
                            600,
                            interaction
                                .getDefinition()
                                .airborneWaterDirectionalFireMaximumContactHeight +
                            20,
                        ),
                    ],
                    fireSourceSystem,
                );

        checks.push({
            name:
                "Projected crossing above directional Fire contact height does not suppress",
            passed:
                highSweepResult.suppressedSourceCount === 0 &&
                fireSourceSystem
                    .getDirectionalEffectiveLength(
                        sourceId,
                    ) === 400,
        });

        const passed =
            checks.every(
                (check): boolean =>
                    check.passed,
            );

        console.group(
            "[8F-4] AIRBORNE WATER x DIRECTIONAL FIRE JET",
        );

        for (const check of checks) {
            console.log(
                `[8F-4] ${check.name}: ${check.passed ? "PASS" : "FAIL"}`,
            );
        }

        console.log(
            `[8F-4] Airborne Water x Directional Fire Jet: ${passed ? "PASS" : "FAIL"}`,
        );

        console.groupEnd();

        return passed;
    }
}

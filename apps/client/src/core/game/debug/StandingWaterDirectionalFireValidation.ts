import {
    FireSourceType,
} from "../config/FireSourceDefinition";

import {
    EnvironmentField,
} from "../environment/EnvironmentField";

import {
    FireSourceSystem,
} from "../environment/FireSourceSystem";

import {
    WaterField,
} from "../environment/WaterField";

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
 * Phase 8F-5 isolated Standing Water x Directional Fire validation.
 *
 * The suite uses real WaterField and FireSourceSystem instances. Direct
 * standing-Water suppression is rebuilt each test frame and shares the same
 * transient cutoff map used by 8F-4 airborne Water.
 */
export class StandingWaterDirectionalFireValidation {
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

        const waterField =
            new WaterField();

        const fireSourceSystem =
            new FireSourceSystem(
                environmentField,
            );

        const sourceId =
            "8f5-directional-validation";

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
                .minimumMeaningfulStandingWaterDepth;

        const puddleX = 600;
        const puddleY = 400;

        const rebuild = () => {
            fireSourceSystem
                .beginDirectionalWaterSuppressionFrame();

            return interaction
                .updateStandingWaterDirectionalFire(
                    waterField,
                    fireSourceSystem,
                );
        };

        let result = rebuild();

        checks.push({
            name:
                "Fire jet over dry terrain remains complete",
            passed:
                result.suppressedSourceCount === 0 &&
                source.isEnabled() &&
                fireSourceSystem
                    .getDirectionalEffectiveLength(
                        sourceId,
                    ) === 400,
        });

        waterField.injectWater(
            puddleX,
            puddleY,
            Math.max(
                0.000001,
                threshold * 0.5,
            ),
        );

        result = rebuild();

        checks.push({
            name:
                "Sub-threshold standing Water does not suppress directional Fire",
            passed:
                result.suppressedSourceCount === 0 &&
                fireSourceSystem
                    .getDirectionalEffectiveLength(
                        sourceId,
                    ) === 400,
        });

        waterField.reset();
        waterField.injectWater(
            puddleX,
            puddleY,
            threshold,
        );

        result = rebuild();

        const shallowCutoff =
            fireSourceSystem
                .getDirectionalEffectiveLength(
                    sourceId,
                );

        checks.push({
            name:
                "Shallow meaningful puddle suppresses Fire at and beyond contact",
            passed:
                result.contactCount >= 1 &&
                result.suppressedSourceCount === 1 &&
                shallowCutoff > 0 &&
                shallowCutoff < 200,
        });

        checks.push({
            name:
                "Directional Fire source remains enabled while standing Water suppresses it",
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
                "Suppressed jet deposits heat before puddle but not beyond it",
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

        waterField.reset();
        waterField.injectWater(
            puddleX,
            puddleY,
            threshold * 4,
        );

        result = rebuild();

        checks.push({
            name:
                "Deep puddle suppresses directional Fire",
            passed:
                result.suppressedSourceCount === 1 &&
                fireSourceSystem
                    .getDirectionalEffectiveLength(
                        sourceId,
                    ) < 200,
        });

        waterField.reset();
        rebuild();

        const fullBeforePuddle =
            fireSourceSystem
                .getDirectionalEffectiveLength(
                    sourceId,
                );

        waterField.injectWater(
            puddleX,
            puddleY,
            threshold * 2,
        );

        result = rebuild();

        checks.push({
            name:
                "Puddle forming underneath an active jet introduces suppression",
            passed:
                fullBeforePuddle === 400 &&
                result.suppressedSourceCount === 1 &&
                fireSourceSystem
                    .getDirectionalEffectiveLength(
                        sourceId,
                    ) < 200,
        });

        environmentField.addMoistureAt(
            puddleX,
            puddleY,
            0.35,
        );

        waterField.removeWater(
            puddleX,
            puddleY,
            waterField
                .getDefinition()
                .maximumDepth,
        );

        result = rebuild();

        const moistureCell =
            environmentField
                .getCellAtWorld(
                    puddleX,
                    puddleY,
                );

        checks.push({
            name:
                "Puddle disappearance removes direct standing-Water suppression",
            passed:
                result.suppressedSourceCount === 0 &&
                source.isEnabled() &&
                fireSourceSystem
                    .getDirectionalEffectiveLength(
                        sourceId,
                    ) === 400,
        });

        checks.push({
            name:
                "Wet ground can remain after standing Water disappears without counting as a puddle",
            passed:
                waterField
                    .sampleAt(
                        puddleX,
                        puddleY,
                    )?.depth === 0 &&
                moistureCell !== null &&
                moistureCell.moisture >
                environmentField
                    .getBaselineMoistureByIndex(
                        moistureCell.index,
                    ) &&
                fireSourceSystem
                    .getDirectionalEffectiveLength(
                        sourceId,
                    ) === 400,
        });

        waterField.reset();
        waterField.injectWater(
            700,
            puddleY,
            threshold * 2,
        );

        fireSourceSystem
            .beginDirectionalWaterSuppressionFrame();

        fireSourceSystem
            .suppressDirectionalSourceFromDistance(
                sourceId,
                120,
            );

        interaction
            .updateStandingWaterDirectionalFire(
                waterField,
                fireSourceSystem,
            );

        checks.push({
            name:
                "Standing and airborne Water suppression preserve the earliest directional cutoff",
            passed:
                Math.abs(
                    fireSourceSystem
                        .getDirectionalEffectiveLength(
                            sourceId,
                        ) -
                    120,
                ) < 0.000001,
        });

        const passed =
            checks.every(
                (check): boolean =>
                    check.passed,
            );

        console.group(
            "[8F-5] STANDING WATER x DIRECTIONAL FIRE JET",
        );

        for (const check of checks) {
            console.log(
                `[8F-5] ${check.name}: ${check.passed ? "PASS" : "FAIL"}`,
            );
        }

        console.log(
            `[8F-5] Standing Water x Directional Fire Jet: ${passed ? "PASS" : "FAIL"}`,
        );

        console.groupEnd();

        return passed;
    }
}

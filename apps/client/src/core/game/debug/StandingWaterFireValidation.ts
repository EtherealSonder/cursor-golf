import type {
    FireManager,
} from "../environment/FireManager";

import type {
    WaterField,
} from "../environment/WaterField";

import type {
    WaterFireInteraction,
} from "../environment/WaterFireInteraction";

interface ValidationCheck {
    readonly name: string;
    readonly passed: boolean;
}

/**
 * Phase 8F-2 isolated Standing Water x Ground Fire validation.
 *
 * The suite uses the real authoritative WaterField and FireManager supplied by
 * World, then resets both systems before returning. EnvironmentField burn,
 * fuel and scorch history are never cleared by the interaction itself.
 */
export class StandingWaterFireValidation {
    public static run(
        interaction: WaterFireInteraction,
        waterField: WaterField,
        fireManager: FireManager,
    ): boolean {
        const checks: ValidationCheck[] = [];
        const threshold =
            interaction
                .getDefinition()
                .minimumMeaningfulStandingWaterDepth;

        const testX = 400;
        const testY = 400;

        const reset = (): void => {
            fireManager.reset();
            waterField.reset();
        };

        const igniteOne = (): {
            readonly gridX: number;
            readonly gridY: number;
            readonly x: number;
            readonly y: number;
        } | null => {
            if (!fireManager.ignite(testX, testY)) {
                return null;
            }

            const cell = fireManager.getActiveCells()[0];

            return cell
                ? {
                    gridX: cell.getGridX(),
                    gridY: cell.getGridY(),
                    x: cell.getWorldCenterX(),
                    y: cell.getWorldCenterY(),
                }
                : null;
        };

        reset();
        let fire = igniteOne();
        const dryResult =
            interaction.updateStandingWaterGroundFire(
                waterField,
                fireManager,
            );

        checks.push({
            name: "No standing Water leaves Ground Fire active",
            passed:
                fire !== null &&
                dryResult.extinguishedFireCellCount === 0 &&
                fireManager.getActiveCellCount() === 1,
        });

        reset();
        fire = igniteOne();

        if (fire) {
            waterField.injectWater(
                fire.x,
                fire.y,
                Math.max(0.000001, threshold * 0.5),
            );
        }

        const shallowResult =
            interaction.updateStandingWaterGroundFire(
                waterField,
                fireManager,
            );

        checks.push({
            name: "Sub-threshold standing Water does not extinguish",
            passed:
                fire !== null &&
                shallowResult.extinguishedFireCellCount === 0 &&
                fireManager.getActiveCellCount() === 1,
        });

        reset();
        fire = igniteOne();

        if (fire) {
            waterField.injectWater(
                fire.x,
                fire.y,
                threshold,
            );
        }

        const waterBefore =
            waterField.getTotalWaterAmount();

        const overlapResult =
            interaction.updateStandingWaterGroundFire(
                waterField,
                fireManager,
            );

        checks.push({
            name: "Meaningful standing Water extinguishes overlapping Ground Fire",
            passed:
                fire !== null &&
                overlapResult.extinguishedFireCellCount === 1 &&
                fireManager.getActiveCellCount() === 0,
        });

        checks.push({
            name: "Extinguishing Ground Fire does not consume standing Water",
            passed:
                Math.abs(
                    waterField.getTotalWaterAmount() - waterBefore,
                ) < 0.000001,
        });

        reset();
        fire = igniteOne();

        if (fire) {
            waterField.injectWater(
                fire.x +
                    fireManager.getDefinition().cellSize * 2,
                fire.y,
                threshold * 2,
            );
        }

        const nearbyResult =
            interaction.updateStandingWaterGroundFire(
                waterField,
                fireManager,
            );

        checks.push({
            name: "Nearby non-overlapping standing Water leaves Ground Fire active",
            passed:
                fire !== null &&
                nearbyResult.extinguishedFireCellCount === 0 &&
                fireManager.getActiveCellCount() === 1,
        });

        reset();
        fire = igniteOne();

        if (fire) {
            waterField.injectWater(
                fire.x,
                fire.y,
                threshold * 2,
            );
        }

        interaction.updateStandingWaterGroundFire(
            waterField,
            fireManager,
        );

        fireManager.update(
            fireManager.getDefinition().firstSpreadAge + 0.05,
        );

        checks.push({
            name: "Extinguished Ground Fire cannot spread on the next Fire update",
            passed:
                fire !== null &&
                fireManager.getActiveCellCount() === 0,
        });

        reset();

        const passed =
            checks.every(
                (check): boolean => check.passed,
            );

        console.group(
            "[8F-2] STANDING WATER x GROUND FIRE",
        );

        for (const check of checks) {
            console.log(
                `[8F-2] ${check.name}: ${check.passed ? "PASS" : "FAIL"}`,
            );
        }

        console.log(
            `[8F-2] Standing Water x Ground Fire: ${passed ? "PASS" : "FAIL"}`,
        );

        console.groupEnd();

        return passed;
    }
}

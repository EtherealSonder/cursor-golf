import { DEFAULT_WATER_FIELD_DEFINITION } from "../config/WaterFieldDefinition";
import { WaterField } from "../environment/WaterField";

/**
 * Isolated transport mass-balance check.
 *
 * Production WaterField deliberately retires microscopic, slow-moving
 * residuals. Disable only that sink in this test so conservation is tested
 * independently of the intended retirement policy. Gameplay is unchanged.
 */
export class WaterConservationValidation {
    public static run(): { passed: boolean; detail: string } {
        const field = new WaterField({
            ...DEFAULT_WATER_FIELD_DEFINITION,
            residualRetirementDepth: 1e-12,
        });
        const points = [[240, 240, 5], [256, 240, 3], [240, 256, 2]] as const;
        let injected = 0;
        for (const [x, y, amount] of points) injected += field.injectWater(x, y, amount);

        const initial = field.getTotalWaterAmount();
        let maximumAccountingDrift = 0;
        let maximumCellMassDrift = 0;
        let finite = true;
        for (let i = 0; i < 180; i += 1) {
            field.update(1 / 60);
            const reportedTotal = field.getTotalWaterAmount();
            let cellTotal = 0;
            for (let index = 0; index < field.getCellCount(); index += 1) {
                const depth = field.getDepthByIndex(index);
                finite = finite && Number.isFinite(depth) && depth >= 0;
                cellTotal += depth;
            }
            maximumAccountingDrift = Math.max(
                maximumAccountingDrift, Math.abs(reportedTotal - initial),
            );
            maximumCellMassDrift = Math.max(
                maximumCellMassDrift, Math.abs(cellTotal - initial),
            );
            finite = finite && Number.isFinite(reportedTotal);
        }

        // Float32 cell storage introduces rounding; 1e-4 is 0.001% of
        // this scenario's 10-unit initial mass, not an arbitrary relaxation
        // of the production simulation.
        const accountingTolerance = 1e-5;
        const cellMassTolerance = 1e-4;
        const passed = finite &&
            Math.abs(initial - injected) < accountingTolerance &&
            maximumAccountingDrift < accountingTolerance &&
            maximumCellMassDrift < cellMassTolerance;
        return {
            passed,
            detail: `injected=${injected.toFixed(6)}, ` +
                `maxAccountingDrift=${maximumAccountingDrift.toExponential(3)}, ` +
                `maxCellMassDrift=${maximumCellMassDrift.toExponential(3)}, ` +
                `active=${field.getActiveCellCount()}, ` +
                `residualRetirement=disabled(test only)`,
        };
    }
}

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

interface ValidationCheck {
    readonly name: string;
    readonly passed: boolean;
    readonly detail: string;
}

export interface WaterRuntimeCorrectnessValidationResult {
    readonly passed: boolean;
    readonly checks: readonly ValidationCheck[];
}

/**
 * Phase 8I-3C regression guard for the sparse/indexed Water runtime changes.
 *
 * The validation owns isolated fields. It never mutates the live World.
 * Existing 8A-8F validators remain the authoritative regression suite for
 * the earlier gameplay phases.
 */
export class WaterRuntimeCorrectnessValidation {
    private static readonly EPSILON = 1e-5;

    public static run():
        WaterRuntimeCorrectnessValidationResult {

        const checks: ValidationCheck[] = [];

        this.validateSparseTraversal(checks);
        this.validateIndexedDepthAccess(checks);
        this.validateSparseRemovalLifecycle(checks);
        this.validateResetCleanup(checks);
        this.validateGroundInteraction(checks);
        this.validateFrameRateStability(checks);

        const passed =
            checks.every(
                (check): boolean =>
                    check.passed,
            );

        console.group(
            "[8I-3C] WATER RUNTIME CORRECTNESS",
        );

        for (
            let index = 0;
            index < checks.length;
            index += 1
        ) {
            const check = checks[index];

            console.log(
                `${check.passed ? "PASS" : "FAIL"}  ${check.name}`,
                check.detail,
            );
        }

        console.log(
            `[8I-3C] RESULT: ${passed ? "PASS" : "FAIL"}`,
        );

        console.groupEnd();

        return {
            passed,
            checks,
        };
    }

    private static validateSparseTraversal(
        checks: ValidationCheck[],
    ): void {
        const field = new WaterField();

        field.addWaterAtWorldPosition(
            120,
            120,
            0.4,
        );

        field.addWaterAtWorldPosition(
            200,
            160,
            0.7,
        );

        const normal =
            field.getTrackedWaterCells()
                .map(
                    (cell) => cell.index,
                )
                .sort(
                    (a, b) => a - b,
                );

        const indexed: number[] = [];

        field.forEachTrackedWaterIndex(
            (index): void => {
                indexed.push(index);
            },
        );

        indexed.sort(
            (a, b) => a - b,
        );

        const passed =
            normal.length === indexed.length &&
            normal.every(
                (value, index) =>
                    value === indexed[index],
            );

        checks.push({
            name: "Sparse Water traversal",
            passed,
            detail:
                `normal=${normal.length}, indexed=${indexed.length}`,
        });
    }

    private static validateIndexedDepthAccess(
        checks: ValidationCheck[],
    ): void {
        const field = new WaterField();

        field.addWaterAtWorldPosition(
            160,
            160,
            0.55,
        );

        const cells =
            field.getTrackedWaterCells();

        const cell =
            cells[0];

        const indexedDepth =
            cell
                ? field.getDepthByIndex(
                    cell.index,
                )
                : 0;

        const passed =
            !!cell &&
            Math.abs(
                indexedDepth - cell.depth,
            ) <= this.EPSILON;

        checks.push({
            name: "Indexed depth access",
            passed,
            detail:
                `sample=${cell?.depth ?? 0}, indexed=${indexedDepth}`,
        });
    }

    private static validateSparseRemovalLifecycle(
        checks: ValidationCheck[],
    ): void {
        const field = new WaterField();

        field.addWaterAtWorldPosition(
            120,
            120,
            0.2,
        );

        field.addWaterAtWorldPosition(
            160,
            120,
            0.2,
        );

        field.addWaterAtWorldPosition(
            200,
            120,
            0.2,
        );

        const snapshot: number[] = [];

        field.forEachTrackedWaterIndex(
            (index): void => {
                snapshot.push(index);
            },
        );

        for (
            let offset = 0;
            offset < snapshot.length;
            offset += 1
        ) {
            field.removeWaterByIndex(
                snapshot[offset],
                Number.POSITIVE_INFINITY,
            );
        }

        const passed =
            field.getTrackedWaterCellCount() === 0;

        checks.push({
            name: "Removal during sparse traversal",
            passed,
            detail:
                `remaining=${field.getTrackedWaterCellCount()}`,
        });
    }

    private static validateResetCleanup(
        checks: ValidationCheck[],
    ): void {
        const field = new WaterField();

        field.addWaterAtWorldPosition(
            120,
            120,
            0.5,
        );

        field.reset();

        let visited = 0;

        field.forEachTrackedWaterIndex(
            (): void => {
                visited += 1;
            },
        );

        const passed =
            field.getTrackedWaterCellCount() === 0 &&
            visited === 0;

        checks.push({
            name: "Reset / sparse cleanup",
            passed,
            detail:
                `tracked=${field.getTrackedWaterCellCount()}, visited=${visited}`,
        });
    }

    private static validateGroundInteraction(
        checks: ValidationCheck[],
    ): void {
        const result =
            this.simulateGroundInteraction(
                60,
                1,
            );

        checks.push({
            name: "Contact wetting + infiltration",
            passed:
                result.waterAfter <
                    result.waterBefore &&
                result.moistureAfter >
                    result.moistureBefore,
            detail:
                `water ${result.waterBefore.toFixed(5)} -> ${result.waterAfter.toFixed(5)}, moisture ${result.moistureBefore.toFixed(5)} -> ${result.moistureAfter.toFixed(5)}`,
        });

        checks.push({
            name: "Finite Water/moisture state",
            passed:
                Number.isFinite(
                    result.waterAfter,
                ) &&
                Number.isFinite(
                    result.moistureAfter,
                ),
            detail:
                `water=${result.waterAfter}, moisture=${result.moistureAfter}`,
        });
    }

    private static validateFrameRateStability(
        checks: ValidationCheck[],
    ): void {
        const at30 =
            this.simulateGroundInteraction(
                30,
                1,
            );

        const at60 =
            this.simulateGroundInteraction(
                60,
                1,
            );

        const at120 =
            this.simulateGroundInteraction(
                120,
                1,
            );

        const waterSpread =
            Math.max(
                at30.waterAfter,
                at60.waterAfter,
                at120.waterAfter,
            ) -
            Math.min(
                at30.waterAfter,
                at60.waterAfter,
                at120.waterAfter,
            );

        const moistureSpread =
            Math.max(
                at30.moistureAfter,
                at60.moistureAfter,
                at120.moistureAfter,
            ) -
            Math.min(
                at30.moistureAfter,
                at60.moistureAfter,
                at120.moistureAfter,
            );

        const tolerance = 0.02;

        checks.push({
            name: "30/60/120 FPS stability",
            passed:
                waterSpread <= tolerance &&
                moistureSpread <= tolerance,
            detail:
                `water spread=${waterSpread.toFixed(6)}, moisture spread=${moistureSpread.toFixed(6)}`,
        });
    }

    private static simulateGroundInteraction(
        fps: number,
        seconds: number,
    ): {
        readonly waterBefore: number;
        readonly waterAfter: number;
        readonly moistureBefore: number;
        readonly moistureAfter: number;
    } {
        const surface =
            new SurfaceSystem(
                SurfaceType.Grass,
            );

        const environment =
            new EnvironmentField(
                surface,
            );

        const water =
            new WaterField();

        const interaction =
            new WaterGroundInteractionSystem(
                water,
                environment,
                surface,
            );

        const x = 240;
        const y = 240;

        water.addWaterAtWorldPosition(
            x,
            y,
            0.6,
        );

        const waterBefore =
            water.sampleAtWorldPosition(
                x,
                y,
            ).depth;

        const moistureBefore =
            environment.sampleAtWorldPosition(
                x,
                y,
            ).moisture;

        const deltaTime =
            1 / fps;

        const steps =
            Math.round(
                fps * seconds,
            );

        for (
            let step = 0;
            step < steps;
            step += 1
        ) {
            interaction.update(
                deltaTime,
            );
        }

        return {
            waterBefore,
            waterAfter:
                water.sampleAtWorldPosition(
                    x,
                    y,
                ).depth,
            moistureBefore,
            moistureAfter:
                environment.sampleAtWorldPosition(
                    x,
                    y,
                ).moisture,
        };
    }
}

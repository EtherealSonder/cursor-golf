import type { WaterField } from "../environment/WaterField";

export interface WaterFieldValidationState {
    readonly injectionPassed: boolean;
    readonly symmetricFlowPassed: boolean;
    readonly momentumPassed: boolean;
    readonly sparsePassed: boolean;
    readonly fixedTimestepPassed: boolean;
    readonly hitchGuardPassed: boolean;
    readonly resetPassed: boolean;

    readonly totalGridCells: number;
    readonly activeCellsAfterInjection: number;
    readonly activeCellsAfterFlow: number;
    readonly processedCellsLastStep: number;
    readonly activePercentage: number;
    readonly conservationError: number;

    readonly centerOfMassShiftX: number;
    readonly initialAverageVelocityX: number;
    readonly finalAverageVelocityX: number;
    readonly eastDepth: number;
    readonly westDepth: number;

    readonly sixtyFpsCenterX: number;
    readonly thirtyFpsCenterX: number;
    readonly oneTwentyFpsCenterX: number;
    readonly fixedTimestepMaxCenterError: number;
    readonly hitchSubsteps: number;
    readonly maximumAllowedSubsteps: number;

    readonly resetTotalWater: number;
    readonly resetActiveCells: number;
    readonly passed: boolean;
}

/** Development-only validation for Water phases 8A-2 through 8A-6. */
export class WaterFieldValidation {
    private state: WaterFieldValidationState | null = null;

    public constructor(
        private readonly waterField: WaterField,
    ) { }

    public run(): WaterFieldValidationState {
        const centerGridX = Math.min(24, this.waterField.getColumnCount() - 3);
        const centerGridY = Math.min(24, this.waterField.getRowCount() - 3);
        const center = this.waterField.gridToWorldCenter(centerGridX, centerGridY);
        const amount = Math.min(8, this.waterField.getDefinition().maximumDepth * 0.5);
        const dt = 1 / 60;

        // 8A-2 injection
        this.waterField.reset();
        const accepted = this.waterField.injectWater(center.x, center.y, amount);
        const sample = this.waterField.sampleAt(center.x, center.y);
        const activeCellsAfterInjection = this.waterField.getActiveCellCount();
        const injectionPassed =
            Math.abs(accepted - amount) <= 0.000001 &&
            sample !== null &&
            Math.abs(sample.depth - accepted) <= 0.000001 &&
            this.waterField.getTotalWaterAmount() === accepted &&
            this.waterField.getNonEmptyCellCount() === 1 &&
            activeCellsAfterInjection > 0;

        // 8A-3 symmetric flow
        const symmetricBefore = this.waterField.getTotalWaterAmount();
        for (let i = 0; i < 8; i += 1) {
            this.waterField.update(dt);
        }
        const north = this.waterField.getCell(centerGridX, centerGridY - 1)?.depth ?? 0;
        const east = this.waterField.getCell(centerGridX + 1, centerGridY)?.depth ?? 0;
        const south = this.waterField.getCell(centerGridX, centerGridY + 1)?.depth ?? 0;
        const west = this.waterField.getCell(centerGridX - 1, centerGridY)?.depth ?? 0;
        const symmetricError = Math.abs(
            this.waterField.getTotalWaterAmount() - symmetricBefore,
        );
        const symmetricFlowPassed =
            north > 0 && east > 0 && south > 0 && west > 0 &&
            Math.abs(north - south) <= 0.00001 &&
            Math.abs(east - west) <= 0.00001 &&
            symmetricError <= 0.000001;

        // 8A-4 momentum + 8A-5 sparse
        this.waterField.reset();
        this.waterField.injectWaterWithMomentum(center.x, center.y, amount, 300, 0);
        const initialCom = this.waterField.calculateWaterCenterOfMass();
        const initialVelocity = this.waterField.calculateWaterWeightedAverageVelocity();
        const totalBeforeFlow = this.waterField.getTotalWaterAmount();

        for (let i = 0; i < 12; i += 1) {
            this.waterField.update(dt);
        }

        const finalCom = this.waterField.calculateWaterCenterOfMass();
        const finalVelocity = this.waterField.calculateWaterWeightedAverageVelocity();
        const eastDepth = this.waterField.getCell(centerGridX + 1, centerGridY)?.depth ?? 0;
        const westDepth = this.waterField.getCell(centerGridX - 1, centerGridY)?.depth ?? 0;
        const conservationError = Math.abs(
            this.waterField.getTotalWaterAmount() - totalBeforeFlow,
        );
        const centerOfMassShiftX = (finalCom?.x ?? 0) - (initialCom?.x ?? 0);

        const momentumPassed =
            centerOfMassShiftX > 0 &&
            initialVelocity.x > finalVelocity.x &&
            finalVelocity.x > 0 &&
            eastDepth > westDepth &&
            conservationError <= 0.000001;

        const totalGridCells = this.waterField.getCellCount();
        const activeCellsAfterFlow = this.waterField.getActiveCellCount();
        const processedCellsLastStep = this.waterField.getLastProcessedCellCount();
        const activePercentage =
            totalGridCells > 0
                ? (processedCellsLastStep / totalGridCells) * 100
                : 0;

        const sparsePassed =
            activeCellsAfterInjection < totalGridCells &&
            activeCellsAfterFlow > 0 &&
            activeCellsAfterFlow < totalGridCells * 0.01 &&
            processedCellsLastStep > 0 &&
            processedCellsLastStep < totalGridCells * 0.01 &&
            conservationError <= 0.000001;

        // 8A-6 fixed timestep: same one-second scenario under 60/30/120 FPS.
        const runPattern = (
            frameDelta: number,
            frameCount: number,
        ): number => {
            this.waterField.reset();
            this.waterField.injectWaterWithMomentum(
                center.x,
                center.y,
                amount,
                300,
                0,
            );

            for (let i = 0; i < frameCount; i += 1) {
                this.waterField.update(frameDelta);
            }

            return this.waterField.calculateWaterCenterOfMass()?.x ?? 0;
        };

        const sixtyFpsCenterX = runPattern(1 / 60, 60);
        const thirtyFpsCenterX = runPattern(1 / 30, 30);
        const oneTwentyFpsCenterX = runPattern(1 / 120, 120);

        const fixedTimestepMaxCenterError = Math.max(
            Math.abs(sixtyFpsCenterX - thirtyFpsCenterX),
            Math.abs(sixtyFpsCenterX - oneTwentyFpsCenterX),
            Math.abs(thirtyFpsCenterX - oneTwentyFpsCenterX),
        );

        const fixedTimestepPassed =
            fixedTimestepMaxCenterError <= 0.001;

        // Hitch guard: one very large frame must never exceed the hard cap.
        this.waterField.reset();
        this.waterField.injectWaterWithMomentum(center.x, center.y, amount, 300, 0);
        this.waterField.update(0.2);

        const hitchSubsteps =
            this.waterField.getLastSubstepCount();

        const maximumAllowedSubsteps =
            this.waterField.getDefinition().maximumSubstepsPerFrame;

        const hitchGuardPassed =
            hitchSubsteps > 0 &&
            hitchSubsteps <= maximumAllowedSubsteps;

        // Reset
        this.waterField.reset();
        const resetTotalWater = this.waterField.getTotalWaterAmount();
        const resetActiveCells = this.waterField.getActiveCellCount();
        const resetPassed =
            resetTotalWater === 0 &&
            resetActiveCells === 0 &&
            this.waterField.getTrackedWaterCellCount() === 0 &&
            this.waterField.getLastProcessedCellCount() === 0 &&
            this.waterField.getLastSubstepCount() === 0;

        const passed =
            injectionPassed &&
            symmetricFlowPassed &&
            momentumPassed &&
            sparsePassed &&
            fixedTimestepPassed &&
            hitchGuardPassed &&
            resetPassed;

        this.state = {
            injectionPassed,
            symmetricFlowPassed,
            momentumPassed,
            sparsePassed,
            fixedTimestepPassed,
            hitchGuardPassed,
            resetPassed,
            totalGridCells,
            activeCellsAfterInjection,
            activeCellsAfterFlow,
            processedCellsLastStep,
            activePercentage,
            conservationError,
            centerOfMassShiftX,
            initialAverageVelocityX: initialVelocity.x,
            finalAverageVelocityX: finalVelocity.x,
            eastDepth,
            westDepth,
            sixtyFpsCenterX,
            thirtyFpsCenterX,
            oneTwentyFpsCenterX,
            fixedTimestepMaxCenterError,
            hitchSubsteps,
            maximumAllowedSubsteps,
            resetTotalWater,
            resetActiveCells,
            passed,
        };

        this.logResult(this.state);
        return this.state;
    }

    public getState(): WaterFieldValidationState | null {
        return this.state;
    }

    private logResult(state: WaterFieldValidationState): void {
        console.group("Phase 8A-6 WaterField fixed timestep + visualizer validation");
        console.log("Grid", {
            columns: this.waterField.getColumnCount(),
            rows: this.waterField.getRowCount(),
            cells: state.totalGridCells,
            cellSize: this.waterField.getDefinition().cellSize,
        });
        console.log("8A-2 Injection", {
            passed: state.injectionPassed,
            activeCellsAfterInjection: state.activeCellsAfterInjection,
        });
        console.log("8A-3 Symmetric Flow", { passed: state.symmetricFlowPassed });
        console.log("8A-4 Momentum", {
            centerOfMassShiftX: state.centerOfMassShiftX,
            initialAverageVelocityX: state.initialAverageVelocityX,
            finalAverageVelocityX: state.finalAverageVelocityX,
            eastDepth: state.eastDepth,
            westDepth: state.westDepth,
            conservationError: state.conservationError,
            passed: state.momentumPassed,
        });
        console.log("8A-5 Sparse Simulation", {
            totalGridCells: state.totalGridCells,
            activeCellsAfterFlow: state.activeCellsAfterFlow,
            processedCellsLastStep: state.processedCellsLastStep,
            activePercentage: state.activePercentage,
            passed: state.sparsePassed,
        });
        console.log("8A-6 Fixed Timestep", {
            sixtyFpsCenterX: state.sixtyFpsCenterX,
            thirtyFpsCenterX: state.thirtyFpsCenterX,
            oneTwentyFpsCenterX: state.oneTwentyFpsCenterX,
            maxCenterError: state.fixedTimestepMaxCenterError,
            passed: state.fixedTimestepPassed,
        });
        console.log("8A-6 Hitch Guard", {
            hitchSubsteps: state.hitchSubsteps,
            maximumAllowedSubsteps: state.maximumAllowedSubsteps,
            passed: state.hitchGuardPassed,
        });
        console.log("Reset", {
            totalWater: state.resetTotalWater,
            activeCells: state.resetActiveCells,
            passed: state.resetPassed,
        });

        if (state.passed) {
            console.log("RESULT: PASS");
        } else {
            console.error("RESULT: FAIL", state);
        }
        console.groupEnd();
    }
}

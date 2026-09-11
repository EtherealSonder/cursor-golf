import {
    DEFAULT_HYDRANT_PRESSURE_DEFINITION,
    HydrantPressureState,
} from "../config/HydrantPressureDefinition";

import {
    HydrantPressureController,
} from "../entities/mechanisms/HydrantPressureController";

export interface HydrantPressureCycleValidationState {
    readonly initialStatePassed: boolean;
    readonly inactiveToBuildingPassed: boolean;
    readonly buildingToActivePassed: boolean;
    readonly activeDurationPassed: boolean;
    readonly activeToReleasingPassed: boolean;
    readonly releasingToInactivePassed: boolean;
    readonly periodicSecondCyclePassed: boolean;
    readonly emissionMappingPassed: boolean;
    readonly brokenFromEveryStatePassed: boolean;
    readonly brokenTerminalPassed: boolean;
    readonly resetPassed: boolean;
    readonly frameRateStabilityPassed: boolean;
    readonly passed: boolean;
}

interface TimelineSnapshot {
    readonly state:
    HydrantPressureState;

    readonly waterActive:
    boolean;

    readonly completedCycles:
    number;
}

/**
 * Phase 8B-10C deterministic validation for the pressure controller.
 *
 * The validation is isolated from the live HydrantHose. It checks transition
 * ordering, the ~5 second active burst, periodic cycling, Broken semantics,
 * reset behavior, emission-state mapping, and 30/60/120 FPS stability.
 */
export class HydrantPressureCycleValidation {
    private state:
        HydrantPressureCycleValidationState | null =
        null;

    public run():
        HydrantPressureCycleValidationState {

        const definition =
            DEFAULT_HYDRANT_PRESSURE_DEFINITION;

        const controller =
            new HydrantPressureController(
                definition,
            );

        const initialStatePassed =
            controller.getState() ===
            HydrantPressureState.Inactive &&
            !controller
                .isWaterEmissionActive();

        this.advanceExact(
            controller,
            definition.inactiveDuration,
            60,
        );

        const inactiveToBuildingPassed =
            controller.getState() ===
            HydrantPressureState
                .PressureBuilding &&
            !controller
                .isWaterEmissionActive();

        this.advanceExact(
            controller,
            definition.pressureBuildDuration,
            60,
        );

        const buildingToActivePassed =
            controller.getState() ===
            HydrantPressureState.Active &&
            controller
                .isWaterEmissionActive();

        /*
         * Verify that the stream remains active immediately before the exact
         * configured active-duration boundary.
         */
        const almostActiveDuration =
            Math.max(
                0,
                definition.activeDuration -
                1 / 120,
            );

        this.advanceExact(
            controller,
            almostActiveDuration,
            120,
        );

        const activeDurationPassed =
            controller.getState() ===
            HydrantPressureState.Active &&
            controller
                .isWaterEmissionActive();

        controller.update(
            1 / 120,
        );

        const activeToReleasingPassed =
            controller.getState() ===
            HydrantPressureState
                .PressureReleasing &&
            !controller
                .isWaterEmissionActive();

        this.advanceExact(
            controller,
            definition.pressureReleaseDuration,
            60,
        );

        const releasingToInactivePassed =
            controller.getState() ===
            HydrantPressureState.Inactive &&
            controller
                .getCompletedCycleCount() ===
            1 &&
            !controller
                .isWaterEmissionActive();

        this.advanceExact(
            controller,
            definition.inactiveDuration +
            definition.pressureBuildDuration,
            60,
        );

        const periodicSecondCyclePassed =
            controller.getState() ===
            HydrantPressureState.Active &&
            controller
                .isWaterEmissionActive();

        const emissionMappingPassed =
            this.validateEmissionMapping();

        const brokenFromEveryStatePassed =
            this.validateBreakFromEveryState();

        const brokenTerminalPassed =
            this.validateBrokenTerminal();

        const resetPassed =
            this.validateReset();

        const frameRateStabilityPassed =
            this.validateFrameRateStability();

        const passed =
            initialStatePassed &&
            inactiveToBuildingPassed &&
            buildingToActivePassed &&
            activeDurationPassed &&
            activeToReleasingPassed &&
            releasingToInactivePassed &&
            periodicSecondCyclePassed &&
            emissionMappingPassed &&
            brokenFromEveryStatePassed &&
            brokenTerminalPassed &&
            resetPassed &&
            frameRateStabilityPassed;

        this.state = {
            initialStatePassed,
            inactiveToBuildingPassed,
            buildingToActivePassed,
            activeDurationPassed,
            activeToReleasingPassed,
            releasingToInactivePassed,
            periodicSecondCyclePassed,
            emissionMappingPassed,
            brokenFromEveryStatePassed,
            brokenTerminalPassed,
            resetPassed,
            frameRateStabilityPassed,
            passed,
        };

        console.group(
            "Phase 8B-10C Hydrant Pressure Cycle Validation",
        );

        console.log(
            "Initial State",
            {
                initialStatePassed,
            },
        );

        console.log(
            "Cycle Transitions",
            {
                inactiveToBuildingPassed,
                buildingToActivePassed,
                activeDurationPassed,
                activeToReleasingPassed,
                releasingToInactivePassed,
                periodicSecondCyclePassed,
            },
        );

        console.log(
            "Water Emission Mapping",
            {
                emissionMappingPassed,
            },
        );

        console.log(
            "Broken State",
            {
                brokenFromEveryStatePassed,
                brokenTerminalPassed,
            },
        );

        console.log(
            "Reset",
            {
                resetPassed,
            },
        );

        console.log(
            "Frame-rate Stability",
            {
                frameRateStabilityPassed,
            },
        );

        console.log(
            "RESULT",
            passed
                ? "PASS"
                : "FAIL",
        );

        console.groupEnd();

        return this.state;
    }

    public getState():
        HydrantPressureCycleValidationState | null {

        return this.state;
    }

    private validateEmissionMapping():
        boolean {

        const controller =
            new HydrantPressureController();

        if (
            controller
                .isWaterEmissionActive()
        ) {
            return false;
        }

        this.advanceExact(
            controller,
            DEFAULT_HYDRANT_PRESSURE_DEFINITION
                .inactiveDuration,
            60,
        );

        if (
            controller
                .isWaterEmissionActive()
        ) {
            return false;
        }

        this.advanceExact(
            controller,
            DEFAULT_HYDRANT_PRESSURE_DEFINITION
                .pressureBuildDuration,
            60,
        );

        if (
            !controller
                .isWaterEmissionActive()
        ) {
            return false;
        }

        this.advanceExact(
            controller,
            DEFAULT_HYDRANT_PRESSURE_DEFINITION
                .activeDuration,
            60,
        );

        return (
            !controller
                .isWaterEmissionActive()
        );
    }

    private validateBreakFromEveryState():
        boolean {

        const targets = [
            0,
            DEFAULT_HYDRANT_PRESSURE_DEFINITION
                .inactiveDuration,
            DEFAULT_HYDRANT_PRESSURE_DEFINITION
                .inactiveDuration +
            DEFAULT_HYDRANT_PRESSURE_DEFINITION
                .pressureBuildDuration,
            DEFAULT_HYDRANT_PRESSURE_DEFINITION
                .inactiveDuration +
            DEFAULT_HYDRANT_PRESSURE_DEFINITION
                .pressureBuildDuration +
            DEFAULT_HYDRANT_PRESSURE_DEFINITION
                .activeDuration,
        ];

        for (
            const elapsed
            of targets
        ) {
            const controller =
                new HydrantPressureController();

            this.advanceExact(
                controller,
                elapsed,
                60,
            );

            controller.break();

            if (
                controller.getState() !==
                HydrantPressureState.Broken ||
                controller
                    .isWaterEmissionActive()
            ) {
                return false;
            }
        }

        return true;
    }

    private validateBrokenTerminal():
        boolean {

        const controller =
            new HydrantPressureController();

        this.advanceExact(
            controller,
            DEFAULT_HYDRANT_PRESSURE_DEFINITION
                .inactiveDuration +
            DEFAULT_HYDRANT_PRESSURE_DEFINITION
                .pressureBuildDuration,
            60,
        );

        controller.break();

        controller.update(
            100,
        );

        return (
            controller.getState() ===
            HydrantPressureState.Broken &&
            controller.getTimeInState() ===
            0 &&
            !controller
                .isWaterEmissionActive()
        );
    }

    private validateReset():
        boolean {

        const controller =
            new HydrantPressureController();

        this.advanceExact(
            controller,
            DEFAULT_HYDRANT_PRESSURE_DEFINITION
                .inactiveDuration +
            DEFAULT_HYDRANT_PRESSURE_DEFINITION
                .pressureBuildDuration,
            60,
        );

        controller.break();
        controller.reset();

        return (
            controller.getState() ===
            HydrantPressureState.Inactive &&
            controller.getTimeInState() ===
            0 &&
            controller.getCompletedCycleCount() ===
            0 &&
            !controller
                .isWaterEmissionActive() &&
            !controller
                .isBroken()
        );
    }

    private validateFrameRateStability():
        boolean {

        const totalDuration =
            26.375;

        const at30 =
            this.simulate(
                30,
                totalDuration,
            );

        const at60 =
            this.simulate(
                60,
                totalDuration,
            );

        const at120 =
            this.simulate(
                120,
                totalDuration,
            );

        return (
            this.snapshotsEqual(
                at30,
                at60,
            ) &&
            this.snapshotsEqual(
                at60,
                at120,
            )
        );
    }

    private simulate(
        fps:
            number,

        duration:
            number,
    ): TimelineSnapshot {

        const controller =
            new HydrantPressureController();

        this.advanceExact(
            controller,
            duration,
            fps,
        );

        return {
            state:
                controller.getState(),
            waterActive:
                controller
                    .isWaterEmissionActive(),
            completedCycles:
                controller
                    .getCompletedCycleCount(),
        };
    }

    private snapshotsEqual(
        first:
            TimelineSnapshot,

        second:
            TimelineSnapshot,
    ): boolean {

        return (
            first.state ===
            second.state &&
            first.waterActive ===
            second.waterActive &&
            first.completedCycles ===
            second.completedCycles
        );
    }

    private advanceExact(
        controller:
            HydrantPressureController,

        duration:
            number,

        fps:
            number,
    ): void {

        if (
            duration <= 0
        ) {
            return;
        }

        const fixedDelta =
            1 /
            fps;

        let remaining =
            duration;

        while (
            remaining >
            1e-10
        ) {
            const step =
                Math.min(
                    fixedDelta,
                    remaining,
                );

            controller.update(
                step,
            );

            remaining -=
                step;
        }
    }
}

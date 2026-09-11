import {
    DEFAULT_HYDRANT_PRESSURE_DEFINITION,
    HydrantPressureState,
    validateHydrantPressureDefinition,
} from "../../config/HydrantPressureDefinition";

import type {
    HydrantPressureDefinition,
} from "../../config/HydrantPressureDefinition";

/**
 * Authoritative Phase 8B-10C Hydrant pressure state machine.
 *
 * This controller owns only operating state and timing. It does not know about
 * WaterSource, rendering, Hose physics, Ball collision, or World.
 *
 * Normal cycle:
 *
 * Inactive -> PressureBuilding -> Active -> PressureReleasing -> Inactive
 *
 * Broken is terminal until reset().
 */
export class HydrantPressureController {
    private state:
        HydrantPressureState =
        HydrantPressureState.Inactive;

    private timeInState =
        0;

    private completedCycleCount =
        0;

    public constructor(
        private readonly definition:
            HydrantPressureDefinition =
            DEFAULT_HYDRANT_PRESSURE_DEFINITION,
    ) {
        validateHydrantPressureDefinition(
            definition,
        );
    }

    public update(
        deltaTime:
            number,
    ): void {

        if (
            !Number.isFinite(
                deltaTime,
            ) ||
            deltaTime <= 0 ||
            this.state ===
            HydrantPressureState.Broken
        ) {
            return;
        }

        this.timeInState +=
            deltaTime;

        /*
         * Carry overshoot into the next state. This makes the cycle stable
         * across different frame rates and large-but-valid frame deltas.
         */
        let transitionGuard =
            0;

        const transitionEpsilon =
            1e-9;

        while (
            this.state !==
            HydrantPressureState.Broken &&
            this.timeInState +
            transitionEpsilon >=
            this.getCurrentStateDuration()
        ) {
            const duration =
                this.getCurrentStateDuration();

            this.timeInState -=
                duration;

            /*
             * Floating-point accumulation can leave a tiny negative remainder
             * when a frame sequence lands exactly on a state boundary.
             */
            if (
                this.timeInState < 0 &&
                this.timeInState >
                -transitionEpsilon
            ) {
                this.timeInState =
                    0;
            }

            this.advanceState();

            transitionGuard +=
                1;

            if (
                transitionGuard >
                16
            ) {
                throw new Error(
                    "HydrantPressureController exceeded its transition guard.",
                );
            }
        }
    }

    public reset():
        void {

        this.state =
            HydrantPressureState.Inactive;

        this.timeInState =
            0;

        this.completedCycleCount =
            0;
    }

    /**
     * Phase 8B-11 will call this from the Hydrant damage system.
     */
    public break():
        void {

        this.state =
            HydrantPressureState.Broken;

        this.timeInState =
            0;
    }

    public getState():
        HydrantPressureState {

        return this.state;
    }

    public getTimeInState():
        number {

        return this.timeInState;
    }

    public getStateProgress():
        number {

        if (
            this.state ===
            HydrantPressureState.Broken
        ) {
            return 1;
        }

        const duration =
            this.getCurrentStateDuration();

        return Math.min(
            1,
            Math.max(
                0,
                this.timeInState /
                duration,
            ),
        );
    }

    public getCompletedCycleCount():
        number {

        return this.completedCycleCount;
    }

    public isWaterEmissionActive():
        boolean {

        return (
            this.state ===
            HydrantPressureState.Active
        );
    }

    public isBroken():
        boolean {

        return (
            this.state ===
            HydrantPressureState.Broken
        );
    }

    public getDefinition():
        HydrantPressureDefinition {

        return this.definition;
    }

    private getCurrentStateDuration():
        number {

        switch (
        this.state
        ) {
            case HydrantPressureState.Inactive:
                return this.definition
                    .inactiveDuration;

            case HydrantPressureState.PressureBuilding:
                return this.definition
                    .pressureBuildDuration;

            case HydrantPressureState.Active:
                return this.definition
                    .activeDuration;

            case HydrantPressureState.PressureReleasing:
                return this.definition
                    .pressureReleaseDuration;

            case HydrantPressureState.Broken:
                return Number
                    .POSITIVE_INFINITY;
        }
    }

    private advanceState():
        void {

        switch (
        this.state
        ) {
            case HydrantPressureState.Inactive:
                this.state =
                    HydrantPressureState
                        .PressureBuilding;

                return;

            case HydrantPressureState.PressureBuilding:
                this.state =
                    HydrantPressureState
                        .Active;

                return;

            case HydrantPressureState.Active:
                this.state =
                    HydrantPressureState
                        .PressureReleasing;

                return;

            case HydrantPressureState.PressureReleasing:
                this.state =
                    HydrantPressureState
                        .Inactive;

                this.completedCycleCount +=
                    1;

                return;

            case HydrantPressureState.Broken:
                return;
        }
    }
}

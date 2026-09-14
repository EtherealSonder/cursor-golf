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

        const transitionEpsilon =
            1e-9;

        this.timeInState +=
            deltaTime;

        /*
         * A browser tab suspension, debugger pause, or runtime hitch can hand
         * this controller a delta large enough to span many complete Hydrant
         * cycles. Skip whole cycles mathematically before processing the
         * remaining state transitions. This preserves elapsed-time semantics
         * without relying on an arbitrary transition guard.
         */
        if (
            this.state ===
            HydrantPressureState.Inactive
        ) {
            const cycleDuration =
                this.getCycleDuration();

            if (
                this.timeInState +
                transitionEpsilon >=
                cycleDuration
            ) {
                const completeCycles =
                    Math.floor(
                        (
                            this.timeInState +
                            transitionEpsilon
                        ) /
                        cycleDuration,
                    );

                if (
                    completeCycles >
                    0
                ) {
                    this.completedCycleCount +=
                        completeCycles;

                    this.timeInState -=
                        completeCycles *
                        cycleDuration;

                    if (
                        this.timeInState < 0 &&
                        this.timeInState >
                        -transitionEpsilon
                    ) {
                        this.timeInState =
                            0;
                    }
                }
            }
        }

        while (true) {
            const duration =
                this.getCurrentStateDuration();

            if (
                !Number.isFinite(
                    duration,
                ) ||
                duration <= 0
            ) {
                throw new Error(
                    "HydrantPressureController requires every non-Broken state duration to be finite and greater than zero.",
                );
            }

            if (
                this.timeInState +
                transitionEpsilon <
                duration
            ) {
                break;
            }

            this.timeInState -=
                duration;

            if (
                this.timeInState < 0 &&
                this.timeInState >
                -transitionEpsilon
            ) {
                this.timeInState =
                    0;
            }

            this.advanceState();

            /*
             * Once a carried delta reaches Inactive again, it may still contain
             * several complete cycles. Skip those cycles directly instead of
             * walking four state transitions for every elapsed cycle.
             */
            if (
                this.state ===
                HydrantPressureState.Inactive
            ) {
                const cycleDuration =
                    this.getCycleDuration();

                if (
                    this.timeInState +
                    transitionEpsilon >=
                    cycleDuration
                ) {
                    const completeCycles =
                        Math.floor(
                            (
                                this.timeInState +
                                transitionEpsilon
                            ) /
                            cycleDuration,
                        );

                    if (
                        completeCycles >
                        0
                    ) {
                        this.completedCycleCount +=
                            completeCycles;

                        this.timeInState -=
                            completeCycles *
                            cycleDuration;

                        if (
                            this.timeInState < 0 &&
                            this.timeInState >
                            -transitionEpsilon
                        ) {
                            this.timeInState =
                                0;
                        }
                    }
                }
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

    private getCycleDuration():
        number {

        const cycleDuration =
            this.definition
                .inactiveDuration +
            this.definition
                .pressureBuildDuration +
            this.definition
                .activeDuration +
            this.definition
                .pressureReleaseDuration;

        if (
            !Number.isFinite(
                cycleDuration,
            ) ||
            cycleDuration <= 0
        ) {
            throw new Error(
                "HydrantPressureController requires a finite positive total cycle duration.",
            );
        }

        return cycleDuration;
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

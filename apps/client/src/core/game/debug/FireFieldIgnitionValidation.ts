import type {
    FireFieldIgnitionMetrics,
    FireManager,
} from "../environment/FireManager";

export interface FireFieldIgnitionValidationState
    extends FireFieldIgnitionMetrics {
    readonly fieldIgnitionWorking: boolean;
}

/**
 * Lightweight development validator for the hybrid Phase 4B-5 Fire
 * transition.
 *
 * It deliberately owns no simulation state. FireManager remains the
 * authority and exposes counters so we can prove that new Fire cells
 * are actually being created by EnvironmentField heat rather than only
 * by the legacy neighbour-spread path.
 */
export class FireFieldIgnitionValidation {

    private elapsedSinceLog =
        0;

    private lastLoggedFieldIgnitions =
        -1;

    constructor(
        private readonly fireManager:
            FireManager,

        private readonly logIntervalSeconds =
            1,
    ) {
        if (
            !Number.isFinite(
                logIntervalSeconds,
            ) ||
            logIntervalSeconds <= 0
        ) {
            throw new Error(
                "Fire field ignition validation log interval must be finite and positive.",
            );
        }
    }

    public update(
        deltaTime: number,
    ): void {
        if (
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return;
        }

        this.elapsedSinceLog +=
            deltaTime;

        if (
            this.elapsedSinceLog <
            this.logIntervalSeconds
        ) {
            return;
        }

        this.elapsedSinceLog =
            0;

        const state =
            this.getState();

        if (
            state.fieldIgnitions ===
            this.lastLoggedFieldIgnitions &&
            state.trackedHeatCellCount ===
            0
        ) {
            return;
        }

        this.lastLoggedFieldIgnitions =
            state.fieldIgnitions;

        console.log(
            "Fire field ignition validation.",
            state,
        );
    }

    public reset():
        void {
        this.elapsedSinceLog =
            0;

        this.lastLoggedFieldIgnitions =
            -1;
    }

    public getState():
        FireFieldIgnitionValidationState {

        const metrics =
            this.fireManager
                .getFieldIgnitionMetrics();

        return {
            ...metrics,

            fieldIgnitionWorking:
                metrics.fieldIgnitions >
                0,
        };
    }
}

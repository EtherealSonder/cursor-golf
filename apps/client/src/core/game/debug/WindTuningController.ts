import {
    WIND_TEST_PRESETS,
} from "../config/WindTestDefinition";

import type {
    WindTestPreset,
    WindTestPresetId,
} from "../config/WindTestDefinition";

import type {
    WindManager,
} from "../environment/WindManager";

/**
 * Describes whether WindManager currently contains
 * normal randomized session wind or a deterministic
 * C7 validation preset.
 */
export type WindTuningMode =
    | "random"
    | "preset";

/**
 * Immutable snapshot exposed to development UI.
 */
export interface WindTuningState {

    readonly mode:
    WindTuningMode;

    /**
     * Current preset when mode is "preset".
     *
     * null means normal randomized wind is active.
     */
    readonly activePreset:
    WindTestPreset | null;

    /**
     * Zero-based index of the selected preset.
     *
     * null means normal randomized wind is active.
     */
    readonly activePresetIndex:
    number | null;

    readonly presetCount: number;
}

export type WindTuningStateListener = (
    state: WindTuningState,
) => void;

/**
 * Development-only controller for selecting stable,
 * repeatable environmental wind conditions.
 *
 * This controller changes only direction and displayed
 * wind speed. It does not modify:
 *
 * - accelerationPerKph
 * - influence curves
 * - acceleration caps
 * - Ball physics
 * - randomized speed bands
 */
export class WindTuningController {

    private readonly windManager:
        WindManager;

    private readonly stateListeners:
        Set<WindTuningStateListener> =
        new Set<WindTuningStateListener>();

    private mode:
        WindTuningMode =
        "random";

    private activePresetIndex:
        number | null =
        null;

    constructor(
        windManager: WindManager,
    ) {
        this.windManager =
            windManager;

        this.validatePresets();
    }

    // -------------------------------------------------------------------------
    // Preset Selection
    // -------------------------------------------------------------------------

    /**
     * Applies one deterministic preset by index.
     */
    public applyPresetByIndex(
        presetIndex: number,
    ): void {

        this.validatePresetIndex(
            presetIndex,
        );

        const preset =
            WIND_TEST_PRESETS[
            presetIndex
            ];

        if (!preset) {
            throw new Error(
                "Wind tuning preset could not be resolved.",
            );
        }

        this.windManager.setWind(
            preset.directionDegrees,
            preset.speedKph,
        );

        this.mode =
            "preset";

        this.activePresetIndex =
            presetIndex;

        this.notifyStateListeners();
    }

    /**
     * Applies one deterministic preset by its stable
     * identifier.
     */
    public applyPresetById(
        presetId:
            WindTestPresetId,
    ): void {

        const presetIndex =
            this.findPresetIndexById(
                presetId,
            );

        if (
            presetIndex ===
            -1
        ) {
            throw new Error(
                `Unknown wind test preset: ${presetId}.`,
            );
        }

        this.applyPresetByIndex(
            presetIndex,
        );
    }

    /**
     * Moves to the next deterministic preset.
     *
     * When random mode is active, the first preset is
     * selected.
     *
     * Preset navigation wraps at both ends.
     */
    public applyNextPreset(): void {

        if (
            this.activePresetIndex ===
            null
        ) {
            this.applyPresetByIndex(
                0,
            );

            return;
        }

        const nextIndex =
            (
                this.activePresetIndex +
                1
            ) %
            WIND_TEST_PRESETS.length;

        this.applyPresetByIndex(
            nextIndex,
        );
    }

    /**
     * Moves to the previous deterministic preset.
     *
     * When random mode is active, the final preset is
     * selected.
     *
     * Preset navigation wraps at both ends.
     */
    public applyPreviousPreset(): void {

        if (
            this.activePresetIndex ===
            null
        ) {
            this.applyPresetByIndex(
                WIND_TEST_PRESETS.length -
                1,
            );

            return;
        }

        const previousIndex =
            (
                this.activePresetIndex -
                1 +
                WIND_TEST_PRESETS.length
            ) %
            WIND_TEST_PRESETS.length;

        this.applyPresetByIndex(
            previousIndex,
        );
    }

    /**
     * Leaves deterministic validation mode and asks
     * WindManager to generate a new normal randomized
     * wind condition.
     */
    public applyRandomWind(): void {

        this.windManager.randomizeWind();

        this.mode =
            "random";

        this.activePresetIndex =
            null;

        this.notifyStateListeners();
    }

    // -------------------------------------------------------------------------
    // State Queries
    // -------------------------------------------------------------------------

    public getState():
        WindTuningState {

        const activePreset =
            this.activePresetIndex ===
                null
                ? null
                : (
                    WIND_TEST_PRESETS[
                    this.activePresetIndex
                    ] ??
                    null
                );

        return {
            mode:
                this.mode,

            activePreset,

            activePresetIndex:
                this.activePresetIndex,

            presetCount:
                WIND_TEST_PRESETS.length,
        };
    }

    public getPresets():
        readonly WindTestPreset[] {

        return WIND_TEST_PRESETS;
    }

    // -------------------------------------------------------------------------
    // State Subscription
    // -------------------------------------------------------------------------

    /**
     * Registers a listener and immediately sends the
     * current controller state.
     */
    public subscribe(
        listener:
            WindTuningStateListener,
    ): () => void {

        this.stateListeners.add(
            listener,
        );

        listener(
            this.getState(),
        );

        let unsubscribed =
            false;

        return (): void => {

            if (unsubscribed) {
                return;
            }

            unsubscribed =
                true;

            this.stateListeners.delete(
                listener,
            );
        };
    }

    private notifyStateListeners():
        void {

        if (
            this.stateListeners.size ===
            0
        ) {
            return;
        }

        const state =
            this.getState();

        /*
         * Set.forEach is used instead of for...of so
         * this remains compatible with the current
         * TypeScript compilation target.
         */
        this.stateListeners.forEach(
            (
                listener,
            ): void => {

                listener(
                    state,
                );
            },
        );
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    public destroy(): void {

        this.stateListeners.clear();

        this.mode =
            "random";

        this.activePresetIndex =
            null;
    }

    // -------------------------------------------------------------------------
    // Utilities
    // -------------------------------------------------------------------------

    private findPresetIndexById(
        presetId:
            WindTestPresetId,
    ): number {

        for (
            let presetIndex = 0;
            presetIndex <
            WIND_TEST_PRESETS.length;
            presetIndex += 1
        ) {
            const preset =
                WIND_TEST_PRESETS[
                presetIndex
                ];

            if (
                preset?.id ===
                presetId
            ) {
                return presetIndex;
            }
        }

        return -1;
    }

    // -------------------------------------------------------------------------
    // Validation
    // -------------------------------------------------------------------------

    private validatePresets():
        void {

        if (
            WIND_TEST_PRESETS.length ===
            0
        ) {
            throw new Error(
                "WindTuningController requires at least one deterministic preset.",
            );
        }

        for (
            let presetIndex = 0;
            presetIndex <
            WIND_TEST_PRESETS.length;
            presetIndex += 1
        ) {
            const preset =
                WIND_TEST_PRESETS[
                presetIndex
                ];

            if (!preset) {
                throw new Error(
                    "Wind tuning preset collection contains an invalid entry.",
                );
            }

            if (
                !Number.isFinite(
                    preset.directionDegrees,
                )
            ) {
                throw new Error(
                    `Wind preset ${preset.id} has an invalid direction.`,
                );
            }

            if (
                !Number.isFinite(
                    preset.speedKph,
                )
            ) {
                throw new Error(
                    `Wind preset ${preset.id} has an invalid speed.`,
                );
            }

            const definition =
                this.windManager
                    .getDefinition();

            if (
                preset.speedKph <
                definition.minimumStrength ||
                preset.speedKph >
                definition.maximumStrength
            ) {
                throw new Error(
                    `Wind preset ${preset.id} falls outside the configured wind-strength range.`,
                );
            }
        }
    }

    private validatePresetIndex(
        presetIndex: number,
    ): void {

        if (
            !Number.isInteger(
                presetIndex,
            )
        ) {
            throw new Error(
                "Wind tuning preset index must be an integer.",
            );
        }

        if (
            presetIndex < 0 ||
            presetIndex >=
            WIND_TEST_PRESETS.length
        ) {
            throw new Error(
                "Wind tuning preset index is outside the available preset range.",
            );
        }
    }
}
/**
 * Phase 8B-10C Hydrant pressure-cycle states.
 *
 * Broken is terminal until reset(). Phase 8B-11 will later connect gameplay
 * damage to that state.
 */
export enum HydrantPressureState {
    Inactive =
    "Inactive",

    PressureBuilding =
    "PressureBuilding",

    Active =
    "Active",

    PressureReleasing =
    "PressureReleasing",

    Broken =
    "Broken",
}

export interface HydrantPressureDefinition {
    /**
     * Quiet period between pressure cycles.
     */
    readonly inactiveDuration:
    number;

    /**
     * Time spent building pressure before the valve produces the full stream.
     */
    readonly pressureBuildDuration:
    number;

    /**
     * Full-pressure Water emission duration.
     */
    readonly activeDuration:
    number;

    /**
     * Dry release/cooldown period after the active burst.
     */
    readonly pressureReleaseDuration:
    number;
}

/**
 * Initial gameplay tuning for Phase 8B-10C.
 *
 * Total repeating cycle:
 * 3.0 s Inactive
 * 1.0 s PressureBuilding
 * 5.0 s Active
 * 1.5 s PressureReleasing
 */
export const DEFAULT_HYDRANT_PRESSURE_DEFINITION:
    HydrantPressureDefinition = {

    inactiveDuration:
        3,

    pressureBuildDuration:
        1,

    activeDuration:
        5,

    pressureReleaseDuration:
        1.5,
};

export function validateHydrantPressureDefinition(
    definition:
        HydrantPressureDefinition,
): void {

    const values = [
        definition.inactiveDuration,
        definition.pressureBuildDuration,
        definition.activeDuration,
        definition.pressureReleaseDuration,
    ];

    if (
        values.some(
            (value): boolean =>
                !Number.isFinite(
                    value,
                ) ||
                value <= 0,
        )
    ) {
        throw new Error(
            "Hydrant pressure durations must all be finite and greater than zero.",
        );
    }
}

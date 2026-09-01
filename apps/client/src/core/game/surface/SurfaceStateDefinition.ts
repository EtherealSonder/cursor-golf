import {
    SurfaceType,
} from "./SurfaceType";

import {
    SurfaceState,
} from "./SurfaceState";

/**
 * Development switch for automatic temporary-state
 * expiry.
 *
 * false:
 * Wet Grass and Wet Sand remain wet indefinitely.
 * This is useful while comparing their physics.
 *
 * true:
 * Temporary states use their configured test
 * duration and then revert automatically.
 *
 * This is intentionally a development-facing
 * setting. Final gameplay drying durations should
 * be tuned later when Water is implemented.
 */
export const SURFACE_STATE_TIMERS_ENABLED =
    false;

/**
 * Temporary validation duration used while the timer
 * system is enabled.
 *
 * This is not a locked final gameplay value.
 */
export const TEMPORARY_SURFACE_STATE_TEST_DURATION_SECONDS =
    8;

export interface SurfaceStateDefinition {

    readonly surfaceType:
    SurfaceType;

    readonly state:
    SurfaceState;

    /**
     * Multiplier applied to the Ball's existing
     * rollingDeceleration value.
     */
    readonly rollingResistanceMultiplier:
    number;

    /**
     * Default lifetime for a temporary state.
     *
     * Null means the state persists until explicitly
     * changed.
     */
    readonly durationSeconds:
    number | null;

    /**
     * State restored when a temporary state expires.
     *
     * Null means there is no automatic reversion.
     */
    readonly reversionState:
    SurfaceState | null;
}

export const NORMAL_GRASS_STATE_DEFINITION:
    SurfaceStateDefinition = {

    surfaceType:
        SurfaceType.Grass,

    state:
        SurfaceState.Normal,

    rollingResistanceMultiplier:
        1,

    durationSeconds:
        null,

    reversionState:
        null,
};

export const WET_GRASS_STATE_DEFINITION:
    SurfaceStateDefinition = {

    surfaceType:
        SurfaceType.Grass,

    state:
        SurfaceState.Wet,

    /*
     * Wet Grass is deliberately more resistant than
     * Normal Grass so the gameplay difference is
     * clearly perceptible during testing.
     */
    rollingResistanceMultiplier:
        1.3,

    durationSeconds:
        SURFACE_STATE_TIMERS_ENABLED
            ? TEMPORARY_SURFACE_STATE_TEST_DURATION_SECONDS
            : null,

    reversionState:
        SurfaceState.Normal,
};

export const SCORCHED_GRASS_STATE_DEFINITION:
    SurfaceStateDefinition = {

    surfaceType:
        SurfaceType.Grass,

    state:
        SurfaceState.Scorched,

    /*
     * Scorched Grass is intentionally faster than
     * Normal Grass, creating a longer-roll route.
     */
    rollingResistanceMultiplier:
        0.75,

    durationSeconds:
        null,

    reversionState:
        null,
};

export const DRY_SAND_STATE_DEFINITION:
    SurfaceStateDefinition = {

    surfaceType:
        SurfaceType.Sand,

    state:
        SurfaceState.Dry,

    rollingResistanceMultiplier:
        2,

    durationSeconds:
        null,

    reversionState:
        null,
};

export const WET_SAND_STATE_DEFINITION:
    SurfaceStateDefinition = {

    surfaceType:
        SurfaceType.Sand,

    state:
        SurfaceState.Wet,

    /*
     * Water compacts Sand. Wet Sand therefore offers
     * much less rolling resistance than Dry Sand,
     * while remaining slower than Normal Grass.
     */
    rollingResistanceMultiplier:
        1.35,

    durationSeconds:
        SURFACE_STATE_TIMERS_ENABLED
            ? TEMPORARY_SURFACE_STATE_TEST_DURATION_SECONDS
            : null,

    reversionState:
        SurfaceState.Dry,
};

const SURFACE_STATE_DEFINITIONS:
    readonly SurfaceStateDefinition[] = [
        NORMAL_GRASS_STATE_DEFINITION,
        WET_GRASS_STATE_DEFINITION,
        SCORCHED_GRASS_STATE_DEFINITION,
        DRY_SAND_STATE_DEFINITION,
        WET_SAND_STATE_DEFINITION,
    ];

export function getSurfaceStateDefinition(
    surfaceType:
        SurfaceType,

    state:
        SurfaceState,
): SurfaceStateDefinition {

    const definition =
        SURFACE_STATE_DEFINITIONS
            .find(
                (
                    candidate:
                        SurfaceStateDefinition,
                ): boolean =>
                    candidate.surfaceType ===
                    surfaceType &&
                    candidate.state ===
                    state,
            );

    if (
        !definition
    ) {
        throw new Error(
            `Surface '${surfaceType}' does not support state '${state}'.`,
        );
    }

    return definition;
}

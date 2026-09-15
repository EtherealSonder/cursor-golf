import {
    isSurfaceStateAllowed,
} from "../surface/SurfaceDefinition";

import {
    SurfaceState,
} from "../surface/SurfaceState";

import {
    SurfaceType,
} from "../surface/SurfaceType";

export interface MoistureSurfaceProfile {
    readonly surfaceType:
    SurfaceType;

    /**
     * Moisture at which ground becomes categorically Wet.
     *
     * Phase 8C-6A contact wetting deliberately establishes moisture slightly
     * above this threshold beneath meaningful standing Water.
     */
    readonly wetThreshold:
    number;

    /**
     * A Wet cell remains Wet while moisture is between dryThreshold and
     * wetThreshold. This hysteresis prevents flicker while the footprint dries.
     */
    readonly dryThreshold:
    number;

    readonly dryState:
    SurfaceState;

    readonly wetState:
    SurfaceState;
}

export interface MoistureSurfaceBridgeDefinition {
    readonly enabled:
    boolean;

    readonly surfaceProfiles:
    readonly MoistureSurfaceProfile[];
}

export const DEFAULT_MOISTURE_SURFACE_BRIDGE_DEFINITION:
    MoistureSurfaceBridgeDefinition = {
    enabled:
        true,

    surfaceProfiles: [
        {
            surfaceType:
                SurfaceType.Grass,

            wetThreshold:
                0.10,

            dryThreshold:
                0.09,

            dryState:
                SurfaceState.Normal,

            wetState:
                SurfaceState.Wet,
        },
        {
            surfaceType:
                SurfaceType.Sand,

            wetThreshold:
                0.10,

            dryThreshold:
                0.08,

            dryState:
                SurfaceState.Dry,

            wetState:
                SurfaceState.Wet,
        },
    ],
};

export function validateMoistureSurfaceBridgeDefinition(
    definition:
        MoistureSurfaceBridgeDefinition,
): void {
    if (
        typeof definition.enabled !==
        "boolean"
    ) {
        throw new Error(
            "Moisture surface bridge enabled must be a boolean.",
        );
    }

    if (
        definition.surfaceProfiles.length ===
        0
    ) {
        throw new Error(
            "Moisture surface bridge requires at least one surface profile.",
        );
    }

    const seenSurfaceTypes =
        new Set<SurfaceType>();

    for (
        const profile
        of definition.surfaceProfiles
    ) {
        if (
            seenSurfaceTypes.has(
                profile.surfaceType,
            )
        ) {
            throw new Error(
                `Moisture surface bridge has a duplicate profile for '${profile.surfaceType}'.`,
            );
        }

        seenSurfaceTypes.add(
            profile.surfaceType,
        );

        if (
            !Number.isFinite(
                profile.dryThreshold,
            ) ||
            !Number.isFinite(
                profile.wetThreshold,
            ) ||
            profile.dryThreshold < 0 ||
            profile.wetThreshold > 1 ||
            profile.dryThreshold >=
            profile.wetThreshold
        ) {
            throw new Error(
                `Moisture surface bridge thresholds for '${profile.surfaceType}' must satisfy 0 <= dryThreshold < wetThreshold <= 1.`,
            );
        }

        if (
            !isSurfaceStateAllowed(
                profile.surfaceType,
                profile.dryState,
            ) ||
            !isSurfaceStateAllowed(
                profile.surfaceType,
                profile.wetState,
            )
        ) {
            throw new Error(
                `Moisture surface bridge contains an invalid state for '${profile.surfaceType}'.`,
            );
        }

        if (
            profile.dryState ===
            profile.wetState
        ) {
            throw new Error(
                `Moisture surface bridge dryState and wetState must differ for '${profile.surfaceType}'.`,
            );
        }
    }

    for (
        const surfaceType
        of Object.values(
            SurfaceType,
        )
    ) {
        if (
            !seenSurfaceTypes.has(
                surfaceType,
            )
        ) {
            throw new Error(
                `Moisture surface bridge is missing a profile for '${surfaceType}'.`,
            );
        }
    }
}

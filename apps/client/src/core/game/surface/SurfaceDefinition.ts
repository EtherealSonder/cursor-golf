import {
    SurfaceType,
} from "./SurfaceType";

import {
    SurfaceState,
} from "./SurfaceState";

export interface SurfaceDefinition {

    readonly type:
    SurfaceType;

    readonly defaultState:
    SurfaceState;

    readonly allowedStates:
    readonly SurfaceState[];
}

export const GRASS_SURFACE_DEFINITION:
    SurfaceDefinition = {

    type:
        SurfaceType.Grass,

    defaultState:
        SurfaceState.Normal,

    allowedStates: [
        SurfaceState.Normal,
        SurfaceState.Wet,
        SurfaceState.Scorched,
    ],
};

export const SAND_SURFACE_DEFINITION:
    SurfaceDefinition = {

    type:
        SurfaceType.Sand,

    defaultState:
        SurfaceState.Dry,

    allowedStates: [
        SurfaceState.Dry,
        SurfaceState.Wet,
    ],
};

const SURFACE_DEFINITIONS:
    Readonly<Record<SurfaceType, SurfaceDefinition>> = {

    [SurfaceType.Grass]:
        GRASS_SURFACE_DEFINITION,

    [SurfaceType.Sand]:
        SAND_SURFACE_DEFINITION,
};

export function getSurfaceDefinition(
    type:
        SurfaceType,
): SurfaceDefinition {

    return SURFACE_DEFINITIONS[
        type
    ];
}

export function isSurfaceStateAllowed(
    surfaceType:
        SurfaceType,

    state:
        SurfaceState,
): boolean {

    return getSurfaceDefinition(
        surfaceType,
    )
        .allowedStates
        .includes(
            state,
        );
}

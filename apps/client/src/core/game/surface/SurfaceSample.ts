import type {
    SurfaceType,
} from "./SurfaceType";

import type {
    SurfaceState,
} from "./SurfaceState";

/**
 * Resolved physical surface data at one world-space point.
 * Consumers such as Ball use this sample without needing to
 * understand how surface state is stored or updated.
 */
export interface SurfaceSample {

    readonly surfaceType:
    SurfaceType;

    readonly surfaceState:
    SurfaceState;

    readonly rollingResistanceMultiplier:
    number;

    readonly zoneId:
    string | null;
}

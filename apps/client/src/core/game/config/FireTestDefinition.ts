import {
    SurfaceType,
} from "../surface/SurfaceType";

/**
 * Temporary Phase 4 Fire validation geometry.
 *
 * Wet Grass is intentionally deferred until Water physics.
 */
export interface FireTestDefinition {
    readonly enabled: boolean;

    readonly sandBlocker: {
        readonly id: string;
        readonly surfaceType: SurfaceType;
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
    };
}

export const DEFAULT_FIRE_TEST_DEFINITION: FireTestDefinition = {
    enabled: true,

    sandBlocker: {
        id: "phase-4-fire-sand-blocker",
        surfaceType: SurfaceType.Sand,
        x: 144,
        y: 176,
        width: 216,
        height: 336,
    },
};

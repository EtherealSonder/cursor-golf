import {
    SurfaceType,
} from "../surface/SurfaceType";

/**
 * Temporary Phase 4 Fire validation geometry.
 *
 * Automatic ignition is intentionally disabled here. Fire is
 * now generated through the development "Generate Random Fire"
 * control so different positions and cluster sizes can be
 * tested repeatedly without restarting the game.
 */
export interface FireTestDefinition {
    readonly enabled: boolean;

    readonly wetGrassBlocker: {
        readonly id: string;
        readonly surfaceType: SurfaceType;
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
    };

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

    /*
     * Large Wet Grass patch inside the initial camera view.
     * Fire ignition and spread should be rejected here.
     */
    wetGrassBlocker: {
        id: "phase-4-fire-wet-grass-blocker",
        surfaceType: SurfaceType.Grass,
        x: 720,
        y: 176,
        width: 216,
        height: 336,
    },

    /*
     * Large Sand patch inside the initial camera view.
     * Fire ignition and spread should also be rejected here.
     */
    sandBlocker: {
        id: "phase-4-fire-sand-blocker",
        surfaceType: SurfaceType.Sand,
        x: 144,
        y: 176,
        width: 216,
        height: 336,
    },
};

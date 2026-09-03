export interface FireMoistureTestBandDefinition {
    readonly id: string;
    readonly label: string;
    readonly moisture: number;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly color: number;
}

export interface FireMoistureTestDefinition {
    readonly enabled: boolean;
    readonly overlayAlpha: number;
    readonly outlineColor: number;
    readonly outlineAlpha: number;
    readonly bands: readonly FireMoistureTestBandDefinition[];
}

/**
 * Development-only moisture validation strip.
 *
 * The initial camera shows world X 0..1200 and Y 0..720. The strip is
 * deliberately placed to the right of the existing Phase 4 Sand blocker.
 *
 * Left -> right:
 *
 * DRY 0.08 | DAMP 0.35 | MOIST 0.60 | VERY WET 0.84
 */
export const DEFAULT_FIRE_MOISTURE_TEST_DEFINITION:
    FireMoistureTestDefinition = {

    enabled:
        true,

    overlayAlpha:
        0.16,

    outlineColor:
        0xffffff,

    outlineAlpha:
        0.34,

    bands: [
        {
            id: "fire-moisture-dry",
            label: "Dry",
            moisture: 0.08,
            x: 400,
            y: 80,
            width: 180,
            height: 560,
            color: 0xf6d365,
        },
        {
            id: "fire-moisture-damp",
            label: "Damp",
            moisture: 0.35,
            x: 580,
            y: 80,
            width: 180,
            height: 560,
            color: 0xb8d58b,
        },
        {
            id: "fire-moisture-moist",
            label: "Moist",
            moisture: 0.60,
            x: 760,
            y: 80,
            width: 180,
            height: 560,
            color: 0x76c6d7,
        },
        {
            id: "fire-moisture-very-wet",
            label: "Very Wet",
            moisture: 0.84,
            x: 940,
            y: 80,
            width: 180,
            height: 560,
            color: 0x5b8fd8,
        },
    ],
};

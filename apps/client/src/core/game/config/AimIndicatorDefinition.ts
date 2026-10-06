export interface AimIndicatorDefinition {
    /** Ball radius. The meter begins exactly at this distance from Ball centre. */
    readonly ballRadius: number;

    /** Local X origin. Zero starts at Ball centre so the Ball masks the rear. */
    readonly startOffset: number;

    /** Visible meter length at zero and full power. */
    readonly minimumLength: number;
    readonly maximumLength: number;

    /** Meter body thickness at zero and full power. */
    readonly minimumThickness: number;
    readonly maximumThickness: number;
    readonly minimumReadablePower: number;

    readonly outlineThickness: number;
    readonly outlineColor: number;

    /** Unfilled full-capacity region. */
    readonly trackColor: number;
    readonly trackAlpha: number;

    /** Length of the tapered terminal region. */
    readonly tipLength: number;

    /** Six power bands, two shades for each power family. */
    readonly bandColors: readonly [
        number, number, number, number, number, number
    ];

    /** How far each internal band boundary points forward. */
    readonly chevronDepth: number;
    readonly bandOverlap: number;

    readonly fillAlpha: number;

    /** Traveling white-band cue. */
    readonly pulseEnabled: boolean;
    readonly pulseBandDuration: number;
    readonly pulseGapDuration: number;
    readonly pulseAlpha: number;
    readonly pulseColor: number;
}

export const DEFAULT_AIM_INDICATOR_DEFINITION: AimIndicatorDefinition = {
    ballRadius: 10,
    startOffset: 0,

    // Strong length response makes drag/power readable at a glance.
    minimumLength: 44,
    maximumLength: 250,

    minimumThickness: 18,
    maximumThickness: 22,
    minimumReadablePower: 0.10,

    outlineThickness: 2.5,
    outlineColor: 0x332a3a,

    trackColor: 0xffffff,
    trackAlpha: 0.16,

    // Small tapered end, not a conventional oversized arrow head.
    tipLength: 24,

    // Yellow 1/2, orange 1/2, red 1/2.
    bandColors: [
        0xffe45c,
        0xffcc3d,
        0xffa13a,
        0xff7a31,
        0xf25362,
        0xdd3e80,
    ],

    chevronDepth: 8,
    bandOverlap: 8,
    fillAlpha: 1.0,

    pulseEnabled: true,
    pulseBandDuration: 0.10,
    pulseGapDuration: 0.16,
    pulseAlpha: 0.96,
    pulseColor: 0xffffff,
};

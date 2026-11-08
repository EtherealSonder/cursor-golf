export interface DebuffHudDefinition {
    readonly rightMargin: number;
    readonly topOffsetFromLives: number;
    readonly entrySize: number;
    readonly entrySpacing: number;
    readonly newestEntryAnchorsRight: boolean;
    readonly holderColor: number;
    readonly popInSeconds: number;
    readonly popOutSeconds: number;
    readonly reorderSeconds: number;
    readonly popOvershootScale: number;
    readonly deathBadgeDiameter: number;
    readonly deathBadgeOffsetY: number;
    /** Maximum square footprint for the skull artwork, aspect ratio preserved. */
    readonly deathSkullSize: number;
}

export const DEFAULT_DEBUFF_HUD_DEFINITION: DebuffHudDefinition = {
    rightMargin: 28,
    topOffsetFromLives: 104,

    // Secondary status holder, scaled to sit below the 330 x 72 lives HUD.
    entrySize: 80,
    entrySpacing: 10,
    newestEntryAnchorsRight: true,

    // Pale muted blush used by all circular status holders.
    holderColor: 0xe2cfd3,

    popInSeconds: 0.18,
    popOutSeconds: 0.12,
    reorderSeconds: 0.14,
    popOvershootScale: 1.08,

    deathBadgeDiameter: 30,
    deathBadgeOffsetY: 31,
    deathSkullSize: 20.25,
};

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
}

export const DEFAULT_DEBUFF_HUD_DEFINITION: DebuffHudDefinition = {
    rightMargin: 28,
    topOffsetFromLives: 104,

    // Universal circular status/debuff holder. Larger than the first D-3 pass
    // so the icon reads clearly beneath the lives bar.
    entrySize: 92,
    entrySpacing: 12,
    newestEntryAnchorsRight: true,

    // Pale muted blush used by all circular status holders.
    holderColor: 0xe2cfd3,

    popInSeconds: 0.18,
    popOutSeconds: 0.12,
    reorderSeconds: 0.14,
    popOvershootScale: 1.08,

    deathBadgeDiameter: 34,
    deathBadgeOffsetY: 36,
};

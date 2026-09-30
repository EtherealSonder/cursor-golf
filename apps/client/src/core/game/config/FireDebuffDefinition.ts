export interface FireDebuffDefinition {
    readonly innerColor: number;
    readonly middleColor: number;
    readonly outerColor: number;

    /** Scale of the shared authored 512x512 Fire composition relative to holder diameter. */
    readonly compositionScale: number;
    readonly compositionOffsetX: number;
    readonly compositionOffsetY: number;

    /** The permanent line-art layer stays fully visible while color fills underneath it. */
    readonly outlineTint: number;

    readonly deathBadgeColor: number;
    readonly deathBadgeOutlineColor: number;
    readonly deathBadgeOutlineWidth: number;
}

export const DEFAULT_FIRE_DEBUFF_DEFINITION: FireDebuffDefinition = {
    // Three sequential heat bands. These are presentation colors only.
    innerColor: 0xffc24a,
    middleColor: 0xff7a3d,
    outerColor: 0xff4654,

    // The source PNGs share the same 512x512 authored coordinate space.
    // Their visible flame occupies only part of that canvas, so the complete
    // composition is intentionally rendered larger than the holder diameter.
    compositionScale: 1.46,
    compositionOffsetX: 0,
    compositionOffsetY: -1,

    outlineTint: 0x171317,

    deathBadgeColor: 0xff2457,
    deathBadgeOutlineColor: 0x171317,
    deathBadgeOutlineWidth: 2,
};

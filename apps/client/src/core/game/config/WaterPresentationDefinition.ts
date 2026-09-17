/**
 * Production Water presentation contract.
 *
 * Phase 8I-0 establishes presentation-only configuration for Water.
 *
 * Architecture rules:
 * - WaterField remains authoritative for standing Water.
 * - AirborneWaterSystem remains authoritative for Water transport.
 * - EnvironmentField remains authoritative for retained ground moisture.
 * - Ball/Water and Water/Fire gameplay events remain authoritative for their interactions.
 * - Presentation must never alter simulation state or gameplay outcomes.
 * - Visual continuity must not be achieved by increasing simulation Water packet counts.
 *
 * Art direction:
 * - Flat illustrated Water inspired by pop-up-book/cartoon presentation.
 * - Smooth organic standing-Water silhouettes.
 * - Restrained depth variation.
 * - Sparse highlights.
 * - No continuous foam field or strong optical distortion.
 * - Surface activity should primarily come from gameplay interactions.
 */

export interface WaterPresentationPalette {
    readonly deepWater: number;
    readonly baseWater: number;
    readonly lightWater: number;
    readonly waterHighlight: number;
    readonly waterEdge: number;
    readonly waterFoam: number;

    readonly steamLight: number;
    readonly steamShadow: number;
    readonly steamFade: number;
}

export interface StandingWaterPresentationDefinition {
    /**
     * Presentation-only switch for the production standing-Water renderer.
     * This must never enable/disable Water simulation.
     */
    readonly enabled: boolean;

    /**
     * Depth below which standing Water is visually suppressed.
     * Presentation only. It must not affect WaterField contents.
     */
    readonly minimumVisibleDepth: number;

    /**
     * Depth treated as visually "full" for depth/color mapping.
     * This does not clamp or modify WaterField depth.
     */
    readonly fullScaleDepth: number;

    /**
     * Width of the visual transition around the visible Water boundary.
     * Intended for smooth scalar-field edge reconstruction.
     */
    readonly edgeTransitionDepth: number;

    /**
     * Alpha controls for the illustrated standing-Water body.
     * These are intentionally conservative starting values and are expected
     * to be visually tuned during Phase 8I-1/8I-2.
     */
    readonly baseAlpha: number;
    readonly shallowAlpha: number;
    readonly deepAlpha: number;

    /**
     * Presentation refresh cadence only.
     * It must not change the Water simulation timestep.
     */
    readonly refreshIntervalSeconds: number;
}

export interface WaterPresentationDefinitionType {
    /**
     * Master presentation-only switch.
     *
     * Disabling this must never disable or modify Water simulation,
     * Water transport, Ball/Water gameplay, ground moisture, or Fire suppression.
     */
    readonly enabled: boolean;

    readonly palette: WaterPresentationPalette;
    readonly standingWater: StandingWaterPresentationDefinition;
}

export const WaterPresentationDefinition: WaterPresentationDefinitionType = {
    enabled: true,

    palette: {
        deepWater: 0x3f83c5,
        baseWater: 0x58a9e2,
        lightWater: 0x83d0ee,
        waterHighlight: 0xeafbff,
        waterEdge: 0x3675b5,
        waterFoam: 0xf5ffff,

        steamLight: 0xf4faf8,
        steamShadow: 0xc8e1e1,
        steamFade: 0xa9ced2,
    },

    standingWater: {
        enabled: true,

        // Initial presentation values. Final visual tuning belongs to 8I-1/8I-2.
        minimumVisibleDepth: 0.0005,
        fullScaleDepth: 0.12,
        edgeTransitionDepth: 0.006,

        baseAlpha: 0.78,
        shallowAlpha: 0.66,
        deepAlpha: 0.86,

        refreshIntervalSeconds: 1 / 30,
    },
} as const;

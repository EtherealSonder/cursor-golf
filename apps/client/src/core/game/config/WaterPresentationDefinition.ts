/**
 * Production Water presentation contract.
 *
 * Phase 8I-2 final illustrated standing-Water pass.
 * Presentation only. WaterField and gameplay remain authoritative.
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
    readonly enabled: boolean;
    readonly minimumVisibleDepth: number;
    readonly fullScaleDepth: number;
    readonly edgeTransitionDepth: number;

    /** Main Water body is intentionally near-opaque for the illustrated style. */
    readonly baseAlpha: number;
    readonly shallowAlpha: number;
    readonly deepAlpha: number;

    /**
     * Phase 8I-2 sparse illustrated surface highlights.
     * These are deterministic presentation marks, not foam or gameplay state.
     */
    readonly highlightsEnabled: boolean;
    readonly highlightMinimumDepthFactor: number;
    readonly highlightSpacingCellsX: number;
    readonly highlightSpacingCellsY: number;
    readonly highlightStrength: number;

    readonly refreshIntervalSeconds: number;
}

export interface WaterPresentationDefinitionType {
    readonly enabled: boolean;
    readonly palette: WaterPresentationPalette;
    readonly standingWater: StandingWaterPresentationDefinition;
}

export const WaterPresentationDefinition: WaterPresentationDefinitionType = {
    enabled: true,

    palette: {
        // Restrained cyan/blue hierarchy. Depth is communicated by colour rather than transparency.
        deepWater: 0x43a8d2,
        baseWater: 0x55c3df,
        lightWater: 0x79d7e9,
        waterHighlight: 0xeafbff,
        waterEdge: 0x47b5d5,
        waterFoam: 0xf5ffff,

        steamLight: 0xf4faf8,
        steamShadow: 0xc8e1e1,
        steamFade: 0xa9ced2,
    },

    standingWater: {
        enabled: true,

        // Preserve the broad authoritative WaterField footprint established in 8I-1.
        minimumVisibleDepth: 0.0005,
        fullScaleDepth: 0.12,

        // Narrow transition so only the reconstructed silhouette fringe is translucent.
        edgeTransitionDepth: 0.003,

        // Illustrated pop-colour body. Wet ground should no longer dominate the perceived colour.
        shallowAlpha: 0.95,
        baseAlpha: 0.985,
        deepAlpha: 1.0,

        // Sparse Plucky-Squire-like graphic glints. Large puddles receive only a few marks.
        highlightsEnabled: true,
        highlightMinimumDepthFactor: 0.32,
        highlightSpacingCellsX: 20,
        highlightSpacingCellsY: 16,
        highlightStrength: 0.78,

        refreshIntervalSeconds: 1 / 30,
    },
} as const;

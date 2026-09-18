/**
 * Production Water presentation contract.
 *
 * Phase 8I-3 adds bounded standing-Water rendering controls.
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

    readonly highlightsEnabled: boolean;
    readonly highlightMinimumDepthFactor: number;
    readonly highlightSpacingCellsX: number;
    readonly highlightSpacingCellsY: number;
    readonly highlightStrength: number;

    /** 8I-8B.1 illustrated standing-Water contour controls. */
    readonly contourThreshold: number;
    readonly accentContourThreshold: number;
    readonly contourSimplificationTolerance: number;
    readonly contourSmoothingPasses: number;
    readonly minimumContourArea: number;
    readonly illustratedBodyAlpha: number;
    readonly illustratedAccentAlpha: number;

    /**
     * Presentation refresh cadence only. Water simulation timing is unchanged.
     * 20 Hz is sufficient for standing Water while reducing CPU texture work.
     */
    readonly refreshIntervalSeconds: number;

    /**
     * Fixed local texture size used by Phase 8I-3 bounded rendering.
     * Distant puddles therefore occupy independent small textures.
     */
    readonly renderRegionSizeCells: number;

    /**
     * Empty region textures are retained briefly to avoid allocation churn
     * when shallow Water flickers around the visibility threshold.
     */
    readonly renderRegionRetentionRefreshes: number;
}

export interface WaterPresentationDefinitionType {
    readonly enabled: boolean;
    readonly palette: WaterPresentationPalette;
    readonly standingWater: StandingWaterPresentationDefinition;
}

export const WaterPresentationDefinition: WaterPresentationDefinitionType = {
    enabled: true,

    palette: {
        deepWater: 0x49c9ee,
        baseWater: 0x49c9ee,
        lightWater: 0x8fe7fa,
        waterHighlight: 0xeafbff,
        waterEdge: 0x47b5d5,
        waterFoam: 0xf5ffff,

        steamLight: 0xf4faf8,
        steamShadow: 0xc8e1e1,
        steamFade: 0xa9ced2,
    },

    standingWater: {
        enabled: true,

        minimumVisibleDepth: 0.0005,
        fullScaleDepth: 0.12,
        edgeTransitionDepth: 0.0015,

        shallowAlpha: 0.92,
        baseAlpha: 0.92,
        deepAlpha: 0.92,

        highlightsEnabled: false,
        highlightMinimumDepthFactor: 0.32,
        highlightSpacingCellsX: 20,
        highlightSpacingCellsY: 16,
        highlightStrength: 0.78,

        // 8I-8B.1: Hose/Sprinkler material family, calm filled contours.
        contourThreshold: 0.0015,
        accentContourThreshold: 0.010,
        contourSimplificationTolerance: 1.75,
        contourSmoothingPasses: 2,
        minimumContourArea: 28,
        illustratedBodyAlpha: 0.99,
        illustratedAccentAlpha: 0.22,

        refreshIntervalSeconds: 1 / 20,

        /*
         * 48 cells at the current 8 px Water grid gives a 384 px world-space
         * region while the backing texture is only 48 x 48 texels.
         */
        renderRegionSizeCells: 48,

        renderRegionRetentionRefreshes: 8,
    },
} as const;

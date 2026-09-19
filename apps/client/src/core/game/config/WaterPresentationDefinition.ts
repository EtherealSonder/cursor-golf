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
    readonly contourSmoothingStrength: number;
    readonly contourCornerPreservation: number;
    readonly accentContourSimplificationTolerance: number;
    readonly accentContourSmoothingPasses: number;
    readonly accentContourSmoothingStrength: number;
    readonly accentContourCornerPreservation: number;
    readonly minimumContourArea: number;
    readonly minimumAccentContourArea: number;

    /** 8I-8B.2A deterministic broad-lobe presentation deformation. */
    readonly organicLobesEnabled: boolean;
    readonly bodyLobeCount: number;
    readonly bodyLobeAmplitudeCells: number;
    readonly bodySecondaryLobeAmplitudeCells: number;
    readonly accentLobeCount: number;
    readonly accentLobeAmplitudeCells: number;
    readonly accentSecondaryLobeAmplitudeCells: number;
    readonly illustratedBodyAlpha: number;
    readonly illustratedAccentAlpha: number;

    /** 8I-8B.3 presentation-only connected-puddle classification. */
    readonly traceMaximumArea: number;
    readonly smallPuddleMaximumArea: number;
    readonly establishedPuddleMinimumArea: number;
    readonly establishedPuddleMinimumPeakDepth: number;
    readonly accentMinimumBodyArea: number;
    readonly accentMinimumPeakDepth: number;
    readonly smallPuddleAlpha: number;

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
        // 8I-8B.2 outer body: restrained shape-preserving smoothing.
        contourSimplificationTolerance: 1.25,
        contourSmoothingPasses: 1,
        contourSmoothingStrength: 0.32,
        contourCornerPreservation: 0.72,

        // Secondary region has its own reconstruction profile.
        accentContourSimplificationTolerance: 0.90,
        accentContourSmoothingPasses: 1,
        accentContourSmoothingStrength: 0.22,
        accentContourCornerPreservation: 0.82,

        minimumContourArea: 28,
        minimumAccentContourArea: 70,

        /*
         * 8I-8B.2A: very-low-frequency, world-anchored deformation breaks
         * radial simulation contours into stable illustrated lobes.
         * Amplitudes are measured in WaterField cells and are clamped by
         * contour size in StandingWaterContourBuilder.
         */
        organicLobesEnabled: true,
        bodyLobeCount: 5,
        bodyLobeAmplitudeCells: 0.85,
        bodySecondaryLobeAmplitudeCells: 0.35,
        accentLobeCount: 4,
        accentLobeAmplitudeCells: 0.60,
        accentSecondaryLobeAmplitudeCells: 0.25,
        illustratedBodyAlpha: 0.99,
        illustratedAccentAlpha: 0.22,

        /*
         * 8I-8B.3: tiny connected standing-Water regions remain presentation
         * traces only. Small accumulations get a restrained cyan patch, while
         * the full illustrated body/accent hierarchy is reserved for regions
         * with enough connected extent and depth.
         */
        traceMaximumArea: 80,
        smallPuddleMaximumArea: 360,
        establishedPuddleMinimumArea: 180,
        establishedPuddleMinimumPeakDepth: 0.004,
        accentMinimumBodyArea: 420,
        accentMinimumPeakDepth: 0.012,
        smallPuddleAlpha: 0.72,

        refreshIntervalSeconds: 1 / 20,

        /*
         * 48 cells at the current 8 px Water grid gives a 384 px world-space
         * region while the backing texture is only 48 x 48 texels.
         */
        renderRegionSizeCells: 48,

        renderRegionRetentionRefreshes: 8,
    },
} as const;

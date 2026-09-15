/**
 * Presentation-only tuning for persistent scorched terrain.
 *
 * EnvironmentField burn remains authoritative. The renderer converts the
 * scalar burn field into connected regional contours. Phase 8C-8B gives
 * scorch an unmistakably burnt material hierarchy so it cannot be confused
 * with dark-green Wet Grass.
 */
export interface ScorchVfxDefinition {
    readonly enabled: boolean;
    readonly refreshIntervalSeconds: number;

    readonly outerBurnThreshold: number;
    readonly burnedRegionThreshold: number;
    readonly heavyCharThreshold: number;

    readonly smoothingPasses: number;
    readonly smoothingStrength: number;
    readonly closingBias: number;

    readonly contourSubdivisions: number;

    readonly outerEdgeDeformationPixels: number;
    readonly burnedEdgeDeformationPixels: number;
    readonly heavyEdgeDeformationPixels: number;

    readonly broadEdgeNoiseFrequency: number;
    readonly detailEdgeNoiseFrequency: number;
    readonly detailEdgeDeformationPixels: number;

    readonly edgeWaveAmplitudePixels: number;
    readonly edgeWaveFrequency: number;

    readonly visualBurnGrowthResponse: number;
    readonly visualBurnCompletionEpsilon: number;

    readonly outerColor: number;
    readonly burnedColor: number;
    readonly heavyColor: number;

    readonly outerAlpha: number;
    readonly burnedAlpha: number;
    readonly heavyAlpha: number;
}

export const DEFAULT_SCORCH_VFX_DEFINITION:
    ScorchVfxDefinition = {

    enabled:
        true,

    refreshIntervalSeconds:
        0.24,

    outerBurnThreshold:
        0.055,

    burnedRegionThreshold:
        0.20,

    heavyCharThreshold:
        0.62,

    smoothingPasses:
        1,

    smoothingStrength:
        0.72,

    closingBias:
        0.065,

    contourSubdivisions:
        2,

    outerEdgeDeformationPixels:
        5.5,

    burnedEdgeDeformationPixels:
        4.0,

    heavyEdgeDeformationPixels:
        2.4,

    /*
     * Broad + detail noise are the current temporally-stable contour model.
     * These values preserve the established footprint shape.
     */
    broadEdgeNoiseFrequency:
        0.035,

    detailEdgeNoiseFrequency:
        0.095,

    detailEdgeDeformationPixels:
        1.35,

    edgeWaveAmplitudePixels:
        3.2,

    edgeWaveFrequency:
        0.018,

    /*
     * Presentation growth remains smooth while authoritative burn is
     * monotonic. These values affect only how quickly the visual catches up.
     */
    visualBurnGrowthResponse:
        7.5,

    visualBurnCompletionEpsilon:
        0.002,

    /*
     * 8C-8B material hierarchy:
     *
     * outer  = warm, lighter burnt-earth perimeter
     * burned = solid dark brown body
     * heavy  = near-charcoal deepest burn
     *
     * High opacity is intentional. Scorch represents permanent material
     * damage and should remain clearly different from translucent moisture.
     */
    outerColor:
        0x8A5A3B,

    burnedColor:
        0x4A2D22,

    heavyColor:
        0x241A17,

    outerAlpha:
        0.92,

    burnedAlpha:
        0.98,

    heavyAlpha:
        1.0,
};

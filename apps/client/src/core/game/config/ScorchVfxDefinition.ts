/**
 * FIRE-VFX-8B presentation-only tuning for connected scorched terrain.
 *
 * EnvironmentField burn remains authoritative. ScorchRenderer maintains a
 * separate visual scalar field that approaches authoritative burn smoothly,
 * then Marching Squares converts that visual field into connected regions.
 */
export interface ScorchVfxDefinition {
    readonly enabled: boolean;

    /**
     * Maximum cadence for expensive contour reconstruction / canvas upload.
     *
     * Visual burn itself is interpolated every frame only for actively
     * changing indices. Marching Squares remains deliberately rate-limited.
     */
    readonly refreshIntervalSeconds: number;

    /**
     * Delta-time-independent response used when visual burn approaches the
     * authoritative EnvironmentField burn value.
     */
    readonly visualBurnGrowthResponse: number;

    /**
     * When visual burn is this close to authoritative burn, growth is
     * considered complete and the index leaves the active-growth list.
     */
    readonly visualBurnCompletionEpsilon: number;

    /**
     * Normalized burn thresholds used to build nested connected regions.
     */
    readonly outerBurnThreshold: number;
    readonly burnedRegionThreshold: number;
    readonly heavyCharThreshold: number;

    /**
     * Number of scalar-field smoothing passes before contour extraction.
     */
    readonly smoothingPasses: number;

    /**
     * Strength of neighbour influence during each smoothing pass.
     */
    readonly smoothingStrength: number;

    /**
     * Small closing bias that helps neighbouring burn samples form one
     * continuous mass instead of exposing the underlying field lattice.
     */
    readonly closingBias: number;

    /**
     * Subdivisions per Marching-Squares segment before perimeter deformation.
     */
    readonly contourSubdivisions: number;

    /**
     * Maximum broad perimeter displacement for each nested burn layer.
     * Deformation is applied only to the final exposed contour, never to
     * individual EnvironmentField or FireCell boundaries.
     */
    readonly outerEdgeDeformationPixels: number;
    readonly burnedEdgeDeformationPixels: number;
    readonly heavyEdgeDeformationPixels: number;

    /**
     * Low-frequency deterministic world-space noise for broad silhouette
     * deformation.
     */
    readonly broadEdgeNoiseFrequency: number;

    /**
     * Secondary deterministic world-space noise for smaller edge breakup.
     */
    readonly detailEdgeNoiseFrequency: number;
    readonly detailEdgeDeformationPixels: number;

    /**
     * Additional stable low-frequency wave component.
     */
    readonly edgeWaveAmplitudePixels: number;
    readonly edgeWaveFrequency: number;

    /**
     * Connected scorch-layer colors.
     */
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

    /*
     * Start conservatively. The previous contour renderer rebuilt at 0.24 s.
     * 0.16 s is visibly more responsive while still keeping Marching Squares
     * and the large canvas upload well below render-frame frequency.
     */
    refreshIntervalSeconds:
        0.16,

    visualBurnGrowthResponse:
        7.5,

    visualBurnCompletionEpsilon:
        0.003,

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
        6.0,

    burnedEdgeDeformationPixels:
        4.2,

    heavyEdgeDeformationPixels:
        2.6,

    broadEdgeNoiseFrequency:
        0.022,

    detailEdgeNoiseFrequency:
        0.072,

    detailEdgeDeformationPixels:
        1.6,

    edgeWaveAmplitudePixels:
        2.6,

    edgeWaveFrequency:
        0.015,

    outerColor:
        0x76513f,

    burnedColor:
        0x4b3026,

    heavyColor:
        0x281b17,

    outerAlpha:
        0.22,

    burnedAlpha:
        0.50,

    heavyAlpha:
        0.38,
};

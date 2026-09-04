/**
 * Presentation-only tuning for persistent scorched terrain.
 *
 * EnvironmentField burn remains authoritative. The renderer converts that
 * scalar burn field into connected regional contours so individual field
 * cells are never rendered as circles or squares.
 */
export interface ScorchVfxDefinition {
    readonly enabled: boolean;

    /**
     * How often the scorch presentation may rebuild while burn is changing.
     */
    readonly refreshIntervalSeconds: number;

    /**
     * Normalized burn thresholds used to build nested connected regions.
     */
    readonly outerBurnThreshold: number;
    readonly burnedRegionThreshold: number;
    readonly heavyCharThreshold: number;

    /**
     * Number of inexpensive scalar-field smoothing passes before contouring.
     * This removes cell-sized holes and softens the simulation lattice.
     */
    readonly smoothingPasses: number;

    /**
     * Strength of neighbour influence during each smoothing pass.
     */
    readonly smoothingStrength: number;

    /**
     * Small expansion bias applied before contour extraction. This helps
     * neighbouring burned samples close into one terrain mass.
     */
    readonly closingBias: number;

    /**
     * Number of subdivisions added to each contour segment before boundary
     * deformation. Higher values provide a less polygonal silhouette.
     */
    readonly contourSubdivisions: number;

    /**
     * Deterministic displacement applied only to contour points.
     * Values are expressed in world pixels.
     */
    readonly outerEdgeDeformationPixels: number;
    readonly burnedEdgeDeformationPixels: number;
    readonly heavyEdgeDeformationPixels: number;

    /**
     * Spatial frequency of the deterministic edge noise.
     */
    readonly edgeNoiseFrequency: number;

    /**
     * Additional low-frequency wave deformation so the boundary does not
     * simply look like random high-frequency fuzz.
     */
    readonly edgeWaveAmplitudePixels: number;
    readonly edgeWaveFrequency: number;

    /**
     * Temporal presentation smoothing.
     *
     * Contours are still rebuilt at the slower refresh cadence above.
     * The renderer then crossfades from the previously displayed contour
     * texture toward the latest target texture every frame.
     */
    readonly transitionDurationSeconds: number;

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

    edgeNoiseFrequency:
        0.035,

    edgeWaveAmplitudePixels:
        3.2,

    edgeWaveFrequency:
        0.018,

    transitionDurationSeconds:
        0.18,

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

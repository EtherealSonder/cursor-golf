export interface GroundFireClusterVfxDefinition {
    readonly clustersPerCell: number;
    readonly influencesPerCluster: number;

    readonly minimumClusterRadius: number;
    readonly maximumClusterRadius: number;

    readonly clusterSpreadRadius: number;
    readonly influenceSpreadRadius: number;

    readonly minimumStrength: number;
    readonly maximumStrength: number;

    readonly growResponsePerSecond: number;
    readonly shrinkResponsePerSecond: number;

    readonly flickerFrequencyMinimum: number;
    readonly flickerFrequencyMaximum: number;
    readonly flickerStrength: number;

    readonly positionWobble: number;
    readonly scaleWobble: number;

    readonly maximumWindLeanPixels: number;
    readonly windAccelerationForMaximumLean: number;

    readonly youngFireAgeSeconds: number;
    readonly matureFireAgeSeconds: number;

    readonly youngFireScaleBoost: number;
    readonly matureFireScaleMultiplier: number;

    readonly yellowCoreBaseProbability: number;
    readonly yellowCoreYoungProbabilityBoost: number;
    readonly yellowCoreMinimumPulse: number;
    readonly yellowCoreMaximumPulse: number;

    readonly outerRadiusMultiplier: number;
    readonly bodyRadiusMultiplier: number;
    readonly coreRadiusMultiplier: number;

    readonly outerMinimumStrength: number;
    readonly bodyMinimumStrength: number;
    readonly coreMinimumStrength: number;

    readonly connectionDistanceMultiplier: number;
}

/**
 * Presentation-only tuning for many independently animated Fire clusters.
 *
 * The visual target is not one continuous world-sized blob and not a set of
 * unrelated sprites. Each small cluster is internally connected/fluid, while
 * multiple clusters preserve gaps and negative space across the burn region.
 */
export const DEFAULT_GROUND_FIRE_CLUSTER_VFX_DEFINITION:
    GroundFireClusterVfxDefinition = {

    clustersPerCell:
        3,

    influencesPerCluster:
        4,

    minimumClusterRadius:
        8,

    maximumClusterRadius:
        17,

    clusterSpreadRadius:
        20,

    influenceSpreadRadius:
        8,

    minimumStrength:
        0.28,

    maximumStrength:
        1,

    growResponsePerSecond:
        11,

    shrinkResponsePerSecond:
        6.5,

    /*
     * Independent cluster modulation around 8-15 visual changes/sec.
     */
    flickerFrequencyMinimum:
        8,

    flickerFrequencyMaximum:
        15,

    flickerStrength:
        0.18,

    positionWobble:
        2.7,

    scaleWobble:
        0.13,

    maximumWindLeanPixels:
        7,

    windAccelerationForMaximumLean:
        900,

    /*
     * Newly ignited cells are visually hottest. Older interior Fire
     * progressively loses yellow and contracts toward red/orange.
     */
    youngFireAgeSeconds:
        0.85,

    matureFireAgeSeconds:
        2.35,

    youngFireScaleBoost:
        1.18,

    matureFireScaleMultiplier:
        0.78,

    yellowCoreBaseProbability:
        0.22,

    yellowCoreYoungProbabilityBoost:
        0.34,

    yellowCoreMinimumPulse:
        0.18,

    yellowCoreMaximumPulse:
        0.72,

    outerRadiusMultiplier:
        1.08,

    bodyRadiusMultiplier:
        0.82,

    /*
     * Yellow is deliberately small relative to orange.
     */
    coreRadiusMultiplier:
        0.28,

    outerMinimumStrength:
        0.06,

    bodyMinimumStrength:
        0.22,

    coreMinimumStrength:
        0.58,

    connectionDistanceMultiplier:
        1.38,
};

/**
 * Reference-locked top-down Fire presentation contract.
 *
 * Presentation only. This definition never owns Fire heat, ignition, spread,
 * lifetime, generation, scorch, Wind, or Water-Fire gameplay behaviour.
 */
export const TOP_DOWN_FIRE_VFX_DEFINITION = Object.freeze({
    perspective: Object.freeze({
        cameraModel: "pure-top-down" as const,
        apparentHeight: "low" as const,
        screenUpIsFlameDirection: false,
        verticalBaseToTipGrammar: false,
        wholeSpriteWindLean: false,
    }),

    ground: Object.freeze({
        model: "combustion-field" as const,
        footprintOriented: true,
        dominantGlobalDirection: false,
        orientationNeutralLocalShapes: true,
        denseOverlappingClusters: true,
        localRadialTurbulence: true,
        hotCentersInsideCoolerStructures: true,
        exposesSimulationGrid: false,
    }),

    /**
     * F-6D hierarchical geometry prototype.
     *
     * The renderer no longer treats every visible item as an equivalent
     * short-lived particle. Primary masses establish continuous coverage,
     * secondary structures articulate the boundary, and small fragments are
     * reserved for breakup around exposed edges.
     */
    groundGeometry: Object.freeze({
        enabled: true,
        maximumElements: 384,

        // One persistent primary body per eligible authoritative Fire cell.
        primaryScaleMinimum: 0.108,
        primaryScaleMaximum: 0.166,
        primaryMaximumAlpha: 0.96,
        primarySpawnScaleFraction: 0.72,
        primarySettleSeconds: 0.18,
        primaryBreathingAmplitude: 0.055,
        primaryBreathingFrequencyMinimum: 0.48,
        primaryBreathingFrequencyMaximum: 0.82,

        // Secondary structures are concentrated on boundary/isolated cells.
        secondaryScaleMinimum: 0.060,
        secondaryScaleMaximum: 0.105,
        secondaryMaximumAlpha: 0.92,
        secondaryLifetimeMinimum: 2.40,
        secondaryLifetimeMaximum: 4.00,
        secondaryBreathingAmplitude: 0.075,
        secondaryBreathingFrequencyMinimum: 0.65,
        secondaryBreathingFrequencyMaximum: 1.05,

        // Small breakup is deliberately a minority visual language.
        fragmentScaleMinimum: 0.020,
        fragmentScaleMaximum: 0.043,
        fragmentMaximumAlpha: 0.88,
        fragmentLifetimeMinimum: 0.85,
        fragmentLifetimeMaximum: 1.45,

        // Fire simulation uses an 8-neighbour field. Four or fewer occupied
        // neighbours reads as an exposed visual boundary for presentation.
        boundaryNeighbourThreshold: 4,
        secondaryPerBoundaryCell: 1,
        fragmentChancePerBoundaryCell: 0.38,

        // Large bodies intentionally extend well beyond the 8 px simulation
        // cell so neighbouring cells merge into a continuous combustion mass.
        primaryJitterCellRadius: 0.62,
        secondaryJitterCellRadius: 1.35,
        fragmentJitterCellRadius: 2.10,

        rotationMinimum: 0,
        rotationMaximum: Math.PI * 2,

        // F-6 remains geometry-only. F-7 introduces the full nested thermal
        // palette and hot-core hierarchy.
        primaryPrototypeTints: Object.freeze([0xff9f32, 0xff8a32] as const),
        secondaryPrototypeTints: Object.freeze([0xff9f32, 0xff6338] as const),
        fragmentPrototypeTints: Object.freeze([0xff6338, 0xff7a32] as const),

        upwardTranslationPixelsPerSecond: 0,
        footprintDriftPixelsPerSecond: 0,
    }),

    directional: Object.freeze({
        model: "continuous-turbulent-plume" as const,
        sourceToTargetMacroFlow: true,
        continuousBody: true,
        chainOfFlameSprites: false,
        irregularLateralTurbulence: true,
        denseOverlappingHotRegions: true,
        progressiveEdgeBreakup: true,
        progressiveEndBreakup: true,
    }),

    shared: Object.freeze({
        sameCombustionVocabulary: true,
        hardAlpha: true,
        flatColor: true,
        softGlow: false,
        featheredEdges: false,
        volumetricSmoke: false,
        presentationOnly: true,
    }),

    legacy: Object.freeze({
        windTongueGroundModelSuperseded: true,
        rootedVerticalFlameGrammarSuperseded: true,
        currentSpriteRenderersAreProvisional: true,
    }),
});

export type TopDownFireVfxDefinition =
    typeof TOP_DOWN_FIRE_VFX_DEFINITION;

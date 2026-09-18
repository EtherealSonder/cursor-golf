export interface WaterVfxPoolDefinition {
    readonly initialCapacity: number;
    readonly maximumCapacity: number;
}

export interface WaterVfxParticleDefinition {
    readonly gravityX: number;
    readonly gravityY: number;
    readonly dragPerSecond: number;
    readonly fadeStartFraction: number;
}

export interface WaterVfxStreamDefinition {
    readonly minimumLength: number;
    readonly minimumWidth: number;
    readonly maximumWidth: number;
    readonly bodyColor: number;
    readonly highlightColor: number;
    readonly bodyAlpha: number;
    readonly highlightAlpha: number;
    readonly highlightWidthFraction: number;
}


export interface HoseWaterVfxDefinition {
    readonly enabled: boolean;

    /** Width at the physical Hose nozzle. */
    readonly startWidth: number;

    /** Width through the coherent middle of the pressure jet. */
    readonly middleWidth: number;

    /** Width toward the authoritative downstream end of the jet. */
    readonly endWidth: number;

    /** Hard presentation floor. Organic deformation may never cross this. */
    readonly minimumBodyWidth: number;

    /** Scales edge disturbance progressively toward the downstream end. */
    readonly downstreamDisturbanceMultiplier: number;

    readonly bodyColor: number;
    readonly bodyAlpha: number;

    /** 8I-6B.3 world-space length represented by one full flow-noise repeat. */
    readonly flowTextureWorldLength: number;

    /**
     * Fallback downstream speed when authoritative packet transport cannot be
     * estimated reliably.
     */
    readonly flowTextureSpeed: number;

    /** Scale applied to the current authoritative Hose transport estimate. */
    readonly flowTransportSpeedScale: number;

    /** Safety bounds for presentation-only texture transport. */
    readonly minimumFlowTextureSpeed: number;
    readonly maximumFlowTextureSpeed: number;

    /** Current-frame-only centerline smoothing passes. Endpoints stay fixed. */
    readonly centerlineSmoothingPasses: number;

    /** Contrast applied while converting grayscale mask values to Water colour. */
    readonly flowTextureContrast: number;

    /** Maximum influence of the light end of the grayscale mask. */
    readonly flowTextureStrength: number;

    /** 8I-6B.5 toon remap for large readable Water highlight masses. */
    readonly toonMidColor: number;
    readonly toonMidThreshold: number;
    readonly toonHighlightThreshold: number;
    readonly toonMaskBlurPixels: number;

    /**
     * 8I-6B.5A large travelling highlight masses.
     * These deliberately survive the narrow gameplay-scale Hose mesh.
     */
    readonly toonMassCount: number;
    readonly toonMassLengthFraction: number;
    readonly toonMassWidthFraction: number;
    readonly toonMassAsymmetry: number;

    /** Presentation-only organic cap lengths, measured in world pixels. */
    readonly sourceCapLength: number;
    readonly downstreamCapLength: number;

    /** Presentation-only centerline reconstruction spacing. */
    readonly resampleSpacing: number;

    /** Restrained current-frame organic movement. No trajectory history is stored. */
    readonly centerWaveAmplitude: number;
    readonly centerWaveFrequency: number;
    readonly centerWaveSpeed: number;

    /** Independent left/right silhouette breakup. */
    readonly edgeWaveAmplitude: number;
    readonly edgeWaveFrequency: number;
    readonly edgeWaveSpeed: number;

    /** 8I-6B.4 broad, low-frequency body compression/expansion. */
    readonly widthSquishAmplitude: number;
    readonly widthSquishFrequency: number;
    readonly widthSquishSpeed: number;

    /** 8I-6B.4 additional asymmetric small-scale edge deformation. */
    readonly edgeIrregularityAmplitude: number;
    readonly edgeIrregularityFrequency: number;
    readonly edgeIrregularitySpeed: number;

    /**
     * 8I-6B.4 current-packet directional spread. This is presentation only:
     * fast changes in the live packet path widen the downstream jet.
     */
    readonly movementSpreadScale: number;
    readonly maximumMovementSpread: number;
    readonly movementSpreadRampExponent: number;

    /** 8I-6B animated broken inner streak. */
    readonly highlightColor: number;
    readonly highlightAlpha: number;
    readonly highlightWidthFraction: number;
    readonly highlightLength: number;
    readonly highlightSpacing: number;
    readonly highlightSpeed: number;

    /** 8I-6B smaller secondary highlight fragments. */
    readonly fragmentColor: number;
    readonly fragmentAlpha: number;
    readonly fragmentWidthFraction: number;
    readonly fragmentLength: number;
    readonly fragmentSpacing: number;
    readonly fragmentSpeed: number;
}

export interface SprinklerWaterVfxDefinition {
    readonly enabled: boolean;

    /** Production segmented spray mark. */
    readonly dropletLength: number;
    readonly dropletWidth: number;
    readonly bodyColor: number;
    readonly bodyAlpha: number;
    readonly highlightColor: number;
    readonly highlightAlpha: number;
    readonly highlightLengthFraction: number;
    readonly highlightWidthFraction: number;

    /** Small deterministic variation keeps the spray hand-drawn rather than cloned. */
    readonly lengthVariation: number;
    readonly widthVariation: number;
    readonly rotationVariationRadians: number;

    /** Render every Nth authoritative packet. 1 preserves the original gameplay read. */
    readonly visualPacketStride: number;

    /** Fade only near the end of an authoritative packet's airborne life. */
    readonly fadeStartAgeSeconds: number;
    readonly fadeDurationSeconds: number;

    /** Gentle visual pulse. Position always remains authoritative. */
    readonly pulseAmplitude: number;
    readonly pulseSpeed: number;
}

export interface WaterVfxDefinition {
    readonly enabled: boolean;
    readonly pool: WaterVfxPoolDefinition;
    readonly particle: WaterVfxParticleDefinition;
    readonly stream: WaterVfxStreamDefinition;
    readonly hose: HoseWaterVfxDefinition;
    readonly sprinkler: SprinklerWaterVfxDefinition;
    readonly dropletColor: number;
    readonly highlightColor: number;
}

export const DEFAULT_WATER_VFX_DEFINITION: WaterVfxDefinition = {
    enabled: true,

    pool: {
        initialCapacity: 96,
        maximumCapacity: 384,
    },

    particle: {
        gravityX: 0,
        gravityY: 180,
        dragPerSecond: 0.12,
        fadeStartFraction: 0.72,
    },

    stream: {
        minimumLength: 0.5,
        minimumWidth: 1.5,
        maximumWidth: 28,
        bodyColor: 0x279ed1,
        highlightColor: 0xbdefff,
        bodyAlpha: 0.96,
        highlightAlpha: 0.78,
        highlightWidthFraction: 0.24,
    },


    hose: {
        enabled: true,

        // 8I-6B.5: readable high-pressure Water body at gameplay zoom.
        // 8I-6B.5B pressure-jet profile: substantial core all the way down.
        startWidth: 10,
        middleWidth: 25,
        endWidth: 50,
        minimumBodyWidth: 10,
        downstreamDisturbanceMultiplier: 1,
        bodyColor: 0x49c9ee,
        bodyAlpha: 0.98,

        // 8I-6B.3 textured internal Water flow.
        // Larger forms and much faster motion read as pressurised Water.
        flowTextureWorldLength: 300,
        flowTextureSpeed: 360,
        flowTransportSpeedScale: 0.90,
        minimumFlowTextureSpeed: 300,
        maximumFlowTextureSpeed: 900,
        centerlineSmoothingPasses: 2,
        flowTextureContrast: 1.10,
        flowTextureStrength: 1.0,

        // 8I-6B.5: convert fine grayscale noise into large flat graphic masses.
        toonMidColor: 0x8fe7fa,
        toonMidThreshold: 0.60,
        toonHighlightThreshold: 0.84,
        toonMaskBlurPixels: 12,

        // 8I-6B.5A: broad cyan masses replace persistent hairline streaks.
        toonMassCount: 7,
        toonMassLengthFraction: 0.19,
        toonMassWidthFraction: 0.62,
        toonMassAsymmetry: 0.28,

        // Rounded/organic mesh terminals. The source cap is normally hidden
        // beneath the Hose nozzle; the downstream cap remains clearly visible.
        sourceCapLength: 5,
        downstreamCapLength: 8,

        resampleSpacing: 7,

        // Larger and slower silhouette motion survives normal gameplay zoom.
        centerWaveAmplitude: 0.65,
        centerWaveFrequency: 0.022,
        centerWaveSpeed: 1.55,

        edgeWaveAmplitude: 0,
        edgeWaveFrequency: 0.022,
        edgeWaveSpeed: 1.35,

        // 8I-6B.5A: stronger, slower body-volume changes at gameplay zoom.
        widthSquishAmplitude: 0,
        widthSquishFrequency: 0.010,
        widthSquishSpeed: 0.95,

        // Lower frequency and stronger asymmetry prevents parallel ribbon edges.
        edgeIrregularityAmplitude: 0,
        edgeIrregularityFrequency: 0.031,
        edgeIrregularitySpeed: 1.55,

        movementSpreadScale: 18,
        maximumMovementSpread: 10,
        movementSpreadRampExponent: 1.35,

        highlightColor: 0xe8fbff,
        highlightAlpha: 0,
        highlightWidthFraction: 0.34,
        highlightLength: 34,
        highlightSpacing: 68,
        highlightSpeed: 105,

        fragmentColor: 0xe8fbff,
        fragmentAlpha: 0,
        fragmentWidthFraction: 0.18,
        fragmentLength: 12,
        fragmentSpacing: 86,
        fragmentSpeed: 78,
    },

    sprinkler: {
        enabled: true,

        // Segmented sprinkler spray. These are independent marks, never a ribbon.
        dropletLength: 13,
        dropletWidth: 6.2,
        bodyColor: 0x49c9ee,
        bodyAlpha: 0.96,
        highlightColor: 0xe8fbff,
        highlightAlpha: 0.82,
        highlightLengthFraction: 0.42,
        highlightWidthFraction: 0.34,

        lengthVariation: 0.14,
        widthVariation: 0.10,
        rotationVariationRadians: 0.045,

        visualPacketStride: 1,

        fadeStartAgeSeconds: 0.72,
        fadeDurationSeconds: 0.22,

        pulseAmplitude: 0.045,
        pulseSpeed: 5.5,
    },

    dropletColor: 0x43b8e8,
    highlightColor: 0xcaf4ff,
};

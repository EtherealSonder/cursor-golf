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

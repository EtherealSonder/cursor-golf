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

export interface WaterVfxDefinition {
    readonly enabled: boolean;
    readonly pool: WaterVfxPoolDefinition;
    readonly particle: WaterVfxParticleDefinition;
    readonly stream: WaterVfxStreamDefinition;
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

    dropletColor: 0x43b8e8,
    highlightColor: 0xcaf4ff,
};

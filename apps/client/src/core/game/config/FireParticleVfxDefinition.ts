export type FireParticleTextureVariant =
    | "body"
    | "core"
    | "accent";

export type FireParticleMaterialLayer =
    | "main"
    | "detail";

export interface FireParticleThermalRoleDefinition {
    readonly weight: number;
    readonly textureVariant: FireParticleTextureVariant;
    readonly tint: number;
    readonly lifetimeMultiplier: number;
    readonly speedMultiplier: number;
    readonly scaleMultiplier: number;
    readonly alphaMultiplier: number;
}

export interface FireParticleMaterialVariantDefinition {
    readonly maskTextureKey: string;
    readonly noiseTextureKey: string;
    readonly noiseScale: number;
    readonly breakupStrength: number;
    readonly edgeBreakupStrength: number;
    readonly noiseOffsetX: number;
    readonly noiseOffsetY: number;
}

export interface FireParticleVfxDefinition {
    readonly enabled: boolean;
    readonly testEmitter: {
        readonly positionX: number;
        readonly positionY: number;
        readonly spawnRadiusX: number;
        readonly spawnRadiusY: number;
        readonly particlesPerSecond: number;
    };
    readonly pool: {
        readonly initialCapacity: number;
        readonly maximumCapacity: number;
    };
    readonly particle: {
        readonly lifetimeMinimum: number;
        readonly lifetimeMaximum: number;
        readonly horizontalVelocityMinimum: number;
        readonly horizontalVelocityMaximum: number;
        readonly upwardVelocityMinimum: number;
        readonly upwardVelocityMaximum: number;
        readonly startScaleXMinimum: number;
        readonly startScaleXMaximum: number;
        readonly startScaleYMinimum: number;
        readonly startScaleYMaximum: number;
        readonly endScaleXMinimum: number;
        readonly endScaleXMaximum: number;
        readonly endScaleYMinimum: number;
        readonly endScaleYMaximum: number;
        readonly alphaMinimum: number;
        readonly alphaMaximum: number;
        readonly rotationMinimum: number;
        readonly rotationMaximum: number;
        readonly angularVelocityMinimum: number;
        readonly angularVelocityMaximum: number;
        readonly emergenceEndFraction: number;
        readonly fadeStartFraction: number;
        readonly flickerSpeedMinimum: number;
        readonly flickerSpeedMaximum: number;
        readonly flickerAmountMinimum: number;
        readonly flickerAmountMaximum: number;
        readonly turbulenceAmplitudeMinimum: number;
        readonly turbulenceAmplitudeMaximum: number;
        readonly turbulenceFrequencyMinimum: number;
        readonly turbulenceFrequencyMaximum: number;
    };
    readonly material: {
        readonly outputSize: number;
        readonly detailParticleChance: number;
        readonly hot: readonly FireParticleMaterialVariantDefinition[];
        readonly body: readonly FireParticleMaterialVariantDefinition[];
        readonly cool: readonly FireParticleMaterialVariantDefinition[];
    };
    readonly thermalRoles: {
        readonly hot: FireParticleThermalRoleDefinition;
        readonly body: FireParticleThermalRoleDefinition;
        readonly cool: FireParticleThermalRoleDefinition;
    };
}

export const DEFAULT_FIRE_PARTICLE_VFX_DEFINITION:
    FireParticleVfxDefinition = {
    enabled: true,

    testEmitter: {
        positionX: 430,
        positionY: 500,
        spawnRadiusX: 26,
        spawnRadiusY: 8,
        particlesPerSecond: 165,
    },

    /*
     * Prewarm more pooled Sprites so the denser Fire does not need to grow
     * the pool during the first large propagation event.
     */
    pool: {
        initialCapacity: 280,
        maximumCapacity: 560,
    },

    particle: {
        lifetimeMinimum: 0.58,
        lifetimeMaximum: 1.05,
        horizontalVelocityMinimum: -24,
        horizontalVelocityMaximum: 24,
        upwardVelocityMinimum: -155,
        upwardVelocityMaximum: -82,
        startScaleXMinimum: 0.046,
        startScaleXMaximum: 0.080,
        startScaleYMinimum: 0.038,
        startScaleYMaximum: 0.072,
        endScaleXMinimum: 0.076,
        endScaleXMaximum: 0.134,
        endScaleYMinimum: 0.116,
        endScaleYMaximum: 0.214,
        alphaMinimum: 0.31,
        alphaMaximum: 0.55,
        rotationMinimum: -0.34,
        rotationMaximum: 0.34,
        angularVelocityMinimum: -0.58,
        angularVelocityMaximum: 0.58,
        emergenceEndFraction: 0.12,
        fadeStartFraction: 0.60,
        flickerSpeedMinimum: 7.0,
        flickerSpeedMaximum: 13.0,
        flickerAmountMinimum: 0.015,
        flickerAmountMaximum: 0.050,
        turbulenceAmplitudeMinimum: 2.0,
        turbulenceAmplitudeMaximum: 7.0,
        turbulenceFrequencyMinimum: 7.0,
        turbulenceFrequencyMaximum: 14.0,
    },

    material: {
        outputSize: 192,
        detailParticleChance: 0.20,
        hot: [
            { maskTextureKey: "fireGlowRound", noiseTextureKey: "fireNoisePerlin", noiseScale: 1.35, breakupStrength: 0.08, edgeBreakupStrength: 0.12, noiseOffsetX: 0.12, noiseOffsetY: 0.18 },
            { maskTextureKey: "fireGlowSoft", noiseTextureKey: "fireNoiseCloud", noiseScale: 1.20, breakupStrength: 0.10, edgeBreakupStrength: 0.14, noiseOffsetX: 0.57, noiseOffsetY: 0.31 },
        ],
        body: [
            { maskTextureKey: "fireGlowSoft", noiseTextureKey: "fireNoiseCloud", noiseScale: 1.15, breakupStrength: 0.14, edgeBreakupStrength: 0.18, noiseOffsetX: 0.18, noiseOffsetY: 0.62 },
            { maskTextureKey: "fireGlowSoft", noiseTextureKey: "fireNoisePerlin", noiseScale: 1.45, breakupStrength: 0.17, edgeBreakupStrength: 0.20, noiseOffsetX: 0.71, noiseOffsetY: 0.15 },
            { maskTextureKey: "fireGlowSoft", noiseTextureKey: "fireNoiseFine", noiseScale: 1.80, breakupStrength: 0.20, edgeBreakupStrength: 0.22, noiseOffsetX: 0.39, noiseOffsetY: 0.79 },
        ],
        cool: [
            { maskTextureKey: "fireGlowSoft", noiseTextureKey: "fireNoiseCloud", noiseScale: 1.25, breakupStrength: 0.24, edgeBreakupStrength: 0.28, noiseOffsetX: 0.82, noiseOffsetY: 0.43 },
            { maskTextureKey: "fireGlowSoft", noiseTextureKey: "fireNoiseFine", noiseScale: 1.95, breakupStrength: 0.28, edgeBreakupStrength: 0.30, noiseOffsetX: 0.27, noiseOffsetY: 0.91 },
        ],
    },

    thermalRoles: {
        hot: { weight: 0.17, textureVariant: "core", tint: 0xffe66a, lifetimeMultiplier: 0.76, speedMultiplier: 1.14, scaleMultiplier: 0.78, alphaMultiplier: 1.0 },
        body: { weight: 0.60, textureVariant: "body", tint: 0xff7a32, lifetimeMultiplier: 1.0, speedMultiplier: 1.0, scaleMultiplier: 1.04, alphaMultiplier: 1.0 },
        cool: { weight: 0.23, textureVariant: "accent", tint: 0xf04438, lifetimeMultiplier: 1.12, speedMultiplier: 0.90, scaleMultiplier: 1.10, alphaMultiplier: 0.86 },
    },
};

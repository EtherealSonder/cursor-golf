export interface WindVfxEmitterDefinition {
    readonly minimumParticleCount: number;
    readonly maximumParticleCount: number;
    readonly minimumSpeed: number;
    readonly maximumSpeed: number;
    readonly minimumLength: number;
    readonly maximumLength: number;
    readonly minimumWidth: number;
    readonly maximumWidth: number;
    readonly minimumOpacity: number;
    readonly maximumOpacity: number;
}

export interface WindVfxDefinition {
    readonly enabled: boolean;
    readonly textureKeys: readonly string[];
    readonly tint: number;
    readonly poolCapacity: number;
    readonly global: WindVfxEmitterDefinition & {
        readonly spawnPadding: number;
    };
    readonly local: WindVfxEmitterDefinition & {
        readonly particlesPerSource: number;

        /**
         * Small presentation-only offset from the authoritative Local Wind
         * source origin. The source itself already sits at the Fan outlet, so
         * this remains intentionally tiny.
         */
        readonly frontOffset: number;

        /**
         * Bias used while initially distributing particles through a source.
         * Values above one place more particles toward the Fan outlet.
         */
        readonly sourceDensityBias: number;

        /**
         * Fraction of Local Wind range at which the end fade begins.
         */
        readonly endFadeStart: number;

        /**
         * The production masks are authored on 512 x 512 transparent canvases
         * while the visible wisp occupies only part of that canvas. These
         * multipliers compensate for the transparent padding so the visible
         * alpha shape has useful in-game size.
         */
        readonly spriteLengthMultiplier: number;
        readonly spriteWidthMultiplier: number;

        /**
         * Keeps particle centres away from the exact stream side boundaries so
         * the visible alpha of wide wisps remains inside the debug volume.
         */
        readonly lateralFillRatio: number;

        /**
         * Presentation-only lateral sinusoidal drift. Values are world pixels
         * and cycles per second. The authoritative Local Wind force remains a
         * straight rectangular tube.
         */
        readonly minimumSineAmplitude: number;
        readonly maximumSineAmplitude: number;
        readonly minimumSineFrequency: number;
        readonly maximumSineFrequency: number;

        /**
         * Some particles are deliberately rendered at lower opacity so the
         * stream contains both defined wisps and softer background airflow.
         */
        readonly softParticleChance: number;
        readonly minimumSoftOpacityMultiplier: number;
        readonly maximumSoftOpacityMultiplier: number;
    };
}

export const DEFAULT_WIND_VFX_DEFINITION: WindVfxDefinition = {
    enabled: true,

    textureKeys: [
        "windStreak01",
        "windStreak02",
        "windStreak03",
        "windStreak04",
    ],

    tint: 0xffffff,

    /*
     * 3 Fans x 24 local particles = 72
     * + up to 24 global particles = 96
     *
     * 128 therefore retains useful headroom without needing runtime Sprite
     * allocation during normal testing.
     */
    poolCapacity: 128,

    global: {
        minimumParticleCount: 6,
        maximumParticleCount: 24,

        minimumSpeed: 180,
        maximumSpeed: 360,

        minimumLength: 55,
        maximumLength: 150,

        minimumWidth: 8,
        maximumWidth: 20,

        minimumOpacity: 0.18,
        maximumOpacity: 0.52,

        spawnPadding: 180,
    },

    local: {
        minimumParticleCount: 0,
        maximumParticleCount: 24,
        particlesPerSource: 24,

        minimumSpeed: 380,
        maximumSpeed: 620,

        minimumLength: 90,
        maximumLength: 180,

        minimumWidth: 14,
        maximumWidth: 26,

        /*
         * The masks already contain soft alpha internally. The previous
         * 0.16-0.46 range multiplied that alpha down so aggressively that the
         * wisps were barely visible. These values intentionally let the mask
         * itself provide most of the softness.
         */
        minimumOpacity: 0.48,
        maximumOpacity: 0.88,

        /*
         * LocalWindSource.position is already the Fan outlet. Keep only a very
         * small gap so the visible stream appears connected to the mechanism.
         */
        frontOffset: 0,

        sourceDensityBias: 1.85,

        endFadeStart: 0.82,

        /*
         * Compensate for the large transparent margins inside the 512 x 512
         * production masks. This changes presentation only, not simulation.
         */
        spriteLengthMultiplier: 1.12,
        spriteWidthMultiplier: 3.25,

        /*
         * The authoritative Local Wind tube has a fixed half-width. Keep the
         * particle centres inside roughly 80% of that width so the visible
         * wisps stay comfortably within the debug rectangle.
         */
        lateralFillRatio: 0.80,

        minimumSineAmplitude: 4,
        maximumSineAmplitude: 8,

        minimumSineFrequency: 1.4,
        maximumSineFrequency: 2.4,

        softParticleChance: 0.42,
        minimumSoftOpacityMultiplier: 0.42,
        maximumSoftOpacityMultiplier: 0.68,
    },
};

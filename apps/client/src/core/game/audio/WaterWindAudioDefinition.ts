/** Audio-only tuning. No simulation parameters are changed. */
export const WATER_WIND_AUDIO = {
    sprinkler: { gain: 0.65 },
    waterRobot: { gain: 1 },
    windRobot: { gain: 1 },
    filling: {
        enabled: true, gain: 0.35, maxEmitters: 2,
        minimumDepth: 0.4, minimumGrowth: 0.08,
        armSeconds: 0.25, fadeInSeconds: 0.5, fadeOutSeconds: 0.25,
        sampleIntervalSeconds: 0.12, sampleDistances: [45, 80, 120, 170, 220, 280] as const,
    },
} as const;

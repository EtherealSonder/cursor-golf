/** P3-C2 diagnostic taxonomy. Timings are CPU wall time, never GPU time. */
export const P3C2_PROFILE = {
    warmupMs: 5000,
    windowMs: 5000,
    windows: 12,
    categories: ["pixiRender", "worldUpdate", "cameraPresentation", "waterPresentation", "firePresentation", "windPresentation", "gameplayPresentation", "standingWaterPresentation", "surfacePresentation", "frameCallback", "otherGameWork"] as const,
} as const;

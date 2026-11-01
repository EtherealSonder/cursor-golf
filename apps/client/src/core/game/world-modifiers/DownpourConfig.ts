/** WM-4: world-space rain effects, with no physical water particles. */
export const DOWNPOUR_CONFIG = Object.freeze({
    moistureFloor: 0.65,
    /** WM-4A: isolate moisture cost from rain impact rendering. */
    enableRainVfx: true,
    /** Temporary WM-4B: skip all wet-ground presentation, retain moisture physics. */
    enableWetGroundRendering: false,
    rainVfxUpdateHz: 30,
    rippleChance: 0.85,
    maximumImpacts: 24,
    impactsPerSecond: 24,
    rippleLifetimeMin: 0.35,
    rippleLifetimeMax: 0.55,
    splashLifetimeMin: 0.25,
    splashLifetimeMax: 0.40,
    rippleRadiusMin: 5,
    rippleRadiusMax: 13,
    splashRadiusMin: 7,
    splashRadiusMax: 15,
} as const);

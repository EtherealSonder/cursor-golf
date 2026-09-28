/** Explosion presentation settings only; never used to calculate physical knockback. */
export const PROXIMITY_MINE_EXPLOSION_VFX = {
    previewEnabledByDefault: false,
    breakupNoiseEnabled: false,
    previewSpacing: 300,
    previewOrigin: { x: 240, y: 210 },
    maxActiveExplosions: 8,
    maxPooledExplosions: 8,
    totalDuration: 0.70,
    fragmentCount: 5,
    blastRingInitialRotationMax: Math.PI / 9,
    emberCount: 8,
    layers: {
        ignition: { size: 86, tint: 0xffed9c, order: 40 },
        fireBody: { size: 354, tint: 0xff963b, order: 10 },
        blastRing: { size: 420, tint: 0xed592e, order: 30 },
        pressureRing: { size: 620, tint: 0x9be5f2, order: 50 },
        flameFragment: { size: 44, tint: 0xffa443, order: 35 },
        ember: { size: 12, tint: 0xffd36c, order: 45 },
    },
    timings: {
        ignition: { start: 0, end: 0.10, from: 0.35, to: 1.15 },
        fireBody: { start: 0.025, end: 0.34, fadeStart: 0.19, from: 0.25, to: 1.0 },
        blastRing: { start: 0.045, end: 0.45, from: 0.25, to: 1.0 },
        pressureRing: { start: 0, expansionEnd: 0.15, fadeStart: 0.105, end: 0.23, from: 0.35, to: 1.0 },
        flameFragment: { start: 0.055, end: 0.61 },
        ember: { start: 0.085, end: 0.68 },
    },
    fragmentSpeed: { min: 390, max: 510 },
    fragmentStaggerMax: 0.045,
    // The flame mask has asymmetrical transparent padding. Align its opaque visual mass,
    // not the full PNG rectangle, with the detonation origin.
    flameFragmentAnchor: { x: 0.45, y: 0.58 },
    emberSpeed: { min: 230, max: 420 },
    fragmentSpin: 0.65,
    emberSpin: 5.0,
    // Embers start near the ignition and scatter beyond the fire body.
    emberSpawnRadius: { min: 5, max: 15 },
    emberStaggerMax: 0.055,
} as const;
export type ExplosionIllustratedMask = keyof typeof PROXIMITY_MINE_EXPLOSION_VFX.layers;

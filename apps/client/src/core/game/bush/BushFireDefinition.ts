/** Bush combustion reuses the existing fire simulation and its VFX. */
export const BUSH_FIRE = {
    burnSeconds: 5,
    fireContactPadding: 5,
    contactSamples: 16,
    directionalContactStep: 5,
    charColor: 0x171317,
    /** Charring finishes before fading starts. Normalized burn progress. */
    charCompleteAt: 0.65,
    /** Hold the fully blackened foliage briefly before the final fade. */
    fadeStartAt: 0.8,
    charRampExponent: 0.85,
    fadeRampExponent: 1.0,
} as const;

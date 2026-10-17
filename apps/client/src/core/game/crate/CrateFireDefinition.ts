/** Crate-specific combustion presentation; gameplay fire remains authoritative. */
export const CRATE_FIRE = {
    burnSeconds: 7.5,
    contactPadding: 7,
    directionalContactStep: 6,
    charColor: 0x171115,
    charCompleteAt: 0.72,
    fadeStartAt: 0.76,
    flameOffsets: [[0,0],[-19,-13],[18,12],[-14,17],[17,-16]] as readonly (readonly [number,number])[],
} as const;

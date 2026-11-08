import type { WorldModifierId } from "../world-modifiers/WorldModifierDefinition";

export interface WorldModifierBackgroundPalette {
    readonly colors: readonly number[];
    readonly transitionSeconds: number;
}

export const WORLD_MODIFIER_BACKGROUND_PALETTES: Readonly<Record<WorldModifierId | "none", WorldModifierBackgroundPalette>> = {
    "dune-surge": { colors: [0xf9e5a0, 0xf6d78a, 0xf3c989, 0xf7dda9, 0xfbeac1], transitionSeconds: 18 },
    wildfire: { colors: [0xf8a68b, 0xf58c72, 0xef775d, 0xf69c65, 0xf9b18c], transitionSeconds: 15 },
    downpour: { colors: [0xb4c7d2, 0x96b1c2, 0x829dac, 0xa4b6c6, 0xc4d1d9], transitionSeconds: 18 },
    "gale-force": { colors: [0xf0f3f0, 0xe4edf0, 0xd7e5e9, 0xe9f1f2, 0xf7f7f1], transitionSeconds: 18 },
    overdrive: { colors: [0xb2f3f0, 0x8ce8eb, 0x69dde7, 0x91eaf5, 0xc4f7f4], transitionSeconds: 14 },
    none: { colors: [0x28212f, 0x302638, 0x392b40, 0x302b3c, 0x252331], transitionSeconds: 20 },
};

export const WORLD_MODIFIER_BACKGROUND_LIGHTNING = {
    minimumIntervalSeconds: 5,
    maximumIntervalSeconds: 12,
    flashColor: 0xf3f7fc,
    maximumStrength: 0.65,
    flashDurationSeconds: 0.14,
    doubleFlashProbability: 0.3,
    doubleFlashGapSeconds: 0.13,
    /** Avoid a hard step in brightness at the start and end of a flash. */
    fadeFraction: 0.35,
} as const;

export function getWorldModifierBackgroundPalette(modifier: WorldModifierId | null): WorldModifierBackgroundPalette {
    return WORLD_MODIFIER_BACKGROUND_PALETTES[modifier ?? "none"];
}

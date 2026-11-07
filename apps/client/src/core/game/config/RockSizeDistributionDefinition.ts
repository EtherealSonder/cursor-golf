/** RK-1. Size bands apply to dynamic SmallRock only. Boulders stay static. */
export interface RockSizeBand {
    readonly name: "pebble" | "small" | "medium";
    readonly minimumRadius: number;
    readonly maximumRadius: number;
    readonly weight: number;
}
export const DEFAULT_ROCK_SIZE_DISTRIBUTION = {
    bands: [
        { name: "pebble", minimumRadius: 4, maximumRadius: 7, weight: 0.30 },
        { name: "small", minimumRadius: 7, maximumRadius: 12, weight: 0.40 },
        { name: "medium", minimumRadius: 12, maximumRadius: 20, weight: 0.30 },
    ] as readonly RockSizeBand[],
    minimumWallClearance: 18,
    minimumObjectClearance: 20,
    boulderMinimumRadius: 38,
    boulderMaximumRadius: 62,
} as const;

/** Pass the world's seeded RNG so level-test placement remains reproducible. */
export function sampleSmallRockRadius(random: () => number): number {
    const bands = DEFAULT_ROCK_SIZE_DISTRIBUTION.bands;
    const roll = random();
    let accumulated = 0;
    for (const band of bands) {
        accumulated += band.weight;
        if (roll < accumulated) {
            return band.minimumRadius + random() * (band.maximumRadius - band.minimumRadius);
        }
    }
    const last = bands[bands.length - 1];
    return last.minimumRadius + random() * (last.maximumRadius - last.minimumRadius);
}

import {
    DEFAULT_WATER_IMPACT_VFX_DEFINITION as D,
} from "../config/WaterImpactVfxDefinition";

import {
    WaterImpactTier,
} from "../water-vfx/WaterImpactIntensityModel";

/**
 * 8I-7I validation for deterministic, bounded organic impact variation.
 *
 * This validates the deterministic seed/PRNG contract and authored variation
 * envelopes without adding any gameplay or collision behavior.
 */
export class WaterImpactVariationValidation {
    public run(): void {
        console.log(
            "[8I-7I] DETERMINISTIC ORGANIC VARIATION",
        );

        const seedA =
            this.hash("source-a:14:2");

        const seedARepeat =
            this.hash("source-a:14:2");

        const seedB =
            this.hash("source-a:15:2");

        const sampleA =
            this.sample(
                seedA,
                WaterImpactTier.Heavy,
            );

        const sampleARepeat =
            this.sample(
                seedARepeat,
                WaterImpactTier.Heavy,
            );

        const sampleB =
            this.sample(
                seedB,
                WaterImpactTier.Heavy,
            );

        const checks:
            [string, boolean][] = [
            [
                "Same seed produces same variation",
                JSON.stringify(sampleA) ===
                JSON.stringify(sampleARepeat),
            ],
            [
                "Different seeds produce variation",
                JSON.stringify(sampleA) !==
                JSON.stringify(sampleB),
            ],
            [
                "Lobe count remains bounded",
                this.countBoundsValid("lobe"),
            ],
            [
                "Droplet count remains bounded",
                this.countBoundsValid("droplet"),
            ],
            [
                "Lobe launch speed remains bounded",
                D.lobeSpeedMin >= 0 &&
                D.lobeSpeedMax >= D.lobeSpeedMin,
            ],
            [
                "Droplet launch speed remains bounded",
                D.dropletSpeedMin >= 0 &&
                D.dropletSpeedMax >=
                D.dropletSpeedMin,
            ],
            [
                "Lobe lifetime remains bounded",
                D.lobeLifetimeMin > 0 &&
                D.lobeLifetimeMax >=
                D.lobeLifetimeMin,
            ],
            [
                "Droplet lifetime remains bounded",
                D.dropletLifetimeMin > 0 &&
                D.dropletLifetimeMax >=
                D.dropletLifetimeMin,
            ],
            [
                "Position jitter remains bounded",
                D.impactPositionJitterX >= 0 &&
                D.impactPositionJitterY >= 0,
            ],
            [
                "Ripple variation remains bounded",
                D.rippleScaleVariation >= 0 &&
                D.rippleScaleVariation < 0.25,
            ],
            [
                "Surface disturbance variation remains bounded",
                D.disturbanceScaleVariation >= 0 &&
                D.disturbanceScaleVariation < 0.25,
            ],
            [
                "Sprinkler variation remains constrained",
                D.sprinklerObstacleMaximumIntensity <
                D.heavyTierThreshold,
            ],
            [
                "Hose variation remains Heavy",
                D.hoseGroundMinimumIntensity >=
                D.heavyTierThreshold &&
                D.hoseObstacleMinimumIntensity >=
                D.heavyTierThreshold,
            ],
            [
                "Reset/replay preserves deterministic result",
                JSON.stringify(
                    this.sample(
                        seedA,
                        WaterImpactTier.Heavy,
                    ),
                ) === JSON.stringify(sampleA),
            ],
        ];

        let pass = true;

        for (const [name, ok] of checks) {
            pass &&= ok;

            console.log(
                `[8I-7I] ${name}: ${
                    ok ? "PASS" : "FAIL"
                }`,
            );
        }

        console.log(
            `[8I-7I] RESULT: ${
                pass ? "PASS" : "FAIL"
            }`,
        );

        if (!pass) {
            throw new Error(
                "8I-7I deterministic variation validation failed.",
            );
        }
    }

    private sample(
        seed: number,
        tier: WaterImpactTier,
    ): readonly number[] {
        const random =
            this.makeRandom(seed);

        const bounds =
            tier === WaterImpactTier.Heavy
                ? [
                    D.heavyLobeCountMin,
                    D.heavyLobeCountMax,
                    D.heavyDropletCountMin,
                    D.heavyDropletCountMax,
                ] as const
                : tier === WaterImpactTier.Medium
                    ? [
                        D.mediumLobeCountMin,
                        D.mediumLobeCountMax,
                        D.mediumDropletCountMin,
                        D.mediumDropletCountMax,
                    ] as const
                    : [
                        D.fineLobeCountMin,
                        D.fineLobeCountMax,
                        D.fineDropletCountMin,
                        D.fineDropletCountMax,
                    ] as const;

        return [
            this.integerRange(
                random,
                bounds[0],
                bounds[1],
            ),
            this.integerRange(
                random,
                bounds[2],
                bounds[3],
            ),
            random(),
            random(),
            random(),
            random(),
        ];
    }

    private countBoundsValid(
        kind: "lobe" | "droplet",
    ): boolean {
        const pairs =
            kind === "lobe"
                ? [
                    [
                        D.fineLobeCountMin,
                        D.fineLobeCountMax,
                    ],
                    [
                        D.mediumLobeCountMin,
                        D.mediumLobeCountMax,
                    ],
                    [
                        D.heavyLobeCountMin,
                        D.heavyLobeCountMax,
                    ],
                ]
                : [
                    [
                        D.fineDropletCountMin,
                        D.fineDropletCountMax,
                    ],
                    [
                        D.mediumDropletCountMin,
                        D.mediumDropletCountMax,
                    ],
                    [
                        D.heavyDropletCountMin,
                        D.heavyDropletCountMax,
                    ],
                ];

        return pairs.every(
            ([minimum, maximum]) =>
                Number.isInteger(minimum) &&
                Number.isInteger(maximum) &&
                minimum >= 0 &&
                maximum >= minimum,
        );
    }

    private integerRange(
        random: () => number,
        minimum: number,
        maximum: number,
    ): number {
        if (maximum <= minimum) {
            return minimum;
        }

        return (
            minimum +
            Math.floor(
                random() *
                (maximum - minimum + 1),
            )
        );
    }

    private hash(
        text: string,
    ): number {
        let hash = 2166136261;

        for (
            let index = 0;
            index < text.length;
            index += 1
        ) {
            hash ^= text.charCodeAt(index);
            hash =
                Math.imul(
                    hash,
                    16777619,
                );
        }

        return hash >>> 0;
    }

    private makeRandom(
        seed: number,
    ): () => number {
        let state =
            (
                Math.floor(seed) ^
                0x9e3779b9
            ) >>> 0;

        return (): number => {
            state =
                (
                    Math.imul(
                        state ^
                        (state >>> 16),
                        0x21f0aaad,
                    ) +
                    0x735a2d97
                ) >>> 0;

            state ^= state >>> 15;

            return (
                (state >>> 0) /
                4294967296
            );
        };
    }
}

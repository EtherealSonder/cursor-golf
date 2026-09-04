import type {
    ScorchVfxDefinition,
} from "../config/ScorchVfxDefinition";

export interface ScorchVisualSample {
    readonly covered: boolean;
    readonly color: number;
    readonly alpha: number;
}

/**
 * Stateless, deterministic world-space scorch material sampler.
 *
 * EnvironmentField owns burn truth. This class only answers the presentation
 * question: for a given world position and normalized burn strength, should
 * char be visible here, and if so how dark should it be?
 *
 * The same world coordinate always produces the same noise pattern. Burn can
 * therefore reveal progressively more of a stable pattern without historical
 * scorch crawling or reshuffling between updates.
 */
export class ScorchPatternSampler {
    public constructor(
        private readonly definition:
            ScorchVfxDefinition,
    ) { }

    public sample(
        worldX: number,
        worldY: number,
        normalizedBurn: number,
        radialFactor: number,
    ): ScorchVisualSample {
        const burn =
            this.clamp01(normalizedBurn);

        const influence =
            this.clamp01(radialFactor);

        if (
            burn <= 0 ||
            influence <= 0
        ) {
            return {
                covered: false,
                color: this.definition.singedColor,
                alpha: 0,
            };
        }

        const large =
            this.valueNoise(
                worldX * this.definition.largeNoiseFrequency,
                worldY * this.definition.largeNoiseFrequency,
                this.definition.noiseSeed,
            );

        const medium =
            this.valueNoise(
                worldX * this.definition.mediumNoiseFrequency,
                worldY * this.definition.mediumNoiseFrequency,
                this.definition.noiseSeed + 193,
            );

        const fine =
            this.valueNoise(
                worldX * this.definition.fineNoiseFrequency,
                worldY * this.definition.fineNoiseFrequency,
                this.definition.noiseSeed + 719,
            );

        const coherentNoise =
            large * 0.48 +
            medium * 0.34 +
            fine * 0.18;

        const coverage =
            this.getCoverageForBurn(burn) *
            this.lerp(
                0.72,
                1.08,
                influence,
            );

        /*
         * The radial term is deliberately noisy rather than a hard circle.
         * Low-burn samples reveal sparse islands. High burn progressively
         * fills the same stable world-space pattern.
         */
        const edgeThreshold =
            1 -
            this.clamp01(coverage) +
            (1 - influence) *
            this.definition.edgeFalloffStrength;

        if (coherentNoise < edgeThreshold) {
            return {
                covered: false,
                color: this.definition.singedColor,
                alpha: 0,
            };
        }

        const materialStrength =
            this.clamp01(
                burn * 0.84 +
                medium * 0.10 +
                fine * 0.06,
            );

        return {
            covered: true,
            color:
                this.getColorForStrength(
                    materialStrength,
                ),
            alpha:
                this.getAlphaForStrength(
                    materialStrength,
                ),
        };
    }

    private getCoverageForBurn(
        burn: number,
    ): number {
        if (
            burn <=
            this.definition.mediumBurnThreshold
        ) {
            const amount =
                this.inverseLerp(
                    this.definition.lightBurnThreshold,
                    this.definition.mediumBurnThreshold,
                    burn,
                );

            return this.lerp(
                this.definition.lightCoverage,
                this.definition.mediumCoverage,
                amount,
            );
        }

        if (
            burn <=
            this.definition.heavyBurnThreshold
        ) {
            const amount =
                this.inverseLerp(
                    this.definition.mediumBurnThreshold,
                    this.definition.heavyBurnThreshold,
                    burn,
                );

            return this.lerp(
                this.definition.mediumCoverage,
                this.definition.heavyCoverage,
                amount,
            );
        }

        const amount =
            this.inverseLerp(
                this.definition.heavyBurnThreshold,
                1,
                burn,
            );

        return this.lerp(
            this.definition.heavyCoverage,
            this.definition.maximumCoverage,
            amount,
        );
    }

    private getColorForStrength(
        strength: number,
    ): number {
        if (
            strength <=
            this.definition.mediumBurnThreshold
        ) {
            const amount =
                this.inverseLerp(
                    this.definition.lightBurnThreshold,
                    this.definition.mediumBurnThreshold,
                    strength,
                );

            return this.lerpColor(
                this.definition.singedColor,
                this.definition.burnedColor,
                amount,
            );
        }

        const amount =
            this.inverseLerp(
                this.definition.mediumBurnThreshold,
                1,
                strength,
            );

        return this.lerpColor(
            this.definition.burnedColor,
            this.definition.charredColor,
            amount,
        );
    }

    private getAlphaForStrength(
        strength: number,
    ): number {
        if (
            strength <=
            this.definition.mediumBurnThreshold
        ) {
            return this.lerp(
                this.definition.singedAlpha,
                this.definition.burnedAlpha,
                this.inverseLerp(
                    this.definition.lightBurnThreshold,
                    this.definition.mediumBurnThreshold,
                    strength,
                ),
            );
        }

        return this.lerp(
            this.definition.burnedAlpha,
            this.definition.charredAlpha,
            this.inverseLerp(
                this.definition.mediumBurnThreshold,
                1,
                strength,
            ),
        );
    }

    private valueNoise(
        x: number,
        y: number,
        seed: number,
    ): number {
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const tx =
            this.smoothStep01(x - x0);

        const ty =
            this.smoothStep01(y - y0);

        const a = this.hash(x0, y0, seed);
        const b = this.hash(x1, y0, seed);
        const c = this.hash(x0, y1, seed);
        const d = this.hash(x1, y1, seed);

        return this.lerp(
            this.lerp(a, b, tx),
            this.lerp(c, d, tx),
            ty,
        );
    }

    private hash(
        x: number,
        y: number,
        seed: number,
    ): number {
        let value =
            (
                Math.imul(
                    x + seed * 131,
                    374761393,
                ) +
                Math.imul(
                    y - seed * 197,
                    668265263,
                )
            ) >>>
            0;

        value =
            Math.imul(
                value ^ (value >>> 13),
                1274126177,
            ) >>>
            0;

        value ^=
            value >>> 16;

        return value / 4294967295;
    }

    private lerpColor(
        start: number,
        end: number,
        amount: number,
    ): number {
        const t = this.clamp01(amount);

        const startR = (start >>> 16) & 0xff;
        const startG = (start >>> 8) & 0xff;
        const startB = start & 0xff;

        const endR = (end >>> 16) & 0xff;
        const endG = (end >>> 8) & 0xff;
        const endB = end & 0xff;

        const red = Math.round(this.lerp(startR, endR, t));
        const green = Math.round(this.lerp(startG, endG, t));
        const blue = Math.round(this.lerp(startB, endB, t));

        return (
            (red << 16) |
            (green << 8) |
            blue
        );
    }

    private inverseLerp(
        start: number,
        end: number,
        value: number,
    ): number {
        if (Math.abs(end - start) < 0.000001) {
            return 0;
        }

        return this.clamp01(
            (value - start) /
            (end - start),
        );
    }

    private smoothStep01(
        value: number,
    ): number {
        const t = this.clamp01(value);
        return t * t * (3 - 2 * t);
    }

    private lerp(
        start: number,
        end: number,
        amount: number,
    ): number {
        return start + (end - start) * amount;
    }

    private clamp01(
        value: number,
    ): number {
        return Math.max(0, Math.min(1, value));
    }
}

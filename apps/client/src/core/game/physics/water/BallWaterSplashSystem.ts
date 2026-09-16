import {
    DEFAULT_BALL_WATER_SPLASH_DEFINITION,
    validateBallWaterSplashDefinition,
} from "../../config/BallWaterSplashDefinition";

import type {
    BallWaterSplashDefinition,
} from "../../config/BallWaterSplashDefinition";

import type {
    BallWaterSample,
} from "./BallWaterSampler";

import type {
    BallWaterSplashEvent,
} from "./BallWaterSplashEvent";

export interface BallWaterSplashInput {
    readonly worldX: number;
    readonly worldY: number;
    readonly velocityX: number;
    readonly velocityY: number;
    readonly sample: BallWaterSample;
}

/**
 * Phase 8E-7 stateful detector for meaningful Ball entry into standing Water.
 * It emits at most one event per armed entry. Presentation is intentionally
 * absent here and will consume BallWaterSplashEvent in Phase 8I.
 */
export class BallWaterSplashSystem {
    private readonly definition: BallWaterSplashDefinition;
    private armed = true;
    private inSplashWater = false;

    constructor(
        definition: BallWaterSplashDefinition =
            DEFAULT_BALL_WATER_SPLASH_DEFINITION,
    ) {
        validateBallWaterSplashDefinition(definition);
        this.definition = definition;
    }

    public update(input: BallWaterSplashInput): BallWaterSplashEvent | null {
        const depth = this.getRepresentativeWetDepth(input.sample);
        const coverage = this.clamp01(
            Number.isFinite(input.sample.coveredFraction)
                ? input.sample.coveredFraction
                : 0,
        );

        const speed =
            Number.isFinite(input.velocityX) &&
            Number.isFinite(input.velocityY)
                ? Math.hypot(input.velocityX, input.velocityY)
                : 0;

        if (
            depth <= this.definition.rearmDepth ||
            coverage < this.definition.minimumCoverage * 0.5
        ) {
            this.inSplashWater = false;
            this.armed = true;
            return null;
        }

        const qualifiesAsSplashWater =
            depth >= this.definition.minimumSplashDepth &&
            coverage >= this.definition.minimumCoverage;

        if (!qualifiesAsSplashWater) {
            return null;
        }

        this.inSplashWater = true;

        if (!this.armed || speed < this.definition.minimumSplashSpeed) {
            return null;
        }

        this.armed = false;

        return {
            worldX: this.finiteOrZero(input.worldX),
            worldY: this.finiteOrZero(input.worldY),
            velocityX: this.finiteOrZero(input.velocityX),
            velocityY: this.finiteOrZero(input.velocityY),
            ballSpeed: speed,
            waterDepth: depth,
            waterCoverage: coverage,
            intensity: this.calculateIntensity(speed, depth, coverage),
        };
    }

    public reset(): void {
        this.armed = true;
        this.inSplashWater = false;
    }

    public isArmed(): boolean {
        return this.armed;
    }

    public isInSplashWater(): boolean {
        return this.inSplashWater;
    }

    public getDefinition(): BallWaterSplashDefinition {
        return this.definition;
    }

    private calculateIntensity(
        speed: number,
        depth: number,
        coverage: number,
    ): number {
        const speedResponse = this.clamp01(
            (speed - this.definition.minimumSplashSpeed) /
            (this.definition.fullIntensitySpeed - this.definition.minimumSplashSpeed),
        );

        const depthResponse = this.clamp01(
            (depth - this.definition.minimumSplashDepth) /
            (this.definition.fullIntensityDepth - this.definition.minimumSplashDepth),
        );

        const coverageResponse = this.clamp01(
            (coverage - this.definition.minimumCoverage) /
            Math.max(1e-6, 1 - this.definition.minimumCoverage),
        );

        return this.clamp01(
            speedResponse * this.definition.speedWeight +
            depthResponse * this.definition.depthWeight +
            coverageResponse * this.definition.coverageWeight,
        );
    }

    private getRepresentativeWetDepth(sample: BallWaterSample): number {
        const coverage = this.clamp01(
            Number.isFinite(sample.coveredFraction)
                ? sample.coveredFraction
                : 0,
        );

        if (coverage <= 0 || !Number.isFinite(sample.averageDepth)) {
            return 0;
        }

        return Math.max(0, sample.averageDepth) / coverage;
    }

    private finiteOrZero(value: number): number {
        return Number.isFinite(value) ? value : 0;
    }

    private clamp01(value: number): number {
        return Math.max(0, Math.min(1, value));
    }
}

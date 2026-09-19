import {
    DEFAULT_BALL_WATER_INTERACTION_DEFINITION,
    validateBallWaterInteractionDefinition,
} from "../../config/BallWaterInteractionDefinition";

import type {
    BallWaterInteractionDefinition,
} from "../../config/BallWaterInteractionDefinition";

import type {
    BallWaterSample,
} from "./BallWaterSampler";

import {
    BallWaterDepthSeverity,
    classifyBallWaterDepthSeverity,
} from "./BallWaterDepthSeverity";


export type BallWaterTransitionState =
    | "dry"
    | "entering"
    | "stable"
    | "exiting";

export type BallWaterDepthResponseBand =
    | "dry"
    | "very-shallow"
    | "shallow"
    | "medium"
    | "deep";

export interface BallWaterInteractionState {
    /** Average depth across only the footprint samples that contain Water. */
    readonly representativeWetDepth: number;

    /** Linear normalized depth response after the meaningful-depth threshold. */
    readonly normalizedDepth: number;

    /** Nonlinear depth response after applying depthExponent. */
    readonly curvedDepth: number;

    /** Raw target exposure before temporal smoothing. */
    readonly targetExposure: number;

    /** Temporally smoothed Water exposure in the inclusive range [0, 1]. */
    readonly smoothedExposure: number;

    /** Additive Water resistance contribution for later Ball integration. */
    readonly additionalResistance: number;

    readonly coveredFraction: number;
    readonly isMeaningfullyWet: boolean;

    /** Shared semantic depth vocabulary for gameplay/presentation consumers. */
    readonly depthSeverity: BallWaterDepthSeverity;

    /** Phase 8E-6 temporal state used by diagnostics and validation only. */
    readonly transitionState: BallWaterTransitionState;
}

/**
 * Phase 8E-2 interpretation layer between BallWaterSampler and Ball physics.
 *
 * This class does not mutate Ball velocity and does not replace SurfaceSystem
 * resistance. It converts the raw footprint query into a stable, bounded
 * Water-response contract that later 8E steps can consume inside Ball's
 * existing physics substeps.
 */
export class BallWaterInteraction {
    private readonly definition: BallWaterInteractionDefinition;

    private smoothedExposure = 0;

    constructor(
        definition: BallWaterInteractionDefinition =
            DEFAULT_BALL_WATER_INTERACTION_DEFINITION,
    ) {
        validateBallWaterInteractionDefinition(definition);
        this.definition = definition;
    }

    public update(
        sample: BallWaterSample,
        deltaTime: number,
    ): BallWaterInteractionState {
        const instantaneous = this.calculateInstantaneousState(sample);

        if (Number.isFinite(deltaTime) && deltaTime > 0) {
            const rate =
                instantaneous.targetExposure >= this.smoothedExposure
                    ? this.definition.entrySmoothingRate
                    : this.definition.exitSmoothingRate;

            const blend = 1 - Math.exp(-rate * deltaTime);

            this.smoothedExposure = this.clamp01(
                this.smoothedExposure +
                (instantaneous.targetExposure - this.smoothedExposure) *
                blend,
            );
        }

        const transitionState = this.classifyTransitionState(
            instantaneous.targetExposure,
            this.smoothedExposure,
        );

        return {
            ...instantaneous,
            smoothedExposure: this.smoothedExposure,
            transitionState,
            additionalResistance:
                this.definition.maximumAdditionalResistance *
                this.smoothedExposure,
        };
    }

    /**
     * Pure, unsmoothed calculation used by deterministic validation and later
     * diagnostics. No internal interaction state is changed.
     */
    public calculateInstantaneousState(
        sample: BallWaterSample,
    ): Omit<
        BallWaterInteractionState,
        "smoothedExposure" | "additionalResistance" | "transitionState"
    > {
        const coveredFraction = this.clamp01(
            Number.isFinite(sample.coveredFraction)
                ? sample.coveredFraction
                : 0,
        );

        const averageDepth =
            Number.isFinite(sample.averageDepth) && sample.averageDepth > 0
                ? sample.averageDepth
                : 0;

        /*
         * BallWaterSampler.averageDepth includes dry footprint samples. Divide
         * by coverage before applying the depth curve so partial coverage is
         * represented once, by coveredFraction, rather than being penalized
         * a second time through averageDepth.
         */
        const representativeWetDepth =
            coveredFraction > 0
                ? averageDepth / coveredFraction
                : 0;

        const normalizedDepth = this.normalizeDepth(
            representativeWetDepth,
        );

        const curvedDepth = Math.pow(
            normalizedDepth,
            this.definition.depthExponent,
        );

        const coverageResponse = Math.pow(
            coveredFraction,
            this.definition.coverageExponent,
        );

        const targetExposure = this.clamp01(
            curvedDepth * coverageResponse,
        );

        const isMeaningfullyWet =
            targetExposure > 0;

        const depthSeverity =
            classifyBallWaterDepthSeverity(
                normalizedDepth,
                isMeaningfullyWet,
                {
                    shallowUpperNormalizedDepth:
                        this.definition.shallowUpperNormalizedDepth,
                    moderateUpperNormalizedDepth:
                        this.definition.moderateUpperNormalizedDepth,
                },
            );

        return {
            representativeWetDepth,
            normalizedDepth,
            curvedDepth,
            targetExposure,
            coveredFraction,
            isMeaningfullyWet,
            depthSeverity,
        };
    }

    public reset(): void {
        this.smoothedExposure = 0;
    }

    public getSmoothedExposure(): number {
        return this.smoothedExposure;
    }

    /**
     * Phase 8E-3 composition rule for terrain and standing-Water resistance.
     *
     * SurfaceSystem remains authoritative for the terrain multiplier. Water
     * contributes only an additive amount on top of that existing value.
     * This method is pure and does not mutate either system.
     */
    public combineRollingResistance(
        surfaceRollingResistanceMultiplier: number,
        waterAdditionalResistance: number,
    ): number {
        if (
            !Number.isFinite(surfaceRollingResistanceMultiplier) ||
            surfaceRollingResistanceMultiplier <= 0
        ) {
            throw new Error(
                "Surface rolling resistance multiplier must be a finite number greater than zero.",
            );
        }

        if (
            !Number.isFinite(waterAdditionalResistance) ||
            waterAdditionalResistance < 0
        ) {
            throw new Error(
                "Standing-Water additional resistance must be a finite non-negative number.",
            );
        }

        return surfaceRollingResistanceMultiplier + waterAdditionalResistance;
    }

    /**
     * Phase 8E-5 diagnostic classification of the nonlinear depth response.
     * This is presentation/validation metadata only and never changes physics.
     */
    public getDepthResponseBand(
        state: Pick<BallWaterInteractionState, "normalizedDepth" | "isMeaningfullyWet">,
    ): BallWaterDepthResponseBand {
        if (!state.isMeaningfullyWet || state.normalizedDepth <= 0) {
            return "dry";
        }

        if (state.normalizedDepth < 0.20) {
            return "very-shallow";
        }

        if (state.normalizedDepth < 0.45) {
            return "shallow";
        }

        if (state.normalizedDepth < 0.75) {
            return "medium";
        }

        return "deep";
    }

    public getDefinition(): BallWaterInteractionDefinition {
        return this.definition;
    }


    private classifyTransitionState(
        targetExposure: number,
        smoothedExposure: number,
    ): BallWaterTransitionState {
        const epsilon = 0.001;

        if (targetExposure <= epsilon && smoothedExposure <= epsilon) {
            return "dry";
        }

        if (smoothedExposure < targetExposure - epsilon) {
            return "entering";
        }

        if (smoothedExposure > targetExposure + epsilon) {
            return "exiting";
        }

        return "stable";
    }

    private normalizeDepth(depth: number): number {
        if (depth <= this.definition.minimumMeaningfulDepth) {
            return 0;
        }

        if (depth >= this.definition.fullEffectDepth) {
            return 1;
        }

        return this.clamp01(
            (depth - this.definition.minimumMeaningfulDepth) /
            (this.definition.fullEffectDepth -
                this.definition.minimumMeaningfulDepth),
        );
    }

    private clamp01(value: number): number {
        return Math.max(0, Math.min(1, value));
    }
}

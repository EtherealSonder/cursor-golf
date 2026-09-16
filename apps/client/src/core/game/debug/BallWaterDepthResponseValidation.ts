import {
    DEFAULT_BALL_WATER_INTERACTION_DEFINITION,
} from "../config/BallWaterInteractionDefinition";

import {
    BallWaterInteraction,
} from "../physics/water/BallWaterInteraction";

import type {
    BallWaterSample,
} from "../physics/water/BallWaterSampler";

/** Phase 8E-5 deterministic validation for nonlinear standing-Water depth response. */
export class BallWaterDepthResponseValidation {
    public run(): void {
        const results = [
            { name: "Dry depth produces zero response", passed: this.validateDry() },
            { name: "Below-threshold depth produces zero response", passed: this.validateBelowThreshold() },
            { name: "Depth ladder is strictly monotonic", passed: this.validateDepthLadder() },
            { name: "Full-effect depth reaches full response", passed: this.validateFullEffect() },
            { name: "Above-full depth remains clamped", passed: this.validateAboveFullClamp() },
            { name: "Nonlinear curve matches configured exponent", passed: this.validateCurve() },
            { name: "Partial coverage reduces exposure", passed: this.validateCoverage() },
            { name: "Maximum resistance remains bounded", passed: this.validateMaximumResistance() },
            { name: "Gameplay shallow depth has meaningful response", passed: this.validateGameplayShallowResponse() },
            { name: "Finite depth-response state", passed: this.validateFiniteState() },
        ];

        for (const result of results) {
            console.log(`[8E-5] ${result.name} ${result.passed ? "PASS" : "FAIL"}`);
        }

        const passed = results.every((result) => result.passed);
        console.log(`[8E-5] Nonlinear Water Depth Slowdown: ${passed ? "PASS" : "FAIL"}`);

        if (!passed) {
            throw new Error("Phase 8E-5 nonlinear Water depth-response validation failed.");
        }
    }

    private validateDry(): boolean {
        return new BallWaterInteraction()
            .calculateInstantaneousState(this.sample(0, 0))
            .targetExposure === 0;
    }

    private validateBelowThreshold(): boolean {
        const d = DEFAULT_BALL_WATER_INTERACTION_DEFINITION.minimumMeaningfulDepth * 0.5;
        return new BallWaterInteraction()
            .calculateInstantaneousState(this.sample(d, 1))
            .targetExposure === 0;
    }

    private validateDepthLadder(): boolean {
        const definition = DEFAULT_BALL_WATER_INTERACTION_DEFINITION;
        const min = definition.minimumMeaningfulDepth;
        const span = definition.fullEffectDepth - min;
        const depths = [0.10, 0.30, 0.55, 0.80].map((fraction) => min + span * fraction);
        const interaction = new BallWaterInteraction();
        const values = depths.map((depth) =>
            interaction.calculateInstantaneousState(this.sample(depth, 1)).targetExposure,
        );
        return values.every((value, index) => index === 0 || value > values[index - 1]);
    }

    private validateFullEffect(): boolean {
        const d = DEFAULT_BALL_WATER_INTERACTION_DEFINITION.fullEffectDepth;
        const state = new BallWaterInteraction().calculateInstantaneousState(this.sample(d, 1));
        return this.nearlyEqual(state.normalizedDepth, 1) && this.nearlyEqual(state.targetExposure, 1);
    }

    private validateAboveFullClamp(): boolean {
        const d = DEFAULT_BALL_WATER_INTERACTION_DEFINITION.fullEffectDepth * 4;
        const state = new BallWaterInteraction().calculateInstantaneousState(this.sample(d, 1));
        return this.nearlyEqual(state.normalizedDepth, 1) && this.nearlyEqual(state.targetExposure, 1);
    }

    private validateCurve(): boolean {
        const definition = DEFAULT_BALL_WATER_INTERACTION_DEFINITION;
        const depth = definition.minimumMeaningfulDepth +
            (definition.fullEffectDepth - definition.minimumMeaningfulDepth) * 0.5;
        const state = new BallWaterInteraction().calculateInstantaneousState(this.sample(depth, 1));
        return this.nearlyEqual(state.curvedDepth, Math.pow(0.5, definition.depthExponent));
    }

    private validateCoverage(): boolean {
        const d = DEFAULT_BALL_WATER_INTERACTION_DEFINITION.fullEffectDepth;
        const interaction = new BallWaterInteraction();
        const full = interaction.calculateInstantaneousState(this.sample(d, 1));
        const half = interaction.calculateInstantaneousState(this.sample(d * 0.5, 0.5));
        return this.nearlyEqual(full.targetExposure, 1) && this.nearlyEqual(half.targetExposure, 0.5);
    }

    private validateMaximumResistance(): boolean {
        const definition = DEFAULT_BALL_WATER_INTERACTION_DEFINITION;
        const interaction = new BallWaterInteraction();
        const wet = this.sample(definition.fullEffectDepth * 2, 1);
        let state = interaction.update(wet, 1 / 60);
        for (let i = 0; i < 600; i += 1) state = interaction.update(wet, 1 / 60);
        return state.additionalResistance <= definition.maximumAdditionalResistance + 1e-9;
    }

    private validateGameplayShallowResponse(): boolean {
        const definition = DEFAULT_BALL_WATER_INTERACTION_DEFINITION;
        const depth = Math.min(0.05, definition.fullEffectDepth * 0.5);
        const state = new BallWaterInteraction().calculateInstantaneousState(this.sample(depth, 1));
        return state.targetExposure >= 0.15;
    }

    private validateFiniteState(): boolean {
        const state = new BallWaterInteraction().update(this.sample(0.05, 0.75), 1 / 60);
        return [
            state.representativeWetDepth,
            state.normalizedDepth,
            state.curvedDepth,
            state.targetExposure,
            state.smoothedExposure,
            state.additionalResistance,
        ].every(Number.isFinite);
    }

    private sample(averageDepth: number, coveredFraction: number): BallWaterSample {
        const coverage = Math.max(0, Math.min(1, coveredFraction));
        return {
            averageDepth,
            maximumDepth: coverage > 0 ? averageDepth / coverage : 0,
            coveredFraction: coverage,
            averageVelocityX: 0,
            averageVelocityY: 0,
            sampleCount: 10,
            coveredSampleCount: Math.round(coverage * 10),
        };
    }

    private nearlyEqual(a: number, b: number, epsilon = 1e-9): boolean {
        return Math.abs(a - b) <= epsilon;
    }
}

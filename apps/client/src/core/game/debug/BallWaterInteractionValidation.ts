import {
    DEFAULT_BALL_WATER_INTERACTION_DEFINITION,
    validateBallWaterInteractionDefinition,
} from "../config/BallWaterInteractionDefinition";

import type {
    BallWaterInteractionDefinition,
} from "../config/BallWaterInteractionDefinition";

import {
    BallWaterInteraction,
} from "../physics/water/BallWaterInteraction";

import type {
    BallWaterSample,
} from "../physics/water/BallWaterSampler";

/** Phase 8E-2 deterministic acceptance checks for the Water/Ball contract. */
export class BallWaterInteractionValidation {
    public run(): void {
        const results: Array<{
            readonly name: string;
            readonly passed: boolean;
        }> = [
            { name: "Dry Water sample", passed: this.validateDrySample() },
            { name: "Below meaningful depth", passed: this.validateBelowMeaningfulDepth() },
            { name: "Meaningful-depth threshold", passed: this.validateMeaningfulDepthThreshold() },
            { name: "Partial depth normalization", passed: this.validatePartialDepthNormalization() },
            { name: "Full-effect depth", passed: this.validateFullEffectDepth() },
            { name: "Above-full-depth clamp", passed: this.validateAboveFullDepthClamp() },
            { name: "Nonlinear depth response", passed: this.validateNonlinearDepthResponse() },
            { name: "Partial footprint coverage", passed: this.validatePartialCoverage() },
            { name: "Full footprint coverage", passed: this.validateFullCoverage() },
            { name: "Entry / exit smoothing", passed: this.validateSmoothing() },
            { name: "Maximum resistance clamp", passed: this.validateMaximumResistance() },
            { name: "Finite interaction state", passed: this.validateFiniteState() },
            { name: "Default definition validity", passed: this.validateDefaultDefinition() },
            { name: "Invalid definition rejection", passed: this.validateInvalidDefinitionRejection() },
        ];

        for (const result of results) {
            console.log(
                `[8E-2] ${result.name} ${result.passed ? "PASS" : "FAIL"}`,
            );
        }

        const passed = results.every((result): boolean => result.passed);

        console.log(
            `[8E-2] Ball Water Interaction Contract: ${passed ? "PASS" : "FAIL"}`,
        );

        if (!passed) {
            throw new Error(
                "Phase 8E-2 Ball Water Interaction validation failed.",
            );
        }
    }

    private validateDrySample(): boolean {
        const state = new BallWaterInteraction().update(
            this.createSample(0, 0),
            1 / 60,
        );

        return state.targetExposure === 0 &&
            state.smoothedExposure === 0 &&
            state.additionalResistance === 0 &&
            !state.isMeaningfullyWet;
    }

    private validateBelowMeaningfulDepth(): boolean {
        const definition = DEFAULT_BALL_WATER_INTERACTION_DEFINITION;
        const depth = definition.minimumMeaningfulDepth * 0.5;
        const state = new BallWaterInteraction().calculateInstantaneousState(
            this.createSample(depth, 1),
        );

        return state.normalizedDepth === 0 && state.targetExposure === 0;
    }

    private validateMeaningfulDepthThreshold(): boolean {
        const definition = DEFAULT_BALL_WATER_INTERACTION_DEFINITION;
        const interaction = new BallWaterInteraction();

        const atThreshold = interaction.calculateInstantaneousState(
            this.createSample(definition.minimumMeaningfulDepth, 1),
        );

        const aboveThreshold = interaction.calculateInstantaneousState(
            this.createSample(definition.minimumMeaningfulDepth + 0.01, 1),
        );

        return atThreshold.targetExposure === 0 &&
            aboveThreshold.targetExposure > 0;
    }

    private validatePartialDepthNormalization(): boolean {
        const definition = DEFAULT_BALL_WATER_INTERACTION_DEFINITION;
        const midpoint =
            (definition.minimumMeaningfulDepth + definition.fullEffectDepth) /
            2;

        const state = new BallWaterInteraction().calculateInstantaneousState(
            this.createSample(midpoint, 1),
        );

        return this.nearlyEqual(state.normalizedDepth, 0.5) &&
            state.curvedDepth > 0 &&
            state.curvedDepth < 1;
    }

    private validateFullEffectDepth(): boolean {
        const definition = DEFAULT_BALL_WATER_INTERACTION_DEFINITION;
        const state = new BallWaterInteraction().calculateInstantaneousState(
            this.createSample(definition.fullEffectDepth, 1),
        );

        return state.normalizedDepth === 1 &&
            state.curvedDepth === 1 &&
            state.targetExposure === 1;
    }

    private validateAboveFullDepthClamp(): boolean {
        const definition = DEFAULT_BALL_WATER_INTERACTION_DEFINITION;
        const state = new BallWaterInteraction().calculateInstantaneousState(
            this.createSample(definition.fullEffectDepth * 10, 1),
        );

        return state.normalizedDepth === 1 && state.targetExposure === 1;
    }

    private validateNonlinearDepthResponse(): boolean {
        const definition = DEFAULT_BALL_WATER_INTERACTION_DEFINITION;
        const midpoint =
            (definition.minimumMeaningfulDepth + definition.fullEffectDepth) /
            2;

        const state = new BallWaterInteraction().calculateInstantaneousState(
            this.createSample(midpoint, 1),
        );

        const expected = Math.pow(0.5, definition.depthExponent);

        return this.nearlyEqual(state.curvedDepth, expected) &&
            state.curvedDepth < state.normalizedDepth;
    }

    private validatePartialCoverage(): boolean {
        const definition = DEFAULT_BALL_WATER_INTERACTION_DEFINITION;
        const coverage = 0.5;

        /* averageDepth includes dry samples, so full wet-sample depth at 50%
         * coverage is represented by averageDepth = fullDepth * 0.5. */
        const state = new BallWaterInteraction().calculateInstantaneousState(
            this.createSample(definition.fullEffectDepth * coverage, coverage),
        );

        return this.nearlyEqual(
                state.representativeWetDepth,
                definition.fullEffectDepth,
            ) &&
            this.nearlyEqual(state.targetExposure, coverage);
    }

    private validateFullCoverage(): boolean {
        const definition = DEFAULT_BALL_WATER_INTERACTION_DEFINITION;
        const state = new BallWaterInteraction().calculateInstantaneousState(
            this.createSample(definition.fullEffectDepth, 1),
        );

        return state.coveredFraction === 1 && state.targetExposure === 1;
    }

    private validateSmoothing(): boolean {
        const definition = DEFAULT_BALL_WATER_INTERACTION_DEFINITION;
        const interaction = new BallWaterInteraction();
        const wet = this.createSample(definition.fullEffectDepth, 1);
        const dry = this.createSample(0, 0);

        const entered = interaction.update(wet, 1 / 60);
        const enteredAgain = interaction.update(wet, 1 / 60);
        const exited = interaction.update(dry, 1 / 60);

        return entered.smoothedExposure > 0 &&
            entered.smoothedExposure < 1 &&
            enteredAgain.smoothedExposure > entered.smoothedExposure &&
            exited.smoothedExposure < enteredAgain.smoothedExposure &&
            exited.smoothedExposure > 0;
    }

    private validateMaximumResistance(): boolean {
        const definition = DEFAULT_BALL_WATER_INTERACTION_DEFINITION;
        const interaction = new BallWaterInteraction();
        const wet = this.createSample(definition.fullEffectDepth * 100, 1);

        let state = interaction.update(wet, 1 / 60);

        for (let index = 0; index < 600; index += 1) {
            state = interaction.update(wet, 1 / 60);
        }

        return state.additionalResistance <=
                definition.maximumAdditionalResistance + 1e-9 &&
            this.nearlyEqual(
                state.additionalResistance,
                definition.maximumAdditionalResistance,
                1e-6,
            );
    }

    private validateFiniteState(): boolean {
        const state = new BallWaterInteraction().update(
            this.createSample(0.2, 0.5),
            1 / 60,
        );

        return [
            state.representativeWetDepth,
            state.normalizedDepth,
            state.curvedDepth,
            state.targetExposure,
            state.smoothedExposure,
            state.additionalResistance,
            state.coveredFraction,
        ].every(Number.isFinite);
    }

    private validateDefaultDefinition(): boolean {
        try {
            validateBallWaterInteractionDefinition(
                DEFAULT_BALL_WATER_INTERACTION_DEFINITION,
            );
            return true;
        } catch {
            return false;
        }
    }

    private validateInvalidDefinitionRejection(): boolean {
        const invalid: BallWaterInteractionDefinition = {
            ...DEFAULT_BALL_WATER_INTERACTION_DEFINITION,
            fullEffectDepth:
                DEFAULT_BALL_WATER_INTERACTION_DEFINITION.minimumMeaningfulDepth,
        };

        try {
            validateBallWaterInteractionDefinition(invalid);
            return false;
        } catch {
            return true;
        }
    }

    private createSample(
        averageDepth: number,
        coveredFraction: number,
    ): BallWaterSample {
        const sampleCount = 10;
        const clampedCoverage = Math.max(0, Math.min(1, coveredFraction));

        return {
            averageDepth,
            maximumDepth: averageDepth,
            coveredFraction: clampedCoverage,
            averageVelocityX: 0,
            averageVelocityY: 0,
            sampleCount,
            coveredSampleCount: Math.round(sampleCount * clampedCoverage),
        };
    }

    private nearlyEqual(
        a: number,
        b: number,
        epsilon = 1e-9,
    ): boolean {
        return Math.abs(a - b) <= epsilon;
    }
}

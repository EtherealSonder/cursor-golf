import {
    BallWaterInteraction,
} from "../physics/water/BallWaterInteraction";

import type {
    BallWaterSample,
} from "../physics/water/BallWaterSampler";

export class BallStandingWaterDragValidation {
    public run(): void {
        const interaction = new BallWaterInteraction();
        const baseDeceleration = 600;

        const definition = interaction.getDefinition();
        const usableDepthRange =
            definition.fullEffectDepth -
            definition.minimumMeaningfulDepth;

        /*
         * Derive validation depths from the active Water-interaction
         * definition instead of assuming the older 0.60 full-effect depth.
         *
         * This keeps the 8E-4 invariant valid when later phases tune the
         * nonlinear response curve. Both comparison depths remain strictly
         * below fullEffectDepth, so the deeper sample must still produce
         * greater drag rather than both samples saturating at the maximum.
         */
        const shallowDepth =
            definition.minimumMeaningfulDepth +
            usableDepthRange * 0.30;

        const mediumDepth =
            definition.minimumMeaningfulDepth +
            usableDepthRange * 0.55;

        const deepDepth =
            definition.minimumMeaningfulDepth +
            usableDepthRange * 0.80;

        const dry = this.sample(0, 0);
        const shallow = this.sample(shallowDepth, 1);
        const medium = this.sample(mediumDepth, 1);
        const deep = this.sample(deepDepth, 1);
        const partial = this.sample(mediumDepth, 0.5);

        const dryState = interaction.update(dry, 1);
        this.assertClose(
            "Dry Ball motion unchanged",
            interaction.combineRollingResistance(1, dryState.additionalResistance),
            1,
        );

        interaction.reset();
        const wetTerrainOnly = interaction.update(dry, 1);
        this.assertClose(
            "Wet terrain resistance unchanged",
            interaction.combineRollingResistance(1.30, wetTerrainOnly.additionalResistance),
            1.30,
        );

        interaction.reset();
        const shallowState = interaction.update(shallow, 1);
        this.assertGreater(
            "Standing Water increases deceleration",
            baseDeceleration * interaction.combineRollingResistance(1, shallowState.additionalResistance),
            baseDeceleration,
        );

        interaction.reset();
        const partialState = interaction.update(partial, 1);
        this.assertGreater(
            "Partial Water produces additional drag",
            partialState.additionalResistance,
            0,
        );

        interaction.reset();
        const mediumState = interaction.update(medium, 1);
        interaction.reset();
        const deepState = interaction.update(deep, 1);
        this.assertGreater(
            "Deeper Water produces greater drag",
            deepState.additionalResistance,
            mediumState.additionalResistance,
        );

        this.assertAtMost(
            "Maximum Water drag remains bounded",
            deepState.additionalResistance,
            interaction.getDefinition().maximumAdditionalResistance + 1e-9,
        );

        this.assertGreater(
            "Wet Grass plus Water combines additively",
            interaction.combineRollingResistance(1.30, mediumState.additionalResistance),
            1.30,
        );

        this.assertGreater(
            "Wet Sand plus Water combines additively",
            interaction.combineRollingResistance(1.35, mediumState.additionalResistance),
            1.35,
        );

        interaction.reset();
        const zeroSpeedEquivalent =
            baseDeceleration *
            interaction.combineRollingResistance(
                1,
                interaction.update(dry, 1 / 60).additionalResistance,
            );
        this.assertFinite(
            "Zero-speed resistance state remains finite",
            zeroSpeedEquivalent,
        );

        const combined = interaction.combineRollingResistance(
            1.30,
            mediumState.additionalResistance,
        );
        this.assertClose(
            "Terrain and Water use additive composition",
            combined,
            1.30 + mediumState.additionalResistance,
        );

        console.info(
            "[8E-4] Ball Standing-Water Drag: PASS",
        );
    }

    private sample(
        representativeWetDepth: number,
        coveredFraction: number,
    ): BallWaterSample {
        const clampedCoverage = Math.max(0, Math.min(1, coveredFraction));
        const sampleCount = 10;
        const coveredSampleCount = Math.round(sampleCount * clampedCoverage);

        return {
            averageDepth: representativeWetDepth * clampedCoverage,
            maximumDepth: representativeWetDepth,
            coveredFraction: clampedCoverage,
            averageVelocityX: 0,
            averageVelocityY: 0,
            sampleCount,
            coveredSampleCount,
        };
    }

    private assertClose(label: string, actual: number, expected: number): void {
        if (!Number.isFinite(actual) || Math.abs(actual - expected) > 1e-6) {
            throw new Error(`[8E-4] ${label} FAIL. Expected ${expected}, received ${actual}.`);
        }
        console.info(`[8E-4] ${label} PASS`);
    }

    private assertGreater(label: string, actual: number, minimum: number): void {
        if (!Number.isFinite(actual) || actual <= minimum) {
            throw new Error(`[8E-4] ${label} FAIL. Expected > ${minimum}, received ${actual}.`);
        }
        console.info(`[8E-4] ${label} PASS`);
    }

    private assertAtMost(label: string, actual: number, maximum: number): void {
        if (!Number.isFinite(actual) || actual > maximum) {
            throw new Error(`[8E-4] ${label} FAIL. Expected <= ${maximum}, received ${actual}.`);
        }
        console.info(`[8E-4] ${label} PASS`);
    }

    private assertFinite(label: string, actual: number): void {
        if (!Number.isFinite(actual)) {
            throw new Error(`[8E-4] ${label} FAIL. Received ${actual}.`);
        }
        console.info(`[8E-4] ${label} PASS`);
    }
}

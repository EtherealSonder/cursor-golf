import {
    DEFAULT_BALL_WATER_INTERACTION_DEFINITION,
} from "../config/BallWaterInteractionDefinition";

import {
    BallWaterInteraction,
} from "../physics/water/BallWaterInteraction";

import {
    BallWaterDepthSeverity,
} from "../physics/water/BallWaterDepthSeverity";

import {
    createBallWaterContactProfile,
} from "../physics/water/BallWaterContactProfile";

import type {
    BallWaterSample,
} from "../physics/water/BallWaterSampler";

export class BallWaterContactProfileValidation {
    private static hasRun = false;

    public run(): void {
        if (BallWaterContactProfileValidation.hasRun) {
            return;
        }
        BallWaterContactProfileValidation.hasRun = true;

        const definition =
            DEFAULT_BALL_WATER_INTERACTION_DEFINITION;

        console.log("[8I-8B.1/2] BALL WATER CONTACT PROFILE");

        const interaction = new BallWaterInteraction(definition);
        const group1Checks: ReadonlyArray<readonly [string, boolean]> = [
            ["Normalized depth clamps to 0..1", this.validateNormalization(interaction)],
            ["Dry depth classified Dry", this.severityAtNormalized(interaction, 0) === BallWaterDepthSeverity.Dry],
            ["Shallow depth classified Shallow", this.severityAtNormalized(interaction, 0.10) === BallWaterDepthSeverity.Shallow],
            ["Moderate depth classified Moderate", this.severityAtNormalized(interaction, 0.40) === BallWaterDepthSeverity.Moderate],
            ["Deep depth classified Deep", this.severityAtNormalized(interaction, 0.80) === BallWaterDepthSeverity.Deep],
            ["Contact profile preserves authoritative values", this.validateProfile()],
        ];
        const group1Passed = this.printChecks("[8I-8B.1/2]", group1Checks);
        console.log(`[8I-8B.1/2] RESULT: ${group1Passed ? "PASS" : "FAIL"}`);

        console.log("[8I-8B.3/4] NONLINEAR WATER RESISTANCE");

        const dry = this.totalResistanceAtNormalized(0, 0);
        const shallow = this.totalResistanceAtNormalized(0.25, 1);
        const moderate = this.totalResistanceAtNormalized(0.60, 1);
        const deep = this.totalResistanceAtNormalized(0.85, 1);
        const full = this.totalResistanceAtNormalized(1, 1);
        const halfCoverage = this.totalResistanceAtNormalized(1, 0.5);

        console.log(
            `[8I-8B.3/4] Resistance samples: dry=${dry.toFixed(3)}x, ` +
            `shallow=${shallow.toFixed(3)}x, moderate=${moderate.toFixed(3)}x, ` +
            `deep=${deep.toFixed(3)}x, full=${full.toFixed(3)}x, ` +
            `full-depth/50%-coverage=${halfCoverage.toFixed(3)}x`,
        );

        const group2Checks: ReadonlyArray<readonly [string, boolean]> = [
            ["Dry Water resistance remains 1.0x on Normal Grass", this.nearlyEqual(dry, 1)],
            ["Resistance increases Shallow < Moderate < Deep", shallow < moderate && moderate < deep && deep <= full],
            [
                "Full-depth/full-coverage matches configured maximum",
                this.nearlyEqual(
                    full,
                    1 + definition.maximumAdditionalResistance,
                ),
            ],
            ["Partial coverage is weaker than full coverage", halfCoverage > 1 && halfCoverage < full],
            ["Depth response is continuous and monotonic", this.validateDepthContinuity()],
            ["Coverage response is continuous and monotonic", this.validateCoverageContinuity()],
            ["Severity does not select resistance", this.validateSeverityIndependence()],
            ["Resistance remains finite and non-negative", this.validateFiniteResistance()],
            [
                "Configured nonlinear curve is valid",
                Number.isFinite(definition.depthExponent) &&
                definition.depthExponent > 0 &&
                Number.isFinite(definition.coverageExponent) &&
                definition.coverageExponent > 0 &&
                Number.isFinite(definition.maximumAdditionalResistance) &&
                definition.maximumAdditionalResistance >= 0,
            ],
        ];

        const group2Passed = this.printChecks("[8I-8B.3/4]", group2Checks);
        console.log(`[8I-8B.3/4] RESULT: ${group2Passed ? "PASS" : "FAIL"}`);

        if (!group1Passed || !group2Passed) {
            throw new Error("8I-8B Ball Water validation failed.");
        }
    }

    private printChecks(
        prefix: string,
        checks: ReadonlyArray<readonly [string, boolean]>,
    ): boolean {
        let passed = true;
        for (const [label, result] of checks) {
            console.log(`${prefix} ${label}: ${result ? "PASS" : "FAIL"}`);
            passed &&= result;
        }
        return passed;
    }

    private validateNormalization(interaction: BallWaterInteraction): boolean {
        const dry = interaction.calculateInstantaneousState(this.sample(0, 0));
        const deep = interaction.calculateInstantaneousState(
            this.sample(DEFAULT_BALL_WATER_INTERACTION_DEFINITION.fullEffectDepth * 4, 1),
        );
        return dry.normalizedDepth === 0 && deep.normalizedDepth === 1;
    }

    private severityAtNormalized(
        interaction: BallWaterInteraction,
        normalizedDepth: number,
    ): BallWaterDepthSeverity {
        if (normalizedDepth <= 0) {
            return interaction.calculateInstantaneousState(this.sample(0, 0)).depthSeverity;
        }
        return interaction.calculateInstantaneousState(
            this.sample(this.depthFromNormalized(normalizedDepth), 1),
        ).depthSeverity;
    }

    private validateProfile(): boolean {
        const profile = createBallWaterContactProfile(
            0.08, 0.55, 0.75, 0.42,
            BallWaterDepthSeverity.Moderate, 1.25,
        );
        return (
            profile.representativeDepth === 0.08 &&
            profile.normalizedDepth === 0.55 &&
            profile.coverage === 0.75 &&
            profile.exposure === 0.42 &&
            profile.severity === BallWaterDepthSeverity.Moderate &&
            profile.contactTime === 1.25
        );
    }

    private totalResistanceAtNormalized(
        normalizedDepth: number,
        coverage: number,
    ): number {
        const interaction = new BallWaterInteraction(
            DEFAULT_BALL_WATER_INTERACTION_DEFINITION,
        );
        const sample = normalizedDepth <= 0
            ? this.sample(0, 0)
            : this.sample(this.depthFromNormalized(normalizedDepth), coverage);
        const state = interaction.calculateInstantaneousState(sample);
        const additional =
            DEFAULT_BALL_WATER_INTERACTION_DEFINITION.maximumAdditionalResistance *
            state.targetExposure;
        return interaction.combineRollingResistance(1, additional);
    }

    private depthFromNormalized(normalizedDepth: number): number {
        const definition = DEFAULT_BALL_WATER_INTERACTION_DEFINITION;
        const t = Math.max(0, Math.min(1, normalizedDepth));
        return definition.minimumMeaningfulDepth +
            (definition.fullEffectDepth - definition.minimumMeaningfulDepth) * t;
    }

    private validateDepthContinuity(): boolean {
        let previous = 1;
        for (let i = 1; i <= 100; i += 1) {
            const current = this.totalResistanceAtNormalized(i / 100, 1);
            if (!Number.isFinite(current) || current < previous) return false;
            previous = current;
        }
        return true;
    }

    private validateCoverageContinuity(): boolean {
        let previous = 1;
        for (let i = 1; i <= 100; i += 1) {
            const current = this.totalResistanceAtNormalized(1, i / 100);
            if (!Number.isFinite(current) || current < previous) return false;
            previous = current;
        }
        return true;
    }

    private validateSeverityIndependence(): boolean {
        const definition =
            DEFAULT_BALL_WATER_INTERACTION_DEFINITION;

        const interaction =
            new BallWaterInteraction(definition);

        const boundary =
            definition.shallowUpperNormalizedDepth;

        // Probe extremely close to the semantic boundary. The classification
        // should change, but the continuous physics response must not jump.
        const epsilon = 1e-7;

        const below =
            interaction.calculateInstantaneousState(
                this.sample(
                    this.depthFromNormalized(
                        Math.max(0, boundary - epsilon),
                    ),
                    1,
                ),
            );

        const above =
            interaction.calculateInstantaneousState(
                this.sample(
                    this.depthFromNormalized(
                        Math.min(1, boundary + epsilon),
                    ),
                    1,
                ),
            );

        const classificationChanges =
            below.depthSeverity ===
            BallWaterDepthSeverity.Shallow &&
            above.depthSeverity ===
            BallWaterDepthSeverity.Moderate;

        const exposureRemainsContinuous =
            Math.abs(
                above.targetExposure -
                below.targetExposure
            ) < 1e-5;

        return (
            classificationChanges &&
            exposureRemainsContinuous
        );
    }

    private validateFiniteResistance(): boolean {
        const probes = [0, 0.1, 0.25, 0.5, 0.75, 1];
        return probes.every((depth) => {
            const value = this.totalResistanceAtNormalized(depth, depth === 0 ? 0 : depth);
            return Number.isFinite(value) && value >= 1;
        });
    }

    private nearlyEqual(a: number, b: number, epsilon = 1e-9): boolean {
        return Math.abs(a - b) <= epsilon;
    }

    private sample(
        representativeDepth: number,
        coverage: number,
    ): BallWaterSample {
        const coveredFraction = Math.max(0, Math.min(1, coverage));
        return {
            averageDepth: representativeDepth * coveredFraction,
            maximumDepth: representativeDepth,
            coveredFraction,
            averageVelocityX: 0,
            averageVelocityY: 0,
            sampleCount: 9,
            coveredSampleCount: Math.round(9 * coveredFraction),
        };
    }
}

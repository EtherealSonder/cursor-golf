import {
    DEFAULT_BALL_PHYSICS_DEFINITION,
} from "../config/BallPhysicsDefinition";

import {
    DEFAULT_BALL_WATER_INTERACTION_DEFINITION,
} from "../config/BallWaterInteractionDefinition";

import {
    NORMAL_GRASS_STATE_DEFINITION,
    WET_GRASS_STATE_DEFINITION,
} from "../surface/SurfaceStateDefinition";

import {
    BallWaterInteraction,
} from "../physics/water/BallWaterInteraction";

import type {
    BallWaterSample,
} from "../physics/water/BallWaterSampler";

export interface BallWaterShotDistanceCaseResult {
    readonly label: string;
    readonly surfaceResistance: number;
    readonly waterDepth: number;
    readonly stopDistance: number;
    readonly stopTime: number;
    readonly maximumWaterResistance: number;
}

export interface BallWaterShotDistanceReport {
    readonly referenceSpeed: number;
    readonly simulationStep: number;
    readonly baseRollingDeceleration: number;
    readonly dry: BallWaterShotDistanceCaseResult;
    readonly wet: BallWaterShotDistanceCaseResult;
    readonly shallow: BallWaterShotDistanceCaseResult;
    readonly medium: BallWaterShotDistanceCaseResult;
    readonly deep: BallWaterShotDistanceCaseResult;
    readonly orderingPassed: boolean;
}

/**
 * Phase 8E-8 deterministic controlled shot-distance comparison.
 *
 * Every case begins with the same speed and fixed timestep. Only terrain
 * resistance and standing-Water depth change. Water cases exercise the real
 * BallWaterInteraction nonlinear response and temporal smoothing.
 */
export class BallWaterShotDistanceValidation {
    private readonly referenceSpeed = 300;
    private readonly simulationStep = 1 / 60;
    private readonly maximumSimulationSeconds = 10;

    public run(): BallWaterShotDistanceReport {
        const definition =
            DEFAULT_BALL_WATER_INTERACTION_DEFINITION;

        const usableDepthRange =
            definition.fullEffectDepth -
            definition.minimumMeaningfulDepth;

        const shallowDepth =
            definition.minimumMeaningfulDepth +
            usableDepthRange * 0.30;

        const mediumDepth =
            definition.minimumMeaningfulDepth +
            usableDepthRange * 0.60;

        const deepDepth =
            definition.minimumMeaningfulDepth +
            usableDepthRange * 0.90;

        const dry = this.simulate(
            "Normal Grass",
            NORMAL_GRASS_STATE_DEFINITION.rollingResistanceMultiplier,
            0,
        );

        const wet = this.simulate(
            "Wet Grass",
            WET_GRASS_STATE_DEFINITION.rollingResistanceMultiplier,
            0,
        );

        const shallow = this.simulate(
            "Wet Grass + Shallow Water",
            WET_GRASS_STATE_DEFINITION.rollingResistanceMultiplier,
            shallowDepth,
        );

        const medium = this.simulate(
            "Wet Grass + Medium Water",
            WET_GRASS_STATE_DEFINITION.rollingResistanceMultiplier,
            mediumDepth,
        );

        const deep = this.simulate(
            "Wet Grass + Deep Water",
            WET_GRASS_STATE_DEFINITION.rollingResistanceMultiplier,
            deepDepth,
        );

        const all = [dry, wet, shallow, medium, deep];

        const finite =
            all.every((result) =>
                Number.isFinite(result.stopDistance) &&
                Number.isFinite(result.stopTime) &&
                Number.isFinite(result.maximumWaterResistance) &&
                result.stopDistance >= 0 &&
                result.stopTime >= 0,
            );

        const wetLessThanDry =
            wet.stopDistance < dry.stopDistance;

        const shallowLessThanWet =
            shallow.stopDistance < wet.stopDistance;

        const mediumLessThanShallow =
            medium.stopDistance < shallow.stopDistance;

        const deepLessThanMedium =
            deep.stopDistance < medium.stopDistance;

        const monotonic =
            shallowLessThanWet &&
            mediumLessThanShallow &&
            deepLessThanMedium;

        const deterministic =
            this.isDeterministic(
                WET_GRASS_STATE_DEFINITION.rollingResistanceMultiplier,
                mediumDepth,
                medium,
            );

        const waterResistanceMonotonic =
            shallow.maximumWaterResistance <
                medium.maximumWaterResistance &&
            medium.maximumWaterResistance <
                deep.maximumWaterResistance;

        const checks: readonly [string, boolean][] = [
            ["All controlled results are finite", finite],
            ["Wet Grass travels less than Normal Grass", wetLessThanDry],
            ["Shallow Water travels less than Wet Grass", shallowLessThanWet],
            ["Medium Water travels less than Shallow Water", mediumLessThanShallow],
            ["Deep Water travels less than Medium Water", deepLessThanMedium],
            ["Increasing Water depth monotonically reduces distance", monotonic],
            ["Water resistance increases with controlled depth", waterResistanceMonotonic],
            ["Repeated controlled runs are deterministic", deterministic],
        ];

        console.log("[8E-8] CONTROLLED SHOT-DISTANCE COMPARISON");
        console.log(
            `[8E-8] Reference Speed: ${this.referenceSpeed.toFixed(2)} px/s`,
        );
        console.log(
            `[8E-8] Simulation Step: ${(this.simulationStep * 1000).toFixed(3)} ms`,
        );
        console.log(
            `[8E-8] Base Rolling Deceleration: ${DEFAULT_BALL_PHYSICS_DEFINITION.rollingDeceleration.toFixed(2)} px/s²`,
        );

        for (const result of all) {
            console.log(`[8E-8] ${result.label}`, {
                surfaceResistance: result.surfaceResistance.toFixed(3),
                waterDepth: result.waterDepth.toFixed(4),
                maximumWaterResistance:
                    result.maximumWaterResistance.toFixed(3),
                stopDistance: `${result.stopDistance.toFixed(2)} px`,
                stopTime: `${result.stopTime.toFixed(3)} s`,
            });
        }

        for (const [name, passed] of checks) {
            console.log(`[8E-8] ${name} ${passed ? "PASS" : "FAIL"}`);
        }

        const passed =
            checks.every(([, value]) => value);

        console.log(
            `[8E-8] Controlled Shot-Distance Comparison: ${passed ? "PASS" : "FAIL"}`,
        );

        if (!passed) {
            throw new Error(
                "Phase 8E-8 Controlled Shot-Distance Comparison validation failed.",
            );
        }

        return {
            referenceSpeed: this.referenceSpeed,
            simulationStep: this.simulationStep,
            baseRollingDeceleration:
                DEFAULT_BALL_PHYSICS_DEFINITION.rollingDeceleration,
            dry,
            wet,
            shallow,
            medium,
            deep,
            orderingPassed: monotonic,
        };
    }

    private simulate(
        label: string,
        surfaceResistance: number,
        representativeWaterDepth: number,
    ): BallWaterShotDistanceCaseResult {
        const interaction =
            new BallWaterInteraction();

        const sample =
            this.createFullCoverageSample(
                representativeWaterDepth,
            );

        let speed = this.referenceSpeed;
        let distance = 0;
        let elapsed = 0;
        let maximumWaterResistance = 0;

        while (
            speed > 0 &&
            elapsed < this.maximumSimulationSeconds
        ) {
            const state =
                interaction.update(
                    sample,
                    this.simulationStep,
                );

            maximumWaterResistance =
                Math.max(
                    maximumWaterResistance,
                    state.additionalResistance,
                );

            const combinedResistance =
                interaction.combineRollingResistance(
                    surfaceResistance,
                    state.additionalResistance,
                );

            const deceleration =
                DEFAULT_BALL_PHYSICS_DEFINITION
                    .rollingDeceleration *
                combinedResistance;

            if (
                !Number.isFinite(deceleration) ||
                deceleration <= 0
            ) {
                return {
                    label,
                    surfaceResistance,
                    waterDepth: representativeWaterDepth,
                    stopDistance: Number.NaN,
                    stopTime: Number.NaN,
                    maximumWaterResistance:
                        Number.NaN,
                };
            }

            const timeToStop =
                speed / deceleration;

            const stepDuration =
                Math.min(
                    this.simulationStep,
                    timeToStop,
                );

            distance +=
                speed * stepDuration -
                0.5 *
                deceleration *
                stepDuration *
                stepDuration;

            speed =
                Math.max(
                    0,
                    speed -
                    deceleration *
                    stepDuration,
                );

            elapsed += stepDuration;
        }

        return {
            label,
            surfaceResistance,
            waterDepth: representativeWaterDepth,
            stopDistance: distance,
            stopTime: elapsed,
            maximumWaterResistance,
        };
    }

    private createFullCoverageSample(
        representativeWaterDepth: number,
    ): BallWaterSample {
        const depth =
            Math.max(
                0,
                representativeWaterDepth,
            );

        return {
            averageDepth: depth,
            maximumDepth: depth,
            coveredFraction:
                depth > 0
                    ? 1
                    : 0,
            averageVelocityX: 0,
            averageVelocityY: 0,
            sampleCount: 9,
            coveredSampleCount:
                depth > 0
                    ? 9
                    : 0,
        };
    }

    private isDeterministic(
        surfaceResistance: number,
        waterDepth: number,
        reference: BallWaterShotDistanceCaseResult,
    ): boolean {
        const repeated =
            this.simulate(
                "Repeat",
                surfaceResistance,
                waterDepth,
            );

        return (
            Math.abs(
                repeated.stopDistance -
                reference.stopDistance,
            ) <= 1e-9 &&
            Math.abs(
                repeated.stopTime -
                reference.stopTime,
            ) <= 1e-9 &&
            Math.abs(
                repeated.maximumWaterResistance -
                reference.maximumWaterResistance,
            ) <= 1e-9
        );
    }
}

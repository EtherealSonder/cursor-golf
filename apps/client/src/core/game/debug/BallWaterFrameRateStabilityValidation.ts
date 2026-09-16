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

export interface BallWaterFrameRateCaseResult {
    readonly label: string;
    readonly waterDepth: number;
    readonly distance30: number;
    readonly distance60: number;
    readonly distance120: number;
    readonly deviation30Percent: number;
    readonly deviation120Percent: number;
    readonly maximumDeviationPercent: number;
    readonly passed: boolean;
}

export interface BallWaterFrameRateStabilityReport {
    readonly tolerancePercent: number;
    readonly cases: readonly BallWaterFrameRateCaseResult[];
    readonly hierarchy30Passed: boolean;
    readonly hierarchy60Passed: boolean;
    readonly hierarchy120Passed: boolean;
    readonly allFinitePassed: boolean;
    readonly passed: boolean;
    readonly maximumDeviationPercent: number;
}

interface SimulatedShot {
    readonly distance: number;
    readonly stopTime: number;
}

/**
 * Phase 8E-9 deterministic 30/60/120 FPS stability validation.
 *
 * The same controlled shot is integrated with three external timesteps while
 * exercising the real BallWaterInteraction smoothing and resistance contract.
 * 60 FPS is the comparison reference. A small numerical tolerance is allowed
 * because motion integration itself is discrete.
 */
export class BallWaterFrameRateStabilityValidation {
    private readonly referenceSpeed = 300;
    private readonly maximumSimulationSeconds = 10;
    private readonly tolerancePercent = 1.0;

    /**
     * Common bounded physics step used inside each simulated outer frame.
     * 30 FPS -> 4 substeps, 60 FPS -> 2, 120 FPS -> 1.
     */
    private readonly internalPhysicsStep = 1 / 120;

    public run(): BallWaterFrameRateStabilityReport {
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

        const scenarios = [
            {
                label: "Normal Grass",
                surfaceResistance:
                    NORMAL_GRASS_STATE_DEFINITION
                        .rollingResistanceMultiplier,
                waterDepth: 0,
            },
            {
                label: "Wet Grass",
                surfaceResistance:
                    WET_GRASS_STATE_DEFINITION
                        .rollingResistanceMultiplier,
                waterDepth: 0,
            },
            {
                label: "Wet Grass + Shallow Water",
                surfaceResistance:
                    WET_GRASS_STATE_DEFINITION
                        .rollingResistanceMultiplier,
                waterDepth: shallowDepth,
            },
            {
                label: "Wet Grass + Medium Water",
                surfaceResistance:
                    WET_GRASS_STATE_DEFINITION
                        .rollingResistanceMultiplier,
                waterDepth: mediumDepth,
            },
            {
                label: "Wet Grass + Deep Water",
                surfaceResistance:
                    WET_GRASS_STATE_DEFINITION
                        .rollingResistanceMultiplier,
                waterDepth: deepDepth,
            },
        ] as const;

        const results = scenarios.map((scenario) => {
            const at30 = this.simulate(
                scenario.surfaceResistance,
                scenario.waterDepth,
                1 / 30,
            );
            const at60 = this.simulate(
                scenario.surfaceResistance,
                scenario.waterDepth,
                1 / 60,
            );
            const at120 = this.simulate(
                scenario.surfaceResistance,
                scenario.waterDepth,
                1 / 120,
            );

            const deviation30Percent =
                this.percentageDifference(
                    at30.distance,
                    at60.distance,
                );
            const deviation120Percent =
                this.percentageDifference(
                    at120.distance,
                    at60.distance,
                );
            const maximumDeviationPercent =
                Math.max(
                    deviation30Percent,
                    deviation120Percent,
                );

            return {
                label: scenario.label,
                waterDepth: scenario.waterDepth,
                distance30: at30.distance,
                distance60: at60.distance,
                distance120: at120.distance,
                deviation30Percent,
                deviation120Percent,
                maximumDeviationPercent,
                passed:
                    maximumDeviationPercent <=
                    this.tolerancePercent,
            } satisfies BallWaterFrameRateCaseResult;
        });

        const allFinitePassed =
            results.every((result) =>
                [
                    result.distance30,
                    result.distance60,
                    result.distance120,
                    result.deviation30Percent,
                    result.deviation120Percent,
                    result.maximumDeviationPercent,
                ].every(Number.isFinite),
            );

        const hierarchy30Passed =
            this.hasStrictDistanceHierarchy(
                results.map((result) => result.distance30),
            );
        const hierarchy60Passed =
            this.hasStrictDistanceHierarchy(
                results.map((result) => result.distance60),
            );
        const hierarchy120Passed =
            this.hasStrictDistanceHierarchy(
                results.map((result) => result.distance120),
            );

        const maximumDeviationPercent =
            Math.max(
                ...results.map(
                    (result) =>
                        result.maximumDeviationPercent,
                ),
            );

        const passed =
            allFinitePassed &&
            results.every((result) => result.passed) &&
            hierarchy30Passed &&
            hierarchy60Passed &&
            hierarchy120Passed;

        console.log("[8E-9] 30/60/120 FPS STABILITY");
        console.log(
            `[8E-9] Reference Speed: ${this.referenceSpeed.toFixed(2)} px/s`,
        );
        console.log(
            `[8E-9] Distance Tolerance: ${this.tolerancePercent.toFixed(2)}%`,
        );
        console.log(
            `[8E-9] Internal Physics Step: ${(this.internalPhysicsStep * 1000).toFixed(3)} ms`,
        );
        console.log(
            "[8E-9] Outer-frame substeps: 30 FPS = 4, 60 FPS = 2, 120 FPS = 1",
        );

        for (const result of results) {
            console.log(`[8E-9] ${result.label}`, {
                waterDepth: result.waterDepth.toFixed(4),
                distance30: `${result.distance30.toFixed(3)} px`,
                distance60: `${result.distance60.toFixed(3)} px`,
                distance120: `${result.distance120.toFixed(3)} px`,
                deviation30Vs60:
                    `${result.deviation30Percent.toFixed(4)}%`,
                deviation120Vs60:
                    `${result.deviation120Percent.toFixed(4)}%`,
                maximumDeviation:
                    `${result.maximumDeviationPercent.toFixed(4)}%`,
                result: result.passed ? "PASS" : "FAIL",
            });
        }

        console.log(
            `[8E-9] All results finite ${allFinitePassed ? "PASS" : "FAIL"}`,
        );

        for (const result of results) {
            console.log(
                `[8E-9] ${result.label} frame-rate stable ${result.passed ? "PASS" : "FAIL"}`,
            );
        }

        console.log(
            `[8E-9] 30 FPS distance hierarchy ${hierarchy30Passed ? "PASS" : "FAIL"}`,
        );
        console.log(
            `[8E-9] 60 FPS distance hierarchy ${hierarchy60Passed ? "PASS" : "FAIL"}`,
        );
        console.log(
            `[8E-9] 120 FPS distance hierarchy ${hierarchy120Passed ? "PASS" : "FAIL"}`,
        );
        console.log(
            `[8E-9] Maximum distance deviation ${maximumDeviationPercent.toFixed(4)}%`,
        );
        console.log(
            `[8E-9] 30/60/120 FPS Stability: ${passed ? "PASS" : "FAIL"}`,
        );

        if (!passed) {
            throw new Error(
                "Phase 8E-9 30/60/120 FPS Stability validation failed.",
            );
        }

        return {
            tolerancePercent: this.tolerancePercent,
            cases: results,
            hierarchy30Passed,
            hierarchy60Passed,
            hierarchy120Passed,
            allFinitePassed,
            passed,
            maximumDeviationPercent,
        };
    }

    private simulate(
        surfaceResistance: number,
        representativeWaterDepth: number,
        outerDeltaTime: number,
    ): SimulatedShot {
        const interaction =
            new BallWaterInteraction();
        const sample =
            this.createFullCoverageSample(
                representativeWaterDepth,
            );

        let speed = this.referenceSpeed;
        let distance = 0;
        let elapsed = 0;

        while (
            speed > 0 &&
            elapsed < this.maximumSimulationSeconds
        ) {
            let remainingOuterTime =
                outerDeltaTime;

            while (
                remainingOuterTime > 1e-12 &&
                speed > 0 &&
                elapsed < this.maximumSimulationSeconds
            ) {
                const physicsDeltaTime =
                    Math.min(
                        this.internalPhysicsStep,
                        remainingOuterTime,
                    );

                const state =
                    interaction.update(
                        sample,
                        physicsDeltaTime,
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
                        distance: Number.NaN,
                        stopTime: Number.NaN,
                    };
                }

                const timeToStop =
                    speed / deceleration;

                const stepDuration =
                    Math.min(
                        physicsDeltaTime,
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
                remainingOuterTime -=
                    physicsDeltaTime;

                if (
                    stepDuration <
                    physicsDeltaTime
                ) {
                    break;
                }
            }
        }

        return {
            distance,
            stopTime: elapsed,
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
                depth > 0 ? 1 : 0,
            averageVelocityX: 0,
            averageVelocityY: 0,
            sampleCount: 9,
            coveredSampleCount:
                depth > 0 ? 9 : 0,
        };
    }

    private percentageDifference(
        value: number,
        reference: number,
    ): number {
        if (
            !Number.isFinite(value) ||
            !Number.isFinite(reference) ||
            reference <= 0
        ) {
            return Number.NaN;
        }

        return (
            Math.abs(value - reference) /
            reference *
            100
        );
    }

    private hasStrictDistanceHierarchy(
        distances: readonly number[],
    ): boolean {
        if (
            distances.length < 2 ||
            !distances.every(Number.isFinite)
        ) {
            return false;
        }

        for (
            let index = 1;
            index < distances.length;
            index += 1
        ) {
            if (
                distances[index] >=
                distances[index - 1]
            ) {
                return false;
            }
        }

        return true;
    }
}

/**
 * Phase 8E-7 gameplay thresholds for Ball entry splashes.
 *
 * This definition is physics/event data only. Rendering, particles, droplets,
 * and ripples consume the emitted event later in Phase 8I.
 */
export interface BallWaterSplashDefinition {
    readonly minimumSplashDepth: number;
    readonly rearmDepth: number;
    readonly minimumSplashSpeed: number;
    readonly fullIntensitySpeed: number;
    readonly fullIntensityDepth: number;
    readonly minimumCoverage: number;
    readonly speedWeight: number;
    readonly depthWeight: number;
    readonly coverageWeight: number;
}

export const DEFAULT_BALL_WATER_SPLASH_DEFINITION:
    BallWaterSplashDefinition = {
    minimumSplashDepth: 0.012,
    rearmDepth: 0.006,
    minimumSplashSpeed: 80,
    fullIntensitySpeed: 900,
    fullIntensityDepth: 0.12,
    minimumCoverage: 0.10,
    speedWeight: 0.65,
    depthWeight: 0.25,
    coverageWeight: 0.10,
};

export function validateBallWaterSplashDefinition(
    definition: BallWaterSplashDefinition,
): void {
    const values = [
        definition.minimumSplashDepth,
        definition.rearmDepth,
        definition.minimumSplashSpeed,
        definition.fullIntensitySpeed,
        definition.fullIntensityDepth,
        definition.minimumCoverage,
        definition.speedWeight,
        definition.depthWeight,
        definition.coverageWeight,
    ];

    if (!values.every(Number.isFinite)) {
        throw new Error("BallWaterSplash definition values must be finite.");
    }

    if (
        definition.minimumSplashDepth <= 0 ||
        definition.rearmDepth < 0 ||
        definition.rearmDepth >= definition.minimumSplashDepth
    ) {
        throw new Error(
            "BallWaterSplash rearmDepth must be non-negative and below minimumSplashDepth.",
        );
    }

    if (
        definition.minimumSplashSpeed < 0 ||
        definition.fullIntensitySpeed <= definition.minimumSplashSpeed
    ) {
        throw new Error(
            "BallWaterSplash fullIntensitySpeed must exceed minimumSplashSpeed.",
        );
    }

    if (definition.fullIntensityDepth <= definition.minimumSplashDepth) {
        throw new Error(
            "BallWaterSplash fullIntensityDepth must exceed minimumSplashDepth.",
        );
    }

    if (
        definition.minimumCoverage < 0 ||
        definition.minimumCoverage > 1
    ) {
        throw new Error(
            "BallWaterSplash minimumCoverage must be in [0, 1].",
        );
    }

    const weightSum =
        definition.speedWeight +
        definition.depthWeight +
        definition.coverageWeight;

    if (
        definition.speedWeight < 0 ||
        definition.depthWeight < 0 ||
        definition.coverageWeight < 0 ||
        Math.abs(weightSum - 1) > 1e-6
    ) {
        throw new Error(
            "BallWaterSplash intensity weights must be non-negative and sum to 1.",
        );
    }
}

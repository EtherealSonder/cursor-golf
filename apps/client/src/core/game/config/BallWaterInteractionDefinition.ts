/**
 * Phase 8E-2 gameplay contract for interpreting standing-Water sampled under
 * the Ball. These values describe Water-specific response only. Existing
 * SurfaceSystem rolling resistance remains authoritative for terrain state.
 */
export interface BallWaterInteractionDefinition {
    /** Wet-sample depth at or below which standing Water has no Ball effect. */
    readonly minimumMeaningfulDepth: number;

    /** Wet-sample depth at which the depth contribution reaches full effect.
     * Tuned in 8E-5 against the normal gameplay puddle range. */
    readonly fullEffectDepth: number;

    /** Curve applied after depth normalization. Values > 1 soften shallow Water. */
    readonly depthExponent: number;

    /** Maximum additive rolling-resistance contribution produced by Water. */
    readonly maximumAdditionalResistance: number;

    /** Phase 8E-6 exponential response rate while Water exposure is increasing. */
    readonly entrySmoothingRate: number;

    /** Phase 8E-6 exponential response rate while Water exposure is decreasing. */
    readonly exitSmoothingRate: number;
}

export const DEFAULT_BALL_WATER_INTERACTION_DEFINITION:
    BallWaterInteractionDefinition = {
    minimumMeaningfulDepth: 0.012,
    fullEffectDepth: 0.12,
    depthExponent: 1.15,
    maximumAdditionalResistance: 1.10,
    entrySmoothingRate: 18,
    exitSmoothingRate: 12,
};

export function validateBallWaterInteractionDefinition(
    definition: BallWaterInteractionDefinition,
): void {
    const finiteValues = [
        definition.minimumMeaningfulDepth,
        definition.fullEffectDepth,
        definition.depthExponent,
        definition.maximumAdditionalResistance,
        definition.entrySmoothingRate,
        definition.exitSmoothingRate,
    ];

    if (!finiteValues.every(Number.isFinite)) {
        throw new Error(
            "BallWaterInteraction definition values must be finite.",
        );
    }

    if (definition.minimumMeaningfulDepth < 0) {
        throw new Error(
            "BallWaterInteraction minimumMeaningfulDepth must be non-negative.",
        );
    }

    if (definition.fullEffectDepth <= definition.minimumMeaningfulDepth) {
        throw new Error(
            "BallWaterInteraction fullEffectDepth must be greater than minimumMeaningfulDepth.",
        );
    }

    if (definition.depthExponent <= 0) {
        throw new Error(
            "BallWaterInteraction depthExponent must be greater than zero.",
        );
    }

    if (definition.maximumAdditionalResistance < 0) {
        throw new Error(
            "BallWaterInteraction maximumAdditionalResistance must be non-negative.",
        );
    }

    if (
        definition.entrySmoothingRate <= 0 ||
        definition.exitSmoothingRate <= 0
    ) {
        throw new Error(
            "BallWaterInteraction smoothing rates must be greater than zero.",
        );
    }
}

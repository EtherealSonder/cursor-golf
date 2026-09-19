export enum BallWaterDepthSeverity {
    Dry = "dry",
    Shallow = "shallow",
    Moderate = "moderate",
    Deep = "deep",
}

export interface BallWaterDepthSeverityThresholds {
    readonly shallowUpperNormalizedDepth: number;
    readonly moderateUpperNormalizedDepth: number;
}

/**
 * Semantic classification only.
 *
 * Physics remains continuous and must not branch on these labels. The labels
 * exist so gameplay, diagnostics, VFX, and future hazard systems share one
 * vocabulary for authoritative normalized standing-Water depth.
 */
export function classifyBallWaterDepthSeverity(
    normalizedDepth: number,
    isMeaningfullyWet: boolean,
    thresholds: BallWaterDepthSeverityThresholds,
): BallWaterDepthSeverity {
    if (
        !isMeaningfullyWet ||
        !Number.isFinite(normalizedDepth) ||
        normalizedDepth <= 0
    ) {
        return BallWaterDepthSeverity.Dry;
    }

    const depth = Math.max(
        0,
        Math.min(1, normalizedDepth),
    );

    if (depth < thresholds.shallowUpperNormalizedDepth) {
        return BallWaterDepthSeverity.Shallow;
    }

    if (depth < thresholds.moderateUpperNormalizedDepth) {
        return BallWaterDepthSeverity.Moderate;
    }

    return BallWaterDepthSeverity.Deep;
}

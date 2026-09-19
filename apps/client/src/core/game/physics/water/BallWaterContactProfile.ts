import type {
    BallWaterDepthSeverity,
} from "./BallWaterDepthSeverity";

export interface BallWaterContactProfile {
    /** Average depth across only Ball-footprint samples that contain Water. */
    readonly representativeDepth: number;

    /** Authoritative standing-Water depth normalized into [0, 1]. */
    readonly normalizedDepth: number;

    /** Fraction of the Ball footprint currently covered by standing Water. */
    readonly coverage: number;

    /** Current authoritative temporally-smoothed Water exposure in [0, 1]. */
    readonly exposure: number;

    /** Semantic depth label. Physics must not branch on this classification. */
    readonly severity: BallWaterDepthSeverity;

    /** Continuous meaningful standing-Water contact duration in seconds. */
    readonly contactTime: number;
}

export function createBallWaterContactProfile(
    representativeDepth: number,
    normalizedDepth: number,
    coverage: number,
    exposure: number,
    severity: BallWaterDepthSeverity,
    contactTime: number,
): BallWaterContactProfile {
    return {
        representativeDepth: finiteNonNegative(representativeDepth),
        normalizedDepth: clamp01(normalizedDepth),
        coverage: clamp01(coverage),
        exposure: clamp01(exposure),
        severity,
        contactTime: finiteNonNegative(contactTime),
    };
}

function finiteNonNegative(value: number): number {
    return Number.isFinite(value)
        ? Math.max(0, value)
        : 0;
}

function clamp01(value: number): number {
    return Math.max(
        0,
        Math.min(
            1,
            Number.isFinite(value) ? value : 0,
        ),
    );
}

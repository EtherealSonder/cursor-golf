/**
 * Phase 8E-1 fixed-footprint sampling configuration for standing Water under
 * the golf Ball. The offsets are normalized by Ball radius, so this remains
 * independent from the Ball's current 10 px physical radius.
 */
export interface BallWaterSampleOffset {
    readonly x: number;
    readonly y: number;
}

export interface BallWaterSamplingDefinition {
    /** Depth at or above which a footprint sample counts as Water-covered. */
    readonly coverageDepthThreshold: number;

    /**
     * Fixed normalized sample offsets inside the circular Ball footprint.
     * (0, 0) is the Ball center. An offset magnitude of 1 lies on its edge.
     */
    readonly sampleOffsets: readonly BallWaterSampleOffset[];
}

const INNER_RING_RADIUS = 0.72;
const DIAGONAL = INNER_RING_RADIUS / Math.SQRT2;

export const DEFAULT_BALL_WATER_SAMPLING_DEFINITION:
    BallWaterSamplingDefinition = {
    coverageDepthThreshold: 0.0001,
    sampleOffsets: [
        { x: 0, y: 0 },
        { x: INNER_RING_RADIUS, y: 0 },
        { x: DIAGONAL, y: DIAGONAL },
        { x: 0, y: INNER_RING_RADIUS },
        { x: -DIAGONAL, y: DIAGONAL },
        { x: -INNER_RING_RADIUS, y: 0 },
        { x: -DIAGONAL, y: -DIAGONAL },
        { x: 0, y: -INNER_RING_RADIUS },
        { x: DIAGONAL, y: -DIAGONAL },
    ],
};

export function validateBallWaterSamplingDefinition(
    definition: BallWaterSamplingDefinition,
): void {
    if (
        !Number.isFinite(definition.coverageDepthThreshold) ||
        definition.coverageDepthThreshold < 0
    ) {
        throw new Error(
            "BallWaterSampling coverageDepthThreshold must be finite and non-negative.",
        );
    }

    if (definition.sampleOffsets.length === 0) {
        throw new Error(
            "BallWaterSampling requires at least one fixed footprint sample.",
        );
    }

    for (const offset of definition.sampleOffsets) {
        if (!Number.isFinite(offset.x) || !Number.isFinite(offset.y)) {
            throw new Error(
                "BallWaterSampling offsets must contain only finite values.",
            );
        }

        if (Math.hypot(offset.x, offset.y) > 1 + 1e-9) {
            throw new Error(
                "BallWaterSampling offsets must remain inside the normalized Ball footprint.",
            );
        }
    }
}

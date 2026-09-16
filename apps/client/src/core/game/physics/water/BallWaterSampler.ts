import {
    DEFAULT_BALL_WATER_SAMPLING_DEFINITION,
    validateBallWaterSamplingDefinition,
} from "../../config/BallWaterSamplingDefinition";

import type {
    BallWaterSamplingDefinition,
} from "../../config/BallWaterSamplingDefinition";

import type {
    WaterField,
} from "../../environment/WaterField";

export interface BallWaterSample {
    readonly averageDepth: number;
    readonly maximumDepth: number;
    readonly coveredFraction: number;
    readonly averageVelocityX: number;
    readonly averageVelocityY: number;
    readonly sampleCount: number;
    readonly coveredSampleCount: number;
}

/**
 * Phase 8E-1 query adapter between continuous Ball geometry and WaterField.
 *
 * Cost is O(S), where S is the fixed number of configured footprint samples.
 * It never scans WaterField cells or WaterField sparse-active collections.
 */
export class BallWaterSampler {
    private readonly waterField: WaterField;
    private readonly definition: BallWaterSamplingDefinition;

    constructor(
        waterField: WaterField,
        definition: BallWaterSamplingDefinition =
            DEFAULT_BALL_WATER_SAMPLING_DEFINITION,
    ) {
        validateBallWaterSamplingDefinition(definition);

        this.waterField = waterField;
        this.definition = definition;
    }

    public sample(
        centerX: number,
        centerY: number,
        radius: number,
    ): BallWaterSample {
        if (
            !Number.isFinite(centerX) ||
            !Number.isFinite(centerY) ||
            !Number.isFinite(radius) ||
            radius <= 0
        ) {
            return this.createEmptySample();
        }

        let depthSum = 0;
        let maximumDepth = 0;
        let coveredSampleCount = 0;

        // Water velocity is depth-weighted so a trace film cannot dominate a
        // deeper body of Water touching another part of the Ball footprint.
        let velocityWeight = 0;
        let weightedVelocityX = 0;
        let weightedVelocityY = 0;

        for (const offset of this.definition.sampleOffsets) {
            const sampleX = centerX + offset.x * radius;
            const sampleY = centerY + offset.y * radius;

            const depth = this.waterField.getDepthAt(sampleX, sampleY);

            depthSum += depth;
            maximumDepth = Math.max(maximumDepth, depth);

            if (depth >= this.definition.coverageDepthThreshold) {
                coveredSampleCount += 1;
            }

            if (depth > 0) {
                const velocity = this.waterField.getVelocityAt(
                    sampleX,
                    sampleY,
                );

                weightedVelocityX += velocity.x * depth;
                weightedVelocityY += velocity.y * depth;
                velocityWeight += depth;
            }
        }

        const sampleCount = this.definition.sampleOffsets.length;

        return {
            averageDepth: depthSum / sampleCount,
            maximumDepth,
            coveredFraction: coveredSampleCount / sampleCount,
            averageVelocityX:
                velocityWeight > 0
                    ? weightedVelocityX / velocityWeight
                    : 0,
            averageVelocityY:
                velocityWeight > 0
                    ? weightedVelocityY / velocityWeight
                    : 0,
            sampleCount,
            coveredSampleCount,
        };
    }

    private createEmptySample(): BallWaterSample {
        return {
            averageDepth: 0,
            maximumDepth: 0,
            coveredFraction: 0,
            averageVelocityX: 0,
            averageVelocityY: 0,
            sampleCount: this.definition.sampleOffsets.length,
            coveredSampleCount: 0,
        };
    }
}

import {
    DEFAULT_BALL_WATER_SAMPLING_DEFINITION,
} from "../config/BallWaterSamplingDefinition";

import {
    DEFAULT_WATER_FIELD_DEFINITION,
} from "../config/WaterFieldDefinition";

import {
    WaterField,
} from "../environment/WaterField";

import {
    BallWaterSampler,
} from "../physics/water/BallWaterSampler";

import type {
    CourseBoundaryDefinition,
} from "../config/CourseBoundaryDefinition";

/** Phase 8E-1 deterministic acceptance checks for Ball-footprint Water queries. */
export class BallWaterSamplingValidation {
    private readonly ballRadius = 10;
    private readonly centerX = 60;
    private readonly centerY = 60;

    public run(): void {
        const results: Array<{ readonly name: string; readonly passed: boolean }> = [
            { name: "Dry footprint", passed: this.validateDryFootprint() },
            { name: "Centre Water", passed: this.validateCenterWater() },
            { name: "Edge Water", passed: this.validateEdgeWater() },
            { name: "Partial coverage", passed: this.validatePartialCoverage() },
            { name: "Full coverage", passed: this.validateFullCoverage() },
            { name: "Depth response", passed: this.validateDepthResponse() },
            { name: "Grid-boundary continuity", passed: this.validateGridBoundaryContinuity() },
            { name: "Adjacent Water rejection", passed: this.validateAdjacentWaterRejection() },
            { name: "Velocity averaging", passed: this.validateVelocityAveraging() },
            { name: "Finite sample state", passed: this.validateFiniteSampleState() },
        ];

        for (const result of results) {
            console.log(
                `[8E-1] ${result.name} ${result.passed ? "PASS" : "FAIL"}`,
            );
        }

        const passed = results.every((result): boolean => result.passed);

        console.log(
            `[8E-1] Ball Water Sampling: ${passed ? "PASS" : "FAIL"}`,
        );

        if (!passed) {
            throw new Error(
                "Phase 8E-1 Ball Water Sampling validation failed.",
            );
        }
    }

    private createField(): WaterField {
        const boundary: CourseBoundaryDefinition = {
            minimumX: 0,
            minimumY: 0,
            maximumX: 128,
            maximumY: 128,
        };

        return new WaterField(
            DEFAULT_WATER_FIELD_DEFINITION,
            boundary,
        );
    }

    private createSampler(field: WaterField): BallWaterSampler {
        return new BallWaterSampler(field);
    }

    private validateDryFootprint(): boolean {
        const field = this.createField();
        const sample = this.createSampler(field).sample(
            this.centerX,
            this.centerY,
            this.ballRadius,
        );

        return sample.averageDepth === 0 &&
            sample.maximumDepth === 0 &&
            sample.coveredFraction === 0 &&
            sample.coveredSampleCount === 0;
    }

    private validateCenterWater(): boolean {
        const field = this.createField();
        field.injectWater(this.centerX, this.centerY, 1);

        const sample = this.createSampler(field).sample(
            this.centerX,
            this.centerY,
            this.ballRadius,
        );

        return field.getDepthAt(this.centerX, this.centerY) > 0 &&
            sample.maximumDepth > 0 &&
            sample.coveredFraction > 0 &&
            sample.coveredFraction < 1;
    }

    private validateEdgeWater(): boolean {
        const field = this.createField();
        const edgeX = this.centerX + this.ballRadius * 0.72;
        const edgeY = this.centerY;

        field.injectWater(edgeX, edgeY, 1);

        const sample = this.createSampler(field).sample(
            this.centerX,
            this.centerY,
            this.ballRadius,
        );

        return field.getDepthAt(this.centerX, this.centerY) === 0 &&
            sample.maximumDepth > 0 &&
            sample.coveredFraction > 0;
    }

    private validatePartialCoverage(): boolean {
        const field = this.createField();
        field.injectWater(this.centerX, this.centerY, 0.8);
        field.injectWater(this.centerX + 7.2, this.centerY, 0.8);
        field.injectWater(this.centerX, this.centerY + 7.2, 0.8);

        const sample = this.createSampler(field).sample(
            this.centerX,
            this.centerY,
            this.ballRadius,
        );

        return sample.coveredFraction > 0 && sample.coveredFraction < 1;
    }

    private validateFullCoverage(): boolean {
        const field = this.createField();

        for (const offset of DEFAULT_BALL_WATER_SAMPLING_DEFINITION.sampleOffsets) {
            field.injectWater(
                this.centerX + offset.x * this.ballRadius,
                this.centerY + offset.y * this.ballRadius,
                0.5,
            );
        }

        const sample = this.createSampler(field).sample(
            this.centerX,
            this.centerY,
            this.ballRadius,
        );

        return sample.coveredSampleCount === sample.sampleCount &&
            this.nearlyEqual(sample.coveredFraction, 1);
    }

    private validateDepthResponse(): boolean {
        const shallowField = this.createField();
        shallowField.injectWater(this.centerX, this.centerY, 0.25);
        const shallow = this.createSampler(shallowField).sample(
            this.centerX,
            this.centerY,
            this.ballRadius,
        );

        const deepField = this.createField();
        deepField.injectWater(this.centerX, this.centerY, 1.5);
        const deep = this.createSampler(deepField).sample(
            this.centerX,
            this.centerY,
            this.ballRadius,
        );

        return deep.averageDepth > shallow.averageDepth &&
            deep.maximumDepth > shallow.maximumDepth;
    }

    private validateGridBoundaryContinuity(): boolean {
        const field = this.createField();

        // Build a compact Water patch wider than the Ball footprint so moving
        // the Ball center across an 8 px grid boundary cannot make coverage
        // disappear merely because the center changed cells.
        for (let x = 40; x <= 80; x += 8) {
            for (let y = 40; y <= 80; y += 8) {
                field.injectWater(x + 1, y + 1, 0.5);
            }
        }

        const sampler = this.createSampler(field);
        const left = sampler.sample(63.9, 60, this.ballRadius);
        const right = sampler.sample(64.1, 60, this.ballRadius);

        return left.coveredFraction > 0 &&
            right.coveredFraction > 0 &&
            Math.abs(left.coveredFraction - right.coveredFraction) <= 2 / left.sampleCount;
    }

    private validateAdjacentWaterRejection(): boolean {
        const field = this.createField();

        // This point is more than one Ball radius away and lies in a cell that
        // none of the fixed footprint samples can touch.
        field.injectWater(
            this.centerX + this.ballRadius + 12,
            this.centerY,
            1,
        );

        const sample = this.createSampler(field).sample(
            this.centerX,
            this.centerY,
            this.ballRadius,
        );

        return sample.coveredFraction === 0 && sample.maximumDepth === 0;
    }

    private validateVelocityAveraging(): boolean {
        const field = this.createField();

        field.injectWaterWithMomentum(
            this.centerX,
            this.centerY,
            1,
            100,
            20,
        );

        field.injectWaterWithMomentum(
            this.centerX + 7.2,
            this.centerY,
            0.5,
            40,
            -10,
        );

        const sample = this.createSampler(field).sample(
            this.centerX,
            this.centerY,
            this.ballRadius,
        );

        return Number.isFinite(sample.averageVelocityX) &&
            Number.isFinite(sample.averageVelocityY) &&
            sample.averageVelocityX > 0;
    }

    private validateFiniteSampleState(): boolean {
        const field = this.createField();
        const sample = this.createSampler(field).sample(
            this.centerX,
            this.centerY,
            this.ballRadius,
        );

        return [
            sample.averageDepth,
            sample.maximumDepth,
            sample.coveredFraction,
            sample.averageVelocityX,
            sample.averageVelocityY,
            sample.sampleCount,
            sample.coveredSampleCount,
        ].every(Number.isFinite);
    }

    private nearlyEqual(a: number, b: number, epsilon = 1e-6): boolean {
        return Math.abs(a - b) <= epsilon;
    }
}

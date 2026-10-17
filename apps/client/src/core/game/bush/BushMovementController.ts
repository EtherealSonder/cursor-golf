import { BUSH_MOVEMENT_DEFINITION } from "./BushMovementDefinition";
import { BushImpactController } from "./BushImpactController";
import type { BushPoint } from "./BushGeometryDefinition";

/** Supplies read-only union traversal coverage from the current active bushes. */
export type BushTraversalCoverageQuery = (center: BushPoint, radius: number) => number;

/** B3: additive, frame-rate-independent rolling deceleration. Ball owns its velocity. */
export class BushMovementController {
    public readonly impact: BushImpactController;
    public constructor(private readonly queryCoverage: BushTraversalCoverageQuery, private readonly onImpact?: () => void) {
        this.impact = new BushImpactController(queryCoverage);
    }

    public synchronize(center: BushPoint, radius: number): void { this.impact.synchronize(center, radius); }
    public isInside(center: BushPoint, radius: number): boolean { return this.impact.isInside(center, radius); }
    public onShotInside(): void { this.onImpact?.(); }

    /** Returns one-time speed retention when entering, otherwise 1. */
    public getEntryVelocityRetention(center: BushPoint, radius: number): number {
        if (!this.impact.update(center, radius)) return 1;
        this.onImpact?.();
        return BUSH_MOVEMENT_DEFINITION.entryVelocityRetention;
    }

    public getAdditionalRollingDeceleration(center: BushPoint, radius: number, baseRollingDeceleration: number): number {
        if (!(radius > 0) || !(baseRollingDeceleration > 0)) return 0;
        const rawCoverage = this.queryCoverage(center, radius);
        if (!Number.isFinite(rawCoverage)) return 0;
        const coverage = Math.max(0, Math.min(BUSH_MOVEMENT_DEFINITION.maximumCoverage, rawCoverage));
        // The outer edge must remain penetrable even at high incoming speed.
        // Full bush drag starts once the ball is almost completely surrounded.
        const resistanceScale = coverage >= BUSH_MOVEMENT_DEFINITION.fullResistanceCoverageThreshold
            ? 1
            : BUSH_MOVEMENT_DEFINITION.partialEntryResistanceMultiplier;
        return baseRollingDeceleration * BUSH_MOVEMENT_DEFINITION.additionalRollingDecelerationMultiplier *
            resistanceScale * Math.pow(coverage, BUSH_MOVEMENT_DEFINITION.coverageExponent);
    }
}

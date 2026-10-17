import type { BushPoint } from "./BushGeometryDefinition";
import { BUSH_MOVEMENT_DEFINITION } from "./BushMovementDefinition";
import type { BushTraversalCoverageQuery } from "./BushMovementController";

/** Stateful crossing detector. It never owns or directly changes Ball velocity. */
export class BushImpactController {
    private inside = false;
    private initialized = false;
    public constructor(private readonly coverageQuery: BushTraversalCoverageQuery) {}

    private coverage(center: BushPoint, radius: number): number {
        const value = this.coverageQuery(center, radius);
        return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    }

    /** Sync when the ball is teleported, reset, or launches from rest. */
    public synchronize(center: BushPoint, radius: number): void {
        this.inside = this.coverage(center, radius) >= BUSH_MOVEMENT_DEFINITION.entryCoverageThreshold;
        this.initialized = true;
    }

    /** Returns true once at near-complete ball coverage, rearming only after exit. */
    public update(center: BushPoint, radius: number): boolean {
        const coverage = this.coverage(center, radius);
        if (!this.initialized) {
            this.synchronize(center, radius);
            return false;
        }
        if (this.inside) {
            if (coverage <= BUSH_MOVEMENT_DEFINITION.exitCoverageThreshold) this.inside = false;
            return false;
        }
        if (coverage >= BUSH_MOVEMENT_DEFINITION.entryCoverageThreshold) {
            this.inside = true;
            return true;
        }
        return false;
    }

    public isInside(center: BushPoint, radius: number): boolean {
        return this.coverage(center, radius) >= BUSH_MOVEMENT_DEFINITION.entryCoverageThreshold;
    }
}

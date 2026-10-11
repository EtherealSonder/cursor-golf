import { fractionOutsideFootprint, findFirstOutsideThresholdCrossing } from "../level/CourseBoundaryFootprintQuery";
import { containsCoursePoint } from "../level/CourseGeometryQueries";
import type { GeneratedCourseGeometry } from "../level/LevelRuntimeDefinition";
import type { GameplayCourseDefinition } from "../config/GameplayCourseDefinition";

export type BallOutOfBoundsState = "inside" | "deathRequested";

export interface BallOutOfBoundsUpdate {
    readonly state: BallOutOfBoundsState;
    readonly fallProgress: number;
    readonly requestDeath: boolean;
}

/**
 * D-5 gameplay OOB detection. The shared death iris now owns death
 * presentation, so leaving the authored course requests death immediately.
 */
export class BallOutOfBoundsController {
    private state: BallOutOfBoundsState = "inside";
    private previousPosition: {x: number; y: number} | null = null;
    private crossing: {x: number; y: number; fraction: number} | null = null;
    public getLastCrossing(): Readonly<{x: number; y: number; fraction: number}> | null { return this.crossing; }

    public constructor(
        private readonly definition: GameplayCourseDefinition,
        private readonly polygonGeometry?: GeneratedCourseGeometry,
    ) {}

    public update(
        x: number,
        y: number,
        _deltaTime: number,
        radius = 0,
    ): BallOutOfBoundsUpdate {
        // A physical radius is required. Do not silently fall back to a center-only check.
        if (!(radius > 0) || !Number.isFinite(radius)) {
            throw new Error("Ball OOB evaluation requires the physical collision radius.");
        }
        const contains = (px: number, py: number) => this.isInsideGameplayCourse(px, py);
        const previous = this.previousPosition ?? {x, y};
        this.previousPosition = {x, y};
        if (this.state === "inside") {
            // Never kill a ball that has returned inside after a transient physics step.
            // The swept query refines the crossing only when the resolved end pose is lethal.
            const finalOutside = fractionOutsideFootprint(contains, {kind: "circle", x, y, radius}, 41);
            const crossing = finalOutside > 0.8 + 1e-6
                ? findFirstOutsideThresholdCrossing(contains, previous, {x, y}, radius, 0.8)
                    ?? {x, y, fraction: finalOutside}
                : null;
            if (crossing) {
                this.crossing = crossing;
                this.state = "deathRequested";
                return {state: this.state, fallProgress: 0, requestDeath: true};
            }
        }

        return {
            state: this.state,
            fallProgress: 0,
            requestDeath: false,
        };
    }

    public isInsideGameplayCourse(x: number, y: number): boolean {
        if (this.polygonGeometry) {
            return containsCoursePoint(this.polygonGeometry, { x, y });
        }
        return (
            x >= this.definition.minimumX &&
            x <= this.definition.maximumX &&
            y >= this.definition.minimumY &&
            y <= this.definition.maximumY
        );
    }

    public reset(): void {
        this.state = "inside";
        this.previousPosition = null;
        this.crossing = null;
    }

    public getState(): BallOutOfBoundsState {
        return this.state;
    }
}

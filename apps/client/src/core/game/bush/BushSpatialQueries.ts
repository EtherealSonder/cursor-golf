import { BUSH_DEFINITION } from "./BushDefinition";
import { BushGeometry } from "./BushGeometry";
import type { BushCoverage, BushPoint } from "./BushGeometryDefinition";

/** Union sampling prevents double-counting when multiple bushes overlap. */
export class BushSpatialQueries {
    public static nearby(bushes: readonly BushGeometry[], center: BushPoint, radius = 0): BushGeometry[] {
        return bushes.filter((b) => center.x + radius >= b.bounds.minX && center.x - radius <= b.bounds.maxX && center.y + radius >= b.bounds.minY && center.y - radius <= b.bounds.maxY);
    }

    public static pointInside(bushes: readonly BushGeometry[], point: BushPoint, inset = 0): boolean {
        return this.nearby(bushes, point).some((b) => b.contains(point, inset));
    }

    public static circleCoverage(bushes: readonly BushGeometry[], center: BushPoint, radius: number, inset = 0): number {
        const nearby = this.nearby(bushes, center, radius);
        if (!nearby.length) return 0;
        if (radius <= 0) return nearby.some((b) => b.contains(center, inset)) ? 1 : 0;
        const count = BUSH_DEFINITION.ballCoverageSamples;
        let total = 0, covered = 0;
        for (let y = 0; y < count; y++) for (let x = 0; x < count; x++) {
            const dx = ((x + 0.5) / count * 2 - 1) * radius;
            const dy = ((y + 0.5) / count * 2 - 1) * radius;
            if (dx*dx + dy*dy > radius*radius) continue;
            total++;
            if (nearby.some((b) => b.contains({ x: center.x + dx, y: center.y + dy }, inset))) covered++;
        }
        return total ? covered / total : 0;
    }

    public static coverage(bushes: readonly BushGeometry[], center: BushPoint, radius: number): BushCoverage {
        return {
            traversal: this.circleCoverage(bushes, center, radius, BUSH_DEFINITION.traversalInset),
            concealment: this.circleCoverage(bushes, center, radius, BUSH_DEFINITION.concealmentInset),
        };
    }
}

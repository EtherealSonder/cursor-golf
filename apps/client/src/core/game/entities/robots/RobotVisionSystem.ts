import type { RobotInteractionEntry, RobotInteractionRegistry } from "./RobotInteractionRegistry";
import type { RobotTargetQuery } from "./RobotTargetQuery";

export interface RobotVisionCandidate {
    readonly target: RobotInteractionEntry;
    readonly distance: number;
    readonly angleDegrees: number;
    readonly visible: boolean;
    readonly blockingOccluderId: string | null;
}

export interface RobotVisionResult {
    readonly candidates: readonly RobotVisionCandidate[];
    readonly selectedTarget: RobotInteractionEntry | null;
}

/**
 * R-8.1 vision scan. The authored range is supplied by RobotDefinition.
 * Keep the cone angle unchanged while allowing the range to be tuned independently.
 */
export class RobotVisionSystem {
    public constructor(
        private readonly targetQuery: RobotTargetQuery,
        private readonly registry: RobotInteractionRegistry,
    ) {}

    /** Scan using an explicit world-space heading, used by impact investigation. */
    public scanHeading(
        originX: number, originY: number, headingRadians: number,
        range: number, halfAngleDegrees: number, excludedId?: string,
    ): RobotVisionResult {
        return this.scan(
            originX, originY, Math.cos(headingRadians), Math.sin(headingRadians),
            range, halfAngleDegrees, excludedId,
        );
    }

    public scan(
        originX: number, originY: number, forwardX: number, forwardY: number,
        range: number, halfAngleDegrees: number, excludedId?: string,
    ): RobotVisionResult {
        const effectiveRange = Math.max(0, range);
        const candidates: RobotVisionCandidate[] = [];
        let selectedTarget: RobotInteractionEntry | null = null;
        let selectedDistance = Number.POSITIVE_INFINITY;
        const halfAngleRadians = halfAngleDegrees * Math.PI / 180;

        for (const target of this.targetQuery.getEligibleTargets(excludedId)) {
            const tx = target.getX(); const ty = target.getY();
            const dx = tx - originX; const dy = ty - originY;
            const distance = Math.hypot(dx, dy);
            if (distance <= 0.0001 || distance > effectiveRange) continue;
            const nx = dx / distance; const ny = dy / distance;
            const dot = Math.max(-1, Math.min(1, forwardX * nx + forwardY * ny));
            const angle = Math.acos(dot);
            if (angle > halfAngleRadians) continue;

            const blocker = this.findBlockingOccluder(originX, originY, tx, ty, target.id, excludedId);
            const visible = blocker === null;
            candidates.push({ target, distance, angleDegrees: angle * 180 / Math.PI, visible, blockingOccluderId: blocker?.id ?? null });
            // Preserve existing nearest-visible-target selection (including the Ball).
            if (visible && distance < selectedDistance) { selectedTarget = target; selectedDistance = distance; }
        }

        return { candidates, selectedTarget };
    }

    private findBlockingOccluder(
        ax: number, ay: number, bx: number, by: number,
        targetId: string, excludedId?: string,
    ): RobotInteractionEntry | null {
        let nearest: RobotInteractionEntry | null = null;
        let nearestT = Number.POSITIVE_INFINITY;
        for (const entry of this.registry.getVisionOccluders()) {
            if (entry.id === targetId || entry.id === excludedId) continue;
            const t = this.segmentHitT(ax, ay, bx, by, entry);
            if (t !== null && t > 0.001 && t < 0.999 && t < nearestT) { nearest = entry; nearestT = t; }
        }
        return nearest;
    }

    private segmentHitT(ax: number, ay: number, bx: number, by: number, entry: RobotInteractionEntry): number | null {
        const shape = entry.getShape?.() ?? entry.shape;
        if (shape.kind === "capsule") {
            const intersects = (t: number): boolean => {
                const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
                const dx = shape.x2 - shape.x1, dy = shape.y2 - shape.y1;
                const u = Math.max(0, Math.min(1, ((px - shape.x1) * dx + (py - shape.y1) * dy) / Math.max(1e-9, dx * dx + dy * dy)));
                return Math.hypot(px - shape.x1 - u * dx, py - shape.y1 - u * dy) <= shape.radius;
            };
            // Conservative continuous coverage: sample no farther apart than half the housing thickness.
            const count = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / Math.max(1, shape.radius * 0.5)));
            if (intersects(0)) return 0;
            for (let i = 1; i <= count; i++) {
                const t = i / count;
                if (!intersects(t)) continue;
                let lo = (i - 1) / count, hi = t;
                for (let k = 0; k < 10; k++) { const mid = (lo + hi) / 2; if (intersects(mid)) hi = mid; else lo = mid; }
                return hi;
            }
            return null;
        }
        if (shape.kind === "circle") {
            const dx = bx - ax; const dy = by - ay;
            const fx = ax - entry.getX(); const fy = ay - entry.getY();
            const a = dx * dx + dy * dy;
            const b = 2 * (fx * dx + fy * dy);
            const c = fx * fx + fy * fy - shape.radius * shape.radius;
            const discriminant = b * b - 4 * a * c;
            if (discriminant < 0 || a <= 0) return null;
            const root = Math.sqrt(discriminant);
            const t1 = (-b - root) / (2 * a); const t2 = (-b + root) / (2 * a);
            if (t1 >= 0 && t1 <= 1) return t1;
            if (t2 >= 0 && t2 <= 1) return t2;
            return null;
        }
        const angle = shape.kind === "orientedRectangle" ? shape.rotation : 0;
        const c = Math.cos(angle), sn = Math.sin(angle);
        const toLocal = (x: number, y: number) => ({ x: (x - entry.getX()) * c + (y - entry.getY()) * sn, y: -(x - entry.getX()) * sn + (y - entry.getY()) * c });
        const aLocal = toLocal(ax, ay), bLocal = toLocal(bx, by);
        ax = aLocal.x; ay = aLocal.y; bx = bLocal.x; by = bLocal.y;
        const minX = -shape.width / 2;
        const maxX = shape.width / 2;
        const minY = -shape.height / 2;
        const maxY = shape.height / 2;
        const dx = bx - ax; const dy = by - ay;
        let tMin = 0; let tMax = 1;
        for (const [p, q] of [[-dx, ax - minX], [dx, maxX - ax], [-dy, ay - minY], [dy, maxY - ay]] as const) {
            if (Math.abs(p) < 1e-9) { if (q < 0) return null; continue; }
            const r = q / p;
            if (p < 0) tMin = Math.max(tMin, r); else tMax = Math.min(tMax, r);
            if (tMin > tMax) return null;
        }
        return tMin;
    }
}

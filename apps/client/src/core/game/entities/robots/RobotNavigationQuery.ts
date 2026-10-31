import type { LevelNavigationBounds } from "../../level/LevelNavigationBounds";
import type { CourseBoundaryDefinition } from "../../config/CourseBoundaryDefinition";
import type { RobotInteractionEntry, RobotInteractionRegistry } from "./RobotInteractionRegistry";

export interface RobotNavigationPoint { readonly x: number; readonly y: number; }
export interface RobotDestinationResult { readonly point: RobotNavigationPoint | null; readonly attempts: number; }

/** R-4 navigation reads only entries explicitly classified NAVIGATION_BLOCKER. */
export class RobotNavigationQuery {
    public constructor(
        private readonly registry: RobotInteractionRegistry,
        private readonly courseBoundary: CourseBoundaryDefinition,
        private readonly excludedId?: string,
        private readonly playableBounds?: LevelNavigationBounds,
    ) {}

    public findDestination(centerX: number, centerY: number, roamRadius: number, clearanceRadius: number, maximumAttempts: number): RobotDestinationResult {
        for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
            const angle = Math.random() * Math.PI * 2;
            // Sample uniformly by area from the outer half of the roam disc.
            // This prevents tiny one/two-step destinations while preserving an
            // unbiased spatial distribution for Fire, Water and future Wind Robots.
            const minimumDistance = roamRadius * 0.5;
            const distance = Math.sqrt(
                minimumDistance * minimumDistance +
                Math.random() * (roamRadius * roamRadius - minimumDistance * minimumDistance),
            );
            const candidate = { x: centerX + Math.cos(angle) * distance, y: centerY + Math.sin(angle) * distance };
            if (this.isPositionClear(candidate.x, candidate.y, clearanceRadius)) return { point: candidate, attempts: attempt };
        }
        return { point: null, attempts: maximumAttempts };
    }


    /**
     * Finds the nearest practical clear point around a physically wedged Robot.
     * Recovery searches concentric rings so relocation stays local and uses the
     * same authoritative NAVIGATION_BLOCKER clearance test as normal roaming.
     */
    public findRecoveryPosition(
        centerX: number,
        centerY: number,
        clearanceRadius: number,
        minimumRadius: number,
        maximumRadius: number,
        radiusStep: number,
        attemptsPerRadius: number,
    ): RobotNavigationPoint | null {
        const safeMinimum = Math.max(clearanceRadius, minimumRadius);
        const safeMaximum = Math.max(safeMinimum, maximumRadius);
        const safeStep = Math.max(1, radiusStep);
        const attempts = Math.max(4, Math.floor(attemptsPerRadius));
        const phase = Math.random() * Math.PI * 2;

        for (let radius = safeMinimum; radius <= safeMaximum + 0.001; radius += safeStep) {
            for (let attempt = 0; attempt < attempts; attempt += 1) {
                const angle = phase + attempt / attempts * Math.PI * 2;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                if (this.isPositionClear(x, y, clearanceRadius)) return { x, y };
            }
        }

        return null;
    }

    public isPositionClear(x: number, y: number, clearanceRadius: number): boolean {
        if (x - clearanceRadius < this.courseBoundary.minimumX || x + clearanceRadius > this.courseBoundary.maximumX || y - clearanceRadius < this.courseBoundary.minimumY || y + clearanceRadius > this.courseBoundary.maximumY) return false;
        if (this.playableBounds && !this.playableBounds.containsCircle(x, y, clearanceRadius)) return false;
        for (const blocker of this.registry.getNavigationBlockers()) {
            if (blocker.id === this.excludedId) continue;
            if (this.intersects(x, y, clearanceRadius, blocker)) return false;
        }
        return true;
    }

    public isSegmentClear(
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        clearanceRadius: number,
    ): boolean {
        const distance = Math.hypot(x1 - x0, y1 - y0);
        const step = Math.max(4, clearanceRadius * 0.45);
        const count = Math.max(1, Math.ceil(distance / step));
        for (let index = 1; index <= count; index += 1) {
            const t = index / count;
            if (!this.isPositionClear(
                x0 + (x1 - x0) * t,
                y0 + (y1 - y0) * t,
                clearanceRadius,
            )) return false;
        }
        return true;
    }

    /** Steer outward from a navigation-only footprint when an impulse/spawn puts a robot inside. */
    public getEscapeDirection(x: number, y: number, clearanceRadius: number): RobotNavigationPoint | null {
        for (const blocker of this.registry.getNavigationBlockers()) {
            if (blocker.id === this.excludedId || !this.intersects(x, y, clearanceRadius, blocker)) continue;
            const cx = blocker.getX(), cy = blocker.getY();
            const shape = blocker.getShape?.() ?? blocker.shape;
            if (shape.kind === "capsule") {
                const dx = shape.x2 - shape.x1, dy = shape.y2 - shape.y1;
                const t = Math.max(0, Math.min(1, ((x - shape.x1) * dx + (y - shape.y1) * dy) / Math.max(1e-9, dx * dx + dy * dy)));
                const nx = x - (shape.x1 + t * dx), ny = y - (shape.y1 + t * dy);
                const length = Math.hypot(nx, ny);
                return length > 1e-5 ? { x: nx / length, y: ny / length } : { x: -dy / Math.max(1e-9, Math.hypot(dx, dy)), y: dx / Math.max(1e-9, Math.hypot(dx, dy)) };
            }
            if (shape.kind === "circle") {
                const dx = x - cx, dy = y - cy;
                const length = Math.hypot(dx, dy);
                return length > 0.001 ? { x: dx / length, y: dy / length } : { x: 1, y: 0 };
            }
            const angle = shape.kind === "orientedRectangle" ? shape.rotation : 0;
            const c = Math.cos(angle), sn = Math.sin(angle);
            const dx = x - cx, dy = y - cy;
            const lx = dx * c + dy * sn, ly = -dx * sn + dy * c;
            const remainingX = shape.width / 2 + clearanceRadius - Math.abs(lx);
            const remainingY = shape.height / 2 + clearanceRadius - Math.abs(ly);
            const ex = remainingX <= remainingY ? (lx < 0 ? -1 : 1) : 0;
            const ey = remainingX > remainingY ? (ly < 0 ? -1 : 1) : 0;
            return { x: ex * c - ey * sn, y: ex * sn + ey * c };
        }
        return null;
    }

    private intersects(x: number, y: number, radius: number, entry: RobotInteractionEntry): boolean {
        const shape = entry.getShape?.() ?? entry.shape;
        if (shape.kind === "capsule") {
            const dx = shape.x2 - shape.x1, dy = shape.y2 - shape.y1;
            const t = Math.max(0, Math.min(1, ((x - shape.x1) * dx + (y - shape.y1) * dy) / Math.max(1e-9, dx * dx + dy * dy)));
            return Math.hypot(x - (shape.x1 + t * dx), y - (shape.y1 + t * dy)) < radius + shape.radius;
        }
        if (shape.kind === "circle") {
            const dx = x - entry.getX(); const dy = y - entry.getY();
            const combined = radius + shape.radius;
            return dx * dx + dy * dy < combined * combined;
        }
        const angle = shape.kind === "orientedRectangle" ? shape.rotation : 0;
        const c = Math.cos(angle), sn = Math.sin(angle);
        const worldDx = x - entry.getX(), worldDy = y - entry.getY();
        const localX = worldDx * c + worldDy * sn;
        const localY = -worldDx * sn + worldDy * c;
        const halfWidth = shape.width / 2, halfHeight = shape.height / 2;
        const dx = localX - Math.max(-halfWidth, Math.min(localX, halfWidth));
        const dy = localY - Math.max(-halfHeight, Math.min(localY, halfHeight));
        return dx * dx + dy * dy < radius * radius;
    }
}

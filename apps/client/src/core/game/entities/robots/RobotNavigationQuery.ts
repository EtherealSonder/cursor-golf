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
        for (const blocker of this.registry.getNavigationBlockers()) {
            if (blocker.id === this.excludedId) continue;
            if (this.intersects(x, y, clearanceRadius, blocker)) return false;
        }
        return true;
    }

    private intersects(x: number, y: number, radius: number, entry: RobotInteractionEntry): boolean {
        if (entry.shape.kind === "circle") {
            const dx = x - entry.getX(); const dy = y - entry.getY();
            const combined = radius + entry.shape.radius;
            return dx * dx + dy * dy < combined * combined;
        }
        const halfWidth = entry.shape.width / 2; const halfHeight = entry.shape.height / 2;
        const closestX = Math.max(entry.getX() - halfWidth, Math.min(x, entry.getX() + halfWidth));
        const closestY = Math.max(entry.getY() - halfHeight, Math.min(y, entry.getY() + halfHeight));
        const dx = x - closestX; const dy = y - closestY;
        return dx * dx + dy * dy < radius * radius;
    }
}

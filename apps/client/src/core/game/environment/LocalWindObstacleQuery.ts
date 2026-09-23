import type { LocalWindObstacleDefinition } from "../config/LocalWindDefinition";
import type { StaticObstacleDefinition } from "../config/ObstacleDefinition";
import type { PhysicsWorld } from "../physics/PhysicsWorld";

export interface LocalWindObstacleResolution {
    readonly blocked: boolean;
    readonly multiplier: number;
    readonly directionX: number;
    readonly directionY: number;
}

/**
 * Cheap static-only obstruction query shared by Local Wind gameplay and VFX.
 * Dynamic bodies intentionally never block airflow.
 */
export class LocalWindObstacleQuery {
    public constructor(
        private readonly physicsWorld: PhysicsWorld,
        private readonly definition: LocalWindObstacleDefinition,
    ) {}

    public resolve(
        sourceX: number,
        sourceY: number,
        targetX: number,
        targetY: number,
        fallbackDirectionX: number,
        fallbackDirectionY: number,
    ): LocalWindObstacleResolution {
        if (!this.segmentBlocked(sourceX, sourceY, targetX, targetY)) {
            return { blocked: false, multiplier: 1, directionX: fallbackDirectionX, directionY: fallbackDirectionY };
        }

        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const length = Math.hypot(dx, dy);
        if (length <= 0.0001) {
            return { blocked: true, multiplier: 0, directionX: fallbackDirectionX, directionY: fallbackDirectionY };
        }

        const nx = dx / length;
        const ny = dy / length;
        const px = -ny;
        const py = nx;

        // Try a small shoulder path on either side. This is deliberately a
        // stylised edge-wrap approximation, not a fluid simulation.
        for (const sign of [1, -1]) {
            const shoulderX = targetX + px * this.definition.edgeWrapDistance * sign;
            const shoulderY = targetY + py * this.definition.edgeWrapDistance * sign;
            if (
                !this.segmentBlocked(sourceX, sourceY, shoulderX, shoulderY) &&
                !this.segmentBlocked(shoulderX, shoulderY, targetX, targetY)
            ) {
                const tangentX = targetX - shoulderX;
                const tangentY = targetY - shoulderY;
                const tangentLength = Math.hypot(tangentX, tangentY);
                return {
                    blocked: true,
                    multiplier: this.definition.edgeWrapStrengthMultiplier,
                    directionX: tangentLength > 0.0001 ? tangentX / tangentLength : fallbackDirectionX,
                    directionY: tangentLength > 0.0001 ? tangentY / tangentLength : fallbackDirectionY,
                };
            }
        }

        return { blocked: true, multiplier: 0, directionX: fallbackDirectionX, directionY: fallbackDirectionY };
    }

    public segmentBlocked(x0: number, y0: number, x1: number, y1: number): boolean {
        const distance = Math.hypot(x1 - x0, y1 - y0);
        const steps = Math.max(1, Math.ceil(distance / this.definition.sampleSpacing));
        const obstacles = this.physicsWorld.getRigidStaticDefinitions();
        for (let i = 1; i <= steps; i += 1) {
            const t = i / steps;
            const x = x0 + (x1 - x0) * t;
            const y = y0 + (y1 - y0) * t;
            for (const obstacle of obstacles) {
                if (this.contains(obstacle, x, y, this.definition.collisionTolerance)) return true;
            }
        }
        return false;
    }

    private contains(obstacle: StaticObstacleDefinition, x: number, y: number, padding: number): boolean {
        const lx = x - obstacle.positionX;
        const ly = y - obstacle.positionY;
        if (obstacle.shape === "circle") {
            const radius = obstacle.radius + padding;
            return lx * lx + ly * ly <= radius * radius;
        }
        if (obstacle.shape === "rectangle") {
            return Math.abs(lx) <= obstacle.width * 0.5 + padding && Math.abs(ly) <= obstacle.height * 0.5 + padding;
        }
        const [a, b, c] = obstacle.points;
        return this.pointInTriangle(lx, ly, a.x, a.y, b.x, b.y, c.x, c.y, padding);
    }

    private pointInTriangle(px: number, py: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, padding: number): boolean {
        const sign = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) =>
            (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
        const d1 = sign(px, py, ax, ay, bx, by);
        const d2 = sign(px, py, bx, by, cx, cy);
        const d3 = sign(px, py, cx, cy, ax, ay);
        const hasNeg = d1 < -padding || d2 < -padding || d3 < -padding;
        const hasPos = d1 > padding || d2 > padding || d3 > padding;
        return !(hasNeg && hasPos);
    }
}

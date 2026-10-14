import { PerformanceInvestigationCounters as P1 } from "../debug/PerformanceInvestigationCounters";
import type { CourseEnvironmentBoundary } from "../level/CourseEnvironmentBoundary";
import type { LocalWindObstacleDefinition } from "../config/LocalWindDefinition";
import type { StaticObstacleDefinition } from "../config/ObstacleDefinition";
import type { PhysicsWorld } from "../physics/PhysicsWorld";
import { WindObstacleSpatialIndex } from "./WindObstacleSpatialIndex";

export interface LocalWindObstacleResolution {
    readonly blocked: boolean;
    readonly multiplier: number;
    readonly directionX: number;
    readonly directionY: number;
}

/**
 * Obstruction query shared by Local Wind gameplay and VFX.
 * Movable Small Rocks remain non-blocking so Wind can push them. Immovable
 * Boulders register as fixed shapes and therefore cut off gameplay airflow and
 * Local Wind particles at the same boundary.
 */
export class LocalWindObstacleQuery {
    public constructor(
        private readonly physicsWorld: PhysicsWorld,
        private readonly definition: LocalWindObstacleDefinition,
    ) {}

    private courseBoundary: CourseEnvironmentBoundary | null = null;
    private staticIndex: WindObstacleSpatialIndex | null = null;
    private staticRevision = -1;
    public invalidateIndex(): void {
        this.staticIndex = null;
        this.staticRevision = -1;
    }
    private getIndexedCandidates(x0: number, y0: number, x1: number, y1: number): readonly StaticObstacleDefinition[] {
        const revision = this.physicsWorld.getRigidStaticRevision();
        // Static registration changes invalidate the index. The stable array reference
        // alone is insufficient because PhysicsWorld mutates it in place.
        if (!this.staticIndex || revision !== this.staticRevision) {
            const definitions = this.physicsWorld.getRigidStaticDefinitions();
            this.staticIndex = new WindObstacleSpatialIndex(definitions, this.definition.collisionTolerance);
            this.staticRevision = revision;
            P1.add("windIndexRebuilds");
        }
        return this.staticIndex.candidates(x0, y0, x1, y1);
    }
    public segmentBlockedExhaustive(x0: number, y0: number, x1: number, y1: number): boolean {
        return this.segmentBlockedInternal(x0, y0, x1, y1, false);
    }

    public setCourseEnvironmentBoundary(boundary: CourseEnvironmentBoundary | null): void {
        this.courseBoundary = boundary;
    }

    public isPlayable(x: number, y: number): boolean {
        return !this.courseBoundary || this.courseBoundary.containsPoint(x, y);
    }

    public resolve(
        sourceX: number,
        sourceY: number,
        targetX: number,
        targetY: number,
        fallbackDirectionX: number,
        fallbackDirectionY: number,
    ): LocalWindObstacleResolution {
        // segmentBlocked() already performs the authoritative course-boundary
        // and wall checks. Avoid doing them again here for every Wind sample.
        if (this.courseBoundary?.blocksSegment(sourceX, sourceY, targetX, targetY)) {
            return {blocked:true,multiplier:0,directionX:fallbackDirectionX,directionY:fallbackDirectionY};
        }
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
        return this.segmentBlockedInternal(x0, y0, x1, y1, true);
    }
    private segmentBlockedInternal(x0: number, y0: number, x1: number, y1: number, indexed: boolean): boolean {
        P1.add("windObstacleRays");
        P1.add("windAnalyticRays");
        if (this.courseBoundary?.blocksSegment(x0, y0, x1, y1)) return true;
        const obstacles = indexed ? this.getIndexedCandidates(x0, y0, x1, y1) : this.physicsWorld.getRigidStaticDefinitions();
        if (indexed) P1.add("windIndexCandidates", obstacles.length);
        else P1.add("windExhaustiveCandidates", obstacles.length);
        const fixedShapes = this.physicsWorld.getRigidFixedShapes();
        const padding = this.definition.collisionTolerance;
        const intersectsBox = (cx: number, cy: number, angle: number, hx: number, hy: number): boolean => {
            const co=Math.cos(-angle), si=Math.sin(-angle);
            const ax=(x0-cx)*co-(y0-cy)*si, ay=(x0-cx)*si+(y0-cy)*co;
            const bx=(x1-cx)*co-(y1-cy)*si, by=(x1-cx)*si+(y1-cy)*co;
            const dx=bx-ax, dy=by-ay;
            let lo=0, hi=1;
            for (const [p,d,h] of [[ax,dx,hx+padding],[ay,dy,hy+padding]]) {
                if (Math.abs(d)<1e-10) { if (Math.abs(p)>h) return false; continue; }
                const t0=(-h-p)/d, t1=(h-p)/d;
                lo=Math.max(lo,Math.min(t0,t1)); hi=Math.min(hi,Math.max(t0,t1));
                if (lo>hi) return false;
            }
            return true;
        };
        const intersectsCircle = (cx: number, cy: number, radius: number): boolean => {
            const dx=x1-x0,dy=y1-y0,dd=dx*dx+dy*dy;
            const t=dd>1e-12?Math.max(0,Math.min(1,((cx-x0)*dx+(cy-y0)*dy)/dd)):0;
            const px=x0+dx*t-cx,py=y0+dy*t-cy,r=radius+padding;
            return px*px+py*py<=r*r;
        };
        for (const obstacle of obstacles) {
            P1.add("windObstacleCandidates");
            if (obstacle.shape === "circle") {
                if (intersectsCircle(obstacle.positionX,obstacle.positionY,obstacle.radius)) return true;
            } else if (obstacle.shape === "rectangle") {
                if (intersectsBox(obstacle.positionX,obstacle.positionY,obstacle.rotationRadians??0,obstacle.width*0.5,obstacle.height*0.5)) return true;
            } else {
                // Preserve legacy triangle sampling; exact box/circle paths handle the common case.
                const distance=Math.hypot(x1-x0,y1-y0),steps=Math.max(1,Math.ceil(distance/this.definition.sampleSpacing));
                for(let i=1;i<=steps;i++) {const t=i/steps;if(this.contains(obstacle,x0+(x1-x0)*t,y0+(y1-y0)*t,padding))return true;}
            }
        }
        for (const shape of fixedShapes) {
            P1.add("windObstacleCandidates");
            if(shape.shape==="circle") {
                if(intersectsCircle(shape.positionX,shape.positionY,shape.radius))return true;
            } else if(intersectsBox(shape.positionX,shape.positionY,shape.rotationRadians,shape.width*0.5,shape.height*0.5))return true;
        }
        return false;
    }

    private contains(obstacle: StaticObstacleDefinition, x: number, y: number, padding: number): boolean {
        const dx = x - obstacle.positionX;
        const dy = y - obstacle.positionY;
        const angle = obstacle.shape === "rectangle" ? -(obstacle.rotationRadians ?? 0) : 0;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
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

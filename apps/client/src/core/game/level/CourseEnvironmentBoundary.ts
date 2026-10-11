import { fractionOutsideFootprint, type CourseFootprint } from "./CourseBoundaryFootprintQuery";
import { PerformanceInvestigationCounters as P1 } from "../debug/PerformanceInvestigationCounters";
import type { WorldPosition } from "./LevelCoordinateTransform";
import type { GeneratedCourseGeometry } from "./LevelRuntimeDefinition";
import {
    containsCourseCircle, containsCoursePoint, getCourseBoundaryIntersections,
    getCourseWallIntersections, type CourseSegmentIntersection,
} from "./CourseGeometryQueries";

/** Geometry-only E1 contract. No physics registrations, rendering or environmental mutations. */
export class CourseEnvironmentBoundary {
    constructor(private readonly geometry: GeneratedCourseGeometry) {}

    public fractionOutside(footprint: CourseFootprint): number {
        return fractionOutsideFootprint((x, y) => this.containsPoint(x, y), footprint);
    }
    public isFootprintMostlyOutside(footprint: CourseFootprint, threshold = 0.8): boolean {
        return this.fractionOutside(footprint) > threshold + 1e-6;
    }
    containsPoint(x: number, y: number): boolean {
        P1.add("polygonPoint");
        return Number.isFinite(x) && Number.isFinite(y) && containsCoursePoint(this.geometry, { x, y });
    }
    isInsidePlayableArea(x: number, y: number): boolean { return this.containsPoint(x, y); }
    containsCircle(x: number, y: number, radius: number): boolean {
        return Number.isFinite(x) && Number.isFinite(y) && containsCourseCircle(this.geometry, { x, y }, radius);
    }
    /** Cell x/y is its TOP-LEFT corner. Default policy requires the whole cell inside. */
    isValidCell(x: number, y: number, cellSize: number, policy: "full" | "center" = "full"): boolean {
        P1.add("cellValidity");
        if (![x, y, cellSize].every(Number.isFinite) || cellSize <= 0) return false;
        const cx = x + cellSize / 2, cy = y + cellSize / 2;
        if (policy === "center") return this.containsPoint(cx, cy);
        const corners = [
            { x, y }, { x: x + cellSize, y },
            { x: x + cellSize, y: y + cellSize }, { x, y: y + cellSize },
        ];
        if (!corners.every(p => this.containsPoint(p.x, p.y))) return false;
        // A concave boundary can pass through a cell even when all corners are inside.
        const sides = corners.map((p, i) => [p, corners[(i + 1) % 4]] as const);
        return !sides.some(([a, b]) => getCourseBoundaryIntersections(this.geometry, a, b)
            .some(hit => hit.fraction > 1e-8 && hit.fraction < 1 - 1e-8));
    }
    /** Allocation-light boolean test; preserves authored openings and concave edges. */
    public blocksSegment(x0: number, y0: number, x1: number, y1: number): boolean {
        P1.add("windBoundaryFastChecks");
        if (!this.containsPoint(x0, y0) || !this.containsPoint(x1, y1)) return true;
        const intersects = (ax: number, ay: number, bx: number, by: number): boolean => {
            const rx = x1-x0, ry = y1-y0, sx = bx-ax, sy = by-ay;
            const denominator = rx*sy-ry*sx;
            const qx = ax-x0, qy = ay-y0;
            if (Math.abs(denominator) < 1e-8) {
                if (Math.abs(qx*ry-qy*rx)>1e-8) return false;
                const rr=rx*rx+ry*ry;
                if (rr<1e-16) return false;
                const t0=(qx*rx+qy*ry)/rr, t1=t0+(sx*rx+sy*ry)/rr;
                return Math.max(0,Math.min(t0,t1)) <= Math.min(1,Math.max(t0,t1))+1e-8;
            }
            const t=(qx*sy-qy*sx)/denominator, u=(qx*ry-qy*rx)/denominator;
            return t>=-1e-8 && t<=1+1e-8 && u>=-1e-8 && u<=1+1e-8;
        };
        const minX=Math.min(x0,x1), maxX=Math.max(x0,x1), minY=Math.min(y0,y1), maxY=Math.max(y0,y1);
        for (const edge of this.geometry.edges) {
            if (Math.max(edge.start.x,edge.end.x)<minX || Math.min(edge.start.x,edge.end.x)>maxX || Math.max(edge.start.y,edge.end.y)<minY || Math.min(edge.start.y,edge.end.y)>maxY) continue;
            if (intersects(edge.start.x,edge.start.y,edge.end.x,edge.end.y)) return true;
        }
        for (const wall of this.geometry.wallSegments) {
            if (Math.max(wall.start.x,wall.end.x)<minX || Math.min(wall.start.x,wall.end.x)>maxX || Math.max(wall.start.y,wall.end.y)<minY || Math.min(wall.start.y,wall.end.y)>maxY) continue;
            if (intersects(wall.start.x,wall.start.y,wall.end.x,wall.end.y)) return true;
        }
        return false;
    }
    /** Fast rejection for boundary intersection consumers; conservative for diagonal edges. */
    public mayIntersectCourseBounds(x0: number, y0: number, x1: number, y1: number): boolean {
        const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
        return this.geometry.edges.some(edge =>
            Math.max(edge.start.x, edge.end.x) >= minX && Math.min(edge.start.x, edge.end.x) <= maxX &&
            Math.max(edge.start.y, edge.end.y) >= minY && Math.min(edge.start.y, edge.end.y) <= maxY);
    }
    getFirstWallHit(start: WorldPosition, end: WorldPosition): CourseSegmentIntersection | undefined {
        P1.add("wallIntersection");
        return getCourseWallIntersections(this.geometry, start, end)[0];
    }
    intersectsWall(start: WorldPosition, end: WorldPosition): boolean {
        return this.getFirstWallHit(start, end) !== undefined;
    }
    getBoundaryCrossings(start: WorldPosition, end: WorldPosition): readonly CourseSegmentIntersection[] {
        P1.add("boundaryCrossings");
        return getCourseBoundaryIntersections(this.geometry, start, end);
    }
    crossesCourseBoundary(start: WorldPosition, end: WorldPosition): boolean {
        return this.getBoundaryCrossings(start, end).length > 0 ||
            this.containsPoint(start.x, start.y) !== this.containsPoint(end.x, end.y);
    }
}

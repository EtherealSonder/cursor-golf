import type { WorldPosition } from "./LevelCoordinateTransform";
import type { GeneratedCourseGeometry, RuntimeCourseBounds } from "./LevelRuntimeDefinition";
import { pointInPolygon } from "./CourseGeometryValidation";

const EPS = 1e-8;
export interface CourseBoundaryProjection { readonly point: WorldPosition; readonly distance: number; readonly edgeIndex: number; }
export interface CourseSegmentIntersection { readonly point: WorldPosition; readonly fraction: number; readonly edgeIndex: number; readonly wallId?: string; }
const cross = (a: WorldPosition, b: WorldPosition) => a.x * b.y - a.y * b.x;
const subtract = (a: WorldPosition, b: WorldPosition): WorldPosition => ({ x: a.x - b.x, y: a.y - b.y });

/** Inclusive segment intersection. Collinear overlap returns the earliest overlapping point. */
export function intersectCourseSegments(a: WorldPosition, b: WorldPosition, c: WorldPosition, d: WorldPosition): { point: WorldPosition; fraction: number } | undefined {
    const r = subtract(b, a), s = subtract(d, c), q = subtract(c, a);
    const rr = r.x * r.x + r.y * r.y;
    if (rr <= EPS * EPS) return undefined;
    const denominator = cross(r, s);
    if (Math.abs(denominator) <= EPS) {
        if (Math.abs(cross(q, r)) > EPS) return undefined;
        const t0 = (q.x * r.x + q.y * r.y) / rr;
        const t1 = t0 + (s.x * r.x + s.y * r.y) / rr;
        const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(1, Math.max(t0, t1));
        if (lo > hi + EPS) return undefined;
        return { point: { x: a.x + r.x * lo, y: a.y + r.y * lo }, fraction: lo };
    }
    const t = cross(q, s) / denominator, u = cross(q, r) / denominator;
    if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return undefined;
    const fraction = Math.max(0, Math.min(1, t));
    return { point: { x: a.x + r.x * fraction, y: a.y + r.y * fraction }, fraction };
}

export function getCourseBoundaryIntersections(geometry: GeneratedCourseGeometry, start: WorldPosition, end: WorldPosition): CourseSegmentIntersection[] {
    return geometry.edges.flatMap(edge => {
        const hit = intersectCourseSegments(start, end, edge.start, edge.end);
        return hit ? [{ ...hit, edgeIndex: edge.index }] : [];
    }).sort((a, b) => a.fraction - b.fraction || a.edgeIndex - b.edgeIndex);
}

/** Wall tests use authored edge segments, not the outward-offset collider centreline. */
export function getCourseWallIntersections(geometry: GeneratedCourseGeometry, start: WorldPosition, end: WorldPosition): CourseSegmentIntersection[] {
    return geometry.wallSegments.flatMap(wall => {
        const hit = intersectCourseSegments(start, end, wall.start, wall.end);
        return hit ? [{ ...hit, edgeIndex: wall.edgeIndex, wallId: wall.id }] : [];
    }).sort((a, b) => a.fraction - b.fraction || a.edgeIndex - b.edgeIndex);
}

export function containsCoursePoint(geometry: GeneratedCourseGeometry, point: WorldPosition): boolean {
    return pointInPolygon(point, geometry.vertices);
}
export function getCourseBounds(geometry: GeneratedCourseGeometry): RuntimeCourseBounds { return geometry.bounds; }
export function getNearestCourseBoundaryPoint(geometry: GeneratedCourseGeometry, point: WorldPosition): CourseBoundaryProjection {
    let best: CourseBoundaryProjection | undefined;
    for (const edge of geometry.edges) {
        const dx = edge.end.x - edge.start.x, dy = edge.end.y - edge.start.y;
        const t = Math.max(0, Math.min(1, ((point.x - edge.start.x) * dx + (point.y - edge.start.y) * dy) / (dx * dx + dy * dy)));
        const candidate = { x: edge.start.x + t * dx, y: edge.start.y + t * dy };
        const distance = Math.hypot(point.x - candidate.x, point.y - candidate.y);
        if (!best || distance < best.distance) best = { point: candidate, distance, edgeIndex: edge.index };
    }
    if (!best) throw new Error("Cannot query a course with no boundary edges.");
    return best;
}
export function getDistanceToCourseBoundary(geometry: GeneratedCourseGeometry, point: WorldPosition): number {
    return getNearestCourseBoundaryPoint(geometry, point).distance;
}
/** Boundary-inclusive; positive-radius circles must be inside and clear of all edges. */
export function containsCourseCircle(geometry: GeneratedCourseGeometry, center: WorldPosition, radius: number): boolean {
    return Number.isFinite(radius) && radius >= 0 && containsCoursePoint(geometry, center)
        && getDistanceToCourseBoundary(geometry, center) + EPS >= radius;
}

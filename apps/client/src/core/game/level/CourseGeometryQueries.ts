import type { WorldPosition } from "./LevelCoordinateTransform";
import type { GeneratedCourseGeometry, RuntimeCourseBounds } from "./LevelRuntimeDefinition";
import { pointInPolygon } from "./CourseGeometryValidation";

export interface CourseBoundaryProjection { readonly point: WorldPosition; readonly distance: number; readonly edgeIndex: number; }

export function containsCoursePoint(geometry: GeneratedCourseGeometry, point: WorldPosition): boolean {
    return pointInPolygon(point, geometry.vertices);
}

export function getCourseBounds(geometry: GeneratedCourseGeometry): RuntimeCourseBounds {
    return geometry.bounds;
}

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
        && getDistanceToCourseBoundary(geometry, center) + 1e-8 >= radius;
}

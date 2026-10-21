import type { WorldPosition } from "../level/LevelCoordinateTransform";
import { intersectCourseSegments } from "../level/CourseGeometryQueries";
import { pointInPolygon } from "../level/CourseGeometryValidation";
import type { ProceduralSandLevelContext } from "./ProceduralSandLevelAdapter";
import type { SandShape } from "./ProceduralSandShapeGenerator";

function distanceToSegment(p: WorldPosition, a: WorldPosition, b: WorldPosition): number {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / Math.max(1e-12, dx * dx + dy * dy)));
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function edges(vertices: readonly WorldPosition[]): [WorldPosition, WorldPosition][] {
    return vertices.map((v, i) => [v, vertices[(i + 1) % vertices.length]]);
}
function polygonsIntersect(a: readonly WorldPosition[], b: readonly WorldPosition[]): boolean {
    if (a.some(p => pointInPolygon(p, b)) || b.some(p => pointInPolygon(p, a))) return true;
    return edges(a).some(([p, q]) => edges(b).some(([r, s]) => !!intersectCourseSegments(p, q, r, s)));
}
function minimumEdgeDistance(a: readonly WorldPosition[], b: readonly WorldPosition[]): number {
    let minimum = Infinity;
    for (const p of a) for (const [u,v] of edges(b)) minimum = Math.min(minimum, distanceToSegment(p,u,v));
    for (const p of b) for (const [u,v] of edges(a)) minimum = Math.min(minimum, distanceToSegment(p,u,v));
    return minimum;
}
export function validateSandPlacement(shape: SandShape, context: ProceduralSandLevelContext, existing: readonly SandShape[], separation: number, spawnClearance: number, holeClearance: number): boolean {
    const points = shape.vertices;
    if (shape.area < 100 || shape.width < 20 || shape.height < 20) return false;
    if (!points.every(p => pointInPolygon(p, context.polygon))) return false;
    const boundary = edges(context.polygon);
    for (const [a,b] of edges(points)) {
        for (const [c,d] of boundary) if (intersectCourseSegments(a,b,c,d)) return false;
        // A segment can leave a concave polygon without either endpoint leaving it.
        const midpoint = { x:(a.x+b.x)/2, y:(a.y+b.y)/2 };
        if (!pointInPolygon(midpoint, context.polygon)) return false;
    }
    for (const p of points) {
        if (Math.hypot(p.x-context.spawn.x,p.y-context.spawn.y) < spawnClearance) return false;
        if (Math.hypot(p.x-context.hole.x,p.y-context.hole.y) < holeClearance) return false;
    }
    for (const [a,b] of edges(points)) {
        if (distanceToSegment(context.spawn,a,b) < spawnClearance || distanceToSegment(context.hole,a,b) < holeClearance) return false;
    }
    if (pointInPolygon(context.spawn,points) || pointInPolygon(context.hole,points)) return false;
    for (const prior of existing) {
        if (polygonsIntersect(points,prior.vertices) || minimumEdgeDistance(points,prior.vertices) < separation) return false;
    }
    return true;
}

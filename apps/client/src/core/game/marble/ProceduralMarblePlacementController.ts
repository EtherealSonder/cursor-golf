import type { GeneratedCourseGeometry } from "../level/LevelRuntimeDefinition";
import { PROCEDURAL_MARBLE_CONFIG as C, marbleTargetForArea } from "./ProceduralMarbleConfig";
export interface MarblePoint { readonly x: number; readonly y: number }
export interface MarbleExclusion extends MarblePoint { readonly radius: number }
export interface MarblePlacementResult { readonly area: number; readonly target: number; readonly positions: readonly MarblePoint[] }
export function polygonArea(vertices: readonly MarblePoint[]): number {
    let sum = 0;
    for (let i = 0; i < vertices.length; i++) {
        const a = vertices[i], b = vertices[(i + 1) % vertices.length];
        sum += a.x * b.y - b.x * a.y;
    }
    return Math.abs(sum) * 0.5;
}
function pointInside(p: MarblePoint, vertices: readonly MarblePoint[]): boolean {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const a = vertices[i], b = vertices[j];
        if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
}
function segmentDistanceSquared(p: MarblePoint, a: MarblePoint, b: MarblePoint): number {
    const dx = b.x - a.x, dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((p.x-a.x)*dx+(p.y-a.y)*dy)/length)) : 0;
    return (p.x-a.x-t*dx)**2+(p.y-a.y-t*dy)**2;
}
export function isMarblePositionFree(point: MarblePoint, geometry: GeneratedCourseGeometry,
    exclusions: readonly MarbleExclusion[], radius = C.radius): boolean {
    const vertices = geometry.vertices;
    if (vertices.length < 3 || !pointInside(point, vertices)) return false;
    const boundary = radius + C.boundaryClearance;
    for (let i = 0; i < vertices.length; i++) {
        if (segmentDistanceSquared(point, vertices[i], vertices[(i+1)%vertices.length]) < boundary**2) return false;
    }
    return !exclusions.some(e => (point.x-e.x)**2+(point.y-e.y)**2 < (radius+e.radius)**2);
}
/** Random on every call; authored placements are reserved before procedural generation. */
export function generateProceduralMarbles(geometry: GeneratedCourseGeometry,
    exclusions: readonly MarbleExclusion[], authoredCount: number, random: () => number = Math.random, rollPercent = 100): MarblePlacementResult {
    const area = polygonArea(geometry.vertices);
    const target = Math.round(marbleTargetForArea(area) * Math.max(0, Math.min(100, rollPercent)) / 100);
    const desired = Math.max(0, target - authoredCount);
    const { minimumX, maximumX, minimumY, maximumY } = geometry.bounds;
    const occupied = [...exclusions];
    const positions: MarblePoint[] = [];
    for (let attempt = 0; attempt < desired * C.attemptsPerMarble && positions.length < desired; attempt++) {
        const candidate = { x: minimumX + random()*(maximumX-minimumX), y: minimumY + random()*(maximumY-minimumY) };
        if (!isMarblePositionFree(candidate, geometry, occupied)) continue;
        positions.push(candidate);
        occupied.push({ ...candidate, radius: C.radius + C.marbleClearance });
    }
    return { area, target, positions };
}

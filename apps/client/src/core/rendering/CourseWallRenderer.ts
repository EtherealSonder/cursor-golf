import { Graphics } from "pixi.js";
import type { GeneratedCourseGeometry, RuntimeCourseWallSegment } from "../game/level/LevelRuntimeDefinition";
import type { CourseVisualDefinition } from "../game/config/CourseVisualDefinition";

type Point = { x: number; y: number };
const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) < 0.01;
const start = (s: RuntimeCourseWallSegment): Point => ({ x: s.center.x - Math.cos(s.angleRadians) * s.length / 2, y: s.center.y - Math.sin(s.angleRadians) * s.length / 2 });
const end = (s: RuntimeCourseWallSegment): Point => ({ x: s.center.x + Math.cos(s.angleRadians) * s.length / 2, y: s.center.y + Math.sin(s.angleRadians) * s.length / 2 });
function joint(a: RuntimeCourseWallSegment, b: RuntimeCourseWallSegment): Point {
    const p = end(a), q = start(b);
    const ux = Math.cos(a.angleRadians), uy = Math.sin(a.angleRadians);
    const vx = Math.cos(b.angleRadians), vy = Math.sin(b.angleRadians);
    const cross = ux * vy - uy * vx;
    if (Math.abs(cross) < 1e-5) return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    const t = ((q.x - p.x) * vy - (q.y - p.y) * vx) / cross;
    const r = { x: p.x + t * ux, y: p.y + t * uy };
    return Math.hypot(r.x - p.x, r.y - p.y) < a.thickness * 2 ? r : { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
}
/** Pure presentation. Grass is independently extended under these strokes by World.
 * Geometry and physical obstacle definitions remain unchanged. */
export function createCourseWallGraphics(geometry: GeneratedCourseGeometry, style: CourseVisualDefinition): Graphics {
    const graphics = new Graphics();
    const segments = geometry.wallSegments;
    if (!segments.length) return graphics;
    const vertices = geometry.vertices;
    const runs: RuntimeCourseWallSegment[][] = [];
    let run: RuntimeCourseWallSegment[] = [];
    for (const s of segments) {
        const prev = run[run.length - 1];
        const connected = prev && s.edgeIndex === (prev.edgeIndex + 1) % vertices.length && near(prev.end, vertices[s.edgeIndex]) && near(s.start, vertices[s.edgeIndex]);
        if (prev && !connected) { runs.push(run); run = []; }
        run.push(s);
    }
    if (run.length) runs.push(run);
    if (runs.length > 1) {
        const first = runs[0][0], lastRun = runs[runs.length - 1], last = lastRun[lastRun.length - 1];
        if (first.edgeIndex === 0 && last.edgeIndex === vertices.length - 1 && near(last.end, vertices[0]) && near(first.start, vertices[0])) {
            runs[0] = [...lastRun, ...runs[0]];
            runs.pop();
        }
    }
    for (const parts of runs) {
        const first = parts[0], last = parts[parts.length - 1];
        const closed = parts.length === segments.length && first.edgeIndex === (last.edgeIndex + 1) % vertices.length && near(last.end, vertices[first.edgeIndex]);
        const points: Point[] = closed ? [] : [start(first)];
        for (let i = 0; i < parts.length - 1; i++) points.push(joint(parts[i], parts[i + 1]));
        if (closed) points.push(joint(last, first)); else points.push(end(last));
        if (points.length < 2) continue;
        for (const stroke of [
            { width: style.gameplayWallVisualThickness + 2 * style.gameplayWallOutlineWidth, color: style.gameplayWallOutlineColor },
            { width: style.gameplayWallVisualThickness, color: style.gameplayWallColor },
            { width: style.gameplayWallHighlightWidth, color: style.gameplayWallHighlightColor },
        ]) {
            graphics.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) graphics.lineTo(points[i].x, points[i].y);
            if (closed) graphics.closePath();
            graphics.stroke({ width: stroke.width, color: stroke.color, cap: "round", join: "round" });
        }
        // Caps only at actual disconnected wall-run ends. Closed boundaries have none.
        // Draw after the strokes so the coral faces remain clearly visible.
        if (!closed) {
            for (const endpoint of [start(first), end(last)]) {
                const outerRadius = style.gameplayWallCapDiameter / 2;
                const innerRadius = Math.max(0, outerRadius - style.gameplayWallOutlineWidth);
                graphics.circle(endpoint.x, endpoint.y, outerRadius).fill(style.gameplayWallOutlineColor);
                graphics.circle(endpoint.x, endpoint.y, innerRadius).fill(style.gameplayWallCapColor);
                graphics.circle(endpoint.x - innerRadius * 0.24, endpoint.y - innerRadius * 0.24, style.gameplayWallCapHighlightRadius).fill(style.gameplayWallCapHighlightColor);
            }
        }
    }
    return graphics;
}

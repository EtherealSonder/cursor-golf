import type { LevelCourseDefinition, LevelPoint } from "./LevelDefinition";
import type { LevelWorldOrigin, WorldPosition } from "./LevelCoordinateTransform";
import type { GeneratedCourseGeometry, RuntimeCourseBoundaryEdge, RuntimeCourseWallSegment, RuntimeCourseBounds } from "./LevelRuntimeDefinition";

const EPS = 1e-8;
const WALL_THICKNESS = 28;

/** Pure geometric preparation; no rendering or physics registrations. */
export function buildCourseGeometry(course: LevelCourseDefinition, origin: LevelWorldOrigin, wallThickness = WALL_THICKNESS): GeneratedCourseGeometry {
    const polygon = course.type === "polygon";
    const localVertices: readonly LevelPoint[] = polygon ? course.vertices : [
        { x: 0, y: 0 }, { x: course.width, y: 0 },
        { x: course.width, y: course.height }, { x: 0, y: course.height },
    ];
    const vertices: WorldPosition[] = localVertices.map(v => ({ x: v.x + origin.x, y: v.y + origin.y }));
    const xs = vertices.map(v => v.x), ys = vertices.map(v => v.y);
    const bounds: RuntimeCourseBounds = {
        minimumX: Math.min(...xs), maximumX: Math.max(...xs),
        minimumY: Math.min(...ys), maximumY: Math.max(...ys),
    };
    // Shoelace sign is positive for clockwise winding in screen/world +Y-down
    // coordinates. Outward normal is left-of-edge for positive winding.
    const signedArea2 = vertices.reduce((sum, v, i) => {
        const next = vertices[(i + 1) % vertices.length];
        return sum + v.x * next.y - next.x * v.y;
    }, 0);
    if (Math.abs(signedArea2) <= EPS) throw new Error("Course polygon has zero area.");
    const outwardSign = signedArea2 > 0 ? 1 : -1;
    const edges: RuntimeCourseBoundaryEdge[] = [];
    const wallSegments: RuntimeCourseWallSegment[] = [];
    const sideByIndex = ["top", "right", "bottom", "left"] as const;
    for (let i = 0; i < vertices.length; i++) {
        const start = vertices[i], end = vertices[(i + 1) % vertices.length];
        const dx = end.x - start.x, dy = end.y - start.y;
        const length = Math.hypot(dx, dy);
        if (length <= EPS) throw new Error(`Course edge ${i} is degenerate.`);
        const unitX = dx / length, unitY = dy / length;
        const outwardX = unitY * outwardSign;
        const outwardY = -unitX * outwardSign;
        const edge: RuntimeCourseBoundaryEdge = { index: i, start, end, length, angleRadians: Math.atan2(dy, dx) };
        edges.push(edge);
        // Rectangle openings are authored along increasing global X/Y axes,
        // while polygon openings follow the authored edge's forward direction.
        const intervals = polygon
            ? course.openings.filter(o => o.edgeIndex === i).map(o => ({ start: o.start, end: o.end }))
            : course.openings.filter(o => o.side === sideByIndex[i]).map(o => {
                const forward = i === 0 || i === 1;
                return forward ? { start: o.start, end: o.end }
                    : { start: length - o.end, end: length - o.start };
            });
        intervals.sort((a, b) => a.start - b.start);
        let cursor = 0, segmentIndex = 0;
        const emit = (a: number, b: number) => {
            if (b - a <= EPS) return;
            const ax = start.x + unitX * a, ay = start.y + unitY * a;
            const bx = start.x + unitX * b, by = start.y + unitY * b;
            wallSegments.push({ id: `course-wall-${i}-${segmentIndex++}`, edgeIndex: i,
                start: { x: ax, y: ay }, end: { x: bx, y: by },
                center: {
                    x: (ax + bx) / 2 + outwardX * wallThickness / 2,
                    y: (ay + by) / 2 + outwardY * wallThickness / 2,
                },
                length: b - a, thickness: wallThickness, angleRadians: edge.angleRadians });
        };
        for (const interval of intervals) {
            if (interval.start < cursor - EPS || interval.end > length + EPS) throw new Error(`Invalid openings on edge ${i}.`);
            emit(cursor, interval.start);
            cursor = interval.end;
        }
        emit(cursor, length);
    }
    return { vertices, edges, wallSegments, bounds };
}

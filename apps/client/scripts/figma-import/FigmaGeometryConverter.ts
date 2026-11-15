import type {
    FigmaConversionDiagnostic, FigmaConvertedObject, FigmaGeometryResult, FigmaVector2,
} from "./FigmaNodeDefinition";
import type { FigmaResolvedGeometry } from "./FigmaResolvedGeometry";
import { boundsOfCoordinates } from "./FigmaCoordinateSpace";

const point = (m: FigmaConvertedObject["transform"]["matrix"], x: number, y: number): FigmaVector2 => ({
    x: m[0][0] * x + m[0][1] * y + m[0][2],
    y: m[1][0] * x + m[1][1] * y + m[1][2],
});
const dist = (a: FigmaVector2, b: FigmaVector2): number => Math.hypot(a.x - b.x, a.y - b.y);
const dot = (a: FigmaVector2, b: FigmaVector2): number => a.x * b.x + a.y * b.y;
const sub = (a: FigmaVector2, b: FigmaVector2): FigmaVector2 => ({ x: a.x - b.x, y: a.y - b.y });

/**
 * FI-2 geometry conversion, matching LevelDefinition's polygon edge contract.
 * Explicit sourceNode.geometry.vertices is supported for future enhanced exports;
 * otherwise a VECTOR without path data is accepted only if explicitly marked
 * as rectangular (or it is the current known rectangular Figma export).
 */
export function convertFigmaGeometry(
    converted: readonly FigmaConvertedObject[],
    frameWidth: number,
    frameHeight: number,
    svg?: FigmaResolvedGeometry,
): FigmaGeometryResult {
    const diagnostics: FigmaConversionDiagnostic[] = [];
    const report = (code: string, message: string, path: readonly string[], severity: "warning" | "error" = "error") =>
        diagnostics.push({ severity, code, message, path });
    const boundaries = converted.filter(c => c.object.identity.kind === "courseBoundary");
    if (boundaries.length !== 1) {
        report("COURSE_COUNT", `Expected exactly one course boundary, found ${boundaries.length}.`, []);
        return { course: null, diagnostics };
    }
    const boundary = boundaries[0];
    const { width, height } = boundary.object.bounds;
    const matchedBoundary = svg?.shapes.get(boundary.object.identity.id);
    const rawGeometry = boundary.object.sourceNode.geometry as { vertices?: unknown } | undefined;
    let vertices: FigmaVector2[];
    if (svg && !matchedBoundary) {
        report('SVG_BOUNDARY_UNMATCHED', 'Course boundary has no SVG match.', boundary.object.nodePath);
        return {course:null, diagnostics};
    }
    if (matchedBoundary) {
        if (matchedBoundary.geometry.curved) {
            report('CURVED_COURSE_PATH', 'Curved SVG course paths require curve flattening before polygon conversion.', boundary.object.nodePath);
            return {course:null, diagnostics};
        }
        vertices = [...matchedBoundary.vertices];
        if (vertices.length > 1 && dist(vertices[0], vertices[vertices.length-1]) < 1e-6) vertices.pop();
        if (vertices.length < 3) {
            report('INVALID_SVG_POLYGON', 'SVG course path has fewer than three distinct vertices.', boundary.object.nodePath);
            return {course:null, diagnostics};
        }
    } else if (rawGeometry && Array.isArray(rawGeometry.vertices) && rawGeometry.vertices.length >= 3 &&
        rawGeometry.vertices.every((v: unknown) => typeof v === "object" && v !== null &&
            "x" in v && "y" in v && Number.isFinite(v.x) && Number.isFinite(v.y))) {
        vertices = rawGeometry.vertices.map((v: FigmaVector2) => point(boundary.transform.matrix, v.x, v.y));
    } else {
        // Current test export uses a rectangular VECTOR with only bounds. Do not
        // silently treat future irregular vector paths as rectangles.
        if (boundary.object.type === "VECTOR") {
            report("MISSING_VECTOR_PATH", "No polygon vertices in export. Using rectangular bounds as a provisional approximation; verify the course is rectangular.", boundary.object.nodePath, "warning");
        }
        vertices = [point(boundary.transform.matrix, 0, 0), point(boundary.transform.matrix, width, 0),
            point(boundary.transform.matrix, width, height), point(boundary.transform.matrix, 0, height)];
    }
    if (!Number.isFinite(frameWidth) || !Number.isFinite(frameHeight) || frameWidth <= 0 || frameHeight <= 0) {
        report("INVALID_FRAME", "Frame width/height must be finite positive numbers.", []);
        return { course: null, diagnostics };
    }
    const openings: { edgeIndex: number; start: number; end: number }[] = [];
    for (const opening of converted.filter(c => c.object.identity.kind === "wallOpening")) {
        const b = opening.object.bounds;
        const svgOpening = svg?.shapes.get(opening.object.identity.id);
        if (svg && !svgOpening) {
            report('SVG_OPENING_UNMATCHED', 'Opening has no SVG match.', opening.object.nodePath);
            continue;
        }
        const m = opening.transform.matrix;
        const center = svgOpening && svgOpening.vertices.length >= 4
            ? {x: svgOpening.vertices.reduce((sum,v)=>sum+v.x,0)/svgOpening.vertices.length,
               y: svgOpening.vertices.reduce((sum,v)=>sum+v.y,0)/svgOpening.vertices.length}
            : point(m, b.width / 2, b.height / 2);
        // For SVG matches, the vertices already include local x/y and all
        // parent transforms. Do not transform Figma bounds a second time.
        const localLongHorizontal = b.width >= b.height;
        const longAxis = svgOpening && svgOpening.vertices.length >= 4
            ? (localLongHorizontal
                ? sub(svgOpening.vertices[1],svgOpening.vertices[0])
                : sub(svgOpening.vertices[3],svgOpening.vertices[0]))
            : (localLongHorizontal
                ? sub(point(m,b.width,b.height/2),point(m,0,b.height/2))
                : sub(point(m,b.width/2,b.height),point(m,b.width/2,0)));
        const longLength = Math.hypot(longAxis.x, longAxis.y);
        if (longLength < 1e-6) { report("INVALID_OPENING", "Opening has zero projected length.", opening.object.nodePath); continue; }
        const unitLong = { x: longAxis.x / longLength, y: longAxis.y / longLength };
        // An authored opening may cross vertices which subdivide one straight wall.
        // Project its entire long axis onto every aligned, collinear boundary edge.
        // A single Figma marker can therefore yield multiple edge intervals.
        const maxOffset = svgOpening ? Math.min(b.width, b.height) * 0.5 + 3 : 40;
        const candidates: { edgeIndex: number; start: number; end: number; perpendicular: number; parallel: number }[] = [];
        for (let i = 0; i < vertices.length; i++) {
            const a = vertices[i], z = vertices[(i + 1) % vertices.length];
            const length = dist(a, z);
            if (length < 1e-6) continue;
            const u = { x: (z.x - a.x) / length, y: (z.y - a.y) / length };
            const parallel = Math.abs(dot(u, unitLong));
            if (parallel < 0.95) continue;
            const offset = sub(center, a);
            const perpendicular = Math.abs(offset.x * u.y - offset.y * u.x);
            if (perpendicular > maxOffset) continue;
            const projectedCenter = dot(offset, u);
            const span = longLength * parallel / 2;
            const start = Math.max(0, projectedCenter - span);
            const end = Math.min(length, projectedCenter + span);
            if (end - start > 1e-5) candidates.push({ edgeIndex: i, start, end, perpendicular, parallel });
        }
        if (!candidates.length) {
            report('OPENING_NOT_ON_EDGE', `Opening ${opening.object.name} does not intersect an aligned boundary edge.`, opening.object.nodePath);
            continue;
        }
        // Keep the closest supporting wall line. This prevents a wide opening
        // from accidentally removing a second nearby parallel wall.
        const bestOffset = Math.min(...candidates.map(c => c.perpendicular));
        const selected = candidates.filter(c => c.perpendicular <= bestOffset + 0.5);
        for (const interval of selected) {
            openings.push({ edgeIndex: interval.edgeIndex, start: interval.start, end: interval.end });
        }
        const covered = selected.reduce((sum, c) => sum + c.end - c.start, 0);
        // An opening straddling a polygon vertex must retain its entire span.
        // Flag clipping, misalignment and overlap with corners explicitly.
        if (Math.abs(covered - longLength) > 1.0) {
            report('OPENING_COVERAGE_MISMATCH',
                `Opening ${opening.object.name}: expected ${longLength.toFixed(2)}px but assigned ${covered.toFixed(2)}px across ${selected.length} edge(s).`,
                opening.object.nodePath);
        }
    }
    // Interval count can exceed authored marker count when a marker spans edges.
    // Missing and truncated markers are reported individually above.
    return { course: { type: "polygon", width: frameWidth, height: frameHeight, baseSurface: "grass", vertices, openings }, diagnostics };
}

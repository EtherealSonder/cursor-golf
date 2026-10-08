import { buildCourseGeometry } from "./CourseGeometryBuilder";
import { containsCourseCircle, containsCoursePoint, getCourseBounds } from "./CourseGeometryQueries";
import { loadLevelDefinition } from "./LevelLoader";
import { runLevel00DevRegression } from "./LevelDevRegression";
import type { LevelDefinition } from "./LevelDefinition";

export interface LevelGeometryRegressionResult {
    readonly passed: boolean;
    readonly failures: readonly string[];
    readonly checks: number;
}

/** Pure deterministic assertions; run in development, never on every simulation tick. */
export function runLevelGeometryRegression(devInput: unknown, polygonInput: unknown): LevelGeometryRegressionResult {
    const failures: string[] = [];
    let checks = 0;
    const check = (condition: boolean, description: string) => {
        checks++;
        if (!condition) failures.push(description);
    };
    const approx = (a: number, b: number) => Math.abs(a - b) < 1e-7;
    const dev = runLevel00DevRegression(devInput);
    check(dev.passed, `dev baseline: ${dev.issues.map(i => i.path).join(", ")}`);
    const origin = { x: 100, y: -1250 };
    const loaded = loadLevelDefinition(polygonInput, { worldOrigin: origin });
    check(loaded.ok, `polygon loads: ${loaded.validation.errors.map(e => e.message).join(", ")}`);
    if (!loaded.ok) return { passed: false, failures, checks };
    const course = loaded.level.course;
    const geometry = course.generatedGeometry;
    if (!geometry) return { passed: false, failures: [...failures, "generated geometry missing"], checks };
    const authored = (polygonInput as LevelDefinition).course;
    if (authored.type !== "polygon") return { passed: false, failures: [...failures, "test definition not polygon"], checks };
    check(course.geometry?.type === "polygon", "runtime polygon discriminator");
    check(geometry.vertices.length === authored.vertices.length, "vertex count");
    check(geometry.edges.length === authored.vertices.length, "edge count");
    check(geometry.wallSegments.length === authored.vertices.length + authored.openings.length, "split segment count");
    check(geometry.wallSegments.some(s => Math.abs(Math.sin(s.angleRadians)) > 0.1 && Math.abs(Math.cos(s.angleRadians)) > 0.1), "diagonal wall exists");
    check(geometry.wallSegments.every(s => approx(s.thickness, 28)), "wall thickness");
    check(approx(geometry.vertices[0].x, authored.vertices[0].x + origin.x) && approx(geometry.vertices[0].y, authored.vertices[0].y + origin.y), "world translation once");
    check(approx(loaded.level.ball.x, (polygonInput as LevelDefinition).ball.x + origin.x), "ball coordinate translation");
    check(approx(loaded.level.hole.y, (polygonInput as LevelDefinition).hole.y + origin.y), "hole coordinate translation");
    const bounds = getCourseBounds(geometry);
    check(approx(bounds.minimumX, 200) && approx(bounds.maximumX, 1150) && approx(bounds.minimumY, -1150) && approx(bounds.maximumY, 450), "polygon bounds (not frame bounds)");
    check(containsCoursePoint(geometry, loaded.level.ball), "ball inside polygon");
    check(containsCoursePoint(geometry, loaded.level.hole), "hole inside polygon");
    check(!containsCoursePoint(geometry, { x: origin.x + 200, y: origin.y + 850 }), "left concave cutout outside");
    check(!containsCoursePoint(geometry, { x: origin.x + 900, y: origin.y + 1050 }), "right concave cutout outside");
    check(containsCourseCircle(geometry, loaded.level.ball, 10), "ball clearance inside");
    check(!containsCourseCircle(geometry, { x: origin.x + 345, y: origin.y + 900 }, 12), "circle clearance near concave wall");
    for (const opening of authored.openings) {
        const edge = geometry.edges[opening.edgeIndex];
        const at = (distance: number) => ({ x: edge.start.x + (edge.end.x - edge.start.x) * distance / edge.length, y: edge.start.y + (edge.end.y - edge.start.y) * distance / edge.length });
        const middle = at((opening.start + opening.end) / 2);
        check(!geometry.wallSegments.some(s => s.edgeIndex === opening.edgeIndex && Math.hypot(s.start.x - middle.x, s.start.y - middle.y) + Math.hypot(s.end.x - middle.x, s.end.y - middle.y) <= s.length + 1e-6), `opening edge ${opening.edgeIndex} gap`);
    }
    const reverse = buildCourseGeometry({ ...authored, vertices: [...authored.vertices].reverse(), openings: [] }, origin);
    check(reverse.wallSegments.length === authored.vertices.length, "reversed winding wall count");
    for (const geom of [geometry, reverse]) {
        const verts = geom.vertices;
        const center = { x: verts.reduce((sum, v) => sum + v.x, 0) / verts.length, y: verts.reduce((sum, v) => sum + v.y, 0) / verts.length };
        // Outward offset sign is verified against winding using the polygon signed area.
        const area2 = verts.reduce((sum, v, i) => sum + v.x * verts[(i + 1) % verts.length].y - verts[(i + 1) % verts.length].x * v.y, 0);
        const first = geom.wallSegments[0];
        const edge = geom.edges[first.edgeIndex];
        const mx = (first.start.x + first.end.x) / 2;
        const my = (first.start.y + first.end.y) / 2;
        const outwardX = (edge.end.y - edge.start.y) / edge.length * Math.sign(area2);
        const outwardY = -(edge.end.x - edge.start.x) / edge.length * Math.sign(area2);
        check(approx(first.center.x - mx, outwardX * 14) && approx(first.center.y - my, outwardY * 14), `outward offset winding ${area2 > 0 ? "CW" : "CCW"}`);
        void center;
    }
    const again = buildCourseGeometry(authored, origin);
    check(JSON.stringify(again) === JSON.stringify(geometry), "deterministic geometry");
    return { passed: failures.length === 0, failures, checks };
}

export function assertLevelGeometryRegression(devInput: unknown, polygonInput: unknown): void {
    const result = runLevelGeometryRegression(devInput, polygonInput);
    if (!result.passed) throw new Error(`LD-8D geometry regression failed (${result.checks} checks):\n${result.failures.join("\n")}`);
}

import { assertCourseGeometryAccelerationValidation } from "../debug/CourseGeometryAccelerationValidation";
import { buildCourseGeometry } from "./CourseGeometryBuilder";
import { CourseEnvironmentBoundary } from "./CourseEnvironmentBoundary";
import type { LevelCourseDefinition } from "./LevelDefinition";

const check = (condition: boolean, message: string): void => {
    if (!condition) throw new Error(`[E1] ${message}`);
};
const rectangle: LevelCourseDefinition = {
    type: "rectangle", width: 200, height: 120, baseSurface: "grass",
    openings: [{ side: "top", start: 80, end: 120 }],
};
const concave: LevelCourseDefinition = {
    type: "polygon", width: 200, height: 200, baseSurface: "grass",
    vertices: [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 200 },
        { x: 130, y: 200 }, { x: 130, y: 70 }, { x: 70, y: 70 },
        { x: 70, y: 200 }, { x: 0, y: 200 }],
    openings: [{ edgeIndex: 0, start: 80, end: 120 }, { edgeIndex: 2, start: 20, end: 50 }],
};
const convex: LevelCourseDefinition = {
    type: "polygon", width: 200, height: 200, baseSurface: "grass",
    vertices: [{ x: 100, y: 0 }, { x: 200, y: 100 }, { x: 100, y: 200 }, { x: 0, y: 100 }],
    openings: [],
};

/** Pure assertions, safe to call during development without constructing a Pixi world. */
export function assertCourseEnvironmentBoundaryValidation(): void {
    assertCourseGeometryAccelerationValidation();
    const origin = { x: 350, y: -120 };
    const rect = new CourseEnvironmentBoundary(buildCourseGeometry(rectangle, origin));
    check(rect.containsPoint(450, -60), "rectangle origin / inside");
    check(!rect.containsPoint(300, -60), "rectangle outside");
    check(rect.containsCircle(450, -60, 10), "circle containment");
    check(!rect.containsCircle(352, -60, 10), "circle crossing edge");
    check(rect.isValidCell(400, -100, 8), "valid full cell");
    check(!rect.isValidCell(345, -100, 8), "invalid boundary cell");
    check(rect.intersectsWall({ x: 380, y: -60 }, { x: 340, y: -60 }), "solid wall intersection");
    check(!rect.intersectsWall({ x: 450, y: -100 }, { x: 450, y: -140 }), "opening has no wall");
    check(rect.crossesCourseBoundary({ x: 450, y: -100 }, { x: 450, y: -140 }), "opening still crosses polygon");
    const diamond = new CourseEnvironmentBoundary(buildCourseGeometry(convex, { x: 0, y: 0 }));
    check(diamond.containsPoint(100, 100), "convex polygon inside");
    check(!diamond.containsPoint(10, 10), "convex polygon outside");
    check(diamond.intersectsWall({ x: 100, y: 100 }, { x: 210, y: 100 }), "diagonal wall intersection");
    const poly = new CourseEnvironmentBoundary(buildCourseGeometry(concave, { x: 0, y: 0 }));
    check(poly.containsPoint(40, 150), "concave polygon arm inside");
    check(!poly.containsPoint(100, 150), "concave polygon notch outside");
    check(poly.getBoundaryCrossings({ x: 40, y: 150 }, { x: 160, y: 150 }).length === 2,
        "concave excursion detected with both endpoints inside");
    check(poly.crossesCourseBoundary({ x: 40, y: 150 }, { x: 160, y: 150 }), "concave crossing");
    check(!poly.isValidCell(68, 90, 8), "cell intersecting concave notch rejected");
    check(!poly.intersectsWall({ x: 100, y: 20 }, { x: 100, y: -20 }), "polygon opening remains open");
}

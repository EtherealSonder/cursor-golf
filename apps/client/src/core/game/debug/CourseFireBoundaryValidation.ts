import { buildCourseGeometry } from "../level/CourseGeometryBuilder";
import { CourseEnvironmentBoundary } from "../level/CourseEnvironmentBoundary";
import type { LevelCourseDefinition } from "../level/LevelDefinition";

const check = (condition: boolean, reason: string): void => {
    if (!condition) throw new Error(`[E2-B] ${reason}`);
};

/** Pure course/fire geometry regressions; gameplay simulation is tested in-browser. */
export function assertCourseFireBoundaryValidation(): void {
    const rectangle: LevelCourseDefinition = {
        type: "rectangle", width: 200, height: 120, baseSurface: "grass",
        openings: [{ side: "top", start: 80, end: 120 }],
    };
    const rect = new CourseEnvironmentBoundary(buildCourseGeometry(rectangle, { x: 0, y: 0 }));
    check(rect.containsPoint(100, 60), "point ignition in course");
    check(!rect.containsPoint(-1, 60), "point ignition outside course");
    check(rect.intersectsWall({ x: 30, y: 60 }, { x: -10, y: 60 }), "directional jet blocked by wall");
    check(!rect.intersectsWall({ x: 100, y: 20 }, { x: 100, y: -20 }), "opening has no wall");
    check(rect.crossesCourseBoundary({ x: 100, y: 20 }, { x: 100, y: -20 }), "opening is void exit");
    const concave: LevelCourseDefinition = {
        type: "polygon", width: 200, height: 200, baseSurface: "grass",
        vertices: [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 200 },
            { x: 130, y: 200 }, { x: 130, y: 70 }, { x: 70, y: 70 },
            { x: 70, y: 200 }, { x: 0, y: 200 }], openings: [],
    };
    const poly = new CourseEnvironmentBoundary(buildCourseGeometry(concave, { x: 0, y: 0 }));
    check(!poly.containsPoint(100, 150), "concave notch invalid for ignition/scorch");
    check(poly.crossesCourseBoundary({ x: 40, y: 150 }, { x: 160, y: 150 }), "cross-notch path invalid");
    check(poly.intersectsWall({ x: 40, y: 150 }, { x: 160, y: 150 }), "cross-notch wall obstruction");
}

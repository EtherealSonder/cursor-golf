import { buildCourseGeometry } from "../level/CourseGeometryBuilder";
import { CourseEnvironmentBoundary } from "../level/CourseEnvironmentBoundary";
import type { LevelCourseDefinition } from "../level/LevelDefinition";
import { WaterField } from "../environment/WaterField";
import { WaterObstacleField } from "../environment/WaterObstacleField";

const requireCondition = (ok: boolean, description: string): void => {
    if (!ok) throw new Error(`[E2-A] ${description}`);
};

/** Standalone geometry/grid tests; no Pixi, physics scene or global state. */
export function assertCourseWaterBoundaryValidation(): void {
    const course: LevelCourseDefinition = {
        type: "polygon", width: 200, height: 200, baseSurface: "grass",
        vertices: [
            { x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 200 },
            { x: 130, y: 200 }, { x: 130, y: 70 }, { x: 70, y: 70 },
            { x: 70, y: 200 }, { x: 0, y: 200 },
        ],
        openings: [{ edgeIndex: 0, start: 80, end: 120 }],
    };
    const boundary = new CourseEnvironmentBoundary(buildCourseGeometry(course, { x: 0, y: 0 }));
    const field = new WaterField(undefined, {
        minimumX: 0, minimumY: 0, maximumX: 200, maximumY: 200,
    });
    const obstacles = new WaterObstacleField(field);
    obstacles.setCourseBoundary(boundary);
    field.setObstacleField(obstacles);
    field.setCourseEnvironmentBoundary(boundary);
    requireCondition(field.injectWater(40, 40, 0.25) > 0, "valid grass accepts water");
    requireCondition(field.injectWater(100, 150, 0.25) === 0, "concave notch rejects water");
    requireCondition(field.injectWater(100, -1, 0.25) === 0, "opening outside rejects water");
    requireCondition(obstacles.isBlocked(12, 18), "concave notch is blocked");
    requireCondition(!obstacles.isBlocked(5, 5), "playable grass remains occupiable");
    obstacles.clear();
    requireCondition(obstacles.isBlocked(12, 18), "course mask survives obstacle cache refresh");
    requireCondition(boundary.getBoundaryCrossings({ x: 40, y: 150 }, { x: 160, y: 150 }).length === 2,
        "concave excursion is detectable");
}

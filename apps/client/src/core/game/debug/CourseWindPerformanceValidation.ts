import { buildCourseGeometry } from "../level/CourseGeometryBuilder";
import { CourseEnvironmentBoundary } from "../level/CourseEnvironmentBoundary";
import { LocalWindObstacleQuery } from "../environment/LocalWindObstacleQuery";
import type { LevelCourseDefinition } from "../level/LevelDefinition";
import type { PhysicsWorld } from "../physics/PhysicsWorld";
import type { LocalWindObstacleDefinition } from "../config/LocalWindDefinition";

/** P2 deterministic checks for the fast boundary and analytical obstacle query. */
export function assertCourseWindPerformanceValidation(): void {
    const course: LevelCourseDefinition = {
        type: "rectangle", width: 200, height: 120, baseSurface: "grass",
        openings: [{ side: "top", start: 80, end: 120 }],
    };
    const boundary = new CourseEnvironmentBoundary(buildCourseGeometry(course, { x: 0, y: 0 }));
    const assert = (ok: boolean, label: string) => { if (!ok) throw new Error(`[P2] ${label}`); };
    assert(!boundary.blocksSegment(40, 40, 60, 40), "interior clear");
    assert(boundary.blocksSegment(40, 40, -20, 40), "solid wall");
    assert(boundary.blocksSegment(100, 20, 100, -20), "opening exits into void");
    const physics = {
        getRigidStaticRevision: () => 0,
        getRigidStaticDefinitions: () => [{
            id: "test-rotated-wall", shape: "rectangle", positionX: 100, positionY: 60,
            width: 80, height: 8, rotationRadians: Math.PI / 4,
        }],
        getRigidFixedShapes: () => [],
    } as unknown as PhysicsWorld;
    const config = { sampleSpacing: 10, collisionTolerance: 0, edgeWrapDistance: 0,
        edgeWrapStrengthMultiplier: 0 } as LocalWindObstacleDefinition;
    const query = new LocalWindObstacleQuery(physics, config);
    query.setCourseEnvironmentBoundary(boundary);
    assert(query.segmentBlocked(60, 60, 140, 60), "rotated wall obstructs");
    assert(!query.segmentBlocked(20, 20, 40, 20), "clear ray remains clear");
    assert(query.segmentBlocked(40, 40, -20, 40), "course boundary obstructs");
}

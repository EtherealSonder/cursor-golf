import type { CourseBoundaryDefinition } from "../config/CourseBoundaryDefinition";
import { deriveCourseTechnicalBoundary } from "../config/CourseBoundaryDefinition";
import type { RuntimeLevelDefinition } from "./LevelRuntimeDefinition";

/** Technical safety envelope; NOT the authored playable region. */
export function resolveLevelTechnicalBounds(
    level: RuntimeLevelDefinition,
    marginX = 1200,
    marginY = 900,
): CourseBoundaryDefinition {
    const course = level.course;
    const bounds = course.generatedGeometry?.bounds ?? {
        minimumX: course.minimumX, maximumX: course.maximumX,
        minimumY: course.minimumY, maximumY: course.maximumY,
    };
    return deriveCourseTechnicalBoundary(bounds, marginX, marginY);
}

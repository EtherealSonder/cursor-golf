import type { GeneratedCourseGeometry } from "./LevelRuntimeDefinition";
import { containsCourseCircle } from "./CourseGeometryQueries";

/** Authored playable boundary; separate from the technical safety envelope. */
export class LevelNavigationBounds {
    constructor(private readonly geometry: GeneratedCourseGeometry) {}

    public containsCircle(x: number, y: number, clearanceRadius: number): boolean {
        return containsCourseCircle(this.geometry, { x, y }, clearanceRadius);
    }
}

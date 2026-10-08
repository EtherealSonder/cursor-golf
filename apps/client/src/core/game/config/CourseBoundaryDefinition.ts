/**
 * Defines the large technical world safety boundary used by
 * Ball hard containment and Camera boundary calculation.
 *
 * D-5 gameplay course/OOB geometry is intentionally separate and lives in
 * GameplayCourseDefinition. Crossing that authored course is allowed; this
 * boundary remains only as a final simulation safety net.
 *
 * These dimensions describe world coordinates.
 *
 * They are independent from the visible logical
 * PixiJS viewport.
 */
export interface CourseBoundaryDefinition {

    /**
     * Left edge of the playable world.
     */
    readonly minimumX: number;

    /**
     * Right edge of the playable world.
     */
    readonly maximumX: number;

    /**
     * Top edge of the playable world.
     */
    readonly minimumY: number;

    /**
     * Bottom edge of the playable world.
     */
    readonly maximumY: number;
}

/**
 * Expanded technical world/camera safety boundary.
 *
 * The visible logical viewport remains:
 *
 * 1200 × 720
 *
 * The initial Camera position remains:
 *
 * X: 0
 * Y: 0
 *
 * Therefore the initially visible world region is:
 *
 * X: 0 to 1200
 * Y: 0 to 720
 *
 * The course uses dimensions based on whole
 * multiples of the temporary 980 × 980 terrain
 * texture.
 *
 * Horizontal size:
 *
 * 6 × 980 = 5880 world pixels
 *
 * Vertical size:
 *
 * 4 × 980 = 3920 world pixels
 *
 * Total playable size:
 *
 * 5880 × 3920 world pixels
 *
 * Camera limits for a 1200 × 720 viewport become:
 *
 * Camera X:
 * -1960 to 2720
 *
 * Camera Y:
 * -980 to 2220
 */
export const DEFAULT_COURSE_BOUNDARY_DEFINITION:
    CourseBoundaryDefinition = {

    minimumX:
        -1960,

    maximumX:
        3920,

    minimumY:
        -980,

    maximumY:
        2940,
};
/** Expand a level's world-space AABB into a technical simulation boundary.
 * Preserve the legacy envelope when the level fits inside it, so the
 * development course keeps its original camera and simulation limits. */
export function deriveCourseTechnicalBoundary(
    bounds: CourseBoundaryDefinition,
    marginX = 1200,
    marginY = 900,
    legacy: CourseBoundaryDefinition = DEFAULT_COURSE_BOUNDARY_DEFINITION,
): CourseBoundaryDefinition {
    if (![bounds.minimumX, bounds.maximumX, bounds.minimumY, bounds.maximumY, marginX, marginY].every(Number.isFinite) ||
        bounds.maximumX <= bounds.minimumX || bounds.maximumY <= bounds.minimumY || marginX < 0 || marginY < 0) {
        throw new Error("Invalid level technical bounds or safety margins.");
    }
    return {
        minimumX: Math.min(legacy.minimumX, bounds.minimumX - marginX),
        maximumX: Math.max(legacy.maximumX, bounds.maximumX + marginX),
        minimumY: Math.min(legacy.minimumY, bounds.minimumY - marginY),
        maximumY: Math.max(legacy.maximumY, bounds.maximumY + marginY),
    };
}

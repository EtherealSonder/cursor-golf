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
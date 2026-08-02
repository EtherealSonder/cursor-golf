/**
 * Defines the rectangular playable world used by
 * Ball and obstacle boundary collision.
 *
 * These dimensions describe world coordinates.
 * They are intentionally independent from the
 * visible PixiJS viewport during C7 open-field
 * wind validation.
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
 * Temporary enlarged C7 validation world.
 *
 * The visible viewport remains 1200 × 720 and
 * initially displays world coordinates:
 *
 * X: 0 to 1200
 * Y: 0 to 720
 *
 * The playable world extends one additional visible
 * viewport in every direction. This allows the Ball
 * to leave the screen without immediately colliding
 * with a course boundary while camera support is not
 * yet implemented.
 *
 * Total playable size:
 *
 * 3600 × 2160 world pixels.
 */
export const DEFAULT_COURSE_BOUNDARY_DEFINITION:
    CourseBoundaryDefinition = {

    minimumX: -1200,
    maximumX: 2400,

    minimumY: -720,
    maximumY: 1440,
};

import {
    DEFAULT_GAME_VIEWPORT_DEFINITION,
} from "./GameViewportDefinition";

/**
 * Defines the temporary Phase 4C.2 obstacle field.
 *
 * Obstacles are distributed using deterministic
 * stratified-grid placement.
 *
 * The playable generation area is divided into cells.
 * One obstacle is placed inside each selected cell,
 * with controlled random jitter.
 *
 * This guarantees broad map coverage while avoiding
 * the regional growth behaviour of Poisson sampling.
 */
export interface ProceduralObstacleFieldDefinition {

    /**
     * Deterministic random seed.
     *
     * The same seed and configuration produce the
     * same obstacle layout on every run.
     */
    readonly seed: number;

    /**
     * Total number of generated obstacles.
     */
    readonly obstacleCount: number;

    /**
     * Fraction of generated obstacles that become
     * static obstacles.
     *
     * Remaining obstacles become dynamic.
     */
    readonly staticObstacleRatio: number;

    /**
     * Empty space retained between generated obstacle
     * centers and each course boundary.
     */
    readonly courseBoundaryMargin: number;

    /**
     * Empty circular region around the Ball's initial
     * position.
     */
    readonly ballSpawnExclusionRadius: number;

    /**
     * Minimum allowed center-to-center distance
     * between generated obstacles.
     */
    readonly minimumSpacing: number;

    /**
     * Maximum fraction of a grid cell's width and
     * height used as positional jitter.
     *
     * Example:
     *
     * 0.35 means an obstacle may move up to 35% of
     * the cell width horizontally and 35% of the
     * cell height vertically away from its center.
     *
     * This value must remain below 0.5 so generated
     * points stay inside their assigned cells.
     */
    readonly cellJitterRatio: number;

    /**
     * Number of candidate positions attempted inside
     * each cell before a fallback position is used.
     */
    readonly placementAttemptsPerCell: number;

    /**
     * Width of every temporary obstacle rectangle.
     */
    readonly obstacleWidth: number;

    /**
     * Height of every temporary obstacle rectangle.
     */
    readonly obstacleHeight: number;

    /**
     * Fill color used by static obstacles.
     */
    readonly staticFillColor: number;

    /**
     * Fill color used by dynamic obstacles.
     */
    readonly dynamicFillColor: number;

    /**
     * Shared obstacle outline color.
     */
    readonly outlineColor: number;

    /**
     * Shared obstacle outline width.
     */
    readonly outlineWidth: number;

    // -------------------------------------------------------
    // Static Collision Configuration
    // -------------------------------------------------------

    readonly staticRestitution: number;

    readonly staticCollisionFriction: number;

    // -------------------------------------------------------
    // Dynamic Collision and Rigid-Body Configuration
    // -------------------------------------------------------

    readonly dynamicRestitution: number;

    readonly dynamicFriction: number;

    readonly dynamicMass: number;

    readonly dynamicLinearDamping: number;

    readonly dynamicAngularDamping: number;

    readonly dynamicSleepLinearSpeedThreshold:
    number;

    readonly dynamicSleepAngularSpeedThreshold:
    number;

    readonly dynamicSleepDelay: number;

    readonly dynamicMaximumLinearSpeed:
    number;

    readonly dynamicMaximumAngularSpeed:
    number;
}

/**
 * Temporary Phase 4C.2 camera-validation layout.
 *
 * Fifteen obstacles across the current course produce
 * an automatically calculated 5-column by 3-row grid.
 *
 * Static rectangles are dark grey.
 * Dynamic rectangles are orange.
 */
export const DEFAULT_PROCEDURAL_OBSTACLE_FIELD_DEFINITION:
    ProceduralObstacleFieldDefinition = {

    seed:
        42731,

    obstacleCount:
        15,

    staticObstacleRatio:
        0.6,

    courseBoundaryMargin:
        220,

    ballSpawnExclusionRadius:
        260,

    minimumSpacing:
        260,

    cellJitterRatio:
        0.35,

    placementAttemptsPerCell:
        40,

    obstacleWidth:
        150,

    obstacleHeight:
        150,

    staticFillColor:
        0x4b5560,

    dynamicFillColor:
        0xe67e22,

    outlineColor:
        0x1f2933,

    outlineWidth:
        5,

    staticRestitution:
        0.72,

    staticCollisionFriction:
        0.1,

    dynamicRestitution:
        0.68,

    dynamicFriction:
        0.22,

    dynamicMass:
        8,

    dynamicLinearDamping:
        1.8,

    dynamicAngularDamping:
        2.5,

    dynamicSleepLinearSpeedThreshold:
        4,

    dynamicSleepAngularSpeedThreshold:
        0.08,

    dynamicSleepDelay:
        0.5,

    dynamicMaximumLinearSpeed:
        750,

    dynamicMaximumAngularSpeed:
        8,
};

/**
 * Current initial Ball world position.
 *
 * Procedural obstacles cannot be placed within the
 * configured exclusion radius around this point.
 */
export const DEFAULT_PROCEDURAL_OBSTACLE_EXCLUSION_CENTER = {

    x:
        DEFAULT_GAME_VIEWPORT_DEFINITION
            .width /
        2,

    y:
        DEFAULT_GAME_VIEWPORT_DEFINITION
            .height /
        2,
};
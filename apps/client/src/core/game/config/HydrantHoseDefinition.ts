import type { CourseBoundaryDefinition } from "./CourseBoundaryDefinition";
import { DEFAULT_COURSE_BOUNDARY_DEFINITION } from "./CourseBoundaryDefinition";

export interface HydrantHoseDefinition {
    /**
     * Main circular Hydrant body collider. This deliberately follows the body
     * rather than the small decorative fittings extending outside the circle.
     */
    readonly hydrantCollisionRadius: number;
    readonly hydrantCollisionRestitution: number;
    readonly hydrantCollisionFriction: number;
    readonly hydrantCollisionPositionSlop: number;
    readonly hydrantCollisionRestingNormalSpeed: number;

    readonly segmentCount: number;
    readonly segmentLength: number;
    readonly pointRadius: number;
    readonly nozzleRadius: number;

    /** General Hose-versus-world collider tuning. */
    readonly hoseObstacleCollisionRadius: number;
    readonly hoseObstacleCollisionIterations: number;
    readonly hoseObstacleCollisionSlop: number;
    readonly fixedTimeStep: number;
    readonly maximumSubSteps: number;
    readonly dampingPerSecond: number;
    readonly constraintIterations: number;
    readonly collisionIterations: number;
    readonly collisionRestitution: number;
    readonly collisionFriction: number;
    readonly collisionPositionSlop: number;
    readonly collisionRestingNormalSpeed: number;
    readonly hoseInverseMass: number;
    readonly randomAngleMinimumRadians: number;
    readonly randomAngleMaximumRadians: number;
    readonly initialBendRadians: number;
    readonly boundaryPadding: number;
    readonly courseBoundary: CourseBoundaryDefinition;
    readonly visual: {
        readonly hoseWidth: number;
        readonly hoseColor: number;
        readonly hoseAlpha: number;
        readonly hydrantSpriteWidth: number;
        readonly hydrantSpriteHeight: number;
        readonly hydrantSpriteAnchorX: number;
        readonly hydrantSpriteAnchorY: number;
        readonly hydrantSpriteOffsetX: number;
        readonly hydrantSpriteOffsetY: number;
        readonly nozzleLength: number;
        readonly nozzleWidth: number;
        readonly nozzleColor: number;
        readonly debugPointRadius: number;
        readonly debugPointColor: number;
        readonly debugPointsVisible: boolean;
    };
}

export const DEFAULT_HYDRANT_HOSE_DEFINITION: HydrantHoseDefinition = {
    /*
     * Phase 8B-14A damage-state revision:
     * The Hydrant art is now visually larger and the collider follows the
     * main circular body instead of the previous small temporary Graphics.
     */
    hydrantCollisionRadius: 28,
    hydrantCollisionRestitution: 0.34,
    hydrantCollisionFriction: 0.12,
    hydrantCollisionPositionSlop: 0.10,
    hydrantCollisionRestingNormalSpeed: 8,

    segmentCount: 24,
    segmentLength: 28,

    pointRadius: 5,
    nozzleRadius: 8,

    /* Slightly wider than the drawn Hose centreline for stable continuous contact. */
    hoseObstacleCollisionRadius: 7,
    hoseObstacleCollisionIterations: 3,
    hoseObstacleCollisionSlop: 0.25,

    fixedTimeStep: 1 / 120,
    maximumSubSteps: 6,
    dampingPerSecond: 3.2,

    constraintIterations: 8,

    collisionIterations: 3,
    collisionRestitution: 0.24,
    collisionFriction: 0.12,
    collisionPositionSlop: 0.05,
    collisionRestingNormalSpeed: 8,

    hoseInverseMass: 1,

    randomAngleMinimumRadians: -Math.PI,
    randomAngleMaximumRadians: Math.PI,

    initialBendRadians: 0.18,

    boundaryPadding: 1,
    courseBoundary: DEFAULT_COURSE_BOUNDARY_DEFINITION,

    visual: {
        hoseWidth: 13,
        hoseColor: 0x403442,
        hoseAlpha: 0.92,

        /*
         * fire_hydrant.png source aspect ratio is approximately 1.216.
         * These values are presentation-only. The solid collider above is
         * tuned separately to the main circular body.
         */
        hydrantSpriteWidth: 72,
        hydrantSpriteHeight: 59.22,
        hydrantSpriteAnchorX: 0.5,
        hydrantSpriteAnchorY: 0.41,
        hydrantSpriteOffsetX: 0,
        hydrantSpriteOffsetY: 0,

        nozzleLength: 20,
        nozzleWidth: 11,
        nozzleColor: 0xd8bea8,
        debugPointRadius: 2.5,
        debugPointColor: 0xfff4d6,
        debugPointsVisible: false,
    },
};

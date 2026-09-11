import type { CourseBoundaryDefinition } from "./CourseBoundaryDefinition";
import { DEFAULT_COURSE_BOUNDARY_DEFINITION } from "./CourseBoundaryDefinition";

export interface HydrantHoseDefinition {
    readonly hydrantCollisionRadius: number;
    readonly segmentCount: number;
    readonly segmentLength: number;
    readonly pointRadius: number;
    readonly nozzleRadius: number;
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
        readonly hydrantRadius: number;
        readonly hydrantColor: number;
        readonly nozzleLength: number;
        readonly nozzleWidth: number;
        readonly nozzleColor: number;
        readonly debugPointRadius: number;
        readonly debugPointColor: number;
        readonly debugPointsVisible: boolean;
    };
}

export const DEFAULT_HYDRANT_HOSE_DEFINITION: HydrantHoseDefinition = {
    hydrantCollisionRadius: 18,
    /*
     * Phase 8B-10A.8:
     *
     * Keep the tested 28 px physical resolution while tripling the Hose
     * length from 8 to 24 constrained segments.
     */
    segmentCount: 24,
    segmentLength: 28,

    /*
     * pointRadius remains useful for course containment and debug purposes.
     * Ball collision now treats the Hose body as continuous capsules between
     * adjacent rope points instead of independent point circles.
     */
    pointRadius: 5,
    nozzleRadius: 8,

    fixedTimeStep: 1 / 120,
    maximumSubSteps: 6,
    dampingPerSecond: 3.2,

    /*
     * The existing PBD solver remains unchanged in character. Eight passes
     * provide enough stiffness for the longer 24-segment Hose while keeping
     * the system inexpensive.
     */
    constraintIterations: 8,

    /*
     * Capsule collision is resolved in a small bounded number of passes.
     * Each pass resolves only the single deepest Hose contact, preventing
     * neighbouring segments from fighting over the Ball.
     */
    collisionIterations: 3,
    collisionRestitution: 0.24,
    collisionFriction: 0.12,

    /*
     * Tiny positional overlap is tolerated and low-speed normal contact does
     * not generate a bounce impulse. This lets a Ball resting against the
     * Hose settle back to an interactable state.
     */
    collisionPositionSlop: 0.05,
    collisionRestingNormalSpeed: 8,

    hoseInverseMass: 1,

    randomAngleMinimumRadians: -Math.PI,
    randomAngleMaximumRadians: Math.PI,

    /*
     * Used to create a gentle initial curve rather than a visible zig-zag.
     */
    initialBendRadians: 0.18,

    boundaryPadding: 1,
    courseBoundary: DEFAULT_COURSE_BOUNDARY_DEFINITION,

    visual: {
        hoseWidth: 13,
        hoseColor: 0x403442,
        hoseAlpha: 0.92,
        hydrantRadius: 18,
        hydrantColor: 0xd9574f,
        nozzleLength: 20,
        nozzleWidth: 11,
        nozzleColor: 0xd8bea8,
        debugPointRadius: 2.5,
        debugPointColor: 0xfff4d6,
        debugPointsVisible: false,
    },
};

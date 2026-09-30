import type {
    BallExplosionDeathDefinition,
} from "../config/BallExplosionDeathDefinition";
import {
    DEFAULT_BALL_EXPLOSION_DEATH_DEFINITION,
} from "../config/BallExplosionDeathDefinition";
import type {
    ProximityMineExplosionEvent,
} from "../config/ProximityMineExplosionDefinition";

export interface BallExplosionDeathTarget {
    readonly x: number;
    readonly y: number;
    readonly radius: number;
}

/**
 * D-6 pure gameplay evaluator.
 *
 * The immutable mine explosion event is the subsystem boundary. VFX never
 * decides lethality. Surface distance is used so a Ball whose physical edge
 * intersects the lethal core is considered caught by the intense explosion.
 */
export class BallExplosionDeathEvaluator {
    constructor(
        private readonly definition:
            BallExplosionDeathDefinition =
            DEFAULT_BALL_EXPLOSION_DEATH_DEFINITION,
    ) {}

    public isLethal(
        event: ProximityMineExplosionEvent,
        ball: BallExplosionDeathTarget,
    ): boolean {
        if (
            !Number.isFinite(event.x) ||
            !Number.isFinite(event.y) ||
            !Number.isFinite(ball.x) ||
            !Number.isFinite(ball.y) ||
            !Number.isFinite(ball.radius) ||
            ball.radius < 0
        ) {
            return false;
        }

        const centerDistance =
            Math.hypot(
                ball.x - event.x,
                ball.y - event.y,
            );

        const surfaceDistance =
            Math.max(
                0,
                centerDistance - ball.radius,
            );

        return (
            surfaceDistance <=
            this.definition.lethalRadius
        );
    }
}

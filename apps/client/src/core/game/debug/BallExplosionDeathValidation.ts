import {
    DEFAULT_BALL_EXPLOSION_DEATH_DEFINITION,
} from "../config/BallExplosionDeathDefinition";
import type {
    ProximityMineExplosionEvent,
} from "../config/ProximityMineExplosionDefinition";
import {
    BallExplosionDeathEvaluator,
} from "../death/BallExplosionDeathEvaluator";

/**
 * D-6 focused development validation.
 *
 * Throws only when the pure lethality contract is broken. It does not mutate
 * World, lives, Ball state, explosion physics, or presentation.
 */
export class BallExplosionDeathValidation {
    public static validate(): void {
        const evaluator =
            new BallExplosionDeathEvaluator();

        const event:
            ProximityMineExplosionEvent = {
                mineId: "d6-validation-mine",
                target: "ball",
                x: 0,
                y: 0,
                blastRadius: 220,
                maximumImpulse: 14000,
                maximumAddedSpeed: 950,
            };

        const lethalRadius =
            DEFAULT_BALL_EXPLOSION_DEATH_DEFINITION
                .lethalRadius;

        const ballRadius = 10;

        const expect = (
            condition: boolean,
            message: string,
        ): void => {
            if (!condition) {
                throw new Error(
                    `[D-6] ${message}`,
                );
            }
        };

        expect(
            evaluator.isLethal(
                event,
                {
                    x: 0,
                    y: 0,
                    radius: ballRadius,
                },
            ),
            "Ball at explosion center must be lethal.",
        );

        expect(
            evaluator.isLethal(
                event,
                {
                    x:
                        lethalRadius +
                        ballRadius,
                    y: 0,
                    radius: ballRadius,
                },
            ),
            "Ball touching the lethal-core boundary must be lethal.",
        );

        expect(
            !evaluator.isLethal(
                event,
                {
                    x:
                        lethalRadius +
                        ballRadius +
                        0.01,
                    y: 0,
                    radius: ballRadius,
                },
            ),
            "Ball just outside the lethal-core boundary must survive.",
        );

        const knockbackOnlyCenterDistance =
            (
                lethalRadius +
                event.blastRadius
            ) * 0.5 +
            ballRadius;

        expect(
            !evaluator.isLethal(
                event,
                {
                    x:
                        knockbackOnlyCenterDistance,
                    y: 0,
                    radius: ballRadius,
                },
            ),
            "Outer blast region must remain non-lethal.",
        );

        expect(
            knockbackOnlyCenterDistance -
                ballRadius <
                event.blastRadius,
            "Outer validation target must still lie inside physical blast radius.",
        );
    }
}

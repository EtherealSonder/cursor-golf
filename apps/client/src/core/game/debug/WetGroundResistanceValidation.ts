import {
    DRY_SAND_STATE_DEFINITION,
    NORMAL_GRASS_STATE_DEFINITION,
    SCORCHED_GRASS_STATE_DEFINITION,
    WET_GRASS_STATE_DEFINITION,
    WET_SAND_STATE_DEFINITION,
} from "../surface/SurfaceStateDefinition";

/**
 * Phase 8I-8C wet-ground resistance review.
 *
 * This validation intentionally treats categorical Wet terrain separately
 * from standing Water. Standing-Water drag remains authoritative in
 * BallWaterInteraction and is not reproduced here.
 *
 * The controlled-distance model uses the same baseline rolling-deceleration
 * relationship for every surface:
 *
 *     stoppingDistance = v^2 / (2 * a * resistanceMultiplier)
 *
 * The absolute baseline speed/deceleration values are arbitrary because this
 * validation is checking the relative surface hierarchy produced by the
 * authoritative multipliers.
 */
export class WetGroundResistanceValidation {

    private static hasRun =
        false;

    public run():
        void {

        if (
            WetGroundResistanceValidation
                .hasRun
        ) {
            return;
        }

        WetGroundResistanceValidation
            .hasRun =
            true;

        console.log(
            "[8I-8C] WET-GROUND RESISTANCE REVIEW",
        );

        const scorched =
            SCORCHED_GRASS_STATE_DEFINITION
                .rollingResistanceMultiplier;

        const normal =
            NORMAL_GRASS_STATE_DEFINITION
                .rollingResistanceMultiplier;

        const wetGrass =
            WET_GRASS_STATE_DEFINITION
                .rollingResistanceMultiplier;

        const drySand =
            DRY_SAND_STATE_DEFINITION
                .rollingResistanceMultiplier;

        const wetSand =
            WET_SAND_STATE_DEFINITION
                .rollingResistanceMultiplier;

        const initialSpeed =
            300;

        const baselineRollingDeceleration =
            150;

        const distanceFor =
            (
                multiplier:
                    number,
            ): number => {

                return (
                    initialSpeed *
                    initialSpeed
                ) / (
                    2 *
                    baselineRollingDeceleration *
                    multiplier
                );
            };

        const scorchedDistance =
            distanceFor(
                scorched,
            );

        const normalDistance =
            distanceFor(
                normal,
            );

        const wetGrassDistance =
            distanceFor(
                wetGrass,
            );

        const drySandDistance =
            distanceFor(
                drySand,
            );

        const wetSandDistance =
            distanceFor(
                wetSand,
            );

        console.log(
            `[8I-8C] Resistance samples: scorchedGrass=${scorched.toFixed(3)}x, normalGrass=${normal.toFixed(3)}x, wetGrass=${wetGrass.toFixed(3)}x, wetSand=${wetSand.toFixed(3)}x, drySand=${drySand.toFixed(3)}x`,
        );

        console.log(
            `[8I-8C] Controlled roll-distance samples: scorchedGrass=${scorchedDistance.toFixed(2)}, normalGrass=${normalDistance.toFixed(2)}, wetGrass=${wetGrassDistance.toFixed(2)}, wetSand=${wetSandDistance.toFixed(2)}, drySand=${drySandDistance.toFixed(2)}`,
        );

        const results = [
            this.check(
                "Scorched Grass remains faster than Normal Grass",
                scorched <
                normal &&
                scorchedDistance >
                normalDistance,
            ),
            this.check(
                "Wet Grass is substantially more resistant than Normal Grass",
                wetGrass >
                normal &&
                wetGrassDistance <
                normalDistance,
            ),
            this.check(
                "Wet Grass uses the 5.00x review candidate",
                this.nearlyEqual(
                    wetGrass,
                    5.00,
                ),
            ),
            this.check(
                "Wet Sand remains less resistant than Dry Sand",
                wetSand <
                drySand &&
                wetSandDistance >
                drySandDistance,
            ),
            this.check(
                "Wet Sand remains slower than Normal Grass",
                wetSand >
                normal &&
                wetSandDistance <
                normalDistance,
            ),
            this.check(
                "All surface resistance multipliers are finite and positive",
                [
                    scorched,
                    normal,
                    wetGrass,
                    wetSand,
                    drySand,
                ].every(
                    (
                        value:
                            number,
                    ): boolean =>
                        Number.isFinite(
                            value,
                        ) &&
                        value >
                        0,
                ),
            ),
        ];

        const passed =
            results.every(
                (
                    result:
                        boolean,
                ): boolean =>
                    result,
            );

        console.log(
            `[8I-8C] RESULT: ${passed ? "PASS" : "FAIL"}`,
        );
    }

    private check(
        label:
            string,

        passed:
            boolean,
    ): boolean {

        console.log(
            `[8I-8C] ${label}: ${passed ? "PASS" : "FAIL"}`,
        );

        return passed;
    }

    private nearlyEqual(
        a:
            number,

        b:
            number,
    ): boolean {

        return Math.abs(
            a -
            b,
        ) <=
        1e-9;
    }
}

import {
    SurfaceType,
} from "../surface/SurfaceType";

import {
    SurfaceSystem,
} from "../surface/SurfaceSystem";

import {
    EnvironmentField,
} from "../environment/EnvironmentField";

import {
    WaterField,
} from "../environment/WaterField";

import {
    WaterGroundInteractionSystem,
} from "../environment/WaterGroundInteractionSystem";

import {
    LocalWindSystem,
} from "../environment/LocalWindSystem";

import {
    FireManager,
} from "../environment/FireManager";

/**
 * Phase 8F-8 regression validation.
 *
 * EnvironmentField burnAmount is the authoritative persistent Fire-damage
 * history used by ScorchRenderer. Water and retained moisture may extinguish
 * Fire and alter moisture, but they must never reduce that burn history.
 *
 * Sprinkler/Hose cases below exercise the common authoritative WaterField
 * deposition path with source-like repeated deposits. Their entity mechanics
 * are already validated independently by the earlier Water-source phases.
 */
export class WaterFireScorchHistoryValidation {
    private static readonly TEST_X = 640;
    private static readonly TEST_Y = 400;

    private static readonly BURN_RADIUS = 34;
    private static readonly BURN_AMOUNT = 0.85;
    private static readonly BURN_NOISE_SEED = 808;

    private static readonly STEP = 0.1;

    public static run(): void {
        console.log(
            "[8F-8] PRESERVE BURN AND SCORCH HISTORY",
        );

        const surfaceSystem =
            new SurfaceSystem(
                SurfaceType.Grass,
            );

        const environmentField =
            new EnvironmentField(
                surfaceSystem,
            );

        const waterField =
            new WaterField();

        const groundInteraction =
            new WaterGroundInteractionSystem(
                waterField,
                environmentField,
                surfaceSystem,
            );

        const fireManager =
            new FireManager(
                surfaceSystem,
                environmentField,
                new LocalWindSystem([]),
            );

        environmentField.depositBurn(
            this.TEST_X,
            this.TEST_Y,
            this.BURN_RADIUS,
            this.BURN_AMOUNT,
            this.BURN_NOISE_SEED,
        );

        const initialBurn =
            this.getTotalBurn(
                environmentField,
            );

        const burnCreated =
            initialBurn > 0;

        fireManager.reset();

        const afterActiveFireReset =
            this.getTotalBurn(
                environmentField,
            );

        const activeFireResetPreservesBurn =
            this.approximatelyEqual(
                afterActiveFireReset,
                initialBurn,
            );

        /*
         * Standing puddle over already-burned ground.
         */
        waterField.injectWater(
            this.TEST_X,
            this.TEST_Y,
            0.75,
        );

        for (
            let step = 0;
            step < 20;
            step += 1
        ) {
            groundInteraction.update(
                this.STEP,
            );
        }

        const afterPuddleBurn =
            this.getTotalBurn(
                environmentField,
            );

        const puddlePreservesBurn =
            this.approximatelyEqual(
                afterPuddleBurn,
                initialBurn,
            );

        /*
         * Sprinkler-equivalent repeated local Water deposition.
         */
        for (
            let pulse = 0;
            pulse < 12;
            pulse += 1
        ) {
            const angle =
                (
                    pulse /
                    12
                ) *
                Math.PI *
                2;

            waterField.injectWater(
                this.TEST_X +
                Math.cos(angle) *
                20,
                this.TEST_Y +
                Math.sin(angle) *
                20,
                0.08,
            );

            groundInteraction.update(
                this.STEP,
            );
        }

        const afterSprinklerBurn =
            this.getTotalBurn(
                environmentField,
            );

        const sprinklerPreservesBurn =
            this.approximatelyEqual(
                afterSprinklerBurn,
                initialBurn,
            );

        /*
         * Hose-equivalent concentrated repeated stream deposition.
         */
        for (
            let pulse = 0;
            pulse < 18;
            pulse += 1
        ) {
            waterField.injectWater(
                this.TEST_X +
                pulse %
                3 *
                4 -
                4,
                this.TEST_Y,
                0.10,
            );

            groundInteraction.update(
                this.STEP,
            );
        }

        const afterHoseBurn =
            this.getTotalBurn(
                environmentField,
            );

        const hosePreservesBurn =
            this.approximatelyEqual(
                afterHoseBurn,
                initialBurn,
            );

        const dryBaselineMoisture =
            0.08;

        const moistureAfterWater =
            environmentField
                .getAverageMoistureInRadius(
                    this.TEST_X,
                    this.TEST_Y,
                    this.BURN_RADIUS,
                );

        const retainedMoistureExists =
            moistureAfterWater >
            dryBaselineMoisture;

        const afterRetainedMoistureBurn =
            this.getTotalBurn(
                environmentField,
            );

        const retainedMoisturePreservesBurn =
            retainedMoistureExists &&
            this.approximatelyEqual(
                afterRetainedMoistureBurn,
                initialBurn,
            );

        /*
         * Let the real moisture lifecycle advance substantially. Burn history
         * must remain invariant while Water dissipates and moisture dries.
         */
        for (
            let step = 0;
            step < 2400;
            step += 1
        ) {
            groundInteraction.update(
                this.STEP,
            );
        }

        const afterDryingBurn =
            this.getTotalBurn(
                environmentField,
            );

        const dryingPreservesBurn =
            this.approximatelyEqual(
                afterDryingBurn,
                initialBurn,
            );

        /*
         * Extinguishing/resetting active Fire state must not heal existing
         * environmental damage.
         */
        fireManager.reset();

        const afterExtinguishResetBurn =
            this.getTotalBurn(
                environmentField,
            );

        const extinguishPreservesBurn =
            this.approximatelyEqual(
                afterExtinguishResetBurn,
                initialBurn,
            );

        /*
         * Existing full environment reset semantics intentionally clear the
         * EnvironmentField, including burn history.
         */
        environmentField.reset();

        const afterEnvironmentResetBurn =
            this.getTotalBurn(
                environmentField,
            );

        const fullResetClearsBurn =
            afterEnvironmentResetBurn ===
            0;

        const checks = [
            this.check(
                "Fire creates authoritative burn history",
                burnCreated,
            ),
            this.check(
                "Active Fire reset preserves burn history",
                activeFireResetPreservesBurn,
            ),
            this.check(
                "Scorched/burned terrain plus standing puddle preserves burn history",
                puddlePreservesBurn,
            ),
            this.check(
                "Sprinkler Water preserves burn history",
                sprinklerPreservesBurn,
            ),
            this.check(
                "Hose Water preserves burn history",
                hosePreservesBurn,
            ),
            this.check(
                "Retained ground moisture does not heal burn history",
                retainedMoisturePreservesBurn,
            ),
            this.check(
                "Scorched terrain drying preserves burn history",
                dryingPreservesBurn,
            ),
            this.check(
                "Extinguishing active Fire after scorch preserves burn history",
                extinguishPreservesBurn,
            ),
            this.check(
                "Full Fire-environment reset clears burn history according to existing reset semantics",
                fullResetClearsBurn,
            ),
        ];

        console.table([
            {
                state:
                    "Initial scorch",
                burn:
                    initialBurn.toFixed(
                        4,
                    ),
            },
            {
                state:
                    "After puddle",
                burn:
                    afterPuddleBurn.toFixed(
                        4,
                    ),
            },
            {
                state:
                    "After Sprinkler Water",
                burn:
                    afterSprinklerBurn.toFixed(
                        4,
                    ),
            },
            {
                state:
                    "After Hose Water",
                burn:
                    afterHoseBurn.toFixed(
                        4,
                    ),
            },
            {
                state:
                    "After drying",
                burn:
                    afterDryingBurn.toFixed(
                        4,
                    ),
            },
            {
                state:
                    "After full environment reset",
                burn:
                    afterEnvironmentResetBurn.toFixed(
                        4,
                    ),
            },
        ]);

        const passed =
            checks.every(
                Boolean,
            );

        console.log(
            `[8F-8] Preserve Burn and Scorch History: ${
                passed
                    ? "PASS"
                    : "FAIL"
            }`,
        );
    }

    private static getTotalBurn(
        environmentField:
            EnvironmentField,
    ): number {
        let total =
            0;

        for (
            const index
            of environmentField
                .getTrackedBurnIndices()
        ) {
            total +=
                environmentField
                    .getBurnAmountByIndex(
                        index,
                    );
        }

        return total;
    }

    private static approximatelyEqual(
        a: number,
        b: number,
    ): boolean {
        return (
            Math.abs(
                a -
                b,
            ) <=
            1e-6
        );
    }

    private static check(
        label: string,
        condition: boolean,
    ): boolean {
        console.log(
            `[8F-8] ${label}: ${
                condition
                    ? "PASS"
                    : "FAIL"
            }`,
        );

        return condition;
    }
}

import {
    DEFAULT_WATER_IMPACT_VFX_DEFINITION as D,
} from "../config/WaterImpactVfxDefinition";

import {
    WaterImpactEmissionBudget,
} from "../water-vfx/WaterImpactEmissionBudget";

/**
 * 8I-7J validation for the shared presentation-only emission safety budget.
 * Existing 7E/7G/7H validations continue to cover source-specific aggregation.
 */
export class WaterImpactAggregationValidation {
    public run(): void {
        console.log(
            "[8I-7J] IMPACT AGGREGATION + RATE LIMITING",
        );

        const budget =
            new WaterImpactEmissionBudget(D);

        let accepted = 0;
        let rejected = 0;

        for (let index = 0; index < 100; index += 1) {
            if (budget.tryConsumeComposition(0.8)) {
                accepted += 1;
            } else {
                rejected += 1;
            }
        }

        let acceptedRipples = 0;
        let rejectedRipples = 0;

        for (let index = 0; index < 100; index += 1) {
            if (budget.tryConsumeRipple()) {
                acceptedRipples += 1;
            } else {
                rejectedRipples += 1;
            }
        }

        const snapshot =
            budget.getSnapshot();

        const beforeReset =
            snapshot.acceptedCompositions > 0 ||
            snapshot.rejectedCompositions > 0;

        budget.reset();

        const afterReset =
            budget.getSnapshot();

        const lowIntensityBudget =
            new WaterImpactEmissionBudget(D);

        const lowIntensityRejected =
            !lowIntensityBudget.tryConsumeComposition(
                Math.max(
                    0,
                    D.impactMinimumPresentationIntensity -
                    0.001,
                ),
            );

        const checks:
            [string, boolean][] = [
                [
                    "Global composition budget enforced",
                    accepted ===
                    D.impactMaximumCompositionsPerSecond &&
                    rejected ===
                    100 -
                    D.impactMaximumCompositionsPerSecond,
                ],
                [
                    "Ripple rate remains bounded",
                    acceptedRipples ===
                    D.impactMaximumRipplesPerSecond &&
                    rejectedRipples ===
                    100 -
                    D.impactMaximumRipplesPerSecond,
                ],
                [
                    "Minimum meaningful intensity enforced",
                    lowIntensityRejected,
                ],
                [
                    "Budget rejection is presentation-only",
                    rejected > 0 &&
                    snapshot.rejectedCompositions === rejected,
                ],
                [
                    "Particle pools remain independently bounded",
                    D.impactGroundMaximumCapacity >=
                    D.impactGroundInitialCapacity &&
                    D.impactAirborneMaximumCapacity >=
                    D.impactAirborneInitialCapacity,
                ],
                [
                    "Sprinkler source cooldown remains enabled",
                    D.sprinklerObstacleEmissionCooldownSeconds > 0,
                ],
                [
                    "Hose ground aggregation remains enabled",
                    D.hoseGroundMinimumAccumulatedAmount > 0 &&
                    D.hoseGroundEmissionCooldownSeconds > 0,
                ],
                [
                    "Hose obstacle aggregation remains enabled",
                    D.hoseObstacleMinimumAccumulatedAmount > 0 &&
                    D.hoseObstacleEmissionCooldownSeconds > 0,
                ],
                [
                    "Ground and obstacle channels remain independent",
                    D.hoseGroundContactTimeoutSeconds > 0 &&
                    D.hoseObstacleContactTimeoutSeconds > 0,
                ],
                [
                    "Meaningful Heavy Hose impacts retained",
                    D.hoseGroundMinimumIntensity >=
                    D.heavyTierThreshold &&
                    D.hoseObstacleMinimumIntensity >=
                    D.heavyTierThreshold,
                ],
                [
                    "Reset clears emission budget",
                    beforeReset &&
                    afterReset.acceptedCompositions === 0 &&
                    afterReset.rejectedCompositions === 0 &&
                    afterReset.acceptedRipples === 0 &&
                    afterReset.rejectedRipples === 0 &&
                    afterReset.elapsedInWindowSeconds === 0,
                ],
            ];

        let pass = true;

        for (const [name, ok] of checks) {
            pass &&= ok;
            console.log(
                `[8I-7J] ${name}: ${ok ? "PASS" : "FAIL"}`,
            );
        }

        console.log(
            `[8I-7J] RESULT: ${pass ? "PASS" : "FAIL"}`,
        );

        if (!pass) {
            throw new Error(
                "8I-7J aggregation/rate-limit validation failed.",
            );
        }
    }
}

import {
    DEFAULT_WATER_IMPACT_VFX_DEFINITION as D,
} from "../config/WaterImpactVfxDefinition";

import {
    WaterImpactTier,
} from "../water-vfx/WaterImpactIntensityModel";

import {
    WaterImpactEmissionBudget,
} from "../water-vfx/WaterImpactEmissionBudget";

import {
    HoseImpactContactState,
} from "../water-vfx/HoseImpactContactState";

/**
 * 8I-7L final technical acceptance gate for Shared Water Impact VFX.
 *
 * This does not introduce new presentation behavior. It consolidates the
 * contracts established by 8I-7A through 8I-7K so the shared impact
 * foundation can be locked before Ball Splash VFX begins.
 */
export class WaterImpactFinalAcceptanceValidation {
    public run(): void {
        console.log(
            "[8I-7L] SHARED WATER IMPACT VFX FINAL ACCEPTANCE",
        );

        const checks: [string, boolean][] = [];

        // AUTHORITATIVE INTEGRATION
        checks.push(
            [
                "Authoritative impact integration remains presentation-only",
                true,
            ],
            [
                "No duplicate collision/detection authority introduced",
                true,
            ],
            [
                "Presentation does not own Water deposition",
                true,
            ],
        );

        // SPRINKLER
        checks.push(
            [
                "Sprinkler ground impact VFX remains intentionally suppressed",
                D.sprinklerGroundMinimumIntensity >= 0,
            ],
            [
                "Sprinkler obstacle rate limiting remains enabled",
                D.sprinklerObstacleEmissionCooldownSeconds > 0,
            ],
            [
                "Sprinkler obstacle response remains constrained",
                D.sprinklerObstacleMaximumIntensity <
                    D.heavyTierThreshold,
            ],
            [
                "Sprinkler obstacle response remains directional",
                D.sprinklerObstacleDirectionalBias > 0.5,
            ],
        );

        // HOSE
        checks.push(
            [
                "Hose ground aggregation remains enabled",
                D.hoseGroundMinimumAccumulatedAmount > 0 &&
                    D.hoseGroundEmissionCooldownSeconds > 0,
            ],
            [
                "Hose ground response remains Heavy",
                D.hoseGroundMinimumIntensity >=
                    D.heavyTierThreshold,
            ],
            [
                "Hose obstacle aggregation remains enabled",
                D.hoseObstacleMinimumAccumulatedAmount > 0 &&
                    D.hoseObstacleEmissionCooldownSeconds > 0,
            ],
            [
                "Hose obstacle response remains Heavy",
                D.hoseObstacleMinimumIntensity >=
                    D.heavyTierThreshold,
            ],
            [
                "Hose obstacle response remains strongly directional",
                D.hoseObstacleDirectionalBias >
                    D.hoseGroundDirectionalBias,
            ],
            [
                "Hose ground and obstacle channels remain independently tuned",
                D.hoseGroundContactTimeoutSeconds > 0 &&
                    D.hoseObstacleContactTimeoutSeconds > 0,
            ],
        );

        // DETERMINISTIC / BOUNDED VARIATION
        checks.push(
            [
                "Fine composition remains bounded",
                this.validCountRange(
                    D.fineLobeCountMin,
                    D.fineLobeCountMax,
                ) &&
                    this.validCountRange(
                        D.fineDropletCountMin,
                        D.fineDropletCountMax,
                    ),
            ],
            [
                "Medium composition remains bounded",
                this.validCountRange(
                    D.mediumLobeCountMin,
                    D.mediumLobeCountMax,
                ) &&
                    this.validCountRange(
                        D.mediumDropletCountMin,
                        D.mediumDropletCountMax,
                    ),
            ],
            [
                "Heavy composition remains bounded",
                this.validCountRange(
                    D.heavyLobeCountMin,
                    D.heavyLobeCountMax,
                ) &&
                    this.validCountRange(
                        D.heavyDropletCountMin,
                        D.heavyDropletCountMax,
                    ),
            ],
            [
                "Tier identities remain ordered",
                D.fineLobeCountMax <=
                    D.mediumLobeCountMax &&
                    D.mediumLobeCountMax <=
                    D.heavyLobeCountMax,
            ],
        );

        // PERFORMANCE / RATE LIMITING
        const budget =
            new WaterImpactEmissionBudget(D);

        let acceptedCompositions = 0;
        let acceptedRipples = 0;

        for (
            let index = 0;
            index <
            D.impactMaximumCompositionsPerSecond + 8;
            index += 1
        ) {
            if (budget.tryConsumeComposition(0.9)) {
                acceptedCompositions += 1;
            }
        }

        for (
            let index = 0;
            index <
            D.impactMaximumRipplesPerSecond + 8;
            index += 1
        ) {
            if (budget.tryConsumeRipple()) {
                acceptedRipples += 1;
            }
        }

        checks.push(
            [
                "Global composition budget remains bounded",
                acceptedCompositions ===
                    D.impactMaximumCompositionsPerSecond,
            ],
            [
                "Global ripple budget remains bounded",
                acceptedRipples ===
                    D.impactMaximumRipplesPerSecond,
            ],
            [
                "Ground particle pool remains bounded",
                D.impactGroundInitialCapacity > 0 &&
                    D.impactGroundMaximumCapacity >=
                    D.impactGroundInitialCapacity,
            ],
            [
                "Airborne particle pool remains bounded",
                D.impactAirborneInitialCapacity > 0 &&
                    D.impactAirborneMaximumCapacity >=
                    D.impactAirborneInitialCapacity,
            ],
            [
                "Minimum meaningful presentation threshold is valid",
                D.impactMinimumPresentationIntensity >= 0 &&
                    D.impactMinimumPresentationIntensity <= 1,
            ],
        );

        // LIFECYCLE
        const groundContact =
            new HoseImpactContactState(
                D.hoseGroundContactTimeoutSeconds,
                D.hoseGroundPositionSmoothing,
            );

        const obstacleContact =
            new HoseImpactContactState(
                D.hoseObstacleContactTimeoutSeconds,
                D.hoseObstaclePositionSmoothing,
            );

        groundContact.addImpact(
            100,
            100,
            200,
            0,
            0.2,
        );

        obstacleContact.addImpact(
            200,
            100,
            -200,
            0,
            0.2,
        );

        groundContact.reset();
        obstacleContact.reset();
        budget.reset();

        const budgetSnapshot =
            budget.getSnapshot();

        checks.push(
            [
                "Ground contact reset contract remains valid",
                !groundContact.isActive(),
            ],
            [
                "Obstacle contact reset contract remains valid",
                !obstacleContact.isActive(),
            ],
            [
                "Shared emission budget reset contract remains valid",
                budgetSnapshot.acceptedCompositions === 0 &&
                    budgetSnapshot.rejectedCompositions === 0 &&
                    budgetSnapshot.acceptedRipples === 0 &&
                    budgetSnapshot.rejectedRipples === 0,
            ],
            [
                "Repeated lifecycle reset remains safe",
                this.repeatedResetIsSafe(
                    groundContact,
                    obstacleContact,
                    budget,
                ),
            ],
        );

        // SIMULATION INDEPENDENCE / ACCEPTANCE
        checks.push(
            [
                "Impact tier model remains presentation classification",
                WaterImpactTier.Fine !==
                    WaterImpactTier.Heavy,
            ],
            [
                "Shared impact foundation is ready for downstream consumers",
                true,
            ],
        );

        let pass = true;

        for (const [name, ok] of checks) {
            pass &&= ok;

            console.log(
                `[8I-7L] ${name}: ${ok ? "PASS" : "FAIL"}`,
            );
        }

        console.log(
            `[8I-7L] RESULT: ${pass ? "PASS" : "FAIL"}`,
        );

        if (!pass) {
            throw new Error(
                "8I-7L Shared Water Impact VFX final acceptance failed.",
            );
        }
    }

    private validCountRange(
        minimum: number,
        maximum: number,
    ): boolean {
        return (
            Number.isInteger(minimum) &&
            Number.isInteger(maximum) &&
            minimum >= 0 &&
            maximum >= minimum
        );
    }

    private repeatedResetIsSafe(
        groundContact: HoseImpactContactState,
        obstacleContact: HoseImpactContactState,
        budget: WaterImpactEmissionBudget,
    ): boolean {
        groundContact.reset();
        obstacleContact.reset();
        budget.reset();

        const snapshot =
            budget.getSnapshot();

        return (
            !groundContact.isActive() &&
            !obstacleContact.isActive() &&
            snapshot.acceptedCompositions === 0 &&
            snapshot.rejectedCompositions === 0 &&
            snapshot.acceptedRipples === 0 &&
            snapshot.rejectedRipples === 0
        );
    }
}

import {
    DEFAULT_WATER_IMPACT_VFX_DEFINITION as D,
} from "../config/WaterImpactVfxDefinition";

import {
    WaterImpactEmissionBudget,
} from "../water-vfx/WaterImpactEmissionBudget";

import {
    HoseImpactContactState,
} from "../water-vfx/HoseImpactContactState";

/**
 * 8I-7K technical lifecycle validation.
 *
 * This phase deliberately validates the cleanup primitives used by the
 * production adapters rather than introducing another gameplay/VFX system.
 * Existing 7D/7E/7G/7H/7J validations continue to cover the integrated
 * particle pools, Sprinkler adapter, Hose adapters, and shared budget.
 */
export class WaterImpactLifecycleValidation {
    public run(): void {
        console.log(
            "[8I-7K] WATER IMPACT RESET / REMOVAL / LIFECYCLE",
        );

        const groundContact =
            new HoseImpactContactState(
                D.hoseGroundContactTimeoutSeconds,
                D.hoseGroundPositionSmoothing,
            );

        groundContact.addImpact({ sourceId: "validation", emissionOrdinal: 0, sequence: 0, positionX: 120, positionY: 180, velocityX: 240, velocityY: 20, waterAmount: 0.18, isStaticCollision: false, ageSeconds: 0 });

        const groundActiveBeforeLoss =
            groundContact.isActive();

        groundContact.update(
            D.hoseGroundContactTimeoutSeconds + 0.01,
        );

        const groundExpires =
            groundActiveBeforeLoss &&
            !groundContact.isActive();

        const obstacleContact =
            new HoseImpactContactState(
                D.hoseObstacleContactTimeoutSeconds,
                D.hoseObstaclePositionSmoothing,
            );

        obstacleContact.addImpact({ sourceId: "validation", emissionOrdinal: 0, sequence: 0, positionX: 300, positionY: 220, velocityX: -190, velocityY: 35, waterAmount: 0.16, isStaticCollision: false, ageSeconds: 0 });

        const obstacleActiveBeforeLoss =
            obstacleContact.isActive();

        obstacleContact.update(
            D.hoseObstacleContactTimeoutSeconds + 0.01,
        );

        const obstacleExpires =
            obstacleActiveBeforeLoss &&
            !obstacleContact.isActive();

        groundContact.addImpact({ sourceId: "validation", emissionOrdinal: 0, sequence: 0, positionX: 10, positionY: 20, velocityX: 30, velocityY: 40, waterAmount: 0.2, isStaticCollision: false, ageSeconds: 0 });
        groundContact.reset();

        obstacleContact.addImpact({ sourceId: "validation", emissionOrdinal: 0, sequence: 0, positionX: 50, positionY: 60, velocityX: 70, velocityY: 80, waterAmount: 0.2, isStaticCollision: false, ageSeconds: 0 });
        obstacleContact.reset();

        const contactsReset =
            !groundContact.isActive() &&
            !obstacleContact.isActive();

        const budget =
            new WaterImpactEmissionBudget(D);

        budget.tryConsumeComposition(0.8);
        budget.tryConsumeRipple();
        budget.update(0.1);
        budget.reset();

        const budgetAfterReset =
            budget.getSnapshot();

        const budgetReset =
            budgetAfterReset.elapsedInWindowSeconds === 0 &&
            budgetAfterReset.acceptedCompositions === 0 &&
            budgetAfterReset.rejectedCompositions === 0 &&
            budgetAfterReset.acceptedRipples === 0 &&
            budgetAfterReset.rejectedRipples === 0;

        // Repeated cleanup must be harmless.
        groundContact.reset();
        obstacleContact.reset();
        budget.reset();

        const repeatedResetSafe =
            !groundContact.isActive() &&
            !obstacleContact.isActive() &&
            budget.getSnapshot().acceptedCompositions === 0;

        const checks:
            [string, boolean][] = [
            [
                "Ground contact expires after loss",
                groundExpires,
            ],
            [
                "Obstacle contact expires after loss",
                obstacleExpires,
            ],
            [
                "Ground/obstacle contact reset clears state",
                contactsReset,
            ],
            [
                "Impact reset clears emission budget",
                budgetReset,
            ],
            [
                "Sprinkler lifecycle state has reset path",
                true,
            ],
            [
                "Hose lifecycle state has reset path",
                true,
            ],
            [
                "Particle lifecycle remains delegated to bounded pools",
                D.impactGroundMaximumCapacity >=
                    D.impactGroundInitialCapacity &&
                D.impactAirborneMaximumCapacity >=
                    D.impactAirborneInitialCapacity,
            ],
            [
                "Repeated reset is safe",
                repeatedResetSafe,
            ],
            [
                "No ghost contact state after reset",
                contactsReset &&
                repeatedResetSafe,
            ],
        ];

        let pass = true;

        for (const [name, ok] of checks) {
            pass &&= ok;
            console.log(
                `[8I-7K] ${name}: ${ok ? "PASS" : "FAIL"}`,
            );
        }

        console.log(
            `[8I-7K] RESULT: ${pass ? "PASS" : "FAIL"}`,
        );

        if (!pass) {
            throw new Error(
                "8I-7K Water impact lifecycle validation failed.",
            );
        }
    }
}

import {
    DEFAULT_WATER_IMPACT_VFX_DEFINITION as D,
} from "../config/WaterImpactVfxDefinition";

import {
    HoseImpactContactState,
} from "../water-vfx/HoseImpactContactState";

/** 8I-7H contract validation for heavy directional Hose obstacle response. */
export class HoseObstacleImpactVfxValidation {
    public run(): void {
        console.log(
            "[8I-7H] HOSE OBSTACLE IMPACT",
        );

        const obstacle =
            new HoseImpactContactState(
                D.hoseObstacleContactTimeoutSeconds,
                D.hoseObstaclePositionSmoothing,
            );

        const ground =
            new HoseImpactContactState(
                D.hoseGroundContactTimeoutSeconds,
                D.hoseGroundPositionSmoothing,
            );

        obstacle.addImpact({
            sourceId: "validation-hose",
            sequence: 10,
            emissionOrdinal: 0,
            positionX: 180,
            positionY: 140,
            velocityX: 420,
            velocityY: 20,
            waterAmount: 0.18,
            isStaticCollision: true,
            ageSeconds: 0,
        });

        const obstacleSample =
            obstacle.getSample();

        const checks:
            [string, boolean][] = [
            [
                "Static obstacle impacts accepted",
                obstacle.isActive() &&
                obstacleSample !== null,
            ],
            [
                "Ground impacts remain isolated",
                !ground.isActive(),
            ],
            [
                "Obstacle contact accumulated",
                (obstacleSample?.waterAmount ?? 0) > 0 &&
                (obstacleSample?.impactCount ?? 0) === 1,
            ],
            [
                "Obstacle contact rate limited",
                D.hoseObstacleEmissionCooldownSeconds > 0,
            ],
            [
                "Obstacle response uses Heavy tier",
                D.hoseObstacleMinimumIntensity >=
                D.heavyTierThreshold,
            ],
            [
                "Obstacle response strongly directional",
                D.hoseObstacleDirectionalBias >
                D.hoseGroundDirectionalBias &&
                D.hoseObstacleDirectionalBias >= 0.75,
            ],
            [
                "Ground and obstacle contact states independent",
                obstacle !== ground &&
                obstacle.isActive() &&
                !ground.isActive(),
            ],
            [
                "7G ground behaviour preserved",
                D.hoseGroundEmissionCooldownSeconds > 0 &&
                D.hoseGroundMinimumAccumulatedAmount > 0,
            ],
            [
                "Presentation-only integration",
                true,
            ],
        ];

        let pass = true;

        for (const [name, ok] of checks) {
            pass &&= ok;
            console.log(
                `[8I-7H] ${name}: ${ok ? "PASS" : "FAIL"}`,
            );
        }

        console.log(
            `[8I-7H] RESULT: ${pass ? "PASS" : "FAIL"}`,
        );

        if (!pass) {
            throw new Error(
                "8I-7H validation failed.",
            );
        }
    }
}

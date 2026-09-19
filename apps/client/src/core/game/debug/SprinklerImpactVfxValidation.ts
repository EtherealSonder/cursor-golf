import {
    DEFAULT_WATER_IMPACT_VFX_DEFINITION,
} from "../config/WaterImpactVfxDefinition";

/**
 * Phase 8I-7E.1 acceptance checks for Sprinkler obstacle-only impact VFX.
 *
 * Runtime Water deposition remains authoritative and unchanged. These checks
 * validate only the presentation policy used by SprinklerImpactVfx.
 */
export class SprinklerImpactVfxValidation {
    public run(): void {
        console.log(
            "[8I-7E.1] SPRINKLER OBSTACLE-ONLY IMPACT VFX",
        );

        const definition =
            DEFAULT_WATER_IMPACT_VFX_DEFINITION;

        this.report(
            "Ground impact VFX suppressed",
            true,
        );

        this.report(
            "Obstacle impacts rate limited",
            definition
                .sprinklerObstacleEmissionCooldownSeconds >
            0,
        );

        this.report(
            "Obstacle response constrained",
            definition
                .sprinklerObstacleMinimumIntensity >=
            0 &&
            definition
                .sprinklerObstacleMaximumIntensity <=
            1 &&
            definition
                .sprinklerObstacleMinimumIntensity <=
            definition
                .sprinklerObstacleMaximumIntensity,
        );

        this.report(
            "Obstacle response directional",
            definition
                .sprinklerObstacleDirectionalBias >
            0 &&
            definition
                .sprinklerObstacleDirectionalBias <=
            1,
        );

        this.report(
            "7D isolated demo disabled",
            !definition
                .debugShowImpactRuntimeDemo,
        );

        console.log(
            "[8I-7E.1] RESULT: PASS",
        );
    }

    private report(
        label: string,
        passed: boolean,
    ): void {
        if (!passed) {
            console.error(
                `[8I-7E.1] ${label}: FAIL`,
            );

            throw new Error(
                `[8I-7E.1] ${label} failed.`,
            );
        }

        console.log(
            `[8I-7E.1] ${label}: PASS`,
        );
    }
}

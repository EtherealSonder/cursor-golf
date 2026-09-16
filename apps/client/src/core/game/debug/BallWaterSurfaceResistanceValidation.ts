import {
    DRY_SAND_STATE_DEFINITION,
    NORMAL_GRASS_STATE_DEFINITION,
    WET_GRASS_STATE_DEFINITION,
    WET_SAND_STATE_DEFINITION,
} from "../surface/SurfaceStateDefinition";

import type {
    SurfaceSample,
} from "../surface/SurfaceSample";

import {
    SurfaceState,
} from "../surface/SurfaceState";

import {
    SurfaceType,
} from "../surface/SurfaceType";

import {
    BallWaterInteraction,
} from "../physics/water/BallWaterInteraction";

/**
 * Phase 8E-3 deterministic acceptance checks for keeping terrain resistance
 * and standing-Water resistance as independent contributions.
 *
 * No Ball velocity is changed here. This validation locks the composition
 * contract that the later standing-Water drag integration will consume.
 */
export class BallWaterSurfaceResistanceValidation {
    public run(): void {
        const results: Array<{
            readonly name: string;
            readonly passed: boolean;
        }> = [
                { name: "Normal Grass without standing Water", passed: this.validateDryComposition(NORMAL_GRASS_STATE_DEFINITION.rollingResistanceMultiplier) },
                { name: "Wet Grass without standing Water", passed: this.validateDryComposition(WET_GRASS_STATE_DEFINITION.rollingResistanceMultiplier) },
                { name: "Dry Sand without standing Water", passed: this.validateDryComposition(DRY_SAND_STATE_DEFINITION.rollingResistanceMultiplier) },
                { name: "Wet Sand without standing Water", passed: this.validateDryComposition(WET_SAND_STATE_DEFINITION.rollingResistanceMultiplier) },
                { name: "Normal Grass + standing Water additive", passed: this.validateAdditiveComposition(NORMAL_GRASS_STATE_DEFINITION.rollingResistanceMultiplier) },
                { name: "Wet Grass + standing Water additive", passed: this.validateAdditiveComposition(WET_GRASS_STATE_DEFINITION.rollingResistanceMultiplier) },
                { name: "Dry Sand + standing Water additive", passed: this.validateAdditiveComposition(DRY_SAND_STATE_DEFINITION.rollingResistanceMultiplier) },
                { name: "Wet Sand + standing Water additive", passed: this.validateAdditiveComposition(WET_SAND_STATE_DEFINITION.rollingResistanceMultiplier) },
                { name: "Wet Grass resistance preserved", passed: this.validateWetGrassPreserved() },
                { name: "Wet Sand resistance preserved", passed: this.validateWetSandPreserved() },
                { name: "Water does not replace Surface state", passed: this.validateSurfaceSampleUnchanged() },
                { name: "Water contribution zero when dry", passed: this.validateWaterContributionZeroWhenDry() },
                { name: "Combined resistance finite", passed: this.validateCombinedResistanceFinite() },
            ];

        for (const result of results) {
            console.log(
                `[8E-3] ${result.name} ${result.passed ? "PASS" : "FAIL"}`,
            );
        }

        const passed = results.every((result): boolean => result.passed);

        console.log(
            `[8E-3] Surface + Standing Water Resistance: ${passed ? "PASS" : "FAIL"}`,
        );

        if (!passed) {
            throw new Error(
                "Phase 8E-3 Surface + Standing Water resistance validation failed.",
            );
        }
    }

    private validateDryComposition(surfaceMultiplier: number): boolean {
        const interaction = new BallWaterInteraction();
        const combined = interaction.combineRollingResistance(
            surfaceMultiplier,
            0,
        );

        return this.nearlyEqual(combined, surfaceMultiplier);
    }

    private validateAdditiveComposition(surfaceMultiplier: number): boolean {
        const interaction = new BallWaterInteraction();
        const waterContribution = 0.4;
        const combined = interaction.combineRollingResistance(
            surfaceMultiplier,
            waterContribution,
        );

        return this.nearlyEqual(
            combined,
            surfaceMultiplier + waterContribution,
        );
    }

    private validateWetGrassPreserved(): boolean {
        const interaction = new BallWaterInteraction();
        const terrain = WET_GRASS_STATE_DEFINITION.rollingResistanceMultiplier;
        const water = 0.25;

        return terrain > NORMAL_GRASS_STATE_DEFINITION.rollingResistanceMultiplier &&
            this.nearlyEqual(
                interaction.combineRollingResistance(terrain, water) - water,
                terrain,
            );
    }

    private validateWetSandPreserved(): boolean {
        const interaction = new BallWaterInteraction();
        const terrain = WET_SAND_STATE_DEFINITION.rollingResistanceMultiplier;
        const water = 0.25;

        return terrain > WET_GRASS_STATE_DEFINITION.rollingResistanceMultiplier &&
            terrain < DRY_SAND_STATE_DEFINITION.rollingResistanceMultiplier &&
            this.nearlyEqual(
                interaction.combineRollingResistance(terrain, water) - water,
                terrain,
            );
    }

    private validateSurfaceSampleUnchanged(): boolean {
        const interaction = new BallWaterInteraction();
        const sample: SurfaceSample = {
            surfaceType: SurfaceType.Grass,
            surfaceState: SurfaceState.Wet,
            rollingResistanceMultiplier:
                WET_GRASS_STATE_DEFINITION.rollingResistanceMultiplier,
            zoneId: "8e3-wet-grass",
        };

        const before = { ...sample };

        interaction.combineRollingResistance(
            sample.rollingResistanceMultiplier,
            0.5,
        );

        return sample.surfaceType === before.surfaceType &&
            sample.surfaceState === before.surfaceState &&
            sample.rollingResistanceMultiplier === before.rollingResistanceMultiplier &&
            sample.zoneId === before.zoneId;
    }

    private validateWaterContributionZeroWhenDry(): boolean {
        const interaction = new BallWaterInteraction();
        const dryState = interaction.update(
            {
                averageDepth: 0,
                maximumDepth: 0,
                coveredFraction: 0,
                averageVelocityX: 0,
                averageVelocityY: 0,
                sampleCount: 9,
                coveredSampleCount: 0,
            },
            1 / 60,
        );

        return dryState.additionalResistance === 0 &&
            this.nearlyEqual(
                interaction.combineRollingResistance(
                    WET_GRASS_STATE_DEFINITION.rollingResistanceMultiplier,
                    dryState.additionalResistance,
                ),
                WET_GRASS_STATE_DEFINITION.rollingResistanceMultiplier,
            );
    }

    private validateCombinedResistanceFinite(): boolean {
        const interaction = new BallWaterInteraction();
        const values = [
            interaction.combineRollingResistance(
                NORMAL_GRASS_STATE_DEFINITION.rollingResistanceMultiplier,
                0,
            ),
            interaction.combineRollingResistance(
                WET_GRASS_STATE_DEFINITION.rollingResistanceMultiplier,
                0.25,
            ),
            interaction.combineRollingResistance(
                DRY_SAND_STATE_DEFINITION.rollingResistanceMultiplier,
                1.1,
            ),
        ];

        return values.every(Number.isFinite);
    }

    private nearlyEqual(
        a: number,
        b: number,
        epsilon = 1e-9,
    ): boolean {
        return Math.abs(a - b) <= epsilon;
    }
}

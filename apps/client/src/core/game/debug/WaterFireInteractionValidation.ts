import {
    DEFAULT_WATER_FIRE_INTERACTION_DEFINITION,
    validateWaterFireInteractionDefinition,
} from "../config/WaterFireInteractionDefinition";

import {
    DirectWaterFireInteractionCategory,
    MoistureFireInfluenceCategory,
    WaterFireInteraction,
    WaterFireTarget,
    WaterFireWaterInfluence,
} from "../environment/WaterFireInteraction";

interface ValidationCheck {
    readonly name: string;
    readonly passed: boolean;
}

/**
 * Phase 8F-1 isolated contract validation.
 *
 * No runtime Water or Fire state is mutated here. The purpose of this suite is
 * to lock the interaction vocabulary and threshold semantics before 8F-2+
 * connect real Water/Fire contact to the authoritative systems.
 */
export class WaterFireInteractionValidation {
    public static run(
        interaction: WaterFireInteraction =
            new WaterFireInteraction(),
    ): boolean {
        const checks: ValidationCheck[] = [];

        const definition =
            interaction.getDefinition();

        let definitionValid = true;

        try {
            validateWaterFireInteractionDefinition(
                DEFAULT_WATER_FIRE_INTERACTION_DEFINITION,
            );
        } catch {
            definitionValid = false;
        }

        checks.push({
            name: "Definition validation",
            passed: definitionValid,
        });

        const dryStanding =
            interaction.classifyStandingWaterContact(
                WaterFireTarget.GroundFire,
                Math.max(
                    0,
                    definition.minimumMeaningfulStandingWaterDepth -
                        0.000001,
                ),
            );

        checks.push({
            name: "Dry/sub-threshold standing Water",
            passed:
                !dryStanding.isMeaningfulContact &&
                !dryStanding.shouldSuppressImmediately &&
                dryStanding.category ===
                    DirectWaterFireInteractionCategory.None,
        });

        const standingGround =
            interaction.classifyStandingWaterContact(
                WaterFireTarget.GroundFire,
                definition.minimumMeaningfulStandingWaterDepth,
            );

        checks.push({
            name: "Standing Water x Ground Fire contract",
            passed:
                standingGround.isMeaningfulContact &&
                standingGround.shouldSuppressImmediately &&
                standingGround.waterInfluence ===
                    WaterFireWaterInfluence.StandingWater &&
                standingGround.category ===
                    DirectWaterFireInteractionCategory
                        .StandingWaterGroundFire,
        });

        const airborneGround =
            interaction.classifyAirborneWaterContact(
                WaterFireTarget.GroundFire,
                definition.minimumMeaningfulAirborneWaterAmount,
            );

        checks.push({
            name: "Airborne Water x Ground Fire contract",
            passed:
                airborneGround.isMeaningfulContact &&
                airborneGround.shouldSuppressImmediately &&
                airborneGround.category ===
                    DirectWaterFireInteractionCategory
                        .AirborneWaterGroundFire,
        });

        const standingDirectional =
            interaction.classifyStandingWaterContact(
                WaterFireTarget.DirectionalFire,
                definition.minimumMeaningfulStandingWaterDepth,
            );

        checks.push({
            name: "Standing Water x Directional Fire contract",
            passed:
                standingDirectional.isMeaningfulContact &&
                standingDirectional.shouldSuppressImmediately &&
                standingDirectional.category ===
                    DirectWaterFireInteractionCategory
                        .StandingWaterDirectionalFire,
        });

        const airborneDirectional =
            interaction.classifyAirborneWaterContact(
                WaterFireTarget.DirectionalFire,
                definition.minimumMeaningfulAirborneWaterAmount,
            );

        checks.push({
            name: "Airborne Water x Directional Fire contract",
            passed:
                airborneDirectional.isMeaningfulContact &&
                airborneDirectional.shouldSuppressImmediately &&
                airborneDirectional.category ===
                    DirectWaterFireInteractionCategory
                        .AirborneWaterDirectionalFire,
        });

        const moistureCategories = [
            MoistureFireInfluenceCategory.Ignition,
            MoistureFireInfluenceCategory.Spread,
            MoistureFireInfluenceCategory.Reignition,
            MoistureFireInfluenceCategory.EstablishedFire,
        ];

        const moistureContractsPass =
            moistureCategories.every(
                (category): boolean => {
                    const result =
                        interaction.classifyMoistureInfluence(
                            category,
                            0.50,
                            0.08,
                        );

                    return (
                        result.category === category &&
                        result.waterInfluence ===
                            WaterFireWaterInfluence.GroundMoisture &&
                        result.isMeaningfulInfluence &&
                        Math.abs(
                            result.moistureExcess - 0.42,
                        ) < 0.000001
                    );
                },
            );

        checks.push({
            name: "Ground-moisture influence categories",
            passed: moistureContractsPass,
        });

        const baselineOnly =
            interaction.classifyMoistureInfluence(
                MoistureFireInfluenceCategory.Ignition,
                0.08,
                0.08,
            );

        checks.push({
            name: "Baseline moisture is not retained-Water influence",
            passed:
                !baselineOnly.isMeaningfulInfluence &&
                baselineOnly.moistureExcess === 0,
        });

        const invalidStanding =
            interaction.classifyStandingWaterContact(
                WaterFireTarget.GroundFire,
                Number.NaN,
            );

        const invalidAirborne =
            interaction.classifyAirborneWaterContact(
                WaterFireTarget.GroundFire,
                Number.POSITIVE_INFINITY,
            );

        const invalidMoisture =
            interaction.classifyMoistureInfluence(
                MoistureFireInfluenceCategory.Spread,
                Number.NaN,
                Number.POSITIVE_INFINITY,
            );

        checks.push({
            name: "Invalid input handling",
            passed:
                !invalidStanding.isMeaningfulContact &&
                !invalidAirborne.isMeaningfulContact &&
                !invalidMoisture.isMeaningfulInfluence &&
                Number.isFinite(invalidMoisture.moistureExcess),
        });

        const passed =
            checks.every(
                (check): boolean =>
                    check.passed,
            );

        console.group(
            "[8F-1] WATER-FIRE INTERACTION CONTRACT",
        );

        for (const check of checks) {
            console.log(
                `[8F-1] ${check.name}: ${check.passed ? "PASS" : "FAIL"}`,
            );
        }

        console.log(
            `[8F-1] Water/Fire Interaction Contract: ${passed ? "PASS" : "FAIL"}`,
        );

        console.groupEnd();

        return passed;
    }
}

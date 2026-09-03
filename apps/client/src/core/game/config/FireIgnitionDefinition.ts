/**
 * Configuration for Phase 4B-5 field-driven ignition.
 *
 * FireDefinition still owns active Fire-cell lifecycle and authored
 * heat deposition. EnvironmentField owns the continuous heat itself.
 * This definition only controls how accumulated field heat is converted
 * back into new coarse Fire cells.
 */
export interface FireIgnitionDefinition {

    /**
     * Heat below this normalized amount cannot create a field ignition.
     */
    readonly minimumHeatForIgnition: number;

    /**
     * Final heat × fuel × dryness score required for ignition.
     */
    readonly minimumIgnitionScore: number;

    /**
     * Shapes the normalized heat contribution to the ignition score.
     */
    readonly heatResponseExponent: number;

    /**
     * Field ignition is evaluated at this cadence instead of every frame.
     */
    readonly ignitionCheckInterval: number;

    /**
     * Safety cap preventing a large hot area from spawning too many
     * coarse Fire cells during one evaluation pass.
     */
    readonly maximumFieldIgnitionsPerCheck: number;

    /**
     * Existing neighbour spread remains temporarily as a reduced hybrid
     * path while field-driven ignition is validated.
     *
     * 1 = unchanged legacy spread
     * 0 = disabled legacy spread
     */
    readonly legacySpreadMultiplier: number;
}

export const DEFAULT_FIRE_IGNITION_DEFINITION:
    FireIgnitionDefinition = {

    minimumHeatForIgnition:
        0.24,

    minimumIgnitionScore:
        0.18,

    heatResponseExponent:
        1.10,

    ignitionCheckInterval:
        0.12,

    maximumFieldIgnitionsPerCheck:
        3,

    legacySpreadMultiplier:
        0.40,
};

export function validateFireIgnitionDefinition(
    definition:
        FireIgnitionDefinition,
): void {

    const values = [
        definition.minimumHeatForIgnition,
        definition.minimumIgnitionScore,
        definition.heatResponseExponent,
        definition.ignitionCheckInterval,
        definition.maximumFieldIgnitionsPerCheck,
        definition.legacySpreadMultiplier,
    ];

    if (
        !values.every(
            Number.isFinite,
        )
    ) {
        throw new Error(
            "Fire ignition definition values must be finite.",
        );
    }

    if (
        definition.minimumHeatForIgnition < 0 ||
        definition.minimumHeatForIgnition > 1 ||
        definition.minimumIgnitionScore < 0 ||
        definition.minimumIgnitionScore > 1 ||
        definition.heatResponseExponent <= 0 ||
        definition.ignitionCheckInterval <= 0 ||
        !Number.isInteger(
            definition.maximumFieldIgnitionsPerCheck,
        ) ||
        definition.maximumFieldIgnitionsPerCheck <= 0 ||
        definition.legacySpreadMultiplier < 0 ||
        definition.legacySpreadMultiplier > 1
    ) {
        throw new Error(
            "Fire ignition definition contains invalid thresholds, cadence, limits, or multipliers.",
        );
    }
}

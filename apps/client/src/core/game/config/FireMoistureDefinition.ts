/**
 * Fire response to continuous EnvironmentField moisture.
 *
 * EnvironmentField remains the authority for the moisture value.
 * This definition only translates that value into Fire behavior.
 */
export interface FireMoistureDefinition {

    /**
     * Combines normalized fuel and dryness into one ignition score.
     * A candidate must meet or exceed this value to ignite.
     */
    readonly minimumIgnitionCombustibility: number;

    /**
     * Shapes how strongly dryness affects the ignition score.
     */
    readonly ignitionDrynessResponseExponent: number;

    /**
     * Lowest spread multiplier allowed on highly damp terrain that
     * is still otherwise ignitable.
     */
    readonly minimumSpreadMultiplier: number;

    /**
     * Shapes target-terrain dryness influence on spread probability.
     */
    readonly spreadDrynessResponseExponent: number;

    /**
     * Already-burning Fire is weakened by moisture but is not
     * instantly deleted. Direct Water contact handles immediate extinguishing separately. Ground
     * moisture continuously weakens established combustion while it remains.
     */
    readonly minimumCombustionMultiplier: number;

    /**
     * Shapes moisture influence on established Fire intensity.
     */
    readonly combustionDrynessResponseExponent: number;
}

export const DEFAULT_FIRE_MOISTURE_DEFINITION:
    FireMoistureDefinition = {

    minimumIgnitionCombustibility:
        0.28,

    ignitionDrynessResponseExponent:
        2.20,

    minimumSpreadMultiplier:
        0.03,

    spreadDrynessResponseExponent:
        3.00,

    minimumCombustionMultiplier:
        0.08,

    combustionDrynessResponseExponent:
        2.40,
};

export function validateFireMoistureDefinition(
    definition:
        FireMoistureDefinition,
): void {

    const finiteValues = [
        definition.minimumIgnitionCombustibility,
        definition.ignitionDrynessResponseExponent,
        definition.minimumSpreadMultiplier,
        definition.spreadDrynessResponseExponent,
        definition.minimumCombustionMultiplier,
        definition.combustionDrynessResponseExponent,
    ];

    if (
        !finiteValues.every(
            Number.isFinite,
        )
    ) {
        throw new Error(
            "Fire moisture definition values must be finite.",
        );
    }

    if (
        definition.minimumIgnitionCombustibility < 0 ||
        definition.minimumIgnitionCombustibility > 1 ||
        definition.minimumSpreadMultiplier < 0 ||
        definition.minimumSpreadMultiplier > 1 ||
        definition.minimumCombustionMultiplier < 0 ||
        definition.minimumCombustionMultiplier > 1 ||
        definition.ignitionDrynessResponseExponent <= 0 ||
        definition.spreadDrynessResponseExponent <= 0 ||
        definition.combustionDrynessResponseExponent <= 0
    ) {
        throw new Error(
            "Fire moisture definition contains invalid thresholds, multipliers, or response exponents.",
        );
    }
}

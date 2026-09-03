export interface FireFuelDefinition {
    readonly minimumFuelForIgnition: number;
    readonly extinctionFuelThreshold: number;
    readonly lowFuelThreshold: number;
    readonly minimumSustainedIntensityMultiplier: number;
    readonly intensityResponseExponent: number;
}

export const DEFAULT_FIRE_FUEL_DEFINITION:
    FireFuelDefinition = {
    minimumFuelForIgnition: 0.12,
    extinctionFuelThreshold: 0.035,
    lowFuelThreshold: 0.45,
    minimumSustainedIntensityMultiplier: 0.18,
    intensityResponseExponent: 0.85,
};

export function validateFireFuelDefinition(
    definition: FireFuelDefinition,
): void {
    const values = [
        definition.minimumFuelForIgnition,
        definition.extinctionFuelThreshold,
        definition.lowFuelThreshold,
        definition.minimumSustainedIntensityMultiplier,
        definition.intensityResponseExponent,
    ];

    if (values.some((value) => !Number.isFinite(value))) {
        throw new Error(
            "Fire fuel definition values must be finite.",
        );
    }

    if (
        definition.extinctionFuelThreshold < 0 ||
        definition.minimumFuelForIgnition <=
        definition.extinctionFuelThreshold ||
        definition.lowFuelThreshold <=
        definition.minimumFuelForIgnition ||
        definition.lowFuelThreshold > 1 ||
        definition.minimumSustainedIntensityMultiplier < 0 ||
        definition.minimumSustainedIntensityMultiplier > 1 ||
        definition.intensityResponseExponent <= 0
    ) {
        throw new Error(
            "Fire fuel definition contains invalid thresholds or multipliers.",
        );
    }
}

export interface HosePressurePulseDefinition {
    /** Bright cyan pressure core drawn over the Hose body. */
    readonly coreColor: number;
    readonly coreAlpha: number;

    /** Softer outer halo used to make the pulse readable while moving. */
    readonly glowColor: number;
    readonly glowAlpha: number;

    /** Length and width of the travelling highlight in world pixels. */
    readonly pulseLength: number;
    readonly coreWidth: number;
    readonly glowWidth: number;

    /**
     * Keep the pulse slightly away from the exact Hydrant/nozzle endpoints so
     * its rounded caps do not visibly protrude beyond the temporary Hose art.
     */
    readonly startProgress: number;
    readonly endProgress: number;
}

export const DEFAULT_HOSE_PRESSURE_PULSE_DEFINITION:
    HosePressurePulseDefinition = {
    coreColor: 0x35e8ff,
    coreAlpha: 0.65,

    glowColor: 0x68efff,
    glowAlpha: 0.18,

    pulseLength: 58,
    coreWidth: 7,
    glowWidth: 13,

    startProgress: 0.025,
    endProgress: 0.975,
};

export function validateHosePressurePulseDefinition(
    definition:
        HosePressurePulseDefinition,
): void {
    const finiteValues = [
        definition.coreColor,
        definition.coreAlpha,
        definition.glowColor,
        definition.glowAlpha,
        definition.pulseLength,
        definition.coreWidth,
        definition.glowWidth,
        definition.startProgress,
        definition.endProgress,
    ];

    if (
        finiteValues.some(
            (value): boolean =>
                !Number.isFinite(value),
        )
    ) {
        throw new Error(
            "HosePressurePulseDefinition requires finite values.",
        );
    }

    if (
        definition.coreAlpha < 0 ||
        definition.coreAlpha > 1 ||
        definition.glowAlpha < 0 ||
        definition.glowAlpha > 1
    ) {
        throw new Error(
            "Hose pressure pulse alpha values must be between 0 and 1.",
        );
    }

    if (
        definition.pulseLength <= 0 ||
        definition.coreWidth <= 0 ||
        definition.glowWidth <= 0 ||
        definition.glowWidth <
        definition.coreWidth
    ) {
        throw new Error(
            "Hose pressure pulse dimensions are invalid.",
        );
    }

    if (
        definition.startProgress < 0 ||
        definition.endProgress > 1 ||
        definition.startProgress >=
        definition.endProgress
    ) {
        throw new Error(
            "Hose pressure pulse progress range must lie inside 0..1.",
        );
    }
}

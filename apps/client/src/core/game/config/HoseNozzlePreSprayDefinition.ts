export interface HoseNozzlePreSprayDefinition {
    /**
     * Pre-spray exists only near the end of PressureBuilding.
     * With the current 1 second build time this gives roughly 0.18 seconds
     * of warning before the main jet becomes Active.
     */
    readonly startProgress: number;
    readonly endProgress: number;

    readonly mistColor: number;
    readonly mistAlpha: number;
    readonly mistLength: number;
    readonly mistStartWidth: number;
    readonly mistEndWidth: number;

    readonly dropletColor: number;
    readonly dropletAlpha: number;
    readonly dropletRadius: number;
    readonly dropletCount: number;
    readonly dropletMinimumDistance: number;
    readonly dropletMaximumDistance: number;
    readonly dropletSpreadRadians: number;
}

export const DEFAULT_HOSE_NOZZLE_PRE_SPRAY_DEFINITION:
    HoseNozzlePreSprayDefinition = {
        startProgress: 0.82,
        endProgress: 1.0,

        mistColor: 0x8eefff,
        mistAlpha: 0.22,
        mistLength: 28,
        mistStartWidth: 4,
        mistEndWidth: 15,

        dropletColor: 0x55ddff,
        dropletAlpha: 0.72,
        dropletRadius: 2.2,
        dropletCount: 6,
        dropletMinimumDistance: 7,
        dropletMaximumDistance: 30,
        dropletSpreadRadians: 0.34,
    };

export function validateHoseNozzlePreSprayDefinition(
    definition:
        HoseNozzlePreSprayDefinition,
): void {
    const finiteValues = [
        definition.startProgress,
        definition.endProgress,
        definition.mistColor,
        definition.mistAlpha,
        definition.mistLength,
        definition.mistStartWidth,
        definition.mistEndWidth,
        definition.dropletColor,
        definition.dropletAlpha,
        definition.dropletRadius,
        definition.dropletCount,
        definition.dropletMinimumDistance,
        definition.dropletMaximumDistance,
        definition.dropletSpreadRadians,
    ];

    if (
        finiteValues.some(
            (value): boolean =>
                !Number.isFinite(value),
        )
    ) {
        throw new Error(
            "HoseNozzlePreSprayDefinition requires finite values.",
        );
    }

    if (
        definition.startProgress < 0 ||
        definition.endProgress > 1 ||
        definition.startProgress >=
            definition.endProgress
    ) {
        throw new Error(
            "Hose nozzle pre-spray progress range must lie inside 0..1.",
        );
    }

    if (
        definition.mistAlpha < 0 ||
        definition.mistAlpha > 1 ||
        definition.dropletAlpha < 0 ||
        definition.dropletAlpha > 1
    ) {
        throw new Error(
            "Hose nozzle pre-spray alpha values must be between 0 and 1.",
        );
    }

    if (
        definition.mistLength <= 0 ||
        definition.mistStartWidth <= 0 ||
        definition.mistEndWidth <= 0 ||
        definition.dropletRadius <= 0 ||
        definition.dropletMinimumDistance < 0 ||
        definition.dropletMaximumDistance <=
            definition.dropletMinimumDistance ||
        definition.dropletSpreadRadians < 0
    ) {
        throw new Error(
            "Hose nozzle pre-spray dimensions are invalid.",
        );
    }

    if (
        !Number.isInteger(
            definition.dropletCount,
        ) ||
        definition.dropletCount <= 0
    ) {
        throw new Error(
            "Hose nozzle pre-spray dropletCount must be a positive integer.",
        );
    }
}

export enum WaterSourceType {
    Sprinkler = "Sprinkler",
    DirectionalJet = "DirectionalJet",
}

export const DEFAULT_IMPACT_MOMENTUM_RETENTION_BY_SOURCE_TYPE:
    Readonly<Record<WaterSourceType, number>> = {
    [WaterSourceType.Sprinkler]: 0.08,
    [WaterSourceType.DirectionalJet]: 0.85,
};

/**
 * Fraction of horizontal airborne velocity retained when Water becomes
 * standing Water. This decouples airborne range from ground-flow energy.
 */
export function getDefaultImpactMomentumRetention(
    sourceType: WaterSourceType,
): number {
    return DEFAULT_IMPACT_MOMENTUM_RETENTION_BY_SOURCE_TYPE[sourceType];
}

/**
 * Common configuration shared by Water-producing mechanisms.
 *
 * Source-specific geometry such as sprinkler nozzle count or hose width does
 * not belong here. Multi-emission mechanisms normalize their source-specific
 * geometry into WaterEmissionRequests before AirborneWaterSystem sees it.
 */
export interface WaterSourceDefinition {
    readonly id: string;
    readonly type: WaterSourceType;
    readonly enabled: boolean;

    readonly positionX: number;
    readonly positionY: number;
    readonly directionRadians: number;

    /** Authoritative Water quantity produced per second. */
    readonly flowRate: number;

    /** Time between representative authoritative emission requests. */
    readonly emissionInterval: number;

    readonly launchSpeed: number;

    /** Upward launch angle above the ground plane, in radians. */
    readonly launchElevationRadians: number;

    /** Relative susceptibility of airborne Water to Wind. */
    readonly windResponse: number;

    /**
     * Optional source override for horizontal momentum retained at impact.
     * Omitted definitions use the source-type default.
     */
    readonly impactMomentumRetention?: number;
}

export function validateWaterSourceDefinition(
    definition: WaterSourceDefinition,
): void {
    if (
        definition.id.trim().length === 0
    ) {
        throw new Error(
            "WaterSourceDefinition id must not be empty.",
        );
    }

    const finiteValues = [
        definition.positionX,
        definition.positionY,
        definition.directionRadians,
        definition.flowRate,
        definition.emissionInterval,
        definition.launchSpeed,
        definition.launchElevationRadians,
        definition.windResponse,
        definition.impactMomentumRetention ??
        getDefaultImpactMomentumRetention(definition.type),
    ];

    if (
        finiteValues.some(
            (value): boolean =>
                !Number.isFinite(value),
        )
    ) {
        throw new Error(
            `WaterSourceDefinition '${definition.id}' contains a non-finite numeric value.`,
        );
    }

    if (
        definition.flowRate < 0
    ) {
        throw new Error(
            `WaterSourceDefinition '${definition.id}' flowRate must be >= 0.`,
        );
    }

    if (
        definition.emissionInterval <= 0
    ) {
        throw new Error(
            `WaterSourceDefinition '${definition.id}' emissionInterval must be > 0.`,
        );
    }

    if (
        definition.launchSpeed < 0
    ) {
        throw new Error(
            `WaterSourceDefinition '${definition.id}' launchSpeed must be >= 0.`,
        );
    }

    if (
        definition.launchElevationRadians < 0 ||
        definition.launchElevationRadians > Math.PI / 2
    ) {
        throw new Error(
            `WaterSourceDefinition '${definition.id}' launchElevationRadians must be between 0 and PI / 2.`,
        );
    }

    if (
        definition.windResponse < 0
    ) {
        throw new Error(
            `WaterSourceDefinition '${definition.id}' windResponse must be >= 0.`,
        );
    }

    const impactMomentumRetention =
        definition.impactMomentumRetention ??
        getDefaultImpactMomentumRetention(
            definition.type,
        );

    if (
        impactMomentumRetention < 0 ||
        impactMomentumRetention > 1
    ) {
        throw new Error(
            `WaterSourceDefinition '${definition.id}' impactMomentumRetention must be between 0 and 1.`,
        );
    }
}

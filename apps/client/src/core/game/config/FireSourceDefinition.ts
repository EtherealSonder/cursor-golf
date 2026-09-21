/**
 * Shared authored definitions for Fire-producing gameplay sources.
 *
 * These definitions describe source intent only. They do not contain
 * PixiJS presentation state and they do not directly own combustion.
 * FireSourceSystem will translate active sources into EnvironmentField
 * heat deposition in later Phase 4B-6 subsections.
 */
export enum FireSourceType {
    Point = "point",
    Persistent = "persistent",
    Directional = "directional",
}

interface BaseFireSourceDefinition {
    readonly id: string;
    readonly type: FireSourceType;
    readonly enabled: boolean;
    readonly positionX: number;
    readonly positionY: number;
}

export interface PointFireSourceDefinition
    extends BaseFireSourceDefinition {
    readonly type: FireSourceType.Point;
    readonly radius: number;
    readonly heatAmount: number;
}

export interface PersistentFireSourceDefinition
    extends BaseFireSourceDefinition {
    readonly type: FireSourceType.Persistent;
    readonly radius: number;
    readonly heatPerSecond: number;
}

export interface DirectionalFireSourceDefinition
    extends BaseFireSourceDefinition {
    readonly type: FireSourceType.Directional;
    readonly directionRadians: number;
    readonly length: number;
    readonly halfWidth: number;
    readonly heatPerSecond: number;
    readonly endHeatMultiplier: number;
}

export type FireSourceDefinition =
    | PointFireSourceDefinition
    | PersistentFireSourceDefinition
    | DirectionalFireSourceDefinition;

export function validateFireSourceDefinition(
    definition: FireSourceDefinition,
): void {
    if (definition.id.trim().length === 0) {
        throw new Error("Fire source id cannot be empty.");
    }

    if (
        !Number.isFinite(definition.positionX) ||
        !Number.isFinite(definition.positionY)
    ) {
        throw new Error(
            `Fire source "${definition.id}" requires finite world coordinates.`,
        );
    }

    switch (definition.type) {
        case FireSourceType.Point:
            if (
                !Number.isFinite(definition.radius) ||
                definition.radius <= 0 ||
                !Number.isFinite(definition.heatAmount) ||
                definition.heatAmount <= 0
            ) {
                throw new Error(
                    `Point Fire source "${definition.id}" has invalid radius or heat amount.`,
                );
            }
            break;

        case FireSourceType.Persistent:
            if (
                !Number.isFinite(definition.radius) ||
                definition.radius <= 0 ||
                !Number.isFinite(definition.heatPerSecond) ||
                definition.heatPerSecond <= 0
            ) {
                throw new Error(
                    `Persistent Fire source "${definition.id}" has invalid radius or heat rate.`,
                );
            }
            break;

        case FireSourceType.Directional:
            if (
                !Number.isFinite(definition.directionRadians) ||
                !Number.isFinite(definition.length) ||
                definition.length <= 0 ||
                !Number.isFinite(definition.halfWidth) ||
                definition.halfWidth <= 0 ||
                !Number.isFinite(definition.heatPerSecond) ||
                definition.heatPerSecond <= 0 ||
                !Number.isFinite(definition.endHeatMultiplier) ||
                definition.endHeatMultiplier < 0 ||
                definition.endHeatMultiplier > 1
            ) {
                throw new Error(
                    `Directional Fire source "${definition.id}" has invalid direction, dimensions, heat rate, or falloff.`,
                );
            }
            break;
    }
}


/**
 * Authoritative Fire/Wind propagation tuning.
 *
 * This is simulation data, not presentation data. It deliberately leaves
 * LocalWindSystem authoritative for airflow geometry and acceleration.
 */
export interface FireWindDynamicsDefinition {
    /**
     * Normalized local-Wind bias above which Fire may continue propagating
     * downstream beyond the ordinary point-Fire generation limit.
     */
    readonly continuationWindBiasThreshold: number;

    /**
     * Candidate alignment required to qualify as a continuation step.
     * 1 = exactly downwind, 0 = perpendicular to Wind.
     */
    readonly continuationMinimumAlignment: number;

    /**
     * Extra probability multiplier for strongly downwind candidates.
     */
    readonly strongDownwindProbabilityMultiplier: number;

    /**
     * Probability multiplier applied to perpendicular candidates in strong Wind.
     */
    readonly strongCrosswindProbabilityMultiplier: number;

    /**
     * Probability multiplier applied to upwind candidates in strong Wind.
     */
    readonly strongUpwindProbabilityMultiplier: number;

    /**
     * Strong Wind narrows the accepted spread cone around the airflow axis.
     */
    readonly strongWindMinimumAlignment: number;

    /**
     * Spatial deterministic variation for ordinary Point Fire. This breaks
     * the repeated square-grid silhouette without changing cell size.
     */
    readonly irregularityMinimumMultiplier: number;
    readonly irregularityMaximumMultiplier: number;
    readonly irregularityGenerationPhase: number;
}

export const DEFAULT_FIRE_WIND_DYNAMICS_DEFINITION:
    FireWindDynamicsDefinition = Object.freeze({
    continuationWindBiasThreshold: 0.48,
    continuationMinimumAlignment: 0.68,

    strongDownwindProbabilityMultiplier: 1.85,
    strongCrosswindProbabilityMultiplier: 0.16,
    strongUpwindProbabilityMultiplier: 0.025,

    strongWindMinimumAlignment: 0.34,

    irregularityMinimumMultiplier: 0.42,
    irregularityMaximumMultiplier: 1.18,
    irregularityGenerationPhase: 0.731,
});

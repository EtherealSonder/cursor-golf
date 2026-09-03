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

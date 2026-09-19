import { SurfaceType } from "../surface/SurfaceType";

export interface WetSurfaceMaterialVisualDefinition {
    readonly surfaceType: SurfaceType;
    readonly color: number;
}

export interface WetSurfaceVisualDefinition {
    readonly enabled: boolean;
    readonly refreshIntervalSeconds: number;
    /** Quantization used only to detect meaningful moisture-shape changes. */
    readonly contourChangeMoistureQuantum: number;
    /** Force a contour rebuild even when visible membership has not changed. */
    readonly maximumContourReuseSeconds: number;
    /** Enter threshold for a newly visible wet-ground cell. */
    readonly minimumVisibleMoistureExcess: number;
    /** Lower exit threshold keeps drying cells stable near the boundary. */
    readonly visibleMoistureExitExcess: number;
    /** Brief retention prevents one-refresh moisture gaps from popping. */
    readonly visibleCellRetentionRefreshes: number;
    readonly minimumContourArea: number;
    readonly contourSimplificationTolerance: number;
    readonly contourSmoothingPasses: number;
    readonly contourSmoothingStrength: number;
    readonly contourCornerPreservation: number;
    readonly organicLobesEnabled: boolean;
    readonly organicLobeCount: number;
    readonly organicLobeAmplitudeCells: number;
    readonly organicSecondaryLobeAmplitudeCells: number;
    readonly wetGroundAlpha: number;
    readonly materialStyles: readonly WetSurfaceMaterialVisualDefinition[];
}

export const DEFAULT_WET_SURFACE_VISUAL_DEFINITION: WetSurfaceVisualDefinition = {
    enabled: true,
    refreshIntervalSeconds: 1 / 10,
    contourChangeMoistureQuantum: 0.01,
    maximumContourReuseSeconds: 0.40,
    minimumVisibleMoistureExcess: 0.015,
    visibleMoistureExitExcess: 0.010,
    visibleCellRetentionRefreshes: 3,
    minimumContourArea: 36,
    contourSimplificationTolerance: 1.5,
    contourSmoothingPasses: 1,
    contourSmoothingStrength: 0.26,
    contourCornerPreservation: 0.80,
    organicLobesEnabled: true,
    organicLobeCount: 4,
    organicLobeAmplitudeCells: 0.42,
    organicSecondaryLobeAmplitudeCells: 0.14,
    wetGroundAlpha: 0.60,
    materialStyles: [
        { surfaceType: SurfaceType.Grass, color: 0x24B978 },
        { surfaceType: SurfaceType.Sand, color: 0x745536 },
    ],
};

export function validateWetSurfaceVisualDefinition(
    definition: WetSurfaceVisualDefinition,
): void {
    if (typeof definition.enabled !== "boolean") {
        throw new Error("Wet-ground presentation enabled must be a boolean.");
    }
    if (!Number.isFinite(definition.refreshIntervalSeconds) ||
        definition.refreshIntervalSeconds <= 0) {
        throw new Error("Wet-ground refreshIntervalSeconds must be finite and positive.");
    }
    if (!Number.isFinite(definition.contourChangeMoistureQuantum) ||
        definition.contourChangeMoistureQuantum <= 0) {
        throw new Error("Wet-ground contourChangeMoistureQuantum must be finite and positive.");
    }
    if (!Number.isFinite(definition.maximumContourReuseSeconds) ||
        definition.maximumContourReuseSeconds <= 0) {
        throw new Error("Wet-ground maximumContourReuseSeconds must be finite and positive.");
    }
    if (!Number.isFinite(definition.minimumVisibleMoistureExcess) ||
        definition.minimumVisibleMoistureExcess < 0) {
        throw new Error("Wet-ground minimumVisibleMoistureExcess must be finite and non-negative.");
    }
    if (!Number.isFinite(definition.visibleMoistureExitExcess) ||
        definition.visibleMoistureExitExcess < 0 ||
        definition.visibleMoistureExitExcess > definition.minimumVisibleMoistureExcess) {
        throw new Error("Wet-ground visibleMoistureExitExcess must be finite, non-negative, and no greater than the enter threshold.");
    }
    if (!Number.isInteger(definition.visibleCellRetentionRefreshes) ||
        definition.visibleCellRetentionRefreshes < 0) {
        throw new Error("Wet-ground visibleCellRetentionRefreshes must be a non-negative integer.");
    }
    if (!Number.isFinite(definition.minimumContourArea) ||
        definition.minimumContourArea < 0) {
        throw new Error("Wet-ground minimumContourArea must be finite and non-negative.");
    }
    if (!Number.isFinite(definition.contourSimplificationTolerance) ||
        definition.contourSimplificationTolerance < 0) {
        throw new Error("Wet-ground contourSimplificationTolerance must be finite and non-negative.");
    }
    if (!Number.isInteger(definition.contourSmoothingPasses) ||
        definition.contourSmoothingPasses < 0 ||
        definition.contourSmoothingPasses > 4) {
        throw new Error("Wet-ground contourSmoothingPasses must be an integer from zero to four.");
    }
    if (!Number.isFinite(definition.contourSmoothingStrength) ||
        definition.contourSmoothingStrength < 0 ||
        definition.contourSmoothingStrength > 1) {
        throw new Error("Wet-ground contourSmoothingStrength must be between zero and one.");
    }
    if (!Number.isFinite(definition.contourCornerPreservation) ||
        definition.contourCornerPreservation < 0 ||
        definition.contourCornerPreservation > 1) {
        throw new Error("Wet-ground contourCornerPreservation must be between zero and one.");
    }
    if (typeof definition.organicLobesEnabled !== "boolean") {
        throw new Error("Wet-ground organicLobesEnabled must be a boolean.");
    }
    if (!Number.isInteger(definition.organicLobeCount) ||
        definition.organicLobeCount < 3 ||
        definition.organicLobeCount > 7) {
        throw new Error("Wet-ground organicLobeCount must be an integer from three to seven.");
    }
    if (!Number.isFinite(definition.organicLobeAmplitudeCells) ||
        definition.organicLobeAmplitudeCells < 0 ||
        !Number.isFinite(definition.organicSecondaryLobeAmplitudeCells) ||
        definition.organicSecondaryLobeAmplitudeCells < 0) {
        throw new Error("Wet-ground lobe amplitudes must be finite and non-negative.");
    }
    if (!Number.isFinite(definition.wetGroundAlpha) ||
        definition.wetGroundAlpha < 0 ||
        definition.wetGroundAlpha > 1) {
        throw new Error("Wet-ground wetGroundAlpha must be between zero and one.");
    }

    const seen = new Set<SurfaceType>();
    definition.materialStyles.forEach((style) => {
        if (seen.has(style.surfaceType)) {
            throw new Error(`Wet-ground visual has duplicate style for '${style.surfaceType}'.`);
        }
        seen.add(style.surfaceType);
        if (!Number.isInteger(style.color) ||
            style.color < 0x000000 ||
            style.color > 0xFFFFFF) {
            throw new Error(`Wet-ground visual color for '${style.surfaceType}' must be a valid 24-bit RGB integer.`);
        }
    });
}

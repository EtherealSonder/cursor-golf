import {
    SurfaceType,
} from "../surface/SurfaceType";

export interface WetSurfaceMaterialVisualDefinition {
    readonly surfaceType:
    SurfaceType;

    readonly color:
    number;
}

export interface WetSurfaceVisualDefinition {
    readonly enabled:
    boolean;

    readonly refreshIntervalSeconds:
    number;

    /**
     * Excess moisture below this amount has no visible darkening.
     */
    readonly minimumVisibleMoistureExcess:
    number;

    /**
     * Excess moisture at which the darkening reaches maximum alpha.
     */
    readonly fullVisualMoistureExcess:
    number;

    readonly maximumAlpha:
    number;

    /**
     * Radius, in EnvironmentField cells, used only for presentation smoothing.
     * Gameplay continues to use authoritative unsmoothed moisture values.
     */
    readonly smoothingRadiusCells:
    number;

    /**
     * Normalized alpha threshold used by the presentation-only GPU edge filter.
     */
    readonly edgeThreshold:
    number;

    /**
     * Width of the smooth GPU transition around the wet-ground boundary.
     */
    readonly edgeSoftness:
    number;

    readonly materialStyles:
    readonly WetSurfaceMaterialVisualDefinition[];
}

export const DEFAULT_WET_SURFACE_VISUAL_DEFINITION:
    WetSurfaceVisualDefinition = {
    enabled:
        true,

    refreshIntervalSeconds:
        1 / 10,

    minimumVisibleMoistureExcess:
        0.0015,

    fullVisualMoistureExcess:
        0.025,

    maximumAlpha:
        0.62,

    smoothingRadiusCells:
        2,

    edgeThreshold:
        0.08,

    edgeSoftness:
        0.10,

    materialStyles: [
        {
            surfaceType:
                SurfaceType.Grass,

            color:
                0x176B45,
        },
        {
            surfaceType:
                SurfaceType.Sand,

            color:
                0x745536,
        },
    ],
};

export function validateWetSurfaceVisualDefinition(
    definition:
        WetSurfaceVisualDefinition,
): void {
    if (
        typeof definition.enabled !==
        "boolean"
    ) {
        throw new Error(
            "Wet-ground presentation enabled must be a boolean.",
        );
    }

    if (
        !Number.isFinite(
            definition.refreshIntervalSeconds,
        ) ||
        definition.refreshIntervalSeconds <= 0
    ) {
        throw new Error(
            "Wet-ground refreshIntervalSeconds must be finite and positive.",
        );
    }

    if (
        !Number.isFinite(
            definition.minimumVisibleMoistureExcess,
        ) ||
        definition.minimumVisibleMoistureExcess < 0
    ) {
        throw new Error(
            "Wet-ground minimumVisibleMoistureExcess must be finite and non-negative.",
        );
    }

    if (
        !Number.isFinite(
            definition.fullVisualMoistureExcess,
        ) ||
        definition.fullVisualMoistureExcess <=
        definition.minimumVisibleMoistureExcess
    ) {
        throw new Error(
            "Wet-ground fullVisualMoistureExcess must be above minimumVisibleMoistureExcess.",
        );
    }

    if (
        !Number.isFinite(
            definition.maximumAlpha,
        ) ||
        definition.maximumAlpha < 0 ||
        definition.maximumAlpha > 1
    ) {
        throw new Error(
            "Wet-ground maximumAlpha must be finite and between zero and one.",
        );
    }

    if (
        !Number.isInteger(
            definition.smoothingRadiusCells,
        ) ||
        definition.smoothingRadiusCells < 0 ||
        definition.smoothingRadiusCells > 4
    ) {
        throw new Error(
            "Wet-ground smoothingRadiusCells must be an integer between zero and four.",
        );
    }

    if (
        !Number.isFinite(
            definition.edgeThreshold,
        ) ||
        definition.edgeThreshold < 0 ||
        definition.edgeThreshold >= 1
    ) {
        throw new Error(
            "Wet-ground edgeThreshold must be finite and between zero inclusive and one exclusive.",
        );
    }

    if (
        !Number.isFinite(
            definition.edgeSoftness,
        ) ||
        definition.edgeSoftness <= 0 ||
        definition.edgeSoftness > 1
    ) {
        throw new Error(
            "Wet-ground edgeSoftness must be finite, positive, and no greater than one.",
        );
    }

    const seen =
        new Set<SurfaceType>();

    for (
        const style
        of definition.materialStyles
    ) {
        if (
            seen.has(
                style.surfaceType,
            )
        ) {
            throw new Error(
                `Wet-ground visual has duplicate style for '${style.surfaceType}'.`,
            );
        }

        seen.add(
            style.surfaceType,
        );

        if (
            !Number.isInteger(
                style.color,
            ) ||
            style.color < 0x000000 ||
            style.color > 0xFFFFFF
        ) {
            throw new Error(
                `Wet-ground visual color for '${style.surfaceType}' must be a valid 24-bit RGB integer.`,
            );
        }
    }
}

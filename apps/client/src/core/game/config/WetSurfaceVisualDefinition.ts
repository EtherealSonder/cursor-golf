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

    readonly materialStyles:
    readonly WetSurfaceMaterialVisualDefinition[];
}

/*
 * 8C-8B visual rule:
 * Wet Grass stays distinctly green. Wet Sand darkens toward a richer earth
 * tone. Scorched cells are deliberately omitted here because ScorchRenderer
 * owns their persistent material appearance.
 */
export const DEFAULT_WET_SURFACE_VISUAL_DEFINITION:
    WetSurfaceVisualDefinition = {
    enabled:
        true,

    /*
     * Ground moisture changes far more slowly than standing Water.
     * 10 Hz is enough for a smooth visual fade once texture interpolation is
     * used and keeps the presentation cost predictable.
     */
    refreshIntervalSeconds:
        1 / 10,

    minimumVisibleMoistureExcess:
        0.0015,

    fullVisualMoistureExcess:
        0.025,

    maximumAlpha:
        0.62,

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
        definition.refreshIntervalSeconds <=
        0
    ) {
        throw new Error(
            "Wet-ground refreshIntervalSeconds must be finite and positive.",
        );
    }

    if (
        !Number.isFinite(
            definition.minimumVisibleMoistureExcess,
        ) ||
        definition.minimumVisibleMoistureExcess <
        0
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
            style.color <
            0x000000 ||
            style.color >
            0xFFFFFF
        ) {
            throw new Error(
                `Wet-ground visual color for '${style.surfaceType}' must be a valid 24-bit RGB integer.`,
            );
        }
    }
}

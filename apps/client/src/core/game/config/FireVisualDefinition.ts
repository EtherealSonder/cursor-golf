import {
    GAME_COLOR_PALETTE,
} from "./GameColorPalette";

/**
 * Presentation-only configuration for the temporary PixiJS Graphics
 * Fire renderer.
 *
 * Simulation cells remain exact. These values only deform the visual
 * footprint so neighbouring Fire cells overlap and read as continuous.
 */
export interface FireVisualDefinition {
    readonly enabled: boolean;

    readonly outerColor: number;
    readonly middleColor: number;
    readonly innerColor: number;

    readonly outerAlpha: number;
    readonly middleAlpha: number;
    readonly innerAlpha: number;

    readonly baseWidthMultiplier: number;
    readonly baseHeightMultiplier: number;

    readonly visualOffsetXRange: number;
    readonly visualOffsetYRange: number;

    readonly lobeCount: number;
    readonly lobeOffsetRange: number;
    readonly lobeMinimumRadiusMultiplier: number;
    readonly lobeMaximumRadiusMultiplier: number;

    readonly overallOverlapMultiplier: number;

    readonly flickerAmount: number;
    readonly flickerSpeed: number;
}

export const DEFAULT_FIRE_VISUAL_DEFINITION:
    FireVisualDefinition = {

    enabled: true,

    outerColor: GAME_COLOR_PALETTE.fire.accent,
    middleColor: GAME_COLOR_PALETTE.fire.main,
    innerColor: GAME_COLOR_PALETTE.fire.hot,

    outerAlpha: 0.24,
    middleAlpha: 0.76,
    innerAlpha: 0.94,

    baseWidthMultiplier: 1.18,
    baseHeightMultiplier: 0.82,

    visualOffsetXRange: 8,
    visualOffsetYRange: 6,

    lobeCount: 4,
    lobeOffsetRange: 18,
    lobeMinimumRadiusMultiplier: 0.18,
    lobeMaximumRadiusMultiplier: 0.34,

    overallOverlapMultiplier: 1.26,

    flickerAmount: 0.08,
    flickerSpeed: 8.5,
};

export function validateFireVisualDefinition(
    definition: FireVisualDefinition,
): void {
    const nonNegativeValues:
        Array<readonly [string, number]> = [
            ["outerColor", definition.outerColor],
            ["middleColor", definition.middleColor],
            ["innerColor", definition.innerColor],
            ["outerAlpha", definition.outerAlpha],
            ["middleAlpha", definition.middleAlpha],
            ["innerAlpha", definition.innerAlpha],
            ["baseWidthMultiplier", definition.baseWidthMultiplier],
            ["baseHeightMultiplier", definition.baseHeightMultiplier],
            ["visualOffsetXRange", definition.visualOffsetXRange],
            ["visualOffsetYRange", definition.visualOffsetYRange],
            ["lobeOffsetRange", definition.lobeOffsetRange],
            ["lobeMinimumRadiusMultiplier", definition.lobeMinimumRadiusMultiplier],
            ["lobeMaximumRadiusMultiplier", definition.lobeMaximumRadiusMultiplier],
            ["overallOverlapMultiplier", definition.overallOverlapMultiplier],
            ["flickerAmount", definition.flickerAmount],
            ["flickerSpeed", definition.flickerSpeed],
        ];

    for (const [name, value] of nonNegativeValues) {
        if (
            !Number.isFinite(value) ||
            value < 0
        ) {
            throw new Error(
                `Fire visual ${name} must be a finite non-negative number.`,
            );
        }
    }

    if (
        definition.baseWidthMultiplier <= 0 ||
        definition.baseHeightMultiplier <= 0 ||
        definition.lobeMinimumRadiusMultiplier <= 0 ||
        definition.lobeMaximumRadiusMultiplier <
        definition.lobeMinimumRadiusMultiplier ||
        definition.overallOverlapMultiplier <= 0 ||
        !Number.isInteger(definition.lobeCount) ||
        definition.lobeCount < 0
    ) {
        throw new Error(
            "Fire visual shape configuration is invalid.",
        );
    }

    if (
        definition.outerAlpha > 1 ||
        definition.middleAlpha > 1 ||
        definition.innerAlpha > 1 ||
        definition.flickerAmount > 1
    ) {
        throw new Error(
            "Fire visual alpha and flickerAmount values must not exceed one.",
        );
    }
}

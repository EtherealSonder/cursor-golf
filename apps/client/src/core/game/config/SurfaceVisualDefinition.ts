import {
    GAME_COLOR_PALETTE,
} from "./GameColorPalette";

export interface ProceduralMarkDefinition {
    readonly spacing: number;
    readonly positionJitter: number;
    readonly dotProbability: number;
    readonly dashProbability: number;
    readonly minimumDotRadius: number;
    readonly maximumDotRadius: number;
    readonly minimumDashLength: number;
    readonly maximumDashLength: number;
    readonly dashWidth: number;
}

export interface SurfaceVisualStyle {
    readonly baseColor: number;
    readonly detailColor: number;
    readonly detailAlpha: number;
    readonly outlineColor: number;
    readonly outlineAlpha: number;
    readonly outlineWidth: number;
    readonly marks: ProceduralMarkDefinition;
    readonly highlightColor: number | null;
    readonly highlightAlpha: number;
    readonly highlightProbability: number;
}

export interface SurfaceVisualDefinition {
    readonly grass: SurfaceVisualStyle;
    readonly wetGrass: SurfaceVisualStyle;
    readonly sand: SurfaceVisualStyle;
    readonly wetSand: SurfaceVisualStyle;
}

const GRASS_MARKS: ProceduralMarkDefinition = {
    spacing: 38,
    positionJitter: 11,

    /*
     * Grass no longer uses dots or arbitrary single
     * dashes. World interprets each Grass sample as
     * one compact three-blade tuft.
     */
    dotProbability: 0,
    dashProbability: 1,

    minimumDotRadius: 0,
    maximumDotRadius: 0,

    /*
     * These values are reused as the small controlled
     * tuft-height range.
     */
    minimumDashLength: 5,
    maximumDashLength: 7,

    /*
     * Blade stroke width.
     */
    dashWidth: 1.35,
};

const SAND_MARKS: ProceduralMarkDefinition = {
    spacing: 34,
    positionJitter: 13,

    /*
     * Sand uses grains only. No line/dash marks.
     */
    dotProbability: 0.72,
    dashProbability: 0,

    minimumDotRadius: 0.8,
    maximumDotRadius: 2.3,

    minimumDashLength: 0,
    maximumDashLength: 0,
    dashWidth: 0,
};

export const DEFAULT_SURFACE_VISUAL_DEFINITION:
    SurfaceVisualDefinition = {
    grass: {
        baseColor: GAME_COLOR_PALETTE.terrain.grass,
        detailColor: GAME_COLOR_PALETTE.terrain.grassDark,
        detailAlpha: 0.62,
        outlineColor: GAME_COLOR_PALETTE.terrain.grassDark,
        outlineAlpha: 0,
        outlineWidth: 0,
        marks: GRASS_MARKS,
        highlightColor: null,
        highlightAlpha: 0,
        highlightProbability: 0,
    },
    wetGrass: {
        baseColor: GAME_COLOR_PALETTE.terrain.grassDark,
        detailColor: GAME_COLOR_PALETTE.terrain.grass,
        detailAlpha: 0.55,
        outlineColor: GAME_COLOR_PALETTE.terrain.waterShadow,
        outlineAlpha: 0.65,
        outlineWidth: 3,
        marks: GRASS_MARKS,
        highlightColor: GAME_COLOR_PALETTE.terrain.water,
        highlightAlpha: 0.48,
        highlightProbability: 0.13,
    },
    sand: {
        baseColor: GAME_COLOR_PALETTE.terrain.sand,
        detailColor: GAME_COLOR_PALETTE.terrain.sandShadow,
        detailAlpha: 0.62,
        outlineColor: GAME_COLOR_PALETTE.terrain.sandShadow,
        outlineAlpha: 0.92,
        outlineWidth: 3,
        marks: SAND_MARKS,
        highlightColor: null,
        highlightAlpha: 0,
        highlightProbability: 0,
    },
    wetSand: {
        baseColor: GAME_COLOR_PALETTE.terrain.sandShadow,
        detailColor: GAME_COLOR_PALETTE.terrain.sand,
        detailAlpha: 0.40,
        outlineColor: GAME_COLOR_PALETTE.environment.wood,
        outlineAlpha: 0.88,
        outlineWidth: 3,
        marks: SAND_MARKS,
        highlightColor: GAME_COLOR_PALETTE.terrain.water,
        highlightAlpha: 0.28,
        highlightProbability: 0.08,
    },
};

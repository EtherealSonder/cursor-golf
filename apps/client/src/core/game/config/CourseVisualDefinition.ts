export interface CourseVisualDefinition {
    readonly grassTextureKey: string;
    readonly sandTextureKey: string;
    readonly grassTileScale: number;
    readonly sandTileScale: number;
    readonly terrainAlpha: number;
    readonly outsideBackgroundColor: number;
    readonly gameplayWallColor: number;
    readonly gameplayWallOutlineColor: number;
    readonly gameplayWallOutlineWidth: number;
    readonly gameplayWallHighlightColor: number;
    readonly gameplayWallHighlightWidth: number;
    readonly gameplayWallVisualThickness: number;
    /** Grass presentation overscan in world pixels, beneath the wall silhouette. */
    readonly gameplayWallGrassUnderfill: number;
    readonly gameplayWallCapDiameter: number;
    readonly gameplayWallCapColor: number;
    readonly gameplayWallCapHighlightColor: number;
    readonly gameplayWallCapHighlightRadius: number;
    readonly outsideBackgroundPalette: readonly number[];
    readonly outsideBackgroundTransitionSeconds: number;
}

export const DEFAULT_COURSE_VISUAL_DEFINITION:
    CourseVisualDefinition = {
    grassTextureKey: "grassTerrain",
    sandTextureKey: "sandTerrain",
    grassTileScale: 0.167,
    sandTileScale: 0.75,
    terrainAlpha: 1,
    outsideBackgroundColor: 0x302638,
    gameplayWallColor: 0x3b2a3c,
    gameplayWallOutlineColor: 0x251927,
    gameplayWallOutlineWidth: 3,
    gameplayWallHighlightColor: 0x5a4357,
    gameplayWallHighlightWidth: 2,
    gameplayWallVisualThickness: 18,
    gameplayWallGrassUnderfill: 9,
    gameplayWallCapDiameter: 26,
    gameplayWallCapColor: 0xf35b75,
    gameplayWallCapHighlightColor: 0xff9a9f,
    gameplayWallCapHighlightRadius: 3.8,
    // Legacy fallback for code paths that do not use the modifier-aware animator.
    outsideBackgroundPalette: [0x28212f, 0x302638, 0x392b40, 0x302b3c, 0x252331],
    outsideBackgroundTransitionSeconds: 18,
};

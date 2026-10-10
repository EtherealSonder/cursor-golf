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
    sandTileScale: 0.25,
    terrainAlpha: 1,
    outsideBackgroundColor: 0xeee8ef,
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
    outsideBackgroundPalette: [0xd9b4f4, 0xf5b5d3, 0xffd0a3, 0xbfc7ff, 0xd6b6fa],
    outsideBackgroundTransitionSeconds: 18,
};

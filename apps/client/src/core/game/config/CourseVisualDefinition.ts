export interface CourseVisualDefinition {
    readonly grassTextureKey: string;
    readonly sandTextureKey: string;
    readonly grassTileScale: number;
    readonly sandTileScale: number;
    readonly terrainAlpha: number;
    readonly outsideBackgroundColor: number;
    readonly gameplayWallColor: number;
    readonly gameplayWallOutlineColor: number;
}

export const DEFAULT_COURSE_VISUAL_DEFINITION:
    CourseVisualDefinition = {
    grassTextureKey: "grassTerrain",
    sandTextureKey: "sandTerrain",
    grassTileScale: 0.167,
    sandTileScale: 0.25,
    terrainAlpha: 1,
    outsideBackgroundColor: 0xeee8ef,
    gameplayWallColor: 0xa96f2a,
    gameplayWallOutlineColor: 0x81511d,
};

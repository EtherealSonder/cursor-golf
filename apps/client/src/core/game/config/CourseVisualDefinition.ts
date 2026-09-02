export interface CourseVisualDefinition {
    readonly grassTextureKey: string;
    readonly sandTextureKey: string;
    readonly grassTileScale: number;
    readonly sandTileScale: number;
    readonly terrainAlpha: number;
}

export const DEFAULT_COURSE_VISUAL_DEFINITION:
    CourseVisualDefinition = {
    grassTextureKey: "grassTerrain",
    sandTextureKey: "sandTerrain",
    grassTileScale: 0.25,
    sandTileScale: 0.25,
    terrainAlpha: 1,
};

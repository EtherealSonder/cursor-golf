/**
 * Defines visual configuration for the rendered
 * course terrain.
 *
 * These values affect presentation only.
 *
 * They do not change:
 *
 * 1. Ball physics
 * 2. Camera boundaries
 * 3. Collision boundaries
 * 4. World-space coordinates
 * 5. Input conversion
 */
export interface CourseVisualDefinition {

    /**
     * AssetLoader texture key used by the course
     * terrain TilingSprite.
     */
    readonly terrainTextureKey: string;

    /**
     * Horizontal scale applied to the repeating
     * terrain texture.
     *
     * Values below one make each repeated tile
     * appear smaller and increase visual density.
     */
    readonly terrainTileScaleX: number;

    /**
     * Vertical scale applied to the repeating
     * terrain texture.
     *
     * Values below one make each repeated tile
     * appear smaller and increase visual density.
     */
    readonly terrainTileScaleY: number;

    /**
     * Overall course terrain opacity.
     *
     * Valid range:
     *
     * 0 = fully transparent
     * 1 = fully opaque
     */
    readonly terrainAlpha: number;

    /**
     * Optional PixiJS tint applied to the terrain.
     *
     * White preserves the original texture colors.
     */
    readonly terrainTint: number;
}

/**
 * Default temporary terrain configuration used
 * during Phase 4C camera validation.
 *
 * The original image is 980 × 980 pixels.
 *
 * A tile scale of 0.5 produces an effective visual
 * repeat size of approximately 490 × 490 world
 * pixels, which provides clear optical movement
 * without making individual flowers excessively
 * large.
 */
export const DEFAULT_COURSE_VISUAL_DEFINITION:
    CourseVisualDefinition = {

    terrainTextureKey:
        "grassMeadowTile",

    terrainTileScaleX:
        0.5,

    terrainTileScaleY:
        0.5,

    terrainAlpha:
        1,

    terrainTint:
        0xffffff,
};
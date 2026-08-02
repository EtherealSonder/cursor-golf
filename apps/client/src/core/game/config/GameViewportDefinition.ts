/**
 * Defines the logical PixiJS gameplay viewport.
 *
 * During the pre-camera development phase, the
 * complete course remains visible inside this
 * viewport. The renderer, course boundaries, and
 * browser-input conversion all use this shared
 * definition so their coordinate systems cannot
 * silently diverge.
 */
export interface GameViewportDefinition {

    /**
     * Logical gameplay width in world pixels.
     */
    readonly width: number;

    /**
     * Logical gameplay height in world pixels.
     */
    readonly height: number;
}

/**
 * Temporary expanded pre-camera viewport.
 *
 * The 1200 × 720 dimensions preserve the existing
 * 5:3 course aspect ratio while providing more
 * visible testing space.
 */
export const DEFAULT_GAME_VIEWPORT_DEFINITION:
    GameViewportDefinition = {

    width: 1200,
    height: 720,
};

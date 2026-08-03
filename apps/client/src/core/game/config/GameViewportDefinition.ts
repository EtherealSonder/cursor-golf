/**
 * Defines the fixed logical PixiJS gameplay
 * coordinate system.
 *
 * The browser may display the canvas at different
 * CSS dimensions, but gameplay systems continue to
 * operate inside this stable logical space.
 *
 * This prevents browser resizing from changing:
 *
 * 1. Camera coordinates
 * 2. Ball physics coordinates
 * 3. Shot distances
 * 4. Obstacle positions
 * 5. Input meaning
 */
export interface GameViewportDefinition {

    /**
     * Fixed logical gameplay width.
     */
    readonly width: number;

    /**
     * Fixed logical gameplay height.
     */
    readonly height: number;
}

/**
 * Stable logical game resolution.
 *
 * The Pixi renderer is created once at this size.
 * CSS scales the resulting canvas to fill the
 * available browser game area.
 *
 * Browser resize does not modify these values.
 */
export const DEFAULT_GAME_VIEWPORT_DEFINITION:
    GameViewportDefinition = {

    width:
        1200,

    height:
        720,
};
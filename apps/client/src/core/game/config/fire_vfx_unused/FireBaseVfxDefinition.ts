/**
 * Presentation-only tuning for the low connected burning bed.
 *
 * This layer is intentionally restrained. It exists only to visually connect
 * neighbouring burning FireCells underneath the later flame-tongue layer.
 *
 * It must never become simulation authority.
 */
export interface FireBaseVfxDefinition {
    readonly stampSize: number;
    readonly stampOverlapScale: number;

    readonly minimumAlpha: number;
    readonly maximumAlpha: number;

    readonly minimumScale: number;
    readonly maximumScale: number;

    readonly youngFireAlphaBoost: number;

    readonly accentAlpha: number;
    readonly accentScale: number;
}

export const DEFAULT_FIRE_BASE_VFX_DEFINITION:
    FireBaseVfxDefinition = {

    /*
     * FireCells are 48 px. A stamp slightly larger than one cell overlaps
     * adjacent cells and therefore creates a continuous low burning bed.
     */
    stampSize:
        58,

    stampOverlapScale:
        1.04,

    minimumAlpha:
        0.46,

    maximumAlpha:
        0.72,

    minimumScale:
        0.88,

    maximumScale:
        1.02,

    youngFireAlphaBoost:
        0.08,

    /*
     * A restrained red accent sits below the orange body. Both are static
     * sprite stamps, not reconstructed Graphics geometry.
     */
    accentAlpha:
        0.38,

    accentScale:
        1.08,
};

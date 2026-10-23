/** P0: visual-only portal previews. No colliders or teleportation. */
export const PORTAL_PREVIEW = {
    /** Figma ball 20 px corresponds to the current 20-world-unit ball. */
    holderWidth: 320,
    holderHeight: 103.4,
    /** Central oval fit, expressed in world units relative to the holder center. */
    openingWidth: 150.4,
    openingHeight: 84,
    openingOffsetX: 0,
    openingOffsetY: 0,
    /** Keep each 256x256 source frame square; clip it with the elliptical opening. */
    artworkWidth: 158,
    artworkHeight: 158,
    artworkOffsetX: 0,
    artworkOffsetY: 0,
    framesPerSecond: 12,
} as const;
export type PortalPreviewVariant = 1 | 2 | 3;

/**
 * Phase F-3 shared Fire visual contract. Presentation-only.
 *
 * Post-restoration color calibration:
 * preserve the existing Fire architecture while restoring stronger thermal
 * separation between yellow, orange, and red/coral layers.
 */
export const FIRE_ART_DIRECTION = Object.freeze({
    palette: Object.freeze({
        hotCore: 0xfff1a6,
        hot: 0xffd34e,
        body: 0xff8435,
        coolOuter: 0xe94b3c,
    }),
    rendering: Object.freeze({
        hardSilhouettes: true,
        crispAlpha: true,
        flatColors: true,
        blurredEdges: false,
        softGlow: false,
        volumetricFire: false,
        limitedTransparency: true,
        organicCurves: true,
        handDrawnIrregularity: true,
        clearLargeShapes: true,
        sparseSmallDetails: true,
    }),
});
export type FireArtDirectionDefinition = typeof FIRE_ART_DIRECTION;

/** B8: Stateless porous foliage absorption. Applies to all authoritative airborne water sources. */
export const BUSH_WATER = {
    /** Fraction of packet mass removed over a full-width (136 px) foliage crossing. */
    centerCrossingAbsorption: 0.75,
    /** Numerical sampling step used for swept foliage intersections. */
    sampleStepPx: 6,
    /** Inside-foliage presentation thinning (in addition to authoritative packet absorption). */
    interiorPresentationFraction: 0.45,
} as const;

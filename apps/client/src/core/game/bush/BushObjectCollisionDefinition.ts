/** B6: a bush is a soft-looking but impenetrable obstacle to non-ball rigid bodies. */
export const BUSH_OBJECT_COLLISION = {
    /** Inset circular footprint avoids snagging on individual leaf cut-outs. */
    radius: 51,
    /** Maximum correction passes for stacked or tightly packed movable bodies. */
    resolutionPasses: 3,
    /** A zero-restitution collision: bodies slide rather than reflect. */
    restitution: 0,
    friction: 0.55,
} as const;

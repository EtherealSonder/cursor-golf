/** C4 crate-only response to continuous high-pressure jets. Sprinkler packets remain collision-only. */
export const CRATE_WATER = {
    jetImpulseMultiplier: 1.35,
    /** Portion of half-height used for a bounded, off-center jet contact. */
    maximumContactOffsetFraction: 0.85,
    /** Reject weak near-edge jet samples to prevent persistent micro-torque. */
    minimumJetInfluence: 0.025,
} as const;

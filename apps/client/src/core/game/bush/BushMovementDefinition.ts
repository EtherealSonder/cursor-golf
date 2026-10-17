/** B3 tuning: additional rolling deceleration, not an entry velocity clamp. */
export const BUSH_MOVEMENT_DEFINITION = {
    /** At full foliage coverage, add 4.4 times the baseline rolling deceleration. */
    additionalRollingDecelerationMultiplier: 4.4,
    /** Small overlap should still allow a weak shot to enter the foliage. */
    coverageExponent: 1.25,
    /** Safety cap for overlapping bushes (their union coverage is <= 1). */
    maximumCoverage: 1,
    /** Retain 12% of incoming velocity once on entry. */
    entryVelocityRetention: 0.12,
    /** Clamp only once the ball is almost completely covered by foliage. */
    entryCoverageThreshold: 0.95,
    /** Re-arm only after the ball has substantially cleared the bush. */
    exitCoverageThreshold: 0.015,
    /** While the ball is crossing the outer foliage, do not stop it before full entry. */
    partialEntryResistanceMultiplier: 0.08,
    /** Coverage at which the full interior resistance is enabled. */
    fullResistanceCoverageThreshold: 0.95,
    impactShake: { amplitude: 5.2, duration: 0.18, frequency: 27, decayExponent: 1.6, roughness: 0.65 },
} as const;

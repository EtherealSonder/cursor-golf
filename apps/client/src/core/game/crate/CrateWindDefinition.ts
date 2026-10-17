/** C3 crate-only wind tuning. Other rigid bodies retain their original response. */
export const CRATE_WIND = {
    fanImpulseMultiplier: 0.62,
    suctionImpulseMultiplier: 2.3,
    /** Side-to-side airflow differential creates torque through the rigid body. */
    sampleHalfWidth: 23,
    sampleHalfHeight: 21,
    torqueFraction: 0.40,
    maximumTangentialImpulsePerStep: 10,
    minimumSampleAcceleration: 0.01,
} as const;

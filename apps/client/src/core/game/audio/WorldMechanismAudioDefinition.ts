/** AUD-6 tuning. All gains multiply asset defaults; rates are calibrated against recorded samples. */
export const WORLD_MECHANISM_AUDIO = {
    mine: { beepGain: 0.8, explosionGain: 1, lethalExplosionMinimumRate: 0.3 },
    robot: { walkGain: 0.8, detectionGain: 1, rateCalibration: 1, minimumRate: 0.6, maximumRate: 2.5 },
    fan: { gain: 0.65, maximumRate: 1.35 },
} as const;

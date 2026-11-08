/** AUD-3 movement-triggered one-shot tuning. Distances are world pixels. */
export const BALL_TRAVERSAL_AUDIO = {
    teleportDistance: 180,
    water: { minimumSpeed: 35, distanceMin: 55, distanceMax: 90, cooldownSeconds: 0.14, entryGain: 0.48, minimumGain: 0.26, fullGainSpeed: 550, rateVariation: 0.05 },
    sand: { minimumSpeed: 25, distanceMin: 45, distanceMax: 75, cooldownSeconds: 0.18, minimumGain: 0.22, fullGainSpeed: 450, rateVariation: 0.04 },
} as const;

/** Audio-only tuning. Simulation and source propagation are unchanged. */
export const FIRE_AUDIO = {
    ground: { updateSeconds: 0.24, maximumEmitters: 6, gain: 0.7, minimumCells: 1 },
    robot: { gain: 0.85 },
} as const;

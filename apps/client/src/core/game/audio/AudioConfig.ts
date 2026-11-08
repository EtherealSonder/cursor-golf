/** AUD-1 tuning, shared by later gameplay audio integrations. */
export const AUDIO_CONFIG = {
    masterVolume: 0.75,
    maximumVoices: 20,
    panStrength: 0.9,
    /** Source is silent at this many viewport half-widths from the centre. */
    silenceRadius: 1.65,
    /** Avoid abrupt gain changes while the camera follows the ball. */
    spatialSmoothingSeconds: 0.035,
} as const;

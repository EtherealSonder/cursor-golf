/** Manual inspection zoom is screen-space input, independent of shot/cinematic zoom. */
export const CAMERA_MANUAL_ZOOM = {
    minimum: 0.55,
    maximum: 1.25,
    wheelStep: 0.12,
    interpolationRate: 7,
    resetKey: "KeyR",
} as const;

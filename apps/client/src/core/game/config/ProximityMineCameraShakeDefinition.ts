/**
 * Presentation-only camera feedback for a proximity-mine explosion.
 *
 * All distances are logical world pixels. CameraShake still owns the final
 * render-space displacement and its global safety limits.
 */
export interface ProximityMineCameraShakeDefinition {
    readonly enabled: boolean;
    readonly amplitude: number;
    readonly duration: number;
    readonly frequency: number;
    readonly roughness: number;
    readonly decayExponent: number;

    /** Initial share of the shake that follows the explosion direction. */
    readonly directionalBias: number;

    /** Directional character fades faster than the overall shake. */
    readonly directionalBiasDecayExponent: number;

    /** Inside this camera-centre distance the shake becomes omnidirectional. */
    readonly centralOmnidirectionalRadius: number;

    /** How far beyond blastRadius a nearby off-screen explosion can be felt. */
    readonly influenceRadiusMultiplier: number;

    /** Lowest retained strength for a nearby explosion whose circle is off-screen. */
    readonly nearbyOffscreenIntensityFloor: number;

    /** Extra weight given to actual explosion-circle overlap with the viewport. */
    readonly exposureWeight: number;
}

export const PROXIMITY_MINE_CAMERA_SHAKE: ProximityMineCameraShakeDefinition = {
    enabled: true,
    amplitude: 28,
    duration: 0.48,
    frequency: 38,
    roughness: 1.0,
    decayExponent: 1.45,
    directionalBias: 0.78,
    directionalBiasDecayExponent: 1.8,
    centralOmnidirectionalRadius: 50,
    influenceRadiusMultiplier: 1.8,
    nearbyOffscreenIntensityFloor: 0.16,
    exposureWeight: 0.62,
};

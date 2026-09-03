/**
 * Presentation-only tuning for coherent Fire-field deformation.
 *
 * Two spatial/temporal noise scales are combined:
 * - broad noise rolls/breathes the complete connected mass
 * - detail noise creates faster licking/curling edge motion
 *
 * Fire simulation authority remains in FireManager / EnvironmentField.
 */
export interface FireFieldDistortionVfxDefinition {
    readonly broadNoiseScale: number;
    readonly broadNoiseSpeed: number;
    readonly broadDisplacementAmount: number;

    readonly detailNoiseScale: number;
    readonly detailNoiseSpeed: number;
    readonly detailDisplacementAmount: number;

    readonly frontDistortionBoost: number;
    readonly oldFireDistortionMultiplier: number;

    readonly outerHaloExpansion: number;
    readonly outerHaloAlpha: number;

    readonly outerBodyExpansion: number;
    readonly outerBodyAlpha: number;

    readonly bodyAlpha: number;

    readonly minimumVisibleRadius: number;
}

export const DEFAULT_FIRE_FIELD_DISTORTION_VFX_DEFINITION:
    FireFieldDistortionVfxDefinition = {

    broadNoiseScale:
        0.018,

    broadNoiseSpeed:
        0.82,

    broadDisplacementAmount:
        5.5,

    detailNoiseScale:
        0.072,

    detailNoiseSpeed:
        2.65,

    detailDisplacementAmount:
        3.1,

    frontDistortionBoost:
        1.28,

    oldFireDistortionMultiplier:
        0.72,

    outerHaloExpansion:
        7.5,

    outerHaloAlpha:
        0.24,

    outerBodyExpansion:
        3.4,

    outerBodyAlpha:
        0.66,

    bodyAlpha:
        0.96,

    minimumVisibleRadius:
        1.2,
};

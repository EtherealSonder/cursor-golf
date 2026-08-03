/**
 * One generic Camera shake request.
 *
 * CameraShake consumes these values without knowing
 * which gameplay event produced them.
 */
export interface CameraShakeRequest {

    /**
     * Maximum displacement from the base Camera
     * position.
     *
     * Units: logical world pixels.
     */
    readonly amplitude: number;

    /**
     * Total shake lifetime.
     *
     * Units: seconds.
     */
    readonly duration: number;

    /**
     * Base oscillation frequency.
     *
     * Units: cycles per second.
     */
    readonly frequency: number;

    /**
     * Exponent applied to the remaining lifetime.
     *
     * 1 produces linear decay.
     * Values above 1 make the shake lose energy more
     * quickly near the end.
     */
    readonly decayExponent: number;

    /**
     * Irregularity of the motion.
     *
     * 0 produces a clean controlled pulse.
     * 1 produces a rough multi-frequency shake.
     */
    readonly roughness: number;
}

/**
 * Generic Camera shake engine configuration.
 */
export interface CameraShakeDefinition {

    readonly enabled: boolean;

    /**
     * Future-ready accessibility switch.
     *
     * When true, shake requests are scaled by
     * reducedMotionAmplitudeMultiplier and
     * reducedMotionDurationMultiplier.
     */
    readonly reducedMotionEnabled: boolean;

    readonly reducedMotionAmplitudeMultiplier:
    number;

    readonly reducedMotionDurationMultiplier:
    number;

    /**
     * Hard safety limits applied to every request and
     * to stacked shake energy.
     */
    readonly maximumAmplitude: number;

    readonly maximumDuration: number;

    readonly minimumVisibleAmplitude: number;

    readonly maximumDeltaTime: number;

    /**
     * Different phase offsets prevent X and Y from
     * moving in the same pattern.
     */
    readonly secondaryFrequencyRatio: number;

    readonly tertiaryFrequencyRatio: number;
}

/**
 * Shot-release Camera feedback tuning.
 */
export interface ShotCameraFeedbackDefinition {

    /**
     * Power below this value produces no release
     * shake.
     */
    readonly minimumPowerForShake: number;

    /**
     * Nonlinear power response.
     *
     * A value of 2 means amplitude grows with power².
     */
    readonly powerExponent: number;

    readonly maximumAmplitude: number;

    readonly minimumDuration: number;

    readonly maximumDuration: number;

    readonly inaccurateFrequency: number;

    readonly accurateFrequency: number;

    readonly perfectFrequency: number;

    readonly inaccurateRoughness: number;

    readonly accurateRoughness: number;

    readonly perfectRoughness: number;

    readonly inaccurateDecayExponent: number;

    readonly accurateDecayExponent: number;

    readonly perfectDecayExponent: number;

    /**
     * Perfect releases receive a compact impact boost,
     * then use a shorter and cleaner profile.
     */
    readonly perfectAmplitudeMultiplier: number;

    readonly perfectDurationMultiplier: number;
}

/**
 * Collision Camera feedback tuning.
 */
export interface CollisionCameraFeedbackDefinition {

    readonly minimumImpactSpeed: number;

    readonly maximumImpactSpeed: number;

    readonly impactExponent: number;

    readonly maximumAmplitude: number;

    readonly minimumDuration: number;

    readonly maximumDuration: number;

    readonly minimumFrequency: number;

    readonly maximumFrequency: number;

    readonly minimumRoughness: number;

    readonly maximumRoughness: number;

    readonly decayExponent: number;
}

/**
 * Complete Phase 4F Camera feedback configuration.
 */
export interface CameraFeedbackDefinition {

    readonly shake:
    CameraShakeDefinition;

    readonly shot:
    ShotCameraFeedbackDefinition;

    readonly collision:
    CollisionCameraFeedbackDefinition;
}

export const DEFAULT_CAMERA_FEEDBACK_DEFINITION:
    CameraFeedbackDefinition = {

    shake: {
        enabled:
            true,

        reducedMotionEnabled:
            false,

        reducedMotionAmplitudeMultiplier:
            0.2,

        reducedMotionDurationMultiplier:
            0.55,

        maximumAmplitude:
            18,

        maximumDuration:
            0.5,

        minimumVisibleAmplitude:
            0.02,

        maximumDeltaTime:
            0.05,

        secondaryFrequencyRatio:
            1.31,

        tertiaryFrequencyRatio:
            1.83,
    },

    shot: {
        minimumPowerForShake:
            0.16,

        powerExponent:
            2,

        maximumAmplitude:
            13,

        minimumDuration:
            0.1,

        maximumDuration:
            0.28,

        inaccurateFrequency:
            17,

        accurateFrequency:
            24,

        perfectFrequency:
            31,

        inaccurateRoughness:
            0.9,

        accurateRoughness:
            0.42,

        perfectRoughness:
            0.12,

        inaccurateDecayExponent:
            1.15,

        accurateDecayExponent:
            1.55,

        perfectDecayExponent:
            2.2,

        perfectAmplitudeMultiplier:
            1.15,

        perfectDurationMultiplier:
            0.68,
    },

    collision: {
        minimumImpactSpeed:
            180,

        maximumImpactSpeed:
            900,

        impactExponent:
            1.6,

        maximumAmplitude:
            10,

        minimumDuration:
            0.08,

        maximumDuration:
            0.22,

        minimumFrequency:
            18,

        maximumFrequency:
            30,

        minimumRoughness:
            0.35,

        maximumRoughness:
            0.85,

        decayExponent:
            1.45,
    },
};

/**
 * FIRE-VFX-4 presentation-only Wind response tuning.
 *
 * LocalWindSystem remains the authoritative source of spatial airflow.
 * FireManager continues to own Wind-biased Fire spread.
 *
 * These values control only how newly spawned flame particles visually bend
 * while they travel.
 */
export interface FireWindVfxDefinition {
    readonly enabled: boolean;

    /**
     * Ignore extremely weak sampled airflow so particles at the very edge of
     * a local-wind field do not develop barely-visible directional drift.
     *
     * Units: world pixels per second squared.
     */
    readonly minimumSourceAcceleration: number;

    /**
     * Converts sampled LocalWindSystem acceleration into an immediate
     * presentation velocity contribution at particle spawn.
     *
     * Units: seconds. Conceptually:
     *
     * immediateWindVelocity = sampledAcceleration * velocityContributionTime
     */
    readonly velocityContributionTime: number;

    /**
     * Hard cap on the immediate Wind velocity contribution.
     *
     * Units: world pixels per second.
     */
    readonly maximumVelocityContribution: number;

    /**
     * Strong Wind suppresses the particle's authored upward buoyancy before
     * the immediate Wind velocity is added.
     *
     * 0 = never suppress upward velocity.
     * 1 = at maximum Wind strength, remove all authored upward velocity.
     */
    readonly maximumUpwardVelocitySuppression: number;

    /**
     * Source acceleration magnitude treated as maximum visual Wind strength
     * for buoyancy suppression and orientation response.
     *
     * Units: world pixels per second squared.
     */
    readonly sourceAccelerationForMaximumStrength: number;

    /**
     * Scales authoritative LocalWindSystem acceleration into continuing
     * visual flame acceleration during the particle lifetime.
     */
    readonly accelerationMultiplier: number;

    /**
     * Hard presentation-only cap on the magnitude of continuing acceleration
     * applied to one Fire particle.
     *
     * Units: world pixels per second squared.
     */
    readonly maximumParticleAcceleration: number;

    /**
     * How strongly the elongated particle sprite follows its resultant
     * velocity direction.
     *
     * Units: interpolation speed per second.
     */
    readonly orientationFollowSpeed: number;

    /**
     * Preserves a small amount of authored angular motion while the particle
     * follows its velocity direction.
     *
     * 0 = no angular wobble.
     * 1 = full original angular velocity.
     */
    readonly angularVelocityRetention: number;
}

export const DEFAULT_FIRE_WIND_VFX_DEFINITION:
    FireWindVfxDefinition = {

    enabled:
        true,

    minimumSourceAcceleration:
        24,

    /*
     * Immediate velocity contribution makes strong local Wind readable from
     * the first frame instead of waiting for acceleration to overcome the
     * authored upward flame velocity.
     */
    velocityContributionTime:
        0.16,

    maximumVelocityContribution:
        175,

    /*
     * At maximum Wind strength, retain only a small portion of the authored
     * upward buoyancy. This allows South Wind to visibly carry Fire south.
     */
    maximumUpwardVelocitySuppression:
        0.82,

    sourceAccelerationForMaximumStrength:
        950,

    /*
     * Continuing acceleration keeps the trajectory bending after spawn.
     */
    accelerationMultiplier:
        0.24,

    maximumParticleAcceleration:
        280,

    /*
     * Smooth orientation tracking keeps elongated particles aligned with
     * travel without making them snap like rigid arrows.
     */
    orientationFollowSpeed:
        10,

    angularVelocityRetention:
        0.22,
};

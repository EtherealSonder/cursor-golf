/**
 * FIRE-VFX-5 presentation-only directional Jet tuning.
 *
 * A Jet uses the exact same FireVfxPool, FireVfxParticle class and Fire
 * textures as Ground Fire. Only emission geometry and initial motion differ.
 *
 * FireSourceSystem remains authoritative for source position, direction,
 * lifetime/enable state and EnvironmentField heat deposition.
 */
export interface JetFireVfxDefinition {
    readonly enabled: boolean;

    /**
     * Base particle emission rate for one enabled Directional FireSource.
     */
    readonly particlesPerSecondPerSource: number;

    /**
     * Small forward offset from the source origin. This prevents the broad
     * centre of a particle mask from visually sitting behind the nozzle.
     */
    readonly spawnForwardOffset: number;

    /**
     * Random radial jitter around the source origin.
     */
    readonly spawnRadius: number;

    /**
     * Half-angle of the authored emission cone.
     *
     * A narrow cone produces the continuous gun/flamethrower stream shown in
     * the visual reference rather than a wide Fire spray.
     */
    readonly coneHalfAngleRadians: number;

    /**
     * Strong forward travel is what differentiates Jet Fire from Ground Fire.
     *
     * Units: world pixels per second.
     */
    readonly forwardVelocityMinimum: number;
    readonly forwardVelocityMaximum: number;

    /**
     * Small perpendicular variation keeps the stream organic while remaining
     * visually directional.
     *
     * Units: world pixels per second.
     */
    readonly lateralVelocityMinimum: number;
    readonly lateralVelocityMaximum: number;

    /**
     * Jet particles reuse the shared particle ranges but scale them to create
     * a denser, faster and slightly more compact stream.
     */
    readonly lifetimeMultiplier: number;
    readonly startScaleMultiplier: number;
    readonly endScaleMultiplier: number;
    readonly alphaMultiplier: number;

    /**
     * Jet particles should visibly follow their travel direction.
     */
    readonly orientationFollowSpeed: number;
    readonly angularVelocityRetention: number;

    /**
     * Existing local airflow may bend a Jet, but the powered forward velocity
     * should remain dominant.
     */
    readonly localWindAccelerationMultiplier: number;
    readonly maximumLocalWindAcceleration: number;

    /**
     * Restricts per-frame catch-up after a slow frame.
     */
    readonly maximumSpawnsPerSourcePerFrame: number;

    /**
     * Deterministic per-source fractional emission carry.
     */
    readonly emitterState: {
        readonly maximumTrackedStates: number;
        readonly maximumCarryParticles: number;
    };
}

export const DEFAULT_JET_FIRE_VFX_DEFINITION:
    JetFireVfxDefinition = {

    enabled:
        true,

    /*
     * Dense enough for overlapping volume while staying comfortably inside
     * the existing shared pool under a single test Jet.
     */
    particlesPerSecondPerSource:
        185,

    spawnForwardOffset:
        8,

    spawnRadius:
        6,

    /*
     * About +/- 6.3 degrees.
     */
    coneHalfAngleRadians:
        0.11,

    forwardVelocityMinimum:
        430,

    forwardVelocityMaximum:
        610,

    lateralVelocityMinimum:
        -24,

    lateralVelocityMaximum:
        24,

    /*
     * At roughly 500 px/s and ~0.7 s visible lifetime the stream naturally
     * reaches around the current authored Directional source length.
     */
    lifetimeMultiplier:
        0.78,

    startScaleMultiplier:
        0.76,

    endScaleMultiplier:
        0.92,

    alphaMultiplier:
        1.08,

    orientationFollowSpeed:
        15,

    angularVelocityRetention:
        0.10,

    /*
     * Wind bends the Jet but does not overpower the nozzle direction.
     */
    localWindAccelerationMultiplier:
        0.34,

    maximumLocalWindAcceleration:
        150,

    maximumSpawnsPerSourcePerFrame:
        6,

    emitterState: {
        maximumTrackedStates:
            32,

        maximumCarryParticles:
            1.5,
    },
};

export interface GroundFireVfxDefinition {
    readonly minimumEmissionRate: number;
    readonly maximumEmissionRate: number;

    readonly spawnRadius: number;
    readonly edgeSpawnBias: number;

    readonly minimumLifetime: number;
    readonly maximumLifetime: number;

    readonly minimumScaleX: number;
    readonly maximumScaleX: number;

    readonly minimumScaleY: number;
    readonly maximumScaleY: number;

    readonly minimumEndScaleXMultiplier: number;
    readonly maximumEndScaleXMultiplier: number;

    readonly minimumEndScaleYMultiplier: number;
    readonly maximumEndScaleYMultiplier: number;

    readonly minimumRadialSpeed: number;
    readonly maximumRadialSpeed: number;

    readonly upwardBiasSpeed: number;

    readonly turbulenceAmplitude: number;
    readonly turbulenceFrequency: number;

    readonly flickerSpeed: number;
    readonly flickerAmount: number;

    readonly growEndFraction: number;
    readonly shrinkStartFraction: number;

    readonly coreParticleChance: number;
    readonly accentParticleChance: number;

    readonly maximumParticlesPerCellPerFrame: number;
}

/**
 * Phase 4B-6E-B Ground Fire shape/density refinement.
 *
 * Goals:
 * - remove the porcupine/spike appearance
 * - use fuller, wider flame tongues
 * - substantially increase overlapping density
 * - keep particles local to the burn region
 * - preserve smooth grow/sustain/shrink animation
 * - preserve pooled allocation and palette authority
 */
export const DEFAULT_GROUND_FIRE_VFX_DEFINITION:
    GroundFireVfxDefinition = {

    /*
     * Considerably denser than the prior pass so the eye reads one
     * continuous flame mass rather than individual tongues.
     */
    minimumEmissionRate:
        52,

    maximumEmissionRate:
        168,

    /*
     * Slightly tighter footprint reduces obvious radial sprays while
     * adjacent 48 px FireCells still overlap visually.
     */
    spawnRadius:
        27,

    edgeSpawnBias:
        0.68,

    /*
     * Slightly longer average lifetime increases simultaneous overlap.
     */
    minimumLifetime:
        0.38,

    maximumLifetime:
        0.76,

    /*
     * Wider and fuller than the previous narrow spike-like tongues.
     */
    minimumScaleX:
        0.34,

    maximumScaleX:
        0.62,

    minimumScaleY:
        0.48,

    maximumScaleY:
        0.92,

    /*
     * Ground flames should not become dramatically thinner/taller.
     * Keep them broad throughout their sustained phase.
     */
    minimumEndScaleXMultiplier:
        0.88,

    maximumEndScaleXMultiplier:
        1.08,

    minimumEndScaleYMultiplier:
        0.96,

    maximumEndScaleYMultiplier:
        1.16,

    /*
     * Ground Fire churns locally instead of spraying radially.
     */
    minimumRadialSpeed:
        0,

    maximumRadialSpeed:
        5,

    /*
     * Small screen-up tendency for flame readability, kept subtle
     * enough to preserve the top-down presentation.
     */
    upwardBiasSpeed:
        5,

    turbulenceAmplitude:
        2.2,

    turbulenceFrequency:
        9.5,

    flickerSpeed:
        12.5,

    flickerAmount:
        0.075,

    /*
     * Keep the working smooth lifecycle.
     */
    growEndFraction:
        0.16,

    shrinkStartFraction:
        0.74,

    /*
     * Orange dominant, yellow common, red restrained.
     */
    coreParticleChance:
        0.34,

    accentParticleChance:
        0.09,

    /*
     * Higher cap supports the denser continuous Fire body without
     * allowing unlimited burst spawning after a stalled frame.
     */
    maximumParticlesPerCellPerFrame:
        10,
};

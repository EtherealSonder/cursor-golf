/**
 * Immutable presentation configuration for the
 * world-space wind visualization.
 *
 * These values affect rendering only.
 *
 * They do not modify:
 *
 * - WindManager state
 * - Ball physics
 * - wind acceleration
 * - wind direction
 */
export interface WindVisualDefinition {

    /**
     * Global toggle for world-space wind particles.
     */
    readonly enabled: boolean;

    /**
     * Maximum number of reusable wind particles.
     *
     * The particle pool is created once and reused.
     */
    readonly maximumParticleCount: number;

    /**
     * Minimum number of visible particles whenever
     * wind strength is above zero.
     */
    readonly minimumVisibleParticleCount: number;

    // -------------------------------------------------------------------------
    // Particle Movement
    // -------------------------------------------------------------------------

    /**
     * Minimum presentation-space particle speed.
     *
     * Units:
     * pixels per second.
     *
     * This is completely independent from the
     * physical acceleration used by WindManager.
     */
    readonly minimumParticleSpeed: number;

    /**
     * Maximum presentation-space particle speed.
     *
     * Units:
     * pixels per second.
     */
    readonly maximumParticleSpeed: number;

    /**
     * Per-particle speed variation.
     *
     * Example:
     *
     * base speed = 200 px/s
     * multiplier = 0.95
     *
     * final particle speed = 190 px/s
     */
    readonly minimumSpeedMultiplier: number;

    readonly maximumSpeedMultiplier: number;

    // -------------------------------------------------------------------------
    // Particle Length
    // -------------------------------------------------------------------------

    /**
     * Minimum possible wind streak length.
     *
     * Units:
     * pixels.
     */
    readonly minimumParticleLength: number;

    /**
     * Maximum possible wind streak length.
     *
     * Stronger wind allows particles to use more of
     * this range.
     *
     * Units:
     * pixels.
     */
    readonly maximumParticleLength: number;

    // -------------------------------------------------------------------------
    // Particle Width
    // -------------------------------------------------------------------------

    /**
     * Minimum base thickness assigned to an
     * individual wind streak.
     *
     * Units:
     * pixels.
     */
    readonly minimumParticleWidth: number;

    /**
     * Maximum base thickness assigned to an
     * individual wind streak.
     *
     * Each particle receives its own randomized width.
     */
    readonly maximumParticleWidth: number;

    /**
     * Width multiplier applied to the first section
     * of the particle.
     *
     * A low value creates a narrow tail.
     */
    readonly tailWidthMultiplier: number;

    /**
     * Width multiplier applied to the central section.
     *
     * This normally represents the full particle
     * thickness.
     */
    readonly middleWidthMultiplier: number;

    /**
     * Width multiplier applied to the final section.
     *
     * A low value creates a narrow head.
     */
    readonly headWidthMultiplier: number;

    // -------------------------------------------------------------------------
    // Particle Opacity
    // -------------------------------------------------------------------------

    /**
     * Minimum base particle opacity.
     */
    readonly minimumParticleOpacity: number;

    /**
     * Maximum base particle opacity.
     *
     * Stronger wind allows particles to use more of
     * this range.
     */
    readonly maximumParticleOpacity: number;

    /**
     * Alpha multiplier for the first section of the
     * particle.
     *
     * The tail is intentionally faint.
     */
    readonly tailOpacityMultiplier: number;

    /**
     * Alpha multiplier for the middle section.
     */
    readonly middleOpacityMultiplier: number;

    /**
     * Alpha multiplier for the final section.
     *
     * This gives the streak a soft tapered finish
     * instead of a hard rectangular endpoint.
     */
    readonly headOpacityMultiplier: number;

    // -------------------------------------------------------------------------
    // Particle Lifetime
    // -------------------------------------------------------------------------

    /**
     * Minimum lifetime of a particle.
     *
     * Units:
     * seconds.
     *
     * Particles normally recycle after leaving the
     * camera-relative wind region. Lifetime remains a
     * safety and appearance-refresh mechanism.
     */
    readonly minimumLifetime: number;

    /**
     * Maximum lifetime of a particle.
     *
     * Units:
     * seconds.
     */
    readonly maximumLifetime: number;

    /**
     * Fraction of lifetime used for initial fade-in.
     *
     * Example:
     *
     * 0.10 = first 10 percent of lifetime.
     */
    readonly fadeInLifetimeFraction: number;

    /**
     * Fraction of lifetime used for final fade-out.
     */
    readonly fadeOutLifetimeFraction: number;

    // -------------------------------------------------------------------------
    // Particle Rendering
    // -------------------------------------------------------------------------

    /**
     * Number of straight sections used to create one
     * tapered particle.
     *
     * Three sections produce:
     *
     * narrow tail
     * full middle
     * narrow head
     */
    readonly particleSegmentCount: number;

    /**
     * PixiJS line color.
     */
    readonly lineColor: number;

    // -------------------------------------------------------------------------
    // Camera-Relative Simulation
    // -------------------------------------------------------------------------

    /**
     * Additional world-space region simulated outside
     * the visible viewport.
     *
     * This allows particles to enter and leave the
     * screen naturally.
     *
     * Units:
     * pixels.
     */
    readonly spawnPadding: number;
}

export const DEFAULT_WIND_VISUAL_DEFINITION:
    WindVisualDefinition = {

    enabled: true,

    // -------------------------------------------------------------------------
    // Particle Pool
    // -------------------------------------------------------------------------

    /*
     * Keep the field lightweight while increasing
     * density enough to remain readable against the
     * current grass texture.
     */
    maximumParticleCount: 28,

    /*
     * Even weak wind should have enough particles to
     * establish a visible direction.
     */
    minimumVisibleParticleCount: 8,

    // -------------------------------------------------------------------------
    // Particle Movement
    // -------------------------------------------------------------------------

    /*
     * Keep the established movement-speed tuning.
     *
     * Particle size and visibility are being adjusted
     * in this pass rather than changing motion speed.
     */
    minimumParticleSpeed: 170,

    maximumParticleSpeed: 330,

    /*
     * Small per-particle variation prevents all
     * particles from travelling at exactly the same
     * speed.
     */
    minimumSpeedMultiplier: 0.90,

    maximumSpeedMultiplier: 1.10,

    // -------------------------------------------------------------------------
    // Particle Length
    // -------------------------------------------------------------------------

    /*
     * Larger streaks remain readable on the current
     * viewport and grass background.
     *
     * Strong wind raises the available maximum length,
     * but particles still receive different randomized
     * lengths.
     */
    minimumParticleLength: 24,

    maximumParticleLength: 80,

    // -------------------------------------------------------------------------
    // Particle Width
    // -------------------------------------------------------------------------

    /*
     * The previous 1.2 to 1.8 pixel range was too thin
     * once rendered against the course texture.
     *
     * These values keep the streaks lightweight while
     * making them clearly perceptible.
     */
    minimumParticleWidth: 2.0,

    maximumParticleWidth: 3.0,

    /*
     * Retain the rice-like form:
     *
     * thinner tail
     * full middle
     * thinner head
     *
     * The endpoints are now less aggressively reduced
     * so the complete streak remains visible.
     */
    tailWidthMultiplier: 0.55,

    middleWidthMultiplier: 1.00,

    headWidthMultiplier: 0.55,

    // -------------------------------------------------------------------------
    // Particle Opacity
    // -------------------------------------------------------------------------

    /*
     * Increase contrast substantially while keeping
     * the particles partially transparent.
     */
    minimumParticleOpacity: 0.32,

    maximumParticleOpacity: 0.70,

    /*
     * Preserve the soft tapered look without allowing
     * the ends to disappear against the background.
     */
    tailOpacityMultiplier: 0.65,

    middleOpacityMultiplier: 1.00,

    headOpacityMultiplier: 0.75,

    // -------------------------------------------------------------------------
    // Particle Lifetime
    // -------------------------------------------------------------------------

    /*
     * Particles normally recycle when leaving the
     * padded visual region.
     *
     * Lifetime continues to act as a safety and
     * appearance-refresh mechanism.
     */
    minimumLifetime: 4,

    maximumLifetime: 8,

    /*
     * Shorter fades mean particles spend a larger
     * percentage of their journey at full visibility.
     */
    fadeInLifetimeFraction: 0.08,

    fadeOutLifetimeFraction: 0.10,

    // -------------------------------------------------------------------------
    // Particle Rendering
    // -------------------------------------------------------------------------

    /*
     * Three straight segments continue to provide the
     * simple tapered rice-like shape.
     */
    particleSegmentCount: 3,

    lineColor: 0xffffff,

    // -------------------------------------------------------------------------
    // Camera-Relative Simulation
    // -------------------------------------------------------------------------

    spawnPadding: 160,
};
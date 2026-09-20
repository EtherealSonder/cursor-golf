/**
 * Phase F-4 correction.
 *
 * Presentation-only Ground Fire Wind policy.
 * This file never changes authoritative Wind, Fire spread, heat, ignition,
 * lifetime, scorch, moisture, or Water-Fire interaction.
 */
export interface GroundFireWindVisualBand {
    readonly normalMaskWeight: number;
    readonly narrowMaskWeight: number;
    readonly curvedMaskWeight: number;
    readonly stretch: number;
    readonly lateralSkew: number;
}

export const GROUND_FIRE_WIND_VFX_DEFINITION = Object.freeze({
    accelerationPerKmh: 3,

    calmMaxKmh: 20,
    moderateMaxKmh: 45,
    highMaxKmh: 65,
    veryHighMaxKmh: 80,
    extremeMaxKmh: 90,

    rootAnchored: true,
    orientGroundParticlesToVelocity: false,
    translateGroundParticlesWithWind: false,

    bands: Object.freeze({
        calm: Object.freeze({
            normalMaskWeight: 0.94,
            narrowMaskWeight: 0.06,
            curvedMaskWeight: 0.00,
            stretch: 1.00,
            lateralSkew: 0.00,
        }),
        moderate: Object.freeze({
            normalMaskWeight: 0.58,
            narrowMaskWeight: 0.27,
            curvedMaskWeight: 0.15,
            stretch: 1.10,
            lateralSkew: 0.08,
        }),
        high: Object.freeze({
            normalMaskWeight: 0.22,
            narrowMaskWeight: 0.28,
            curvedMaskWeight: 0.50,
            stretch: 1.22,
            lateralSkew: 0.14,
        }),
        veryHigh: Object.freeze({
            normalMaskWeight: 0.08,
            narrowMaskWeight: 0.22,
            curvedMaskWeight: 0.70,
            stretch: 1.34,
            lateralSkew: 0.20,
        }),
        extreme: Object.freeze({
            normalMaskWeight: 0.03,
            narrowMaskWeight: 0.17,
            curvedMaskWeight: 0.80,
            stretch: 1.45,
            lateralSkew: 0.26,
        }),
    }),
});

export type GroundFireWindBandName =
    keyof typeof GROUND_FIRE_WIND_VFX_DEFINITION.bands;

export function getGroundFireWindBandName(
    windKmh: number,
): GroundFireWindBandName {
    const d = GROUND_FIRE_WIND_VFX_DEFINITION;
    const speed = Number.isFinite(windKmh) ? Math.max(0, windKmh) : 0;

    if (speed <= d.calmMaxKmh) return "calm";
    if (speed <= d.moderateMaxKmh) return "moderate";
    if (speed <= d.highMaxKmh) return "high";
    if (speed <= d.veryHighMaxKmh) return "veryHigh";
    return "extreme";
}

export function getGroundFireWindVisualStrength(
    windKmh: number,
): number {
    if (!Number.isFinite(windKmh) || windKmh <= 8) return 0;
    return Math.max(
        0,
        Math.min(
            1,
            (windKmh - 8) /
            (GROUND_FIRE_WIND_VFX_DEFINITION.extremeMaxKmh - 8),
        ),
    );
}

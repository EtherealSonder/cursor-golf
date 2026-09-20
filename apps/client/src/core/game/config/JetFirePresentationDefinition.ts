/**
 * Presentation-only tuning for Directional Fire.
 *
 * These values affect only the visual jet emitted by JetFireEmitter.
 * They never modify authoritative FireSource length, heat, ignition,
 * spread, Water suppression, or any other gameplay state.
 */
export interface JetFirePresentationDefinition {
    readonly emissionDensityMultiplier: number;
    readonly forwardVelocityMultiplier: number;
    readonly lateralVelocityMultiplier: number;
    readonly startLongitudinalScaleMultiplier: number;
    readonly startLateralScaleMultiplier: number;
    readonly endLongitudinalScaleMultiplier: number;
    readonly endLateralScaleMultiplier: number;
    readonly turbulenceMultiplier: number;
    readonly terminalFadeStartFraction: number;
    readonly terminalFadeEndFraction: number;

    /**
     * Spatial termination based on current effective jet length.
     * The final portion of the jet fades and shortens before the hard
     * authoritative presentation cutoff.
     */
    readonly terminalDistanceZoneFraction: number;
    readonly terminalLongitudinalScaleAtEnd: number;
    readonly terminalTurbulenceAtEnd: number;

    readonly hotWeightMultiplier: number;
    readonly bodyWeightMultiplier: number;
    readonly coolWeightMultiplier: number;
}

export const DEFAULT_JET_FIRE_PRESENTATION_DEFINITION:
    JetFirePresentationDefinition = Object.freeze({
    // More overlap through the coherent body of the stream.
    emissionDensityMultiplier: 1.18,

    // Preserve a forceful dominant axis.
    forwardVelocityMultiplier: 1.12,

    // Restrain sideways breakup so the stream does not become a cloud.
    lateralVelocityMultiplier: 0.58,

    // Flame masks are authored vertically. JetFireEmitter maps Y scale to
    // the longitudinal/travel axis through velocity-following orientation.
    startLongitudinalScaleMultiplier: 1.12,
    startLateralScaleMultiplier: 1.08,
    endLongitudinalScaleMultiplier: 1.24,
    endLateralScaleMultiplier: 1.14,

    turbulenceMultiplier: 0.48,

    // Directional particles disappear before they read as detached floating
    // flame stamps at the downstream end.
    terminalFadeStartFraction: 0.70,
    terminalFadeEndFraction: 0.93,

    // Final 24% of the effective jet is the controlled spatial termination.
    terminalDistanceZoneFraction: 0.24,

    // Preserve width but shorten the flame along the stream axis near its tip.
    terminalLongitudinalScaleAtEnd: 0.55,

    // Keep terminal fragments aligned instead of letting them float apart.
    terminalTurbulenceAtEnd: 0.20,

    // Same F-3 palette, hotter role distribution.
    hotWeightMultiplier: 1.95,
    bodyWeightMultiplier: 1.08,
    coolWeightMultiplier: 0.56,
});

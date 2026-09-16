/**
 * Phase 8F-1 configuration for the Water/Fire interaction boundary.
 *
 * This definition does not perform collision detection or mutate Water/Fire
 * state. It only defines the thresholds used to classify whether Water or
 * retained ground moisture is meaningful to later interaction phases.
 */
export interface WaterFireInteractionDefinition {
    /**
     * Standing-Water depth below this value is treated as numerical residue
     * rather than direct Fire-extinguishing contact.
     *
     * Kept aligned with the existing meaningful shallow-Water scale used by
     * Ball/Water gameplay.
     */
    readonly minimumMeaningfulStandingWaterDepth: number;

    /**
     * Minimum airborne Water quantity that can represent direct Water/Fire
     * contact. AirborneWaterPacket already guarantees a positive quantity;
     * this threshold additionally rejects negligible values at the contract.
     */
    readonly minimumMeaningfulAirborneWaterAmount: number;

    /**
     * Minimum amount by which current ground moisture must exceed its natural
     * baseline before the interaction contract classifies the terrain as
     * environmentally Water-influenced.
     *
     * Actual ignition/spread/combustion response remains owned by the existing
     * Fire moisture model and is tuned in later 8F subphases.
     */
    readonly minimumMeaningfulMoistureExcess: number;

    /**
     * Fraction of one Fire-cell half-extent ignored at the outer edge when
     * testing standing-Water overlap. This avoids treating a Water-cell centre
     * that lies exactly on a neighbouring Fire-cell boundary as contact.
     */
    readonly standingWaterGroundFireFootprintInsetFraction: number;

    /**
     * Ground-plane radius assigned to an airborne Water packet when testing
     * swept contact against a Ground Fire cell.
     */
    readonly airborneWaterGroundFireContactRadius: number;

    /**
     * Maximum packet height that can physically intersect the Ground Fire
     * flame volume. A projected X/Y crossing above this height is not contact.
     */
    readonly airborneWaterGroundFireMaximumContactHeight: number;

    /**
     * Additional ground-plane radius around an airborne Water sweep when
     * testing it against the authored directional Fire stream. This is
     * intentionally generous so Hose and Sprinkler crossings feel reliable.
     */
    readonly airborneWaterDirectionalFireContactRadius: number;

    /**
     * Maximum airborne Water height that can directly suppress a directional
     * Fire jet. Higher Water may cross in X/Y without touching the jet.
     */
    readonly airborneWaterDirectionalFireMaximumContactHeight: number;

    /**
     * Additional ground-plane padding around one standing-Water cell when
     * testing it against the authored directional Fire stream. The Water
     * cell itself contributes its half-diagonal footprint separately.
     */
    readonly standingWaterDirectionalFireContactRadius: number;
}

export const DEFAULT_WATER_FIRE_INTERACTION_DEFINITION:
    WaterFireInteractionDefinition = {

    minimumMeaningfulStandingWaterDepth:
        0.012,

    minimumMeaningfulAirborneWaterAmount:
        0.000001,

    minimumMeaningfulMoistureExcess:
        0.001,

    standingWaterGroundFireFootprintInsetFraction:
        0.04,

    airborneWaterGroundFireContactRadius:
        24,

    airborneWaterGroundFireMaximumContactHeight:
        64,

    airborneWaterDirectionalFireContactRadius:
        36,

    airborneWaterDirectionalFireMaximumContactHeight:
        96,

    standingWaterDirectionalFireContactRadius:
        8,
};

export function validateWaterFireInteractionDefinition(
    definition: WaterFireInteractionDefinition,
): void {
    const values = [
        definition.minimumMeaningfulStandingWaterDepth,
        definition.minimumMeaningfulAirborneWaterAmount,
        definition.minimumMeaningfulMoistureExcess,
        definition.standingWaterGroundFireFootprintInsetFraction,
        definition.airborneWaterGroundFireContactRadius,
        definition.airborneWaterGroundFireMaximumContactHeight,
        definition.airborneWaterDirectionalFireContactRadius,
        definition.airborneWaterDirectionalFireMaximumContactHeight,
        definition.standingWaterDirectionalFireContactRadius,
    ];

    if (!values.every(Number.isFinite)) {
        throw new Error(
            "Water/Fire interaction definition values must be finite.",
        );
    }

    if (
        definition.minimumMeaningfulStandingWaterDepth < 0 ||
        definition.minimumMeaningfulAirborneWaterAmount <= 0 ||
        definition.minimumMeaningfulMoistureExcess < 0 ||
        definition.standingWaterGroundFireFootprintInsetFraction < 0 ||
        definition.standingWaterGroundFireFootprintInsetFraction >= 0.5 ||
        definition.airborneWaterGroundFireContactRadius < 0 ||
        definition.airborneWaterGroundFireMaximumContactHeight <= 0 ||
        definition.airborneWaterDirectionalFireContactRadius < 0 ||
        definition.airborneWaterDirectionalFireMaximumContactHeight <= 0 ||
        definition.standingWaterDirectionalFireContactRadius < 0
    ) {
        throw new Error(
            "Water/Fire interaction thresholds are invalid. Footprint inset fraction must remain in [0, 0.5), Water/Fire contact radii must be non-negative, and maximum contact heights must be greater than zero.",
        );
    }
}

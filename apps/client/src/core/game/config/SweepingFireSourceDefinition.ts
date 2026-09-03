/**
 * Phase 4B-6D development/test tuning for sweeping Fire sources.
 *
 * Sweeping is intentionally NOT a new FireSourceType.
 * A sweeping source is a normal Directional FireSource whose
 * runtime direction is animated by FireSourceTestController.
 */
export interface SweepingFireSourceDefinition {
    readonly sweepArcRadians: number;
    readonly angularSpeedRadiansPerSecond: number;
}

export const DEFAULT_SWEEPING_FIRE_SOURCE_DEFINITION:
    SweepingFireSourceDefinition = {

    /*
     * Total sweep arc = 120 degrees.
     *
     * The user's initial drag direction becomes the center angle,
     * and the source oscillates approximately +/-60 degrees
     * around that direction.
     */
    sweepArcRadians:
        Math.PI * (2 / 3),

    /*
     * 90 degrees per second.
     *
     * This is intentionally stronger than the previous tuning so
     * the sweeping behavior is unmistakably different from a
     * stationary Directional Fire source during validation.
     */
    angularSpeedRadiansPerSecond:
        Math.PI / 2,
};
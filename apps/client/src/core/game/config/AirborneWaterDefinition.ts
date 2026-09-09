/**
 * Global simulation tuning for authoritative airborne Water packets.
 *
 * Source-specific values such as launch speed, elevation, and Wind response
 * remain on WaterSourceDefinition. This definition only owns transport rules.
 */
export interface AirborneWaterDefinition {
    /** Fixed internal transport step used for frame-rate-stable trajectories. */
    readonly simulationStepSeconds: number;

    /** Maximum fixed steps admitted during one rendered frame. */
    readonly maximumSubstepsPerFrame: number;

    /** Maximum frame delta admitted to the internal accumulator. */
    readonly maximumFrameDeltaSeconds: number;

    /** Downward acceleration in world-pixels per second squared. */
    readonly gravity: number;

    /** Hard safety cap for authoritative packets in flight. */
    readonly maximumPacketCount: number;

    /** Safety lifetime after which a packet is discarded if it never lands. */
    readonly maximumPacketAgeSeconds: number;

    /** Water quantities below this threshold are ignored at packet creation. */
    readonly minimumWaterAmount: number;
}

export const DEFAULT_AIRBORNE_WATER_DEFINITION:
    AirborneWaterDefinition = {
    simulationStepSeconds: 1 / 60,
    maximumSubstepsPerFrame: 4,
    maximumFrameDeltaSeconds: 0.1,
    gravity: 980,
    maximumPacketCount: 512,
    maximumPacketAgeSeconds: 5,
    minimumWaterAmount: 0.000001,
};

export function validateAirborneWaterDefinition(
    definition: AirborneWaterDefinition,
): void {
    const positiveFiniteValues = [
        definition.simulationStepSeconds,
        definition.maximumFrameDeltaSeconds,
        definition.gravity,
        definition.maximumPacketAgeSeconds,
        definition.minimumWaterAmount,
    ];

    if (
        positiveFiniteValues.some(
            (value): boolean =>
                !Number.isFinite(value) ||
                value <= 0,
        )
    ) {
        throw new Error(
            "AirborneWaterDefinition positive tuning values must be finite and greater than 0.",
        );
    }

    if (
        !Number.isInteger(
            definition.maximumSubstepsPerFrame,
        ) ||
        definition.maximumSubstepsPerFrame <= 0
    ) {
        throw new Error(
            "AirborneWaterDefinition maximumSubstepsPerFrame must be a positive integer.",
        );
    }

    if (
        !Number.isInteger(
            definition.maximumPacketCount,
        ) ||
        definition.maximumPacketCount <= 0
    ) {
        throw new Error(
            "AirborneWaterDefinition maximumPacketCount must be a positive integer.",
        );
    }
}

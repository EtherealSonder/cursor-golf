export interface HydrantDamageDefinition {
    /**
     * Weak contacts do not accumulate any hidden damage.
     * Each qualifying impact advances exactly one discrete state.
     */
    readonly normalToDamagedImpactSpeed: number;
    readonly damagedToBrokenImpactSpeed: number;
    readonly impactCooldown: number;

    readonly burstWaterAmount: number;
    readonly burstLaunchSpeed: number;
    readonly burstPacketCount: number;
    readonly burstLaunchElevationRadians: number;
    readonly burstWindResponse: number;
    readonly burstImpactMomentumRetention: number;
}

export const DEFAULT_HYDRANT_DAMAGE_DEFINITION:
    HydrantDamageDefinition = {
    /*
     * Ball maximum speed is currently 1200 px/s. These values make a
     * committed shot necessary while allowing later tuning from playtests.
     */
    normalToDamagedImpactSpeed: 450,
    damagedToBrokenImpactSpeed: 550,
    impactCooldown: 0.20,

    /*
     * Destruction still emits one finite radial batch through the existing
     * WaterSourceSystem -> AirborneWaterSystem pipeline.
     */
    burstWaterAmount: 5.0,
    burstLaunchSpeed: 360,
    burstPacketCount: 16,
    burstLaunchElevationRadians:
        Math.PI / 5,
    burstWindResponse: 0.18,
    burstImpactMomentumRetention: 0.55,
};

export function validateHydrantDamageDefinition(
    definition:
        HydrantDamageDefinition,
): void {
    const positiveValues = [
        definition.normalToDamagedImpactSpeed,
        definition.damagedToBrokenImpactSpeed,
        definition.impactCooldown,
        definition.burstWaterAmount,
        definition.burstLaunchSpeed,
        definition.burstPacketCount,
    ];

    if (
        positiveValues.some(
            (value): boolean =>
                !Number.isFinite(value) ||
                value <= 0,
        )
    ) {
        throw new Error(
            "HydrantDamageDefinition requires finite positive tuning values.",
        );
    }

    if (
        !Number.isInteger(
            definition.burstPacketCount,
        )
    ) {
        throw new Error(
            "Hydrant burst packet count must be an integer.",
        );
    }

    if (
        !Number.isFinite(
            definition.burstLaunchElevationRadians,
        ) ||
        definition.burstLaunchElevationRadians < 0 ||
        definition.burstLaunchElevationRadians >
        Math.PI / 2
    ) {
        throw new Error(
            "Hydrant burst launch elevation must be between 0 and PI/2.",
        );
    }

    if (
        !Number.isFinite(
            definition.burstWindResponse,
        ) ||
        definition.burstWindResponse < 0 ||
        !Number.isFinite(
            definition.burstImpactMomentumRetention,
        ) ||
        definition.burstImpactMomentumRetention < 0 ||
        definition.burstImpactMomentumRetention > 1
    ) {
        throw new Error(
            "Hydrant burst response values are outside their valid ranges.",
        );
    }
}

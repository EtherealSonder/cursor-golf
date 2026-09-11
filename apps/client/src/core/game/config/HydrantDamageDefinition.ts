export interface HydrantDamageDefinition {
    readonly maxDurability: number;
    readonly minimumImpactSpeed: number;
    readonly minimumImpactEnergy: number;
    readonly damageEnergyScale: number;
    readonly maximumDamagePerImpact: number;
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
        maxDurability: 100,

        /*
         * Ordinary low-speed nudges should not damage the Hydrant. Strong
         * golf shots should remove a meaningful fraction of durability.
         */
        minimumImpactSpeed: 280,
        minimumImpactEnergy: 39000,
        damageEnergyScale: 0.00125,
        maximumDamagePerImpact: 55,
        impactCooldown: 0.20,

        /*
         * Destruction emits one finite radial batch through the existing
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
        definition.maxDurability,
        definition.minimumImpactSpeed,
        definition.minimumImpactEnergy,
        definition.damageEnergyScale,
        definition.maximumDamagePerImpact,
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

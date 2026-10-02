export interface BoulderFractureDefinition {
    readonly minimumFragmentCount: number;
    readonly maximumFragmentCount: number;
    readonly minimumFragmentRadius: number;
    readonly maximumFragmentRadius: number;
    readonly spawnClearance: number;
    readonly angularJitterRadians: number;
    readonly minimumRadialImpulse: number;
    readonly maximumRadialImpulse: number;
    readonly maximumTangentialImpulseFraction: number;
    readonly impulseLeverArmFraction: number;
}

export const DEFAULT_BOULDER_FRACTURE_DEFINITION: BoulderFractureDefinition = {
    minimumFragmentCount: 5,
    maximumFragmentCount: 6,
    minimumFragmentRadius: 11,
    maximumFragmentRadius: 16,
    spawnClearance: 4,
    angularJitterRadians: 0.14,
    minimumRadialImpulse: 1050,
    maximumRadialImpulse: 1650,
    maximumTangentialImpulseFraction: 0.28,
    impulseLeverArmFraction: 0.62,
};

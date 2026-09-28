/** PM-2A: physics-only blast tuning. Distances are world pixels. */
export const PROXIMITY_MINE_EXPLOSION_DEFINITION = {
    blastRadius: 220,
    /** Impulse in mass*px/s, before quadratic surface-distance falloff. */
    maximumImpulse: 14000,
    /** Limit added velocity, not total existing velocity. */
    maximumAddedSpeed: 950,
    /** Fraction of the target bounding radius used as the tangential lever arm. */
    spinLeverArmFraction: 0.85,
    /** Tangential impulse relative to the outward impulse. */
    spinImpulseFraction: 0.40,
    /** Surface-distance falloff power for rotational response. */
    spinFalloffPower: 1.35,
    /** Smallest effective lever arm, in world pixels. */
    minimumSpinLeverArm: 8,
} as const;

/** Immutable one-shot event copied before the mine entity is destroyed. */
export interface ProximityMineExplosionEvent {
    readonly mineId: string;
    readonly target: string;
    readonly x: number;
    readonly y: number;
    readonly blastRadius: number;
    readonly maximumImpulse: number;
    readonly maximumAddedSpeed: number;
}

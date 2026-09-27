/** PM-2A: physics-only blast tuning. Distances are world pixels. */
export const PROXIMITY_MINE_EXPLOSION_DEFINITION = {
    blastRadius: 220,
    /** Impulse in mass*px/s, before quadratic surface-distance falloff. */
    maximumImpulse: 14000,
    /** Limit added velocity, not total existing velocity. */
    maximumAddedSpeed: 950,
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

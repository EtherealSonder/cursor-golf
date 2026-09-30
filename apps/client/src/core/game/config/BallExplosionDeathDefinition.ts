/**
 * D-6 Ball-specific mine-explosion lethality.
 *
 * This remains independent from general explosion physics and presentation.
 * The initial 175 px core approximately matches the 354 px-diameter primary
 * explosion fire body while the existing 220 px blast radius remains capable
 * of applying non-lethal knockback outside this core.
 */
export interface BallExplosionDeathDefinition {
    readonly lethalRadius: number;
}

export const DEFAULT_BALL_EXPLOSION_DEATH_DEFINITION:
    BallExplosionDeathDefinition = {
        lethalRadius: 175,
    };

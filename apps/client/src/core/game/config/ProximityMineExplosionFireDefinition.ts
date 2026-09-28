import { PROXIMITY_MINE_EXPLOSION_VFX } from "./ProximityMineExplosionVfxDefinition";

/** PM-2F: a larger initial cluster using the existing FireManager spread rules. */
export const PROXIMITY_MINE_EXPLOSION_FIRE = {
    /** Wait until the explosion presentation has completed. */
    ignitionDelaySeconds: PROXIMITY_MINE_EXPLOSION_VFX.totalDuration,
    /** World-space radius for initial ignition attempts, NOT the final spread radius. */
    initialIgnitionRadius: 65,
    /** Centre seed plus additional nearby seeds, subject to existing Fire limits. */
    initialIgnitionCount: 4,
} as const;

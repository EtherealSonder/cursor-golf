import type {
    AirborneWaterCollisionField,
} from "../environment/AirborneWaterCollisionField";

import type {
    AirborneWaterCollisionHit,
} from "../environment/AirborneWaterObstacleShape";

export interface FireParticleCollisionHit {
    readonly positionX: number;
    readonly positionY: number;
    readonly normalX: number;
    readonly normalY: number;
    readonly fraction: number;
    readonly colliderId?: string;
}

/**
 * R-ROCK-3: the shared airborne obstacle field includes dynamic Small Rocks and fixed Boulders,
 * so directional flame particles terminate against both without Rock-specific Fire simulation.
 * Presentation-only swept collision adapter for airborne Directional Fire.
 *
 * The underlying obstacle population is the already synchronized airborne
 * obstacle cache produced from PhysicsWorld registrations. This avoids a
 * second collider registry and gives Fire the same static objects, mechanisms,
 * fixed shapes and airborne polylines used by airborne Water.
 *
 * Ball is intentionally excluded because it is not projected into this
 * airborne obstacle cache.
 */
/**
 * R-ROCK-3 acceptance: this adapter consumes the same live airborne collision
 * field as Water. Small Rocks and Boulders therefore terminate directional
 * Fire particles at their circular contact boundary.
 */
export class FireParticleCollisionField {
    public constructor(
        private readonly airborneObstacleField:
            AirborneWaterCollisionField,
    ) {
    }

    public sweep(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        ignoredSourceId?: string,
    ): FireParticleCollisionHit | null {
        const hit:
            AirborneWaterCollisionHit | null =
            this.airborneObstacleField.sweep(
                startX,
                startY,
                endX,
                endY,
                ignoredSourceId,
            );

        if (!hit) {
            return null;
        }

        return {
            positionX: hit.positionX,
            positionY: hit.positionY,
            normalX: hit.normalX,
            normalY: hit.normalY,
            fraction: hit.fraction,
            colliderId: hit.colliderId,
        };
    }
}

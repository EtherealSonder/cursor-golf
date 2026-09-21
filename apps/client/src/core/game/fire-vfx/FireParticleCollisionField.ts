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

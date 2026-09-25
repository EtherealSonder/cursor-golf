import type { DirectionalBumper } from "../entities/mechanisms/DirectionalBumper";
import type { AirborneWaterCollisionResponse } from "../environment/AirborneWaterCollisionResponse";

/**
 * DB-6 adapter between the moving Directional Bumper arm and the existing
 * authoritative airborne-Water reflection policy introduced by RB-4.
 *
 * Collision geometry itself remains owned by PhysicsWorld through the bumper's
 * fixed-shape provider. WaterObstacleRegistrationSystem rebuilds the airborne
 * collision field from that live shape, so this system only installs the
 * exceptional reflection response for the same collider id.
 */
export class DirectionalBumperWaterCollisionSystem {
    public register(
        bumper: DirectionalBumper,
        collisionResponse: AirborneWaterCollisionResponse,
    ): () => void {
        const definition = bumper.getDefinition();
        const colliderId = bumper.getColliderId();

        collisionResponse.registerReflector(colliderId, {
            speedRetention: definition.waterReflectionSpeedRetention,
            separationDistance: definition.waterReflectionSeparationDistance,
            minimumOutgoingSpeed: definition.waterReflectionMinimumSpeed,
            // Water contact is presentation-only for the mechanism. It never
            // requests a strike or enters the DB targeting state machine.
            onImpact: (): void => bumper.playImpactAnimation(),
        });

        return (): void => collisionResponse.unregister(colliderId);
    }
}

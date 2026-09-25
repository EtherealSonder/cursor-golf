import type { RotatingPaddle } from "../entities/mechanisms/RotatingPaddle";
import type { PhysicsWorld } from "./PhysicsWorld";

/**
 * Registers the solid center stopper in the shared PhysicsWorld collider population.
 * WaterObstacleRegistrationSystem projects this provider into airborne/ground Water;
 * Directional Fire consumes the same airborne obstacle cache, and rigid dynamics use
 * the same fixed shape through DynamicStaticCollisionSystem.
 */
export class RotatingPaddleWaterCollisionSystem {
    public register(physicsWorld: PhysicsWorld, paddle: RotatingPaddle): void {
        physicsWorld.registerFixedShapeProvider(
            paddle.getCenterColliderId(),
            () => paddle.getCenterCollisionShape(),
            {
                participation: {
                    rigidBody: true,
                    hose: true,
                    groundWater: true,
                    airborneWater: true,
                    impactAwareness: false,
                },
            },
        );
    }
}

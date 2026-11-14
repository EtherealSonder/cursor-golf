import { Rock } from "../../entities/props/Rock";
import { DEFAULT_ROCK_WIND_RESISTANCE_DEFINITION as ROCK_WIND } from "../../config/RockWindResistanceDefinition";
import type { WindManager } from "../../environment/WindManager";
import type { DynamicCollidable } from "../DynamicCollidable";
import type { PhysicsWorld } from "../PhysicsWorld";
import {
    DEFAULT_GLOBAL_WIND_DYNAMIC_FORCE_DEFINITION,
    type GlobalWindDynamicForceDefinition,
} from "../../config/GlobalWindDynamicForceDefinition";

/**
 * Applies prevailing global wind to moving, non-anchored rigid bodies.
 * The ball keeps its existing dedicated wind physics and is deliberately not
 * registered here. Robots are excluded by World, regardless of their mass.
 * Static, fixed-pivot and resting bodies never receive a global wind impulse.
 */
export class GlobalWindDynamicForceSystem {
    public constructor(
        private readonly windManager: WindManager,
        private readonly physicsWorld: PhysicsWorld,
        private readonly isExcluded: (body: DynamicCollidable) => boolean,
        private readonly definition: GlobalWindDynamicForceDefinition =
            DEFAULT_GLOBAL_WIND_DYNAMIC_FORCE_DEFINITION,
    ) {}

    public update(deltaTime: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;
        const dt = Math.min(deltaTime, this.definition.maximumDeltaTime);
        const acceleration = this.windManager.getAcceleration();
        if (!Number.isFinite(acceleration.x) || !Number.isFinite(acceleration.y)) return;
        if (acceleration.x === 0 && acceleration.y === 0) return;

        const minSpeedSquared = this.definition.minimumMovingSpeed ** 2;
        for (const body of this.physicsWorld.getRigidDynamicCollidables()) {
            if (this.isExcluded(body) || body.isFixedPivot?.()) continue;
            // Stone is too dense for ordinary prevailing wind to sustain rolling.
            if (body instanceof Rock && ROCK_WIND.globalWindMultiplier === 0) continue;
            const inverseMass = body.getInverseMass();
            if (!Number.isFinite(inverseMass) || inverseMass <= 0) continue;
            const vx = body.getVelocityX();
            const vy = body.getVelocityY();
            if (!Number.isFinite(vx) || !Number.isFinite(vy) ||
                vx * vx + vy * vy <= minSpeedSquared) continue;

            // Wind cannot indefinitely sustain the final few pixels/second of motion.
            // Smooth attenuation also avoids a hard force discontinuity at rest.
            const speed = Math.hypot(vx, vy);
            const fadeRange = Math.max(0.001, this.definition.fullWindSpeed - this.definition.windFadeStartSpeed);
            const fade = Math.max(0, Math.min(1, (speed - this.definition.windFadeStartSpeed) / fadeRange));
            if (fade <= 0) continue;
            const scale = this.definition.referenceMass * this.definition.accelerationMultiplier * fade * dt;
            let impulseX = acceleration.x * scale;
            let impulseY = acceleration.y * scale;
            const magnitude = Math.hypot(impulseX, impulseY);
            if (magnitude > this.definition.maximumImpulsePerStep) {
                const limit = this.definition.maximumImpulsePerStep / magnitude;
                impulseX *= limit;
                impulseY *= limit;
            }
            body.applyImpulseAtWorldPoint(impulseX, impulseY, body.getX(), body.getY());
        }
    }
}

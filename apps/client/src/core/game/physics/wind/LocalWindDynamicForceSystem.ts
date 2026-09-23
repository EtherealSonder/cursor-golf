import {
    DEFAULT_LOCAL_WIND_DYNAMIC_FORCE_DEFINITION,
    type LocalWindDynamicForceDefinition,
    DEFAULT_LOCAL_WIND_OBSTACLE_DEFINITION,
} from "../../config/LocalWindDefinition";
import { LocalWindObstacleQuery } from "../../environment/LocalWindObstacleQuery";

import type { LocalWindSystem } from "../../environment/LocalWindSystem";
import type { PhysicsWorld } from "../PhysicsWorld";

/**
 * Applies authoritative Local Wind to every registered movable rigid body.
 *
 * The LocalWindSystem field is authored as the acceleration experienced by a
 * reference-mass body. This system converts that field into force/impulse, so
 * the final acceleration naturally falls with body mass through each
 * DynamicCollidable's inverse mass. Fan push and Wind Robot pull require no
 * entity-specific branches because their direction/strength already live in
 * LocalWindSystem.
 */
interface LocalWindForceTarget {
    getX(): number;
    getY(): number;
    getInverseMass(): number;
    applyImpulseAtWorldPoint(
        impulseX: number, impulseY: number, contactPointX: number, contactPointY: number,
    ): void;
}

export class LocalWindDynamicForceSystem {
    private readonly additionalBodies = new Set<LocalWindForceTarget>();

    public constructor(
        private readonly localWindSystem: LocalWindSystem,
        private readonly physicsWorld: PhysicsWorld,
        private readonly definition: LocalWindDynamicForceDefinition =
            DEFAULT_LOCAL_WIND_DYNAMIC_FORCE_DEFINITION,
    ) {
        this.validateDefinition(definition);
        this.localWindSystem.setObstacleQuery(
            new LocalWindObstacleQuery(physicsWorld, DEFAULT_LOCAL_WIND_OBSTACLE_DEFINITION),
        );
    }

    /** Bodies such as Ball deliberately live outside PhysicsWorld's dynamic list. */
    public registerAdditionalBody(body: LocalWindForceTarget): void {
        this.additionalBodies.add(body);
    }

    public unregisterAdditionalBody(body: LocalWindForceTarget): void {
        this.additionalBodies.delete(body);
    }

    public update(deltaTime: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
            return;
        }

        const bodies = [
            ...this.physicsWorld.getRigidDynamicCollidables(),
            ...this.additionalBodies,
        ];

        for (const body of bodies) {
            const inverseMass = body.getInverseMass();

            // Static/kinematic registrations cannot be displaced by Wind.
            if (!Number.isFinite(inverseMass) || inverseMass <= 0) {
                continue;
            }

            const x = body.getX();
            const y = body.getY();
            const sample = this.localWindSystem.sampleAt(x, y);
            const acceleration = sample.acceleration;
            const accelerationMagnitude = Math.hypot(
                acceleration.x,
                acceleration.y,
            );

            if (
                !Number.isFinite(accelerationMagnitude) ||
                accelerationMagnitude < this.definition.minimumAcceleration
            ) {
                continue;
            }

            // F = a(reference) * m(reference), J = F * dt. The body's own
            // inverse mass is applied by applyImpulseAtWorldPoint().
            const hasPullSource = sample.contributingSourceIds.some((sourceId) =>
                this.localWindSystem.getSources().some(
                    (source) => source.id === sourceId && source.flowMode === "pull",
                ),
            );
            const mass = 1 / inverseMass;
            const heavyProgress = Math.max(0, Math.min(1,
                (mass - this.definition.referenceMass) /
                Math.max(0.001, this.definition.pullHeavyBodyReferenceMass - this.definition.referenceMass),
            ));
            const pullHeavyMultiplier = hasPullSource
                ? 1 + (this.definition.pullHeavyBodyMaximumMultiplier - 1) * heavyProgress
                : 1;

            let impulseX =
                acceleration.x * this.definition.referenceMass * pullHeavyMultiplier * deltaTime;
            let impulseY =
                acceleration.y * this.definition.referenceMass * pullHeavyMultiplier * deltaTime;

            const impulseMagnitude = Math.hypot(impulseX, impulseY);
            if (impulseMagnitude > this.definition.maximumImpulsePerStep) {
                const scale =
                    this.definition.maximumImpulsePerStep / impulseMagnitude;
                impulseX *= scale;
                impulseY *= scale;
            }

            body.applyImpulseAtWorldPoint(impulseX, impulseY, x, y);
        }
    }

    private validateDefinition(definition: LocalWindDynamicForceDefinition): void {
        if (
            !Number.isFinite(definition.referenceMass) ||
            definition.referenceMass <= 0 ||
            !Number.isFinite(definition.minimumAcceleration) ||
            definition.minimumAcceleration < 0 ||
            !Number.isFinite(definition.maximumImpulsePerStep) ||
            definition.maximumImpulsePerStep <= 0 ||
            !Number.isFinite(definition.pullHeavyBodyMaximumMultiplier) ||
            definition.pullHeavyBodyMaximumMultiplier < 1 ||
            !Number.isFinite(definition.pullHeavyBodyReferenceMass) ||
            definition.pullHeavyBodyReferenceMass <= definition.referenceMass
        ) {
            throw new Error("Invalid Local Wind dynamic-force definition.");
        }
    }
}

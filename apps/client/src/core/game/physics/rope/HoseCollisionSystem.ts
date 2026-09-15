import type { HydrantHoseDefinition } from "../../config/HydrantHoseDefinition";
import type { HoseRope } from "./HoseRope";
import type { PhysicsWorld } from "../PhysicsWorld";
import { HoseObstacleCollision } from "./HoseObstacleCollision";

/**
 * General physical collision pass for the Hydrant Hose against world objects.
 * The rope remains a Verlet rope rather than being converted into dozens of
 * rigid bodies. Contact correction is distributed to the two points belonging
 * to the colliding segment and constraints are re-solved after each pass.
 */
export class HoseCollisionSystem {
    private readonly geometry = new HoseObstacleCollision();
    private lastResolvedContactCount = 0;

    public constructor(
        private readonly rope: HoseRope,
        private readonly definition: HydrantHoseDefinition,
    ) { }

    public resolve(
        physicsWorld: PhysicsWorld,
    ): number {
        this.lastResolvedContactCount = 0;

        const staticObstacles =
            physicsWorld
                .getHoseStaticDefinitions();

        const dynamicObstacles =
            physicsWorld
                .getHoseDynamicCollidables();

        const radius =
            this.definition
                .hoseObstacleCollisionRadius;

        for (let pass = 0; pass < this.definition.hoseObstacleCollisionIterations; pass += 1) {
            let resolvedThisPass = false;

            for (const obstacle of staticObstacles) {
                const contact = this.geometry.findDeepestStaticContact(this.rope, obstacle, radius);
                if (!contact) continue;
                this.rope.applySegmentPositionCorrection(
                    contact.segmentIndex,
                    contact.interpolation,
                    contact.normalX * (contact.penetrationDepth + this.definition.hoseObstacleCollisionSlop),
                    contact.normalY * (contact.penetrationDepth + this.definition.hoseObstacleCollisionSlop),
                );
                this.lastResolvedContactCount += 1;
                resolvedThisPass = true;
            }

            for (const obstacle of dynamicObstacles) {
                const contact = this.geometry.findDeepestDynamicContact(this.rope, obstacle, radius);
                if (!contact) continue;
                this.rope.applySegmentPositionCorrection(
                    contact.segmentIndex,
                    contact.interpolation,
                    contact.normalX * (contact.penetrationDepth + this.definition.hoseObstacleCollisionSlop),
                    contact.normalY * (contact.penetrationDepth + this.definition.hoseObstacleCollisionSlop),
                );
                this.lastResolvedContactCount += 1;
                resolvedThisPass = true;
            }

            if (!resolvedThisPass) break;
            this.rope.resolveConstraintsImmediately();
        }

        return this.lastResolvedContactCount;
    }

    public getLastResolvedContactCount(): number {
        return this.lastResolvedContactCount;
    }
}

import type { RadialBumperDefinition } from "../config/RadialBumperDefinition";
import type { RadialBumper } from "../entities/mechanisms/RadialBumper";
import type { DynamicCollidable } from "./DynamicCollidable";
import { detectDynamicCollidableAgainstFixedCollision } from "./DynamicCollidableCollision";
import type { FixedCircleCollisionShape } from "./DynamicCollidableCollision";
import type { PhysicsWorld } from "./PhysicsWorld";

/**
 * Powered Radial Bumper response for every movable body registered with PhysicsWorld.
 * The bumper remains fixed. Mass changes the powered rebound strength, but RB-3.1
 * deliberately compresses the mass penalty so even heavy bodies are kicked clearly.
 */
export class RadialBumperCollisionSystem {
    private readonly activeContacts = new Set<string>();

    public resolve(physicsWorld: PhysicsWorld, bumper: RadialBumper): number {
        const definition = bumper.getDefinition();
        const collision = bumper.getCollisionDefinition();
        if (collision.shape !== "circle") return 0;

        const fixedShape: FixedCircleCollisionShape = {
            id: collision.id,
            shape: "circle",
            positionX: collision.positionX,
            positionY: collision.positionY,
            radius: collision.radius,
            material: {
                restitution: collision.material.restitution,
                friction: collision.material.collisionFriction,
            },
        };

        const contactsThisFrame = new Set<string>();
        let poweredImpactCount = 0;

        for (const body of physicsWorld.getMovableRigidDynamicCollidables()) {
            const manifold = detectDynamicCollidableAgainstFixedCollision(body, fixedShape);
            if (!manifold) continue;

            const bodyId = body.getDefinition().id;
            contactsThisFrame.add(bodyId);

            // Fully separate the movable body before applying the powered response.
            body.translate(
                manifold.normalX * (manifold.penetrationDepth + 0.01),
                manifold.normalY * (manifold.penetrationDepth + 0.01),
            );

            const velocityX = body.getVelocityX();
            const velocityY = body.getVelocityY();
            const incomingSpeed = Math.hypot(velocityX, velocityY);
            const inwardNormalSpeed = velocityX * manifold.normalX + velocityY * manifold.normalY;

            // Only a newly-entered, inward-moving contact receives a powered kick.
            if (
                this.activeContacts.has(bodyId) ||
                inwardNormalSpeed >= -definition.minimumGenericImpactSpeed ||
                incomingSpeed < definition.minimumGenericImpactSpeed
            ) {
                continue;
            }

            const inverseMass = body.getInverseMass();
            if (inverseMass <= 0) continue;
            const mass = 1 / inverseMass;
            const massFactor = this.calculateMassFactor(mass, definition);
            const poweredSpeed =
                incomingSpeed * definition.genericBounceSpeedMultiplier * massFactor;
            const targetSpeed = Math.min(
                definition.maximumGenericReboundSpeed,
                poweredSpeed,
            );

            // Apply the delta at the centre of mass so the bumper launches the body
            // radially without injecting artificial spin. Existing angular velocity
            // is left untouched.
            const targetVelocityX = manifold.normalX * targetSpeed;
            const targetVelocityY = manifold.normalY * targetSpeed;
            const impulseX = (targetVelocityX - velocityX) * mass;
            const impulseY = (targetVelocityY - velocityY) * mass;
            body.applyImpulseAtWorldPoint(impulseX, impulseY, body.getX(), body.getY());

            body.notifyExternalImpact?.({
                sourceKind: "other",
                sourceId: collision.id,
                positionX: manifold.contactPointX,
                positionY: manifold.contactPointY,
            });
            bumper.triggerImpact();
            poweredImpactCount += 1;
        }

        this.activeContacts.clear();
        for (const id of contactsThisFrame) this.activeContacts.add(id);
        return poweredImpactCount;
    }

    public reset(): void {
        this.activeContacts.clear();
    }

    private calculateMassFactor(mass: number, definition: RadialBumperDefinition): number {
        const safeMass = Math.max(0.0001, mass);
        // A shallow exponent intentionally compresses the difference between light
        // and heavy bodies. The clamp guarantees that high mass weakens the launch
        // without ever making this powered bumper feel like an ordinary collision.
        const massRatio = definition.genericReferenceMass / safeMass;
        const raw = Math.pow(massRatio, definition.genericMassResponseExponent);
        return Math.max(
            definition.genericMinimumMassFactor,
            Math.min(definition.genericMaximumMassFactor, raw),
        );
    }
}

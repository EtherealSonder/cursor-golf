import type { DynamicCollidable } from "../physics/DynamicCollidable";
import { detectDynamicCollidableAgainstFixedCollision } from "../physics/DynamicCollidableCollision";
import { resolveDynamicCollision, type DynamicCollisionBody } from "../physics/DynamicCollisionResponse";
import type { Bush } from "./Bush";
import { BUSH_OBJECT_COLLISION } from "./BushObjectCollisionDefinition";

/**
 * Resolves rigid movable objects against static foliage, without registering
 * a bush in PhysicsWorld's shared fixed-collider list (which the Ball also uses).
 * This deliberately excludes the Ball, whose traversal is handled by B3.
 */
export class BushObjectCollisionSystem {
    public resolve(bushes: readonly Bush[], bodies: readonly DynamicCollidable[]): number {
        if (bushes.length === 0 || bodies.length === 0) return 0;
        let contacts = 0;
        for (let pass = 0; pass < BUSH_OBJECT_COLLISION.resolutionPasses; pass++) {
            let hadContact = false;
            for (const body of bodies) {
                if (body.getInverseMass() <= 0) continue;
                for (const bush of bushes) {
                    if (bush.isDestroyed) continue;
                    const fixed = bush.getObjectCollisionShape();
                    const manifold = detectDynamicCollidableAgainstFixedCollision(body, fixed);
                    if (!manifold || manifold.penetrationDepth <= 0) continue;
                    hadContact = true;
                    contacts++;
                    const dynamic: DynamicCollisionBody = {
                        positionX: body.getX(), positionY: body.getY(),
                        velocityX: body.getVelocityX(), velocityY: body.getVelocityY(),
                        angularVelocity: body.getAngularVelocity(),
                        inverseMass: body.getInverseMass(),
                        inverseMomentOfInertia: body.getInverseMomentOfInertia(),
                        applyImpulseAtWorldPoint: (ix, iy, x, y) => body.applyImpulseAtWorldPoint(ix, iy, x, y),
                        translate: (x, y) => body.translate(x, y),
                    };
                    const immovable: DynamicCollisionBody = {
                        positionX: bush.x, positionY: bush.y,
                        velocityX: 0, velocityY: 0, angularVelocity: 0,
                        inverseMass: 0, inverseMomentOfInertia: 0,
                        applyImpulseAtWorldPoint: () => {}, translate: () => {},
                    };
                    resolveDynamicCollision(dynamic, immovable,
                        { ...manifold, restitution: 0, friction: BUSH_OBJECT_COLLISION.friction },
                        1, 0);
                }
            }
            if (!hadContact) break;
        }
        return contacts;
    }
}

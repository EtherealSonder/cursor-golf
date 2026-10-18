import type { Robot } from "../entities/robots/Robot";
import type { Rotator } from "../entities/mechanisms/Rotator";
import { ROTATOR_DEFINITION as D } from "../config/RotatorDefinition";
import { detectDynamicCollidableAgainstFixedCollision } from "../physics/DynamicCollidableCollision";
import { rotatorDynamicShapes } from "./RotatorDynamicCollisionGeometry";

/** Resolve motor-driven arm contacts after robot locomotion. Robot AI retains movement ownership. */
export class RotatorRobotCollisionSystem {
    public resolve(rotators: readonly Rotator[], robots: readonly Robot[], applyImpulse = true): void {
        for (const rotator of rotators) {
            const center = rotator.getCenter();
            const shapes = rotatorDynamicShapes(rotator);
            for (const robot of robots) {
                if (robot.isDestroyed() || Math.hypot(robot.getX() - center.x, robot.getY() - center.y) > D.diameter) continue;
                for (let pass = 0; pass < 4; pass++) {
                    let best: ReturnType<typeof detectDynamicCollidableAgainstFixedCollision> = null;
                    let index = -1;
                    for (let i = 0; i < shapes.length; i++) {
                        const hit = detectDynamicCollidableAgainstFixedCollision(robot, shapes[i]);
                        if (hit && hit.penetrationDepth > (best?.penetrationDepth ?? 0)) { best = hit; index = i; }
                    }
                    if (!best || best.penetrationDepth <= 0.01) break;
                    robot.translate(best.normalX * (best.penetrationDepth + D.contactSkin), best.normalY * (best.penetrationDepth + D.contactSkin));
                    if (!applyImpulse || pass !== 0 || index === 0) continue;
                    const omega = rotator.getAngularVelocity();
                    const surfaceX = -omega * (best.contactPointY - center.y);
                    const surfaceY = omega * (best.contactPointX - center.x);
                    const closing = Math.max(0, (surfaceX - robot.getVelocityX()) * best.normalX + (surfaceY - robot.getVelocityY()) * best.normalY);
                    if (closing > 1) {
                        const mass = 1 / Math.max(1e-6, robot.getInverseMass());
                        const impulse = Math.min(260, closing * mass * 0.30);
                        robot.receiveProximityMineBlast(best.normalX * impulse, best.normalY * impulse, 0.12);
                    }
                }
            }
        }
    }
}

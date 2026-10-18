import type { DynamicCollidable } from "../physics/DynamicCollidable";
import { detectDynamicCollidableAgainstFixedCollision } from "../physics/DynamicCollidableCollision";
import { ROTATOR_DEFINITION as D } from "../config/RotatorDefinition";
import type { Rotator } from "../entities/mechanisms/Rotator";
import { rotatorDynamicShapes } from "./RotatorDynamicCollisionGeometry";

/** A fixed motor drives the moving contact surface; only the dynamic body receives impulses. */
export class RotatorDynamicCollisionSystem {
    public resolve(rotators: readonly Rotator[], bodies: readonly DynamicCollidable[], applyImpulses = true): void {
        for (const rotator of rotators) {
            const center = rotator.getCenter();
            const omega = rotator.getAngularVelocity();
            const shapes = rotatorDynamicShapes(rotator);
            for (const body of bodies) {
                const def = body.getDefinition();
                if (def.shape === "triangle" || body.getInverseMass() <= 0) continue;
                if (Math.hypot(body.getX() - center.x, body.getY() - center.y) > D.diameter) continue;
                // Recompute manifolds after each projection to prevent stale multi-contact normals.
                for (let pass = 0; pass < 5; pass++) {
                    let deepest: ReturnType<typeof detectDynamicCollidableAgainstFixedCollision> = null;
                    let selected = -1;
                    for (let i = 0; i < shapes.length; i++) {
                        const m = detectDynamicCollidableAgainstFixedCollision(body, shapes[i]);
                        if (m && m.penetrationDepth > (deepest?.penetrationDepth ?? 0)) { deepest = m; selected = i; }
                    }
                    if (!deepest || deepest.penetrationDepth <= 0.01) break;
                    body.translate(deepest.normalX * (deepest.penetrationDepth + D.contactSkin),
                        deepest.normalY * (deepest.penetrationDepth + D.contactSkin));
                    if (!applyImpulses || pass > 0) continue;
                    const px = deepest.contactPointX, py = deepest.contactPointY;
                    const sx = selected === 0 ? 0 : -omega * (py - center.y);
                    const sy = selected === 0 ? 0 : omega * (px - center.x);
                    const rx = px - body.getX(), ry = py - body.getY();
                    const vx = body.getVelocityX() - body.getAngularVelocity() * ry - sx;
                    const vy = body.getVelocityY() + body.getAngularVelocity() * rx - sy;
                    const nx = deepest.normalX, ny = deepest.normalY;
                    const closing = Math.max(0, -(vx * nx + vy * ny));
                    const cross = rx * ny - ry * nx;
                    const inv = body.getInverseMass() + cross * cross * body.getInverseMomentOfInertia();
                    if (inv <= 1e-9) continue;
                    const j = Math.min(1200, closing * (1 + D.restitution) / inv);
                    if (j > 0) {
                        body.applyImpulseAtWorldPoint(nx * j, ny * j, px, py);
                        body.notifyExternalImpact?.({ sourceKind: "other", sourceId: rotator.getId(),
                            positionX: px, positionY: py, closingNormalSpeed: closing,
                            effectiveMass: 1 / inv, normalImpulseMagnitude: j });
                    }
                    // Motor-driven tangential traction also creates off-center torque.
                    const tx = -ny, ty = nx;
                    const slip = vx * tx + vy * ty;
                    const crossT = rx * ty - ry * tx;
                    const invT = body.getInverseMass() + crossT * crossT * body.getInverseMomentOfInertia();
                    if (invT > 1e-9) {
                        const jt = Math.max(-Math.max(j * 0.65, 8), Math.min(Math.max(j * 0.65, 8), -slip / invT * 0.35));
                        body.applyImpulseAtWorldPoint(tx * jt, ty * jt, px, py);
                    }
                }
            }
        }
    }
}

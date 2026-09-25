import type { Ball } from "../entities/Ball";
import type { RotatingPaddle } from "../entities/mechanisms/RotatingPaddle";
import type { PhysicsWorld } from "./PhysicsWorld";

export class RotatingPaddleCenterCollisionSystem {
    /** Generic rigid bodies are resolved by DynamicStaticCollisionSystem once the center provider is registered. */
    public isRegisteredWithPhysicsWorld(physicsWorld: PhysicsWorld, paddle: RotatingPaddle): boolean {
        return physicsWorld.getRigidFixedShapes().some((shape) => shape.id === paddle.getCenterColliderId());
    }
    public resolve(ball: Ball, paddle: RotatingPaddle): void {
        const dx = ball.getX() - paddle.getX();
        const dy = ball.getY() - paddle.getY();
        const distance = Math.hypot(dx, dy);
        const minimumDistance = paddle.getDefinition().centerStopperRadius + ball.getRadius();
        if (distance >= minimumDistance) return;

        const nx = distance > 0.0001 ? dx / distance : 1;
        const ny = distance > 0.0001 ? dy / distance : 0;
        const penetration = minimumDistance - distance;
        ball.translate(nx * penetration, ny * penetration);

        const normalSpeed = ball.getVelocityX() * nx + ball.getVelocityY() * ny;
        if (normalSpeed >= 0) return;

        const inverseMass = ball.getInverseMass();
        if (inverseMass <= 0) return;
        const restitution = paddle.getDefinition().centerRestitution;
        const impulseMagnitude = -(1 + restitution) * normalSpeed / inverseMass;
        ball.applyImpulseAtWorldPoint(
            nx * impulseMagnitude,
            ny * impulseMagnitude,
            paddle.getX() + nx * paddle.getDefinition().centerStopperRadius,
            paddle.getY() + ny * paddle.getDefinition().centerStopperRadius,
        );
    }
}

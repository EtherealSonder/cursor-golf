import type { Ball } from "../entities/Ball";
import type { ConveyorBelt } from "../entities/mechanisms/ConveyorBelt";
import { CONVEYOR_BELT_PHYSICS } from "./ConveyorBeltPhysicsDefinition";

/** Circle/rectangle contact, in the conveyor's rotated local coordinate system. */
export function conveyorBallContactWeight(
    ballX: number, ballY: number, radius: number,
    beltX: number, beltY: number, rotation: number,
    width: number, height: number,
): number {
    if (!(radius > 0)) return 0;
    const dx = ballX - beltX;
    const dy = ballY - beltY;
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    const localX = c * dx + s * dy;
    const localY = -s * dx + c * dy;
    const halfW = width / 2;
    const halfH = height / 2;
    const outsideX = Math.max(Math.abs(localX) - halfW, 0);
    const outsideY = Math.max(Math.abs(localY) - halfH, 0);
    const distance = Math.hypot(outsideX, outsideY);
    if (distance >= radius) return 0;
    // Fully inside the rectangle means full contact. Near an edge, ramp contact.
    const insideDepth = Math.min(halfW - Math.abs(localX), halfH - Math.abs(localY));
    if (insideDepth >= radius) return 1;
    return Math.max(0, Math.min(1, (radius - distance + Math.max(0, insideDepth)) / (2 * radius)));
}

/**
 * Calculate the conveyor's signed forward velocity change for a single step.
 * A shot faster than the conveyor in the forward direction is never slowed.
 * Against the conveyor, velocity is driven through zero toward the belt speed.
 */
export function conveyorDirectionalDeltaSpeed(
    currentDirectionalSpeed: number,
    deltaTime: number,
    contactWeight: number,
): number {
    if (!Number.isFinite(currentDirectionalSpeed) || !Number.isFinite(deltaTime) || deltaTime <= 0) return 0;
    if (!Number.isFinite(contactWeight) || contactWeight <= 0) return 0;
    const remaining = CONVEYOR_BELT_PHYSICS.targetDirectionalSpeed - currentDirectionalSpeed;
    if (remaining <= 0) return 0;
    return Math.min(remaining, CONVEYOR_BELT_PHYSICS.acceleration * deltaTime * Math.min(1, contactWeight));
}

export class ConveyorBeltBallTransportSystem {
    public update(deltaTime: number, ball: Ball, belts: readonly ConveyorBelt[]): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;
        const inverseMass = ball.getInverseMass();
        if (!(inverseMass > 0)) return;
        for (const belt of belts) {
            const weight = conveyorBallContactWeight(
                ball.getX(), ball.getY(), ball.getRadius(),
                belt.getX(), belt.getY(), belt.getRotationRadians(),
                belt.getFootprintWidth(), belt.getFootprintHeight(),
            );
            if (weight <= 0) continue;
            const angle = belt.getRotationRadians();
            const dirX = Math.cos(angle);
            const dirY = Math.sin(angle);
            const along = ball.getVelocityX() * dirX + ball.getVelocityY() * dirY;
            const deltaSpeed = conveyorDirectionalDeltaSpeed(along, deltaTime, weight);
            if (deltaSpeed <= 0) continue;
            const impulse = deltaSpeed / inverseMass;
            ball.applyImpulseAtWorldPoint(dirX * impulse, dirY * impulse, ball.getX(), ball.getY());
        }
    }
}

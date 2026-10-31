import { RigidBody2D } from "../physics/RigidBody2D";
import type { DynamicRectangleObstacleDefinition } from "../config/ObstacleDefinition";

/** Reuses the shared rigid-body solver; owns only the crate's integrated pose. */
export class CratePhysicsController {
    public readonly body: RigidBody2D;
    public x: number;
    public y: number;
    public rotation = 0;

    constructor(definition: DynamicRectangleObstacleDefinition) {
        this.x = definition.positionX;
        this.y = definition.positionY;
        this.rotation = definition.rotationRadians;
        const inertia = definition.rigidBody.mass * (definition.width ** 2 + definition.height ** 2) / 12;
        this.body = new RigidBody2D(definition.rigidBody, inertia);
    }

    /** P4-B: preserve angular state while relocating the authoritative body. */
    public teleportTo(x: number, y: number, vx: number, vy: number): void {
        this.x = x; this.y = y;
        this.body.setVelocity(vx, vy);
    }

    public update(dt: number): void {
        const movement = this.body.integrate(dt);
        this.x += movement.positionDeltaX;
        this.y += movement.positionDeltaY;
        this.rotation += movement.rotationDelta;
    }

    public translate(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
    }

    /** Conveyor impulses share the existing rigid-body momentum and torque solver. */
    public applyConveyorImpulse(ix: number, iy: number, contactX: number, contactY: number): void {
        this.applyImpulse(ix, iy, contactX, contactY);
    }

    public applyImpulse(ix: number, iy: number, contactX: number, contactY: number): void {
        this.body.applyImpulseAtWorldPoint(ix, iy, contactX - this.x, contactY - this.y);
    }
}

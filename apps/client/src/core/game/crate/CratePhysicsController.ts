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

    public applyImpulse(ix: number, iy: number, contactX: number, contactY: number): void {
        this.body.applyImpulseAtWorldPoint(ix, iy, contactX - this.x, contactY - this.y);
    }
}

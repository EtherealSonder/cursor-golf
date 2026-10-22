import { RigidBody2D } from "../physics/RigidBody2D";
import type { DynamicCircleObstacleDefinition } from "../config/ObstacleDefinition";
/** Physics pose and impulses; no elemental behavior in M1. */
export class ElementalMarblePhysicsController {
    public readonly body: RigidBody2D;
    public x: number;
    public y: number;
    public rotation = 0;
    constructor(definition: DynamicCircleObstacleDefinition) {
        this.x = definition.positionX; this.y = definition.positionY;
        const inertia = definition.rigidBody.mass * definition.radius ** 2 / 2;
        this.body = new RigidBody2D(definition.rigidBody, inertia);
    }
    public update(dt: number): void {
        const motion = this.body.integrate(dt);
        this.x += motion.positionDeltaX; this.y += motion.positionDeltaY;
        this.rotation += motion.rotationDelta;
    }
    public translate(dx: number, dy: number): void { this.x += dx; this.y += dy; }
    public applyImpulse(ix: number, iy: number, cx: number, cy: number): void {
        this.body.applyImpulseAtWorldPoint(ix, iy, cx - this.x, cy - this.y);
    }
}

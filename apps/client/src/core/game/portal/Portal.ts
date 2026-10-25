import type { DynamicCollidable, DynamicCompoundPrimitive } from "../physics/DynamicCollidable";
import type { DynamicObstacleDefinition } from "../config/ObstacleDefinition";
import { createPortalCompoundCollisionPrimitives } from "./PortalCollisionGeometry";
import { RigidBody2D } from "../physics/RigidBody2D";
import { PORTAL_BODY, PORTAL_COLLIDER } from "../config/PortalPhysicsDefinition";
import type { PortalPlacement } from "../level/LevelDefinition";

/** P2-B1: simulation-owned movable portal; deliberately not a collision target yet. */
export class Portal implements DynamicCollidable {
    private static readonly collisionPrimitives = createPortalCompoundCollisionPrimitives();
    public readonly id: string;
    public readonly body: RigidBody2D;
    private x: number;
    private y: number;
    private rotation: number;
    /** Authored world-space pivot; never changes during simulation. */
    private readonly anchorX: number;
    private readonly anchorY: number;

    public constructor(placement: PortalPlacement) {
        this.id = placement.id;
        this.anchorX = placement.x;
        this.anchorY = placement.y;
        this.x = placement.x;
        this.y = placement.y;
        this.rotation = placement.rotation;
        const d = PORTAL_BODY;
        const inertia = d.mass * (PORTAL_COLLIDER.width ** 2 + PORTAL_COLLIDER.height ** 2) * d.inertiaFactor;
        this.body = new RigidBody2D({
            bodyType: "dynamic", mass: d.mass,
            linearDamping: d.linearDamping,
            angularDamping: d.angularDamping,
            sleepLinearSpeedThreshold: d.sleepLinearSpeedThreshold,
            sleepAngularSpeedThreshold: d.sleepAngularSpeedThreshold,
            sleepDelay: d.sleepDelay,
            maximumLinearSpeed: d.maximumLinearSpeed,
            maximumAngularSpeed: d.maximumAngularSpeed,
        }, inertia);
    }

    public getDefinition(): DynamicObstacleDefinition {
        return {
            id: this.id, shape: "rectangle", positionX: this.x, positionY: this.y,
            rotationRadians: this.rotation, width: PORTAL_COLLIDER.width,
            height: PORTAL_COLLIDER.height, fillColor: 0, outlineColor: 0,
            outlineWidth: 0,
            material: { restitution: 0.25, friction: 0.55 },
            rigidBody: this.body.getDefinition(),
        };
    }
    public getCompoundCollisionGeometry(): readonly DynamicCompoundPrimitive[] {
        return Portal.collisionPrimitives;
    }
    public isFixedPivot(): boolean { return true; }
    /** Housing remains solid, but only the two handles drive the pivot. */
    public getContactInverseMomentOfInertia(partId: string | undefined): number {
        return partId === "leftHandle" || partId === "rightHandle"
            ? this.getInverseMomentOfInertia() : 0;
    }
    public applyContactImpulseAtWorldPoint(ix: number, iy: number, px: number, py: number, partId: string | undefined): void {
        if (this.getContactInverseMomentOfInertia(partId) === 0) return;
        this.applyImpulseAtWorldPoint(ix, iy, px, py);
    }
    public getRotationRadians(): number { return this.rotation; }
    public getInverseMomentOfInertia(): number { return this.body.getInverseMomentOfInertia(); }
    /** Fixed pivot: contact position correction must never displace the center. */
    public translate(_dx: number, _dy: number): void { /* anchored */ }
    public getX(): number { return this.x; }
    public getY(): number { return this.y; }
    public getRotation(): number { return this.rotation; }
    public getInverseMass(): number { return 0; }
    public getVelocityX(): number { return 0; }
    public getVelocityY(): number { return 0; }
    public getAngularVelocity(): number { return this.body.getAngularVelocity(); }
    public applyImpulseAtWorldPoint(ix: number, iy: number, px: number, py: number): void {
        // Angular-only impulse. RigidBody2D.applyImpulseAtWorldPoint would
        // also add linear velocity, which violates the fixed-pivot constraint.
        const torqueImpulse = (px - this.anchorX) * iy - (py - this.anchorY) * ix;
        if (!Number.isFinite(torqueImpulse)) return;
        this.body.setAngularVelocity(
            this.body.getAngularVelocity() + torqueImpulse * this.body.getInverseMomentOfInertia(),
        );
    }
    public applyLocalWindImpulse(ix: number, iy: number): void {
        // C1: wind is intentionally disabled until handle-specific torque in C3.
        void ix; void iy;
    }
    public update(dt: number): void {
        const movement = this.body.integrate(dt);
        // Ignore linear integration entirely, including any stale velocity.
        this.x = this.anchorX;
        this.y = this.anchorY;
        this.rotation += movement.rotationDelta;
    }
}

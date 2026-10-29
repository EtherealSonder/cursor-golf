import { PortalPerformanceDiagnosticController as PortalDiag } from "../debug/PortalPerformanceDiagnosticController";
import type { DynamicCollidable, DynamicCompoundPrimitive } from "../physics/DynamicCollidable";
import type { DynamicObstacleDefinition } from "../config/ObstacleDefinition";
import { createPortalCompoundCollisionPrimitives } from "./PortalCollisionGeometry";
import { RigidBody2D } from "../physics/RigidBody2D";
import { PORTAL_BODY, PORTAL_COLLIDER } from "../config/PortalPhysicsDefinition";
import type { PortalPlacement } from "../level/LevelDefinition";
import type { LocalWindSystem } from "../environment/LocalWindSystem";

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
    /** The handle positions are derived from the authoritative anchored transform. */
    public getHandleWorldPosition(side: "left" | "right"): { x: number; y: number } {
        const localX = (side === "left" ? -1 : 1) * PORTAL_COLLIDER.handleCenterX;
        const c = Math.cos(this.rotation);
        const sn = Math.sin(this.rotation);
        return { x: this.anchorX + localX * c, y: this.anchorY + localX * sn };
    }

    private applyHandleTorque(
        side: "left" | "right", forceX: number, forceY: number,
        multiplier: number, maximumAngularImpulse: number,
    ): void {
        if (!Number.isFinite(forceX) || !Number.isFinite(forceY)) return;
        const handle = this.getHandleWorldPosition(side);
        const leverX = handle.x - this.anchorX;
        const leverY = handle.y - this.anchorY;
        const rawTorque = (leverX * forceY - leverY * forceX) * multiplier;
        const torque = Math.max(-maximumAngularImpulse, Math.min(maximumAngularImpulse, rawTorque));
        if (!Number.isFinite(torque)) return;
        this.body.setAngularVelocity(
            this.body.getAngularVelocity() + torque * this.body.getInverseMomentOfInertia(),
        );
    }

    /** Fixed pivots receive wind at the handles, never through center-of-mass translation. */
    public applyFixedPivotWind(
        wind: LocalWindSystem, dt: number, referenceMass: number,
    ): void {
        if (!(dt > 0) || !Number.isFinite(dt)) return;
        const d = PORTAL_BODY;
        for (const side of ["left", "right"] as const) {
            const handle = this.getHandleWorldPosition(side);
            const acceleration = wind.sampleAt(handle.x, handle.y).acceleration;
            if (Math.hypot(acceleration.x, acceleration.y) < d.windMinimumAcceleration) continue;
            this.applyHandleTorque(
                side, acceleration.x * referenceMass * dt,
                acceleration.y * referenceMass * dt,
                d.windImpulseMultiplier, d.windMaximumAngularImpulsePerStep,
            );
        }
    }

    /** Packet impacts only apply torque to the contacted handle. */
    public applyWaterHandleImpulse(
        side: "left" | "right", velocityX: number, velocityY: number,
        waterAmount: number,
    ): void {
        if (!Number.isFinite(waterAmount) || waterAmount <= 0) return;
        const momentumX = velocityX * waterAmount;
        const momentumY = velocityY * waterAmount;
        if (Math.hypot(momentumX, momentumY) < PORTAL_BODY.waterMinimumMomentum) return;
        this.applyHandleTorque(
            side, momentumX, momentumY,
            PORTAL_BODY.waterImpulseMultiplier,
            PORTAL_BODY.waterMaximumAngularImpulsePerHit,
        );
    }

    public applyLocalWindImpulse(ix: number, iy: number): void {
        // The shared center-sampled wind path must never move this anchored body.
        void ix; void iy;
    }
    /** Temporarily tests a candidate orientation without changing the fixed pivot. */
    public testRotation(angle: number, probe: () => boolean): boolean {
        const previous = this.rotation;
        this.rotation = angle;
        try { return probe(); } finally { this.rotation = previous; }
    }

    /** Angular-only integration with optional swept obstruction callback. */
    public update(dt: number, blocked?: (candidateAngle: number, previousAngle: number) => boolean): void {
        const movement = PortalDiag.active?.measure("portalIntegration", () => this.body.integrate(dt)) ?? this.body.integrate(dt);
        this.x = this.anchorX;
        this.y = this.anchorY;
        const delta = movement.rotationDelta;
        if (!Number.isFinite(delta) || delta === 0) return;
        const count = Math.max(1, Math.ceil(Math.abs(delta) / PORTAL_BODY.maximumRotationStepRadians));
        const step = delta / count;
        PortalDiag.active?.count("rotationSubsteps",count);
        for (let i = 0; i < count; i += 1) {
            const next = this.rotation + step;
            if (blocked?.(next, this.rotation)) {
                PortalDiag.active?.count("rotationRejected");
                this.body.setAngularVelocity(this.body.getAngularVelocity() * PORTAL_BODY.blockedAngularVelocityRetention);
                break;
            }
            this.rotation = next;
            PortalDiag.active?.count("rotationAccepted");
        }
    }
}

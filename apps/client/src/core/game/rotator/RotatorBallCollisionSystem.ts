import type { Ball } from "../entities/Ball";
import type { Rotator } from "../entities/mechanisms/Rotator";
import { ROTATOR_DEFINITION } from "../config/RotatorDefinition";
import { rotatorContacts } from "./RotatorCollisionGeometry";
import { wrapRotatorAngle } from "./RotatorAnimationDefinition";

export interface RotatorBallImpact { speed: number; normalX: number; normalY: number; }

/** Fixed motor-driven arms: nonpenetration and sustained moving-surface contact. */
export class RotatorBallCollisionSystem {
    public resolve(dt: number, ball: Ball, rotator: Rotator): RotatorBallImpact | null {
        if (ball.isDeathPhysicsLocked || !Number.isFinite(dt) || dt <= 0) return null;
        const omega = rotator.getAngularVelocity();
        const center = rotator.getCenter();
        const reach = ROTATOR_DEFINITION.armOuterRadius + ROTATOR_DEFINITION.armEndRadius + ball.getRadius() + ROTATOR_DEFINITION.contactCaptureDistance;
        if (Math.hypot(ball.getX() - center.x, ball.getY() - center.y) > reach) return null;

        const count = Math.min(ROTATOR_DEFINITION.maxCollisionSubsteps, Math.max(1, Math.ceil(Math.abs(omega * dt) / ROTATOR_DEFINITION.maxAngularStep)));
        const endAngle = rotator.getArmAngle();
        const subDt = dt / count;
        let strongest: RotatorBallImpact | null = null;

        for (let step = 1; step <= count; step++) {
            const angle = wrapRotatorAngle(endAngle - omega * dt * (1 - step / count));
            for (let iteration = 0; iteration < 4; iteration++) {
                const contacts = rotatorContacts(center.x, center.y, angle, omega, ball.getX(), ball.getY(), ball.getRadius(), ROTATOR_DEFINITION.contactCaptureDistance);
                if (!contacts.length) break;
                contacts.sort((a, b) => b.depth - a.depth);
                const c = contacts[0];
                if (c.depth > 0) {
                    ball.correctRotatorPenetration(c.normalX * (c.depth + ROTATOR_DEFINITION.contactSkin), c.normalY * (c.depth + ROTATOR_DEFINITION.contactSkin));
                }
                const vx = ball.getVelocityX(), vy = ball.getVelocityY();
                const rvx = vx - c.surfaceX, rvy = vy - c.surfaceY;
                const normalSpeed = rvx * c.normalX + rvy * c.normalY;
                const closingSpeed = Math.max(0, -normalSpeed);
                if (closingSpeed > 0 && (!strongest || closingSpeed > strongest.speed)) {
                    strongest = { speed: closingSpeed, normalX: c.normalX, normalY: c.normalY };
                }
                const tx = -c.normalY, ty = c.normalX;
                const tangentialSlip = rvx * tx + rvy * ty;
                // A low-restitution unilateral contact removes inward velocity without
                // treating the motor-driven arm as an elastic bumper.
                const normalDelta = closingSpeed * (1 + ROTATOR_DEFINITION.restitution);
                // Tangential coupling operates while near the surface, including when
                // the normal component is zero. This lets a slow ball be swept around.
                const slipDelta = -tangentialSlip * Math.min(1, ROTATOR_DEFINITION.tangentialCouplingPerSecond * subDt);
                const invMass = ball.getInverseMass();
                if (invMass > 0 && (normalDelta !== 0 || slipDelta !== 0)) {
                    ball.applyImpulseAtWorldPoint(
                        (c.normalX * normalDelta + tx * slipDelta) / invMass,
                        (c.normalY * normalDelta + ty * slipDelta) / invMass,
                        c.contactX, c.contactY,
                    );
                }
                // Re-query only when a positional correction was necessary.
                if (c.depth <= 0) break;
            }
        }
        // Final projection also runs here for the normal physics path; World repeats
        // it after other mechanisms have finished changing the ball's position.
        this.resolveFinalPenetration(ball, rotator);
        return strongest;
    }
    /** Position-only final projection at the actual sprite angle. No impulses or bounce. */
    public resolveFinalPenetration(ball: Ball, rotator: Rotator): void {
        if (ball.isDeathPhysicsLocked) return;
        const center = rotator.getCenter();
        const reach = ROTATOR_DEFINITION.armOuterRadius + ROTATOR_DEFINITION.armCapHalfThickness
            + ROTATOR_DEFINITION.armTipSafetyMargin + ball.getRadius() + ROTATOR_DEFINITION.contactSkin;
        if (Math.hypot(ball.getX() - center.x, ball.getY() - center.y) > reach) return;
        const angle = rotator.getRenderedArmAngle();
        const omega = rotator.getAngularVelocity();
        // A compound shaft/end-cap can yield several contacts. Re-query after each
        // projection; the largest remaining penetration determines the next move.
        for (let pass = 0; pass < 24; pass++) {
            const contacts = rotatorContacts(center.x, center.y, angle, omega,
                ball.getX(), ball.getY(), ball.getRadius(), 0);
            let deepest: (typeof contacts)[number] | undefined;
            for (const contact of contacts) {
                if (contact.depth > (deepest?.depth ?? 0)) deepest = contact;
            }
            if (!deepest || deepest.depth <= 0.015) break;
            ball.correctRotatorPenetration(
                deepest.normalX * (deepest.depth + ROTATOR_DEFINITION.contactSkin),
                deepest.normalY * (deepest.depth + ROTATOR_DEFINITION.contactSkin),
            );
        }
    }

}

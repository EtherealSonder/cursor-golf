import type { DynamicCollidable } from "./DynamicCollidable";
import type { PhysicsWorld } from "./PhysicsWorld";
import type { RotatingPaddle } from "../entities/mechanisms/RotatingPaddle";

export class RotatingPaddleDynamicInteractionSystem {
    private readonly contactTimes = new Map<string, number>();

    public update(deltaTime: number, physicsWorld: PhysicsWorld, paddle: RotatingPaddle): void {
        if (deltaTime <= 0) return;

        const activeKeys = new Set<string>();
        let index = 0;
        for (const body of physicsWorld.getMovableRigidDynamicCollidables()) {
            const key = `${paddle.getId()}:${index++}`;
            if (this.applyToBody(deltaTime, body, paddle, key)) {
                activeKeys.add(key);
            }
        }

        // Clear elapsed-contact state after a body has left the surface so the
        // next entry begins with rotation-first behaviour again.
        for (const key of this.contactTimes.keys()) {
            if (key.startsWith(`${paddle.getId()}:`) && !activeKeys.has(key)) {
                this.contactTimes.delete(key);
            }
        }
    }

    private applyToBody(
        deltaTime: number,
        body: DynamicCollidable,
        paddle: RotatingPaddle,
        contactKey: string,
    ): boolean {
        const definition = body.getDefinition();
        const bodyRadius = definition.shape === "circle"
            ? definition.radius
            : definition.shape === "rectangle"
                ? Math.hypot(definition.width, definition.height) * 0.5
                : 0;
        if (bodyRadius <= 0) return false;

        const dx = body.getX() - paddle.getX();
        const dy = body.getY() - paddle.getY();
        const distance = Math.hypot(dx, dy);
        const paddleDefinition = paddle.getDefinition();

        if (distance <= paddle.getCenterStopperRadius() + bodyRadius) return false;
        if (distance >= paddle.getSurfaceRadius() + bodyRadius) return false;
        if (distance <= 0.0001) return false;

        const tangent = paddle.getTangentialDirectionAt(body.getX(), body.getY());
        if (!tangent) return false;

        const inverseMass = body.getInverseMass();
        if (inverseMass <= 0) return false;
        const mass = 1 / inverseMass;
        const massRatio = Math.max(0.0001, paddleDefinition.dynamicReferenceMass / mass);
        const massFactor = Math.max(
            paddleDefinition.dynamicMinimumMassFactor,
            Math.min(
                paddleDefinition.dynamicMaximumMassFactor,
                Math.pow(massRatio, paddleDefinition.dynamicMassResponseExponent),
            ),
        );

        const contactTime = (this.contactTimes.get(contactKey) ?? 0) + deltaTime;
        this.contactTimes.set(contactKey, contactTime);
        const ejectionRamp = Math.min(
            1,
            contactTime / Math.max(0.001, paddleDefinition.dynamicEjectionRampSeconds),
        );

        const radialX = dx / distance;
        const radialY = dy / distance;
        const usableRadius = Math.max(1, paddle.getSurfaceRadius() - paddle.getCenterStopperRadius());
        const radius01 = Math.max(0, Math.min(1,
            (distance - paddle.getCenterStopperRadius()) / usableRadius,
        ));

        const velocityX = body.getVelocityX();
        const velocityY = body.getVelocityY();
        const currentTangentialSpeed = velocityX * tangent.x + velocityY * tangent.y;
        const currentRadialSpeed = velocityX * radialX + velocityY * radialY;

        const targetTangentialSpeed = paddleDefinition.dynamicTargetTangentialSpeedAtOuterRadius
            * (0.70 + 0.30 * radius01);
        const tangentialError = targetTangentialSpeed - currentTangentialSpeed;
        const maxTangentialCorrection = paddleDefinition.dynamicTangentialDeltaSpeedPerSecond
            * massFactor * deltaTime;
        const tangentialCorrection = Math.max(
            -maxTangentialCorrection,
            Math.min(maxTangentialCorrection, tangentialError),
        );

        // Rotation dominates immediately. Outward escape ramps in only after the
        // object has visibly been carried by the paddle.
        const targetOutwardSpeed = paddleDefinition.dynamicOutwardEscapeSpeed * ejectionRamp;
        const outwardError = targetOutwardSpeed - currentRadialSpeed;
        const outwardBlend = Math.min(
            1,
            paddleDefinition.dynamicOutwardCouplingPerSecond * massFactor * deltaTime,
        );
        const outwardCorrection = Math.max(0, outwardError) * outwardBlend;
        const poweredPush = paddleDefinition.dynamicAdditionalTangentialPushPerSecond
            * massFactor * deltaTime;

        let impulseX = (
            tangent.x * (tangentialCorrection + poweredPush)
            + radialX * outwardCorrection
        ) * mass;
        let impulseY = (
            tangent.y * (tangentialCorrection + poweredPush)
            + radialY * outwardCorrection
        ) * mass;

        const impulseMagnitude = Math.hypot(impulseX, impulseY);
        const maximumImpulse = paddleDefinition.dynamicMaximumImpulsePerSecond * deltaTime;
        if (impulseMagnitude > maximumImpulse && impulseMagnitude > 0.0001) {
            const scale = maximumImpulse / impulseMagnitude;
            impulseX *= scale;
            impulseY *= scale;
        }
        if (Math.hypot(impulseX, impulseY) <= 0.0001) return true;

        body.applyImpulseAtWorldPoint(
            impulseX,
            impulseY,
            body.getX(),
            body.getY(),
        );
        body.notifyExternalImpact?.({
            sourceKind: "other",
            sourceId: `rotating-paddle:${paddle.getId()}`,
            positionX: paddle.getX(),
            positionY: paddle.getY(),
        });
        return true;
    }
}

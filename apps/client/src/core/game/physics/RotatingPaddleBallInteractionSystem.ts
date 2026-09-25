import type { Ball } from "../entities/Ball";
import type { RotatingPaddle } from "../entities/mechanisms/RotatingPaddle";

export class RotatingPaddleBallInteractionSystem {
    public update(deltaTime: number, ball: Ball, paddle: RotatingPaddle): void {
        if (deltaTime <= 0) return;

        const dx = ball.getX() - paddle.getX();
        const dy = ball.getY() - paddle.getY();
        const distance = Math.hypot(dx, dy);
        const definition = paddle.getDefinition();
        const ballRadius = ball.getRadius();

        if (distance <= definition.centerStopperRadius + ballRadius) return;
        if (distance >= definition.poweredRadius + ballRadius) return;
        if (distance <= 0.0001) return;

        const tangent = paddle.getTangentialDirectionAt(ball.getX(), ball.getY());
        if (!tangent) return;

        const radialX = dx / distance;
        const radialY = dy / distance;
        const usableRadius = Math.max(1, definition.poweredRadius - definition.centerStopperRadius);
        const radius01 = Math.max(0, Math.min(1,
            (distance - definition.centerStopperRadius) / usableRadius,
        ));

        const velocityX = ball.getVelocityX();
        const velocityY = ball.getVelocityY();
        const incomingSpeed = Math.hypot(velocityX, velocityY);
        const currentTangentialSpeed = velocityX * tangent.x + velocityY * tangent.y;
        const currentRadialSpeed = velocityX * radialX + velocityY * radialY;

        // Rotation authority is intentionally much stronger than propulsion.
        // This turns the incoming velocity toward the local tangent instead of
        // simply stacking more speed onto the shot.
        const targetTangentialSpeed = definition.targetTangentialSpeedAtOuterRadius
            * (0.72 + 0.28 * radius01);
        const tangentialError = targetTangentialSpeed - currentTangentialSpeed;
        const maxTangentialCorrection = definition.maximumTangentialDeltaSpeedPerSecond * deltaTime;
        const tangentialCorrection = Math.max(
            -maxTangentialCorrection,
            Math.min(maxTangentialCorrection, tangentialError),
        );

        // A small outward target guarantees escape, but is velocity-target based
        // rather than an accumulating radial force.
        const outwardError = definition.ballOutwardEscapeSpeed - currentRadialSpeed;
        const outwardBlend = Math.min(1, definition.ballOutwardCouplingPerSecond * deltaTime);
        const outwardCorrection = Math.max(0, outwardError) * outwardBlend;

        const additionalPush = definition.additionalTangentialPushPerSecond * deltaTime;
        let deltaVelocityX = tangent.x * (tangentialCorrection + additionalPush)
            + radialX * outwardCorrection;
        let deltaVelocityY = tangent.y * (tangentialCorrection + additionalPush)
            + radialY * outwardCorrection;

        if (Math.hypot(deltaVelocityX, deltaVelocityY) <= 0.0001) return;

        // Do not let the paddle manufacture a large speed spike. It may add only
        // a small escape allowance above the speed with which the Ball entered
        // this update, while still being free to rotate that velocity strongly.
        const candidateX = velocityX + deltaVelocityX;
        const candidateY = velocityY + deltaVelocityY;
        const candidateSpeed = Math.hypot(candidateX, candidateY);
        const allowedSpeed = Math.min(
            definition.maximumBallSpeed,
            Math.max(incomingSpeed + 35, definition.ballOutwardEscapeSpeed),
        );
        if (candidateSpeed > allowedSpeed && candidateSpeed > 0.0001) {
            const scale = allowedSpeed / candidateSpeed;
            deltaVelocityX = candidateX * scale - velocityX;
            deltaVelocityY = candidateY * scale - velocityY;
        }

        const inverseMass = ball.getInverseMass();
        if (inverseMass <= 0) return;
        const mass = 1 / inverseMass;
        ball.applyImpulseAtWorldPoint(
            deltaVelocityX * mass,
            deltaVelocityY * mass,
            ball.getX(),
            ball.getY(),
        );
    }
}

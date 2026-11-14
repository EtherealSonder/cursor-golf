import type { HoleDefinition } from "../config/HoleDefinition";

/** Speed-limited cup depression: dissipates tangential energy and nudges near misses inward. */
export class HoleRimDynamicsSystem {
    public static calculateVelocityDelta(
        definition: HoleDefinition,
        ballX: number, ballY: number,
        velocityX: number, velocityY: number,
        holeX: number, holeY: number,
        deltaTime: number,
    ): { x: number; y: number } {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) return { x: 0, y: 0 };
        const dx = holeX - ballX;
        const dy = holeY - ballY;
        const distance = Math.hypot(dx, dy);
        if (distance < 0.001 || distance >= definition.rimRadius) return { x: 0, y: 0 };
        const speed = Math.hypot(velocityX, velocityY);
        // Never trap a fast drive. The cup should not behave as a hard brake.
        if (speed >= definition.rimFadeSpeed) return { x: 0, y: 0 };
        const t = Math.max(0, Math.min(1, 1 - distance / definition.rimRadius));
        const proximity = t * t * (3 - 2 * t);
        const speedWeight = speed <= definition.rimFullEffectSpeed ? 1 :
            (definition.rimFadeSpeed - speed) /
            (definition.rimFadeSpeed - definition.rimFullEffectSpeed);
        const step = Math.min(deltaTime, 1 / 30);
        const weight = proximity * speedWeight;
        // Exponential damping is frame-rate independent and cannot reverse velocity.
        const damping = 1 - Math.exp(-definition.rimDampingPerSecond * weight * step);
        const nx = dx / distance;
        const ny = dy / distance;
        const inwardSpeed = velocityX * nx + velocityY * ny;
        // Steer primarily sideways. AttractionSystem handles radial pull.
        const lateralX = velocityX - inwardSpeed * nx;
        const lateralY = velocityY - inwardSpeed * ny;
        const lateralSpeed = Math.hypot(lateralX, lateralY);
        const steer = Math.min(lateralSpeed, definition.rimSteeringAcceleration * weight * step);
        return {
            x: -velocityX * damping - (lateralSpeed > 0.001 ? lateralX / lateralSpeed * steer : 0),
            y: -velocityY * damping - (lateralSpeed > 0.001 ? lateralY / lateralSpeed * steer : 0),
        };
    }
}

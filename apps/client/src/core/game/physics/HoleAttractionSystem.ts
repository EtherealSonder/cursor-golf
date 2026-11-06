import type { HoleDefinition } from "../config/HoleDefinition";

/** Smooth, bounded steering applied before the Ball integrates its position. */
export class HoleAttractionSystem {
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
        if (distance <= 0.001 || distance >= definition.attractionRadius) return { x: 0, y: 0 };
        const speed = Math.hypot(velocityX, velocityY);
        if (speed >= definition.attractionFadeSpeed) return { x: 0, y: 0 };
        const nx = dx / distance;
        const ny = dy / distance;
        const t = Math.max(0, Math.min(1, 1 - distance / definition.attractionRadius));
        const spatialWeight = t * t * (3 - 2 * t);
        const speedWeight = speed <= definition.attractionFullSpeed ? 1 :
            Math.max(0, (definition.attractionFadeSpeed - speed) /
                Math.max(0.001, definition.attractionFadeSpeed - definition.attractionFullSpeed));
        const alignment = speed > 0.001 ? (velocityX * nx + velocityY * ny) / speed : 0;
        const departureWeight = alignment < 0 ?
            definition.attractionDepartureFactor + (1 - definition.attractionDepartureFactor) * (1 + alignment) : 1;
        // Prevent the cup from waking a stationary ball from a distance.
        if (speed < 0.5 && distance > definition.visualRadius + 12) return { x: 0, y: 0 };
        const acceleration = definition.attractionMaxAcceleration * spatialWeight * speedWeight * departureWeight;
        const step = Math.min(Math.max(0, deltaTime), 1 / 30);
        return { x: nx * acceleration * step, y: ny * acceleration * step };
    }
}

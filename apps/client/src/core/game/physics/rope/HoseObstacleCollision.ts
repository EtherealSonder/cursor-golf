import type { StaticObstacleDefinition } from "../../config/ObstacleDefinition";
import type { DynamicCollidable } from "../DynamicCollidable";
import { detectBallObstacleCollision, detectBallDynamicObstacleCollision } from "../StaticObstacleCollision";
import type { HoseRope } from "./HoseRope";

export interface HoseObstacleContact {
    readonly segmentIndex: number;
    readonly interpolation: number;
    readonly normalX: number;
    readonly normalY: number;
    readonly penetrationDepth: number;
}

/**
 * Geometry adapter between the segmented Hose and ordinary gameplay colliders.
 * Each rope segment is sampled as a chain of small circles. The sample spacing
 * is bounded by the Hose diameter so adjacent samples overlap and do not leave
 * gaps that small mechanisms can tunnel through.
 */
export class HoseObstacleCollision {
    public findDeepestStaticContact(
        rope: HoseRope,
        obstacle: StaticObstacleDefinition,
        hoseRadius: number,
    ): HoseObstacleContact | null {
        return this.findDeepestContact(
            rope,
            hoseRadius,
            (x, y, radius) => detectBallObstacleCollision(x, y, radius, obstacle),
        );
    }

    public findDeepestDynamicContact(
        rope: HoseRope,
        obstacle: DynamicCollidable,
        hoseRadius: number,
    ): HoseObstacleContact | null {
        const definition = obstacle.getDefinition();
        return this.findDeepestContact(
            rope,
            hoseRadius,
            (x, y, radius) => detectBallDynamicObstacleCollision(
                x,
                y,
                radius,
                obstacle.getX(),
                obstacle.getY(),
                obstacle.getRotationRadians(),
                definition,
            ),
        );
    }

    private findDeepestContact(
        rope: HoseRope,
        hoseRadius: number,
        query: (
            x: number,
            y: number,
            radius: number,
        ) => { readonly normalX: number; readonly normalY: number; readonly penetrationDepth: number } | null,
    ): HoseObstacleContact | null {
        const points = rope.getPoints();
        let deepest: HoseObstacleContact | null = null;

        for (let segmentIndex = 0; segmentIndex < points.length - 1; segmentIndex += 1) {
            const a = points[segmentIndex]!;
            const b = points[segmentIndex + 1]!;
            const length = Math.hypot(b.x - a.x, b.y - a.y);
            const sampleSpacing = Math.max(1, hoseRadius * 1.5);
            const sampleCount = Math.max(1, Math.ceil(length / sampleSpacing));

            for (let sampleIndex = 0; sampleIndex <= sampleCount; sampleIndex += 1) {
                const interpolation = sampleIndex / sampleCount;
                const x = a.x + (b.x - a.x) * interpolation;
                const y = a.y + (b.y - a.y) * interpolation;
                const manifold = query(x, y, hoseRadius);
                if (!manifold || manifold.penetrationDepth <= 0) continue;

                const contact: HoseObstacleContact = {
                    segmentIndex,
                    interpolation,
                    normalX: manifold.normalX,
                    normalY: manifold.normalY,
                    penetrationDepth: manifold.penetrationDepth,
                };

                if (!deepest || contact.penetrationDepth > deepest.penetrationDepth) {
                    deepest = contact;
                }
            }
        }

        return deepest;
    }
}

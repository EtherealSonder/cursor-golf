export interface DynamicCollisionManifold {
    readonly obstacleId: string;

    /**
     * Unit normal pointing from the obstacle
     * toward the Ball.
     */
    readonly normalX: number;
    readonly normalY: number;

    readonly penetrationDepth: number;

    /**
     * World-space point where the collision
     * impulse is applied.
     */
    readonly contactPointX: number;
    readonly contactPointY: number;

    readonly restitution: number;
    readonly friction: number;
}

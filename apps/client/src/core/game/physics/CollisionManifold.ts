export interface CollisionManifold {
    readonly obstacleId: string;

    /** Unit normal pointing from the obstacle toward the Ball. */
    readonly normalX: number;
    readonly normalY: number;

    /** Distance the Ball must move along the normal to separate. */
    readonly penetrationDepth: number;

    readonly restitution: number;
    readonly collisionFriction: number;
}
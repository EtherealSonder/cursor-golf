/** Metadata shared by continuous airborne-Water obstacle shapes. */
export interface AirborneWaterObstacleOwnership {
    /** Stable registration/debug identity. */
    readonly colliderId?: string;

    /**
     * Water sources owned by this collider. Packets from these sources ignore
     * this shape, allowing Water to leave its own emitter without an immediate
     * fraction-zero self collision. Foreign Water still collides normally.
     */
    readonly ownerSourceIds?: readonly string[];
}

export interface RectangleAirborneWaterObstacleShape extends AirborneWaterObstacleOwnership {
    readonly kind: "rectangle";
    readonly centerX: number;
    readonly centerY: number;
    readonly width: number;
    readonly height: number;
}

export interface OrientedRectangleAirborneWaterObstacleShape extends AirborneWaterObstacleOwnership {
    readonly kind: "orientedRectangle";
    readonly centerX: number;
    readonly centerY: number;
    readonly width: number;
    readonly height: number;
    readonly rotationRadians: number;
}

export interface CircleAirborneWaterObstacleShape extends AirborneWaterObstacleOwnership {
    readonly kind: "circle";
    readonly centerX: number;
    readonly centerY: number;
    readonly radius: number;
}

export type AirborneWaterObstacleShape =
    | RectangleAirborneWaterObstacleShape
    | OrientedRectangleAirborneWaterObstacleShape
    | CircleAirborneWaterObstacleShape;

export interface AirborneWaterCollisionHit {
    readonly positionX: number;
    readonly positionY: number;
    readonly normalX: number;
    readonly normalY: number;
    readonly fraction: number;
    readonly colliderId?: string;
}

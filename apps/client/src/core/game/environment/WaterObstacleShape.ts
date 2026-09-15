export interface RectangleWaterObstacleShape {
    readonly kind: "rectangle";
    readonly centerX: number;
    readonly centerY: number;
    readonly width: number;
    readonly height: number;
}

export interface OrientedRectangleWaterObstacleShape {
    readonly kind: "orientedRectangle";
    readonly centerX: number;
    readonly centerY: number;
    readonly width: number;
    readonly height: number;
    readonly rotationRadians: number;
}

export interface CircleWaterObstacleShape {
    readonly kind: "circle";
    readonly centerX: number;
    readonly centerY: number;
    readonly radius: number;
}

export type WaterObstacleShape =
    | RectangleWaterObstacleShape
    | OrientedRectangleWaterObstacleShape
    | CircleWaterObstacleShape;

export interface Vector2Like {
    readonly x: number;
    readonly y: number;
}

export interface MutableVector2 {
    x: number;
    y: number;
}

export const PHYSICS_EPSILON = 0.000001;

export function dot(
    firstX: number,
    firstY: number,
    secondX: number,
    secondY: number,
): number {

    return (
        firstX * secondX +
        firstY * secondY
    );
}

export function crossVectorVector(
    firstX: number,
    firstY: number,
    secondX: number,
    secondY: number,
): number {

    return (
        firstX * secondY -
        firstY * secondX
    );
}

export function crossScalarVector(
    scalar: number,
    vectorX: number,
    vectorY: number,
): MutableVector2 {

    return {
        x:
            -scalar *
            vectorY,

        y:
            scalar *
            vectorX,
    };
}

export function magnitude(
    x: number,
    y: number,
): number {

    return Math.hypot(
        x,
        y,
    );
}

export function normalize(
    x: number,
    y: number,
    fallbackX = 1,
    fallbackY = 0,
): MutableVector2 {

    const length =
        magnitude(
            x,
            y,
        );

    if (
        length <=
        PHYSICS_EPSILON
    ) {
        return {
            x: fallbackX,
            y: fallbackY,
        };
    }

    return {
        x:
            x /
            length,

        y:
            y /
            length,
    };
}

export function clampMagnitude(
    x: number,
    y: number,
    maximumMagnitude: number,
): MutableVector2 {

    const currentMagnitude =
        magnitude(
            x,
            y,
        );

    if (
        currentMagnitude <=
        maximumMagnitude ||
        currentMagnitude <=
        PHYSICS_EPSILON
    ) {
        return {
            x,
            y,
        };
    }

    const scale =
        maximumMagnitude /
        currentMagnitude;

    return {
        x:
            x *
            scale,

        y:
            y *
            scale,
    };
}

export function rotatePoint(
    localX: number,
    localY: number,
    rotationRadians: number,
): MutableVector2 {

    const cosine =
        Math.cos(
            rotationRadians,
        );

    const sine =
        Math.sin(
            rotationRadians,
        );

    return {
        x:
            localX * cosine -
            localY * sine,

        y:
            localX * sine +
            localY * cosine,
    };
}

export function inverseRotatePoint(
    worldX: number,
    worldY: number,
    rotationRadians: number,
): MutableVector2 {

    return rotatePoint(
        worldX,
        worldY,
        -rotationRadians,
    );
}

export function calculateRectangleMomentOfInertia(
    mass: number,
    width: number,
    height: number,
): number {

    return (
        mass *
        (
            width * width +
            height * height
        ) /
        12
    );
}

export function calculateSolidCircleMomentOfInertia(
    mass: number,
    radius: number,
): number {

    return (
        mass *
        radius *
        radius /
        2
    );
}

export function calculateTriangleMomentOfInertia(
    mass: number,
    points: readonly Vector2Like[],
): number {

    if (points.length !== 3) {
        throw new Error(
            "Triangle inertia requires exactly three points.",
        );
    }

    let crossSum = 0;
    let weightedSum = 0;

    for (
        let index = 0;
        index < 3;
        index += 1
    ) {
        const current =
            points[index];

        const next =
            points[
            (index + 1) %
            3
            ];

        const edgeCross =
            crossVectorVector(
                current.x,
                current.y,
                next.x,
                next.y,
            );

        crossSum +=
            edgeCross;

        weightedSum +=
            edgeCross *
            (
                dot(
                    current.x,
                    current.y,
                    current.x,
                    current.y,
                ) +
                dot(
                    current.x,
                    current.y,
                    next.x,
                    next.y,
                ) +
                dot(
                    next.x,
                    next.y,
                    next.x,
                    next.y,
                )
            );
    }

    if (
        Math.abs(
            crossSum,
        ) <=
        PHYSICS_EPSILON
    ) {
        throw new Error(
            "Triangle points must form a non-degenerate polygon.",
        );
    }

    return (
        mass *
        Math.abs(
            weightedSum /
            (
                6 *
                crossSum
            ),
        )
    );
}

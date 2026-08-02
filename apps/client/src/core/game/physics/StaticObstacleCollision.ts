import type {
    CircleObstacleDefinition,
    DynamicObstacleDefinition,
    RectangleObstacleDefinition,
    StaticObstacleDefinition,
    TriangleObstacleDefinition,
    TrianglePointDefinition,
} from "../config/ObstacleDefinition";

import type {
    CollisionManifold,
} from "./CollisionManifold";

import type {
    DynamicCollisionManifold,
} from "./DynamicCollisionManifold";

interface Point2D {
    readonly x: number;
    readonly y: number;
}

interface CirclePolygonCollisionGeometry {
    readonly normalX: number;
    readonly normalY: number;
    readonly penetrationDepth: number;
    readonly contactPointX: number;
    readonly contactPointY: number;
}

const EPSILON = 0.000001;

export function detectBallObstacleCollision(
    ballX: number,
    ballY: number,
    ballRadius: number,
    obstacle: StaticObstacleDefinition,
): CollisionManifold | null {

    switch (obstacle.shape) {
        case "rectangle":
            return detectStaticCircleRectangleCollision(
                ballX,
                ballY,
                ballRadius,
                obstacle,
            );

        case "circle":
            return detectStaticCircleCircleCollision(
                ballX,
                ballY,
                ballRadius,
                obstacle,
            );

        case "triangle":
            return detectStaticCircleTriangleCollision(
                ballX,
                ballY,
                ballRadius,
                obstacle,
            );
    }
}

export function detectBallDynamicObstacleCollision(
    ballX: number,
    ballY: number,
    ballRadius: number,
    obstacleX: number,
    obstacleY: number,
    obstacleRotationRadians: number,
    obstacle: DynamicObstacleDefinition,
): DynamicCollisionManifold | null {

    let geometry:
        CirclePolygonCollisionGeometry | null;

    switch (obstacle.shape) {
        case "rectangle":
            geometry =
                detectCircleOrientedRectangleGeometry(
                    ballX,
                    ballY,
                    ballRadius,
                    obstacleX,
                    obstacleY,
                    obstacleRotationRadians,
                    obstacle.width,
                    obstacle.height,
                );
            break;

        case "circle":
            geometry =
                detectCircleCircleGeometry(
                    ballX,
                    ballY,
                    ballRadius,
                    obstacleX,
                    obstacleY,
                    obstacle.radius,
                );
            break;

        case "triangle":
            geometry =
                detectCircleTriangleGeometry(
                    ballX,
                    ballY,
                    ballRadius,
                    obstacleX,
                    obstacleY,
                    obstacleRotationRadians,
                    obstacle.points,
                );
            break;
    }

    if (!geometry) {
        return null;
    }

    return {
        obstacleId: obstacle.id,
        normalX: geometry.normalX,
        normalY: geometry.normalY,
        penetrationDepth: geometry.penetrationDepth,
        contactPointX: geometry.contactPointX,
        contactPointY: geometry.contactPointY,
        restitution: obstacle.material.restitution,
        friction: obstacle.material.friction,
    };
}

function detectStaticCircleRectangleCollision(
    ballX: number,
    ballY: number,
    ballRadius: number,
    obstacle: RectangleObstacleDefinition,
): CollisionManifold | null {

    const geometry =
        detectCircleOrientedRectangleGeometry(
            ballX,
            ballY,
            ballRadius,
            obstacle.positionX,
            obstacle.positionY,
            0,
            obstacle.width,
            obstacle.height,
        );

    return geometry
        ? createStaticManifold(
            obstacle,
            geometry,
        )
        : null;
}

function detectStaticCircleCircleCollision(
    ballX: number,
    ballY: number,
    ballRadius: number,
    obstacle: CircleObstacleDefinition,
): CollisionManifold | null {

    const geometry =
        detectCircleCircleGeometry(
            ballX,
            ballY,
            ballRadius,
            obstacle.positionX,
            obstacle.positionY,
            obstacle.radius,
        );

    return geometry
        ? createStaticManifold(
            obstacle,
            geometry,
        )
        : null;
}

function detectStaticCircleTriangleCollision(
    ballX: number,
    ballY: number,
    ballRadius: number,
    obstacle: TriangleObstacleDefinition,
): CollisionManifold | null {

    const geometry =
        detectCircleTriangleGeometry(
            ballX,
            ballY,
            ballRadius,
            obstacle.positionX,
            obstacle.positionY,
            0,
            obstacle.points,
        );

    return geometry
        ? createStaticManifold(
            obstacle,
            geometry,
        )
        : null;
}

function detectCircleOrientedRectangleGeometry(
    ballX: number,
    ballY: number,
    ballRadius: number,
    rectangleX: number,
    rectangleY: number,
    rotationRadians: number,
    width: number,
    height: number,
): CirclePolygonCollisionGeometry | null {

    const localBall = inverseRotatePoint(
        ballX - rectangleX,
        ballY - rectangleY,
        rotationRadians,
    );

    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const closestLocalX = clamp(
        localBall.x,
        -halfWidth,
        halfWidth,
    );

    const closestLocalY = clamp(
        localBall.y,
        -halfHeight,
        halfHeight,
    );

    const differenceX =
        localBall.x - closestLocalX;

    const differenceY =
        localBall.y - closestLocalY;

    const distanceSquared =
        differenceX * differenceX +
        differenceY * differenceY;

    if (
        distanceSquared >
        ballRadius * ballRadius
    ) {
        return null;
    }

    let localNormalX: number;
    let localNormalY: number;
    let penetrationDepth: number;
    let contactLocalX: number;
    let contactLocalY: number;

    if (distanceSquared > EPSILON) {
        const distance =
            Math.sqrt(distanceSquared);

        localNormalX =
            differenceX / distance;

        localNormalY =
            differenceY / distance;

        penetrationDepth =
            ballRadius - distance;

        contactLocalX = closestLocalX;
        contactLocalY = closestLocalY;
    } else {
        const distanceToLeft =
            localBall.x + halfWidth;

        const distanceToRight =
            halfWidth - localBall.x;

        const distanceToTop =
            localBall.y + halfHeight;

        const distanceToBottom =
            halfHeight - localBall.y;

        const nearestDistance =
            Math.min(
                distanceToLeft,
                distanceToRight,
                distanceToTop,
                distanceToBottom,
            );

        if (nearestDistance === distanceToLeft) {
            localNormalX = -1;
            localNormalY = 0;
            penetrationDepth =
                ballRadius + distanceToLeft;
            contactLocalX = -halfWidth;
            contactLocalY = localBall.y;
        } else if (
            nearestDistance === distanceToRight
        ) {
            localNormalX = 1;
            localNormalY = 0;
            penetrationDepth =
                ballRadius + distanceToRight;
            contactLocalX = halfWidth;
            contactLocalY = localBall.y;
        } else if (
            nearestDistance === distanceToTop
        ) {
            localNormalX = 0;
            localNormalY = -1;
            penetrationDepth =
                ballRadius + distanceToTop;
            contactLocalX = localBall.x;
            contactLocalY = -halfHeight;
        } else {
            localNormalX = 0;
            localNormalY = 1;
            penetrationDepth =
                ballRadius + distanceToBottom;
            contactLocalX = localBall.x;
            contactLocalY = halfHeight;
        }
    }

    const worldNormal = rotatePoint(
        localNormalX,
        localNormalY,
        rotationRadians,
    );

    const worldContact = rotatePoint(
        contactLocalX,
        contactLocalY,
        rotationRadians,
    );

    return {
        normalX: worldNormal.x,
        normalY: worldNormal.y,
        penetrationDepth:
            Math.max(0, penetrationDepth),
        contactPointX:
            rectangleX + worldContact.x,
        contactPointY:
            rectangleY + worldContact.y,
    };
}

function detectCircleCircleGeometry(
    ballX: number,
    ballY: number,
    ballRadius: number,
    obstacleX: number,
    obstacleY: number,
    obstacleRadius: number,
): CirclePolygonCollisionGeometry | null {

    const differenceX =
        ballX - obstacleX;

    const differenceY =
        ballY - obstacleY;

    const combinedRadius =
        ballRadius + obstacleRadius;

    const distanceSquared =
        differenceX * differenceX +
        differenceY * differenceY;

    if (
        distanceSquared >
        combinedRadius * combinedRadius
    ) {
        return null;
    }

    let normalX = 1;
    let normalY = 0;
    let distance = 0;

    if (distanceSquared > EPSILON) {
        distance = Math.sqrt(distanceSquared);
        normalX = differenceX / distance;
        normalY = differenceY / distance;
    }

    return {
        normalX,
        normalY,
        penetrationDepth:
            combinedRadius - distance,
        contactPointX:
            obstacleX + normalX * obstacleRadius,
        contactPointY:
            obstacleY + normalY * obstacleRadius,
    };
}

function detectCircleTriangleGeometry(
    ballX: number,
    ballY: number,
    ballRadius: number,
    obstacleX: number,
    obstacleY: number,
    rotationRadians: number,
    points: readonly TrianglePointDefinition[],
): CirclePolygonCollisionGeometry | null {

    const vertices = points.map(
        (
            point: TrianglePointDefinition,
        ): Point2D => {
            const rotated = rotatePoint(
                point.x,
                point.y,
                rotationRadians,
            );

            return {
                x: obstacleX + rotated.x,
                y: obstacleY + rotated.y,
            };
        },
    );

    const ballCenter: Point2D = {
        x: ballX,
        y: ballY,
    };

    const centerInside =
        isPointInsideTriangle(
            ballCenter,
            vertices[0],
            vertices[1],
            vertices[2],
        );

    let closestPoint: Point2D | null = null;
    let closestEdgeStart: Point2D | null = null;
    let closestEdgeEnd: Point2D | null = null;
    let closestDistanceSquared =
        Number.POSITIVE_INFINITY;

    for (
        let index = 0;
        index < 3;
        index += 1
    ) {
        const start = vertices[index];
        const end = vertices[(index + 1) % 3];

        const candidate =
            closestPointOnSegment(
                ballCenter,
                start,
                end,
            );

        const differenceX =
            ballX - candidate.x;

        const differenceY =
            ballY - candidate.y;

        const candidateDistanceSquared =
            differenceX * differenceX +
            differenceY * differenceY;

        if (
            candidateDistanceSquared <
            closestDistanceSquared
        ) {
            closestDistanceSquared =
                candidateDistanceSquared;
            closestPoint = candidate;
            closestEdgeStart = start;
            closestEdgeEnd = end;
        }
    }

    if (
        !closestPoint ||
        !closestEdgeStart ||
        !closestEdgeEnd
    ) {
        return null;
    }

    if (
        !centerInside &&
        closestDistanceSquared >
        ballRadius * ballRadius
    ) {
        return null;
    }

    const closestDistance =
        Math.sqrt(
            Math.max(
                0,
                closestDistanceSquared,
            ),
        );

    if (!centerInside) {
        if (closestDistance > EPSILON) {
            return {
                normalX:
                    (ballX - closestPoint.x) /
                    closestDistance,
                normalY:
                    (ballY - closestPoint.y) /
                    closestDistance,
                penetrationDepth:
                    ballRadius - closestDistance,
                contactPointX: closestPoint.x,
                contactPointY: closestPoint.y,
            };
        }

        const edgeNormal =
            calculateOutwardEdgeNormal(
                closestEdgeStart,
                closestEdgeEnd,
                vertices,
            );

        return {
            normalX: edgeNormal.x,
            normalY: edgeNormal.y,
            penetrationDepth: ballRadius,
            contactPointX: closestPoint.x,
            contactPointY: closestPoint.y,
        };
    }

    const edgeNormal =
        calculateOutwardEdgeNormal(
            closestEdgeStart,
            closestEdgeEnd,
            vertices,
        );

    return {
        normalX: edgeNormal.x,
        normalY: edgeNormal.y,
        penetrationDepth:
            ballRadius + closestDistance,
        contactPointX: closestPoint.x,
        contactPointY: closestPoint.y,
    };
}

function createStaticManifold(
    obstacle: StaticObstacleDefinition,
    geometry: CirclePolygonCollisionGeometry,
): CollisionManifold {

    return {
        obstacleId: obstacle.id,
        normalX: geometry.normalX,
        normalY: geometry.normalY,
        penetrationDepth:
            geometry.penetrationDepth,
        restitution:
            obstacle.material.restitution,
        collisionFriction:
            obstacle.material.collisionFriction,
    };
}

function calculateOutwardEdgeNormal(
    start: Point2D,
    end: Point2D,
    vertices: readonly Point2D[],
): Point2D {

    const edgeX = end.x - start.x;
    const edgeY = end.y - start.y;
    const edgeLength =
        Math.hypot(edgeX, edgeY);

    if (edgeLength <= EPSILON) {
        return { x: 1, y: 0 };
    }

    const signedAreaTwice =
        calculateSignedAreaTwice(vertices);

    if (signedAreaTwice > 0) {
        return {
            x: edgeY / edgeLength,
            y: -edgeX / edgeLength,
        };
    }

    return {
        x: -edgeY / edgeLength,
        y: edgeX / edgeLength,
    };
}

function calculateSignedAreaTwice(
    vertices: readonly Point2D[],
): number {

    let area = 0;

    for (
        let index = 0;
        index < vertices.length;
        index += 1
    ) {
        const current = vertices[index];
        const next =
            vertices[(index + 1) % vertices.length];

        area +=
            current.x * next.y -
            next.x * current.y;
    }

    return area;
}

function closestPointOnSegment(
    point: Point2D,
    start: Point2D,
    end: Point2D,
): Point2D {

    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;

    const lengthSquared =
        segmentX * segmentX +
        segmentY * segmentY;

    if (lengthSquared <= EPSILON) {
        return {
            x: start.x,
            y: start.y,
        };
    }

    const projection =
        (
            (point.x - start.x) * segmentX +
            (point.y - start.y) * segmentY
        ) /
        lengthSquared;

    const clampedProjection =
        clamp(projection, 0, 1);

    return {
        x:
            start.x +
            segmentX * clampedProjection,
        y:
            start.y +
            segmentY * clampedProjection,
    };
}

function isPointInsideTriangle(
    point: Point2D,
    a: Point2D,
    b: Point2D,
    c: Point2D,
): boolean {

    const crossAB = crossProduct(
        b.x - a.x,
        b.y - a.y,
        point.x - a.x,
        point.y - a.y,
    );

    const crossBC = crossProduct(
        c.x - b.x,
        c.y - b.y,
        point.x - b.x,
        point.y - b.y,
    );

    const crossCA = crossProduct(
        a.x - c.x,
        a.y - c.y,
        point.x - c.x,
        point.y - c.y,
    );

    const hasNegative =
        crossAB < -EPSILON ||
        crossBC < -EPSILON ||
        crossCA < -EPSILON;

    const hasPositive =
        crossAB > EPSILON ||
        crossBC > EPSILON ||
        crossCA > EPSILON;

    return !(hasNegative && hasPositive);
}

function rotatePoint(
    x: number,
    y: number,
    rotationRadians: number,
): Point2D {

    const cosine = Math.cos(rotationRadians);
    const sine = Math.sin(rotationRadians);

    return {
        x: x * cosine - y * sine,
        y: x * sine + y * cosine,
    };
}

function inverseRotatePoint(
    x: number,
    y: number,
    rotationRadians: number,
): Point2D {

    return rotatePoint(
        x,
        y,
        -rotationRadians,
    );
}

function crossProduct(
    ax: number,
    ay: number,
    bx: number,
    by: number,
): number {

    return ax * by - ay * bx;
}

function clamp(
    value: number,
    minimum: number,
    maximum: number,
): number {

    return Math.max(
        minimum,
        Math.min(value, maximum),
    );
}

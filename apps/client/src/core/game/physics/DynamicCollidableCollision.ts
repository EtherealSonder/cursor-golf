import type {
    DynamicRectangleObstacleDefinition,
} from "../config/ObstacleDefinition";

import type {
    DynamicCollidable,
} from "./DynamicCollidable";

import type {
    DynamicCollisionManifold,
} from "./DynamicCollisionManifold";

import {
    combineFriction,
    combineRestitution,
} from "./PhysicsMaterial";

interface Point2D {
    readonly x: number;
    readonly y: number;
}

interface Axis2D {
    readonly x: number;
    readonly y: number;
}

interface OrientedRectangle {
    readonly centerX: number;
    readonly centerY: number;
    readonly axisX: Axis2D;
    readonly axisY: Axis2D;
    readonly vertices: readonly Point2D[];
}

interface Projection {
    readonly minimum: number;
    readonly maximum: number;
}

const SUPPORT_EPSILON = 0.0001;

/**
 * Detects collision between two physical mechanism colliders.
 *
 * Phase G intentionally limits mechanism-to-mechanism collision to the
 * rectangle colliders currently used by Fan and FireTube. Ball collision
 * geometry remains in StaticObstacleCollision.ts and is unchanged.
 */
export function detectDynamicCollidableCollision(
    first:
        DynamicCollidable,

    second:
        DynamicCollidable,
): DynamicCollisionManifold | null {

    const firstDefinition =
        first.getDefinition();

    const secondDefinition =
        second.getDefinition();

    if (
        firstDefinition.shape !==
        "rectangle" ||
        secondDefinition.shape !==
        "rectangle"
    ) {
        return null;
    }

    const firstRectangle =
        createOrientedRectangle(
            first.getX(),
            first.getY(),
            first.getRotationRadians(),
            firstDefinition,
        );

    const secondRectangle =
        createOrientedRectangle(
            second.getX(),
            second.getY(),
            second.getRotationRadians(),
            secondDefinition,
        );

    const axes = [
        firstRectangle.axisX,
        firstRectangle.axisY,
        secondRectangle.axisX,
        secondRectangle.axisY,
    ];

    let minimumOverlap =
        Number.POSITIVE_INFINITY;

    let minimumAxis:
        Axis2D | null =
        null;

    for (
        const axis
        of axes
    ) {
        const firstProjection =
            projectRectangle(
                firstRectangle,
                axis,
            );

        const secondProjection =
            projectRectangle(
                secondRectangle,
                axis,
            );

        const overlap =
            Math.min(
                firstProjection.maximum,
                secondProjection.maximum,
            ) -
            Math.max(
                firstProjection.minimum,
                secondProjection.minimum,
            );

        if (overlap <= 0) {
            return null;
        }

        if (
            overlap <
            minimumOverlap
        ) {
            minimumOverlap =
                overlap;

            minimumAxis =
                axis;
        }
    }

    if (!minimumAxis) {
        return null;
    }

    /*
     * DynamicCollisionResponse expects its normal to point from the second
     * body toward the first body.
     */
    const centerDeltaX =
        first.getX() -
        second.getX();

    const centerDeltaY =
        first.getY() -
        second.getY();

    const axisDirection =
        centerDeltaX *
        minimumAxis.x +
        centerDeltaY *
        minimumAxis.y;

    const normalX =
        axisDirection >= 0
            ? minimumAxis.x
            : -minimumAxis.x;

    const normalY =
        axisDirection >= 0
            ? minimumAxis.y
            : -minimumAxis.y;

    const contactPoint =
        calculateContactPoint(
            firstRectangle,
            secondRectangle,
            normalX,
            normalY,
        );

    return {
        obstacleId:
            `${firstDefinition.id}<->${secondDefinition.id}`,

        normalX,
        normalY,

        penetrationDepth:
            minimumOverlap,

        contactPointX:
            contactPoint.x,

        contactPointY:
            contactPoint.y,

        restitution:
            combineRestitution(
                firstDefinition.material,
                secondDefinition.material,
            ),

        friction:
            combineFriction(
                firstDefinition.material,
                secondDefinition.material,
            ),
    };
}

function createOrientedRectangle(
    centerX:
        number,

    centerY:
        number,

    rotationRadians:
        number,

    definition:
        DynamicRectangleObstacleDefinition,
): OrientedRectangle {

    const cosine =
        Math.cos(
            rotationRadians,
        );

    const sine =
        Math.sin(
            rotationRadians,
        );

    const axisX: Axis2D = {
        x: cosine,
        y: sine,
    };

    const axisY: Axis2D = {
        x: -sine,
        y: cosine,
    };

    const halfWidth =
        definition.width / 2;

    const halfHeight =
        definition.height / 2;

    return {
        centerX,
        centerY,
        axisX,
        axisY,

        vertices: [
            createVertex(
                centerX,
                centerY,
                axisX,
                axisY,
                -halfWidth,
                -halfHeight,
            ),
            createVertex(
                centerX,
                centerY,
                axisX,
                axisY,
                halfWidth,
                -halfHeight,
            ),
            createVertex(
                centerX,
                centerY,
                axisX,
                axisY,
                halfWidth,
                halfHeight,
            ),
            createVertex(
                centerX,
                centerY,
                axisX,
                axisY,
                -halfWidth,
                halfHeight,
            ),
        ],
    };
}

function createVertex(
    centerX:
        number,

    centerY:
        number,

    axisX:
        Axis2D,

    axisY:
        Axis2D,

    localX:
        number,

    localY:
        number,
): Point2D {

    return {
        x:
            centerX +
            axisX.x *
            localX +
            axisY.x *
            localY,

        y:
            centerY +
            axisX.y *
            localX +
            axisY.y *
            localY,
    };
}

function projectRectangle(
    rectangle:
        OrientedRectangle,

    axis:
        Axis2D,
): Projection {

    let minimum =
        Number.POSITIVE_INFINITY;

    let maximum =
        Number.NEGATIVE_INFINITY;

    for (
        const vertex
        of rectangle.vertices
    ) {
        const projection =
            vertex.x *
            axis.x +
            vertex.y *
            axis.y;

        minimum =
            Math.min(
                minimum,
                projection,
            );

        maximum =
            Math.max(
                maximum,
                projection,
            );
    }

    return {
        minimum,
        maximum,
    };
}

/**
 * The existing impulse solver consumes one world-space contact point.
 *
 * For each rectangle we average every equally-extreme support vertex. This
 * yields a face centre for face contacts instead of arbitrarily selecting one
 * corner, while still preserving off-centre torque for corner impacts.
 */
function calculateContactPoint(
    first:
        OrientedRectangle,

    second:
        OrientedRectangle,

    normalX:
        number,

    normalY:
        number,
): Point2D {

    const firstSupport =
        getAverageSupportPoint(
            first,
            -normalX,
            -normalY,
        );

    const secondSupport =
        getAverageSupportPoint(
            second,
            normalX,
            normalY,
        );

    return {
        x:
            (
                firstSupport.x +
                secondSupport.x
            ) /
            2,

        y:
            (
                firstSupport.y +
                secondSupport.y
            ) /
            2,
    };
}

function getAverageSupportPoint(
    rectangle:
        OrientedRectangle,

    directionX:
        number,

    directionY:
        number,
): Point2D {

    let maximumProjection =
        Number.NEGATIVE_INFINITY;

    for (
        const vertex
        of rectangle.vertices
    ) {
        maximumProjection =
            Math.max(
                maximumProjection,
                vertex.x *
                directionX +
                vertex.y *
                directionY,
            );
    }

    let totalX = 0;
    let totalY = 0;
    let count = 0;

    for (
        const vertex
        of rectangle.vertices
    ) {
        const projection =
            vertex.x *
            directionX +
            vertex.y *
            directionY;

        if (
            maximumProjection -
            projection >
            SUPPORT_EPSILON
        ) {
            continue;
        }

        totalX +=
            vertex.x;

        totalY +=
            vertex.y;

        count += 1;
    }

    if (count <= 0) {
        return {
            x:
                rectangle.centerX,

            y:
                rectangle.centerY,
        };
    }

    return {
        x:
            totalX /
            count,

        y:
            totalY /
            count,
    };
}

import { PortalPerformanceDiagnosticController as PortalDiag } from "../debug/PortalPerformanceDiagnosticController";
import type {
    DynamicObstacleDefinition,
} from "../config/ObstacleDefinition";

import type {
    DynamicCollidable,
} from "./DynamicCollidable";

import type {
    DynamicCollisionManifold,
} from "./DynamicCollisionManifold";

import type {
    PhysicsMaterial,
} from "./PhysicsMaterial";

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
    readonly halfWidth: number;
    readonly halfHeight: number;
    readonly vertices: readonly Point2D[];
}

interface Projection {
    readonly minimum: number;
    readonly maximum: number;
}

export interface FixedRectangleCollisionShape {
    readonly id: string;
    readonly shape: "rectangle";
    readonly positionX: number;
    readonly positionY: number;
    readonly rotationRadians: number;
    readonly width: number;
    readonly height: number;
    readonly material: PhysicsMaterial;
}

export interface FixedCircleCollisionShape {
    readonly id: string;
    readonly shape: "circle";
    readonly positionX: number;
    readonly positionY: number;
    readonly radius: number;
    readonly material: PhysicsMaterial;
}

export type FixedCollisionShape =
    | FixedRectangleCollisionShape
    | FixedCircleCollisionShape;

const SUPPORT_EPSILON = 0.0001;
const GEOMETRY_EPSILON = 0.000001;

/** Conservative, rotation-invariant bounds for compound geometry. The local
 * primitives are immutable for portals, so cache by geometry-array identity. */
const compoundRadiusCache = new WeakMap<readonly import("./DynamicCollidable").DynamicCompoundPrimitive[], number>();

export function getCollidableBoundingRadius(body: DynamicCollidable): number {
    const compound = body.getCompoundCollisionGeometry?.();
    if (compound) {
        const cached = compoundRadiusCache.get(compound);
        if (cached !== undefined) return cached;
        let radius = 0;
        for (const primitive of compound) {
            if (primitive.kind === "capsule") {
                radius = Math.max(radius,
                    Math.hypot(primitive.x1, primitive.y1) + primitive.radius,
                    Math.hypot(primitive.x2, primitive.y2) + primitive.radius);
            } else {
                // Rectangle corners remain within this circle at every local angle.
                radius = Math.max(radius,
                    Math.hypot(primitive.x, primitive.y) +
                    Math.hypot(primitive.width, primitive.height) * 0.5);
            }
        }
        compoundRadiusCache.set(compound, radius);
        return radius;
    }
    const definition = body.getDefinition();
    if (definition.shape === "circle") return definition.radius;
    if (definition.shape === "rectangle") return Math.hypot(definition.width, definition.height) * 0.5;
    // Unsupported primitive: never reject it in the broad phase.
    return Number.POSITIVE_INFINITY;
}

/** Conservative, rotation-invariant fixed-shape radius. */
export function getFixedShapeBoundingRadius(shape: FixedCollisionShape): number {
    return shape.shape === "circle" ? shape.radius : Math.hypot(shape.width, shape.height) * 0.5;
}

/** A false result guarantees separation at every orientation of the dynamic body. */
export function mayCollidableOverlapFixed(body: DynamicCollidable, shape: FixedCollisionShape): boolean {
    const combined = getCollidableBoundingRadius(body) + getFixedShapeBoundingRadius(shape);
    const dx = body.getX() - shape.positionX;
    const dy = body.getY() - shape.positionY;
    return dx * dx + dy * dy <= combined * combined;
}

/** True means a pair MAY overlap. False guarantees separation. */
export function mayCollidablesOverlap(first: DynamicCollidable, second: DynamicCollidable): boolean {
    const sum = getCollidableBoundingRadius(first) + getCollidableBoundingRadius(second);
    const dx = first.getX() - second.getX();
    const dy = first.getY() - second.getY();
    const possible = dx * dx + dy * dy <= sum * sum;
    const diag = PortalDiag.active;
    if (diag && (first.getCompoundCollisionGeometry || second.getCompoundCollisionGeometry)) {
        diag.count("broadPhasePairsTested");
        diag.count(possible ? "broadPhasePairsAccepted" : "broadPhasePairsRejected");
    }
    return possible;
}


/**
 * General narrow-phase collision detection for the current sandbox collider
 * primitives. Object identity is deliberately irrelevant. Any
 * DynamicCollidable using a supported shape automatically participates.
 *
 * Supported pairs:
 * rectangle <-> rectangle
 * circle    <-> circle
 * circle    <-> rectangle
 *
 * Triangle support can be added here once, when a gameplay object actually
 * requires dynamic triangle collision. It does not require object-specific
 * pair logic.
 */
export function detectDynamicCollidableCollision(
    first: DynamicCollidable,
    second: DynamicCollidable,
): DynamicCollisionManifold | null {

    if (first.getCompoundCollisionGeometry || second.getCompoundCollisionGeometry) {
        if (!mayCollidablesOverlap(first, second)) return null;
        return detectCompoundPair(first, second);
    }
    return detectShapePair(
        first.getX(),
        first.getY(),
        first.getRotationRadians(),
        first.getDefinition(),
        second.getX(),
        second.getY(),
        second.getRotationRadians(),
        second.getDefinition(),
    );
}

/**
 * Dynamic-versus-fixed form of the same narrow phase. The returned normal
 * still points from the second body toward the first body, matching
 * DynamicCollisionResponse.
 */
export function detectDynamicCollidableAgainstFixedCollision(
    dynamic: DynamicCollidable,
    fixed: FixedCollisionShape,
): DynamicCollisionManifold | null {

    if (!mayCollidableOverlapFixed(dynamic, fixed)) return null;
    if (dynamic.getCompoundCollisionGeometry) {
        return detectCompoundAgainstFixed(dynamic, fixed);
    }
    const dynamicDefinition =
        dynamic.getDefinition();

    if (dynamicDefinition.shape === "triangle") {
        return null;
    }

    if (fixed.shape === "rectangle") {
        if (dynamicDefinition.shape === "rectangle") {
            return detectRectangleRectangle(
                dynamic.getX(),
                dynamic.getY(),
                dynamic.getRotationRadians(),
                dynamicDefinition,
                fixed.positionX,
                fixed.positionY,
                fixed.rotationRadians,
                fixed,
            );
        }

        return detectCircleRectangle(
            dynamic.getX(),
            dynamic.getY(),
            dynamicDefinition,
            fixed.positionX,
            fixed.positionY,
            fixed.rotationRadians,
            fixed,
            `${dynamicDefinition.id}<->${fixed.id}`,
            dynamicDefinition.material,
            fixed.material,
        );
    }

    if (dynamicDefinition.shape === "circle") {
        return detectCircleCircle(
            dynamic.getX(),
            dynamic.getY(),
            dynamicDefinition,
            fixed.positionX,
            fixed.positionY,
            fixed,
            `${dynamicDefinition.id}<->${fixed.id}`,
            dynamicDefinition.material,
            fixed.material,
        );
    }

    /*
     * Rectangle is the first body and circle is the second. Reuse the
     * circle-rectangle calculation with reversed bodies, then flip the normal.
     */
    const reversed =
        detectCircleRectangle(
            fixed.positionX,
            fixed.positionY,
            fixed,
            dynamic.getX(),
            dynamic.getY(),
            dynamic.getRotationRadians(),
            dynamicDefinition,
            `${fixed.id}<->${dynamicDefinition.id}`,
            fixed.material,
            dynamicDefinition.material,
        );

    if (!reversed) {
        return null;
    }

    return {
        ...reversed,
        obstacleId:
            `${dynamicDefinition.id}<->${fixed.id}`,
        normalX:
            -reversed.normalX,
        normalY:
            -reversed.normalY,
    };
}

function detectShapePair(
    firstX: number,
    firstY: number,
    firstRotation: number,
    firstDefinition: DynamicObstacleDefinition,
    secondX: number,
    secondY: number,
    secondRotation: number,
    secondDefinition: DynamicObstacleDefinition,
): DynamicCollisionManifold | null {

    if (
        firstDefinition.shape === "triangle" ||
        secondDefinition.shape === "triangle"
    ) {
        return null;
    }

    if (
        firstDefinition.shape === "rectangle" &&
        secondDefinition.shape === "rectangle"
    ) {
        return detectRectangleRectangle(
            firstX,
            firstY,
            firstRotation,
            firstDefinition,
            secondX,
            secondY,
            secondRotation,
            secondDefinition,
        );
    }

    if (
        firstDefinition.shape === "circle" &&
        secondDefinition.shape === "circle"
    ) {
        return detectCircleCircle(
            firstX,
            firstY,
            firstDefinition,
            secondX,
            secondY,
            secondDefinition,
            `${firstDefinition.id}<->${secondDefinition.id}`,
            firstDefinition.material,
            secondDefinition.material,
        );
    }

    if (
        firstDefinition.shape === "circle" &&
        secondDefinition.shape === "rectangle"
    ) {
        return detectCircleRectangle(
            firstX,
            firstY,
            firstDefinition,
            secondX,
            secondY,
            secondRotation,
            secondDefinition,
            `${firstDefinition.id}<->${secondDefinition.id}`,
            firstDefinition.material,
            secondDefinition.material,
        );
    }

    if (
        firstDefinition.shape === "rectangle" &&
        secondDefinition.shape === "circle"
    ) {
        const reversed =
            detectCircleRectangle(
                secondX,
                secondY,
                secondDefinition,
                firstX,
                firstY,
                firstRotation,
                firstDefinition,
                `${secondDefinition.id}<->${firstDefinition.id}`,
                secondDefinition.material,
                firstDefinition.material,
            );

        if (!reversed) {
            return null;
        }

        return {
            ...reversed,
            obstacleId:
                `${firstDefinition.id}<->${secondDefinition.id}`,
            normalX:
                -reversed.normalX,
            normalY:
                -reversed.normalY,
        };
    }

    return null;
}

function detectRectangleRectangle(
    firstX: number,
    firstY: number,
    firstRotation: number,
    firstDefinition: {
        readonly id: string;
        readonly width: number;
        readonly height: number;
        readonly material: PhysicsMaterial;
    },
    secondX: number,
    secondY: number,
    secondRotation: number,
    secondDefinition: {
        readonly id: string;
        readonly width: number;
        readonly height: number;
        readonly material: PhysicsMaterial;
    },
): DynamicCollisionManifold | null {

    const firstRectangle =
        createOrientedRectangle(
            firstX,
            firstY,
            firstRotation,
            firstDefinition,
        );

    const secondRectangle =
        createOrientedRectangle(
            secondX,
            secondY,
            secondRotation,
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

    for (const axis of axes) {
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

        if (overlap < minimumOverlap) {
            minimumOverlap = overlap;
            minimumAxis = axis;
        }
    }

    if (!minimumAxis) {
        return null;
    }

    const centerDeltaX =
        firstX -
        secondX;

    const centerDeltaY =
        firstY -
        secondY;

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
        calculateRectangleContactPoint(
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

function detectCircleCircle(
    firstX: number,
    firstY: number,
    firstDefinition: {
        readonly radius: number;
    },
    secondX: number,
    secondY: number,
    secondDefinition: {
        readonly radius: number;
    },
    obstacleId: string,
    firstMaterial: PhysicsMaterial,
    secondMaterial: PhysicsMaterial,
): DynamicCollisionManifold | null {

    const differenceX =
        firstX -
        secondX;

    const differenceY =
        firstY -
        secondY;

    const combinedRadius =
        firstDefinition.radius +
        secondDefinition.radius;

    const distanceSquared =
        differenceX *
        differenceX +
        differenceY *
        differenceY;

    if (
        distanceSquared >=
        combinedRadius *
        combinedRadius
    ) {
        return null;
    }

    let normalX = 1;
    let normalY = 0;
    let distance = 0;

    if (
        distanceSquared >
        GEOMETRY_EPSILON
    ) {
        distance =
            Math.sqrt(
                distanceSquared,
            );

        normalX =
            differenceX /
            distance;

        normalY =
            differenceY /
            distance;
    }

    const firstSurfaceX =
        firstX -
        normalX *
        firstDefinition.radius;

    const firstSurfaceY =
        firstY -
        normalY *
        firstDefinition.radius;

    const secondSurfaceX =
        secondX +
        normalX *
        secondDefinition.radius;

    const secondSurfaceY =
        secondY +
        normalY *
        secondDefinition.radius;

    return {
        obstacleId,
        normalX,
        normalY,
        penetrationDepth:
            combinedRadius -
            distance,
        contactPointX:
            (
                firstSurfaceX +
                secondSurfaceX
            ) / 2,
        contactPointY:
            (
                firstSurfaceY +
                secondSurfaceY
            ) / 2,
        restitution:
            combineRestitution(
                firstMaterial,
                secondMaterial,
            ),
        friction:
            combineFriction(
                firstMaterial,
                secondMaterial,
            ),
    };
}

function detectCircleRectangle(
    circleX: number,
    circleY: number,
    circleDefinition: {
        readonly radius: number;
    },
    rectangleX: number,
    rectangleY: number,
    rectangleRotation: number,
    rectangleDefinition: {
        readonly width: number;
        readonly height: number;
    },
    obstacleId: string,
    circleMaterial: PhysicsMaterial,
    rectangleMaterial: PhysicsMaterial,
): DynamicCollisionManifold | null {

    const rectangle =
        createOrientedRectangle(
            rectangleX,
            rectangleY,
            rectangleRotation,
            rectangleDefinition,
        );

    const offsetX =
        circleX -
        rectangleX;

    const offsetY =
        circleY -
        rectangleY;

    const localX =
        offsetX *
        rectangle.axisX.x +
        offsetY *
        rectangle.axisX.y;

    const localY =
        offsetX *
        rectangle.axisY.x +
        offsetY *
        rectangle.axisY.y;

    const closestLocalX =
        clamp(
            localX,
            -rectangle.halfWidth,
            rectangle.halfWidth,
        );

    const closestLocalY =
        clamp(
            localY,
            -rectangle.halfHeight,
            rectangle.halfHeight,
        );

    const closestWorldX =
        rectangleX +
        rectangle.axisX.x *
        closestLocalX +
        rectangle.axisY.x *
        closestLocalY;

    const closestWorldY =
        rectangleY +
        rectangle.axisX.y *
        closestLocalX +
        rectangle.axisY.y *
        closestLocalY;

    const differenceX =
        circleX -
        closestWorldX;

    const differenceY =
        circleY -
        closestWorldY;

    const distanceSquared =
        differenceX *
        differenceX +
        differenceY *
        differenceY;

    if (
        distanceSquared >
        circleDefinition.radius *
        circleDefinition.radius
    ) {
        return null;
    }

    let normalX: number;
    let normalY: number;
    let penetrationDepth: number;
    let contactPointX: number;
    let contactPointY: number;

    if (
        distanceSquared >
        GEOMETRY_EPSILON
    ) {
        const distance =
            Math.sqrt(
                distanceSquared,
            );

        normalX =
            differenceX /
            distance;

        normalY =
            differenceY /
            distance;

        penetrationDepth =
            circleDefinition.radius -
            distance;

        contactPointX =
            closestWorldX;

        contactPointY =
            closestWorldY;
    } else {
        const distanceToLeft =
            localX +
            rectangle.halfWidth;

        const distanceToRight =
            rectangle.halfWidth -
            localX;

        const distanceToTop =
            localY +
            rectangle.halfHeight;

        const distanceToBottom =
            rectangle.halfHeight -
            localY;

        const nearest =
            Math.min(
                distanceToLeft,
                distanceToRight,
                distanceToTop,
                distanceToBottom,
            );

        let localNormalX = 0;
        let localNormalY = 0;
        let faceLocalX = localX;
        let faceLocalY = localY;

        if (nearest === distanceToLeft) {
            localNormalX = -1;
            faceLocalX =
                -rectangle.halfWidth;
        } else if (
            nearest === distanceToRight
        ) {
            localNormalX = 1;
            faceLocalX =
                rectangle.halfWidth;
        } else if (
            nearest === distanceToTop
        ) {
            localNormalY = -1;
            faceLocalY =
                -rectangle.halfHeight;
        } else {
            localNormalY = 1;
            faceLocalY =
                rectangle.halfHeight;
        }

        normalX =
            rectangle.axisX.x *
            localNormalX +
            rectangle.axisY.x *
            localNormalY;

        normalY =
            rectangle.axisX.y *
            localNormalX +
            rectangle.axisY.y *
            localNormalY;

        penetrationDepth =
            circleDefinition.radius +
            nearest;

        contactPointX =
            rectangleX +
            rectangle.axisX.x *
            faceLocalX +
            rectangle.axisY.x *
            faceLocalY;

        contactPointY =
            rectangleY +
            rectangle.axisX.y *
            faceLocalX +
            rectangle.axisY.y *
            faceLocalY;
    }

    return {
        obstacleId,
        normalX,
        normalY,
        penetrationDepth,
        contactPointX,
        contactPointY,
        restitution:
            combineRestitution(
                circleMaterial,
                rectangleMaterial,
            ),
        friction:
            combineFriction(
                circleMaterial,
                rectangleMaterial,
            ),
    };
}

function createOrientedRectangle(
    centerX: number,
    centerY: number,
    rotationRadians: number,
    definition: {
        readonly width: number;
        readonly height: number;
    },
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
        halfWidth,
        halfHeight,
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
    centerX: number,
    centerY: number,
    axisX: Axis2D,
    axisY: Axis2D,
    localX: number,
    localY: number,
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
    rectangle: OrientedRectangle,
    axis: Axis2D,
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

function calculateRectangleContactPoint(
    first: OrientedRectangle,
    second: OrientedRectangle,
    normalX: number,
    normalY: number,
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
            ) / 2,
        y:
            (
                firstSupport.y +
                secondSupport.y
            ) / 2,
    };
}

function getAverageSupportPoint(
    rectangle: OrientedRectangle,
    directionX: number,
    directionY: number,
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

function clamp(
    value: number,
    minimum: number,
    maximum: number,
): number {

    return Math.max(
        minimum,
        Math.min(
            value,
            maximum,
        ),
    );
}

// P2-B2A: detection only. No new collision registrations or response calls.
// Expand each local-space compound shape into existing supported narrow-phase
// primitives, then select one manifold to avoid duplicate impulses at arc joints.
interface PrimitiveInstance {
    readonly partId?: string;
    readonly x: number; readonly y: number; readonly rotation: number;
    readonly definition: DynamicObstacleDefinition;
}
function getPrimitiveInstances(body: DynamicCollidable): PrimitiveInstance[] {
    const definition = body.getDefinition();
    const compound = body.getCompoundCollisionGeometry?.();
    if (!compound) return [{x:body.getX(),y:body.getY(),rotation:body.getRotationRadians(),definition}];
    const angle = body.getRotationRadians(), cos = Math.cos(angle), sin = Math.sin(angle);
    const transform = (x:number,y:number) => ({x:body.getX()+x*cos-y*sin,y:body.getY()+x*sin+y*cos});
    const instances: PrimitiveInstance[] = [];
    const add = (id:string,x:number,y:number,rotation:number,shape: "circle" | "rectangle",a:number,b=0,partId=id) => {
        const d: DynamicObstacleDefinition = shape === "circle"
            ? {...definition,id:`${definition.id}/${id}`,shape:"circle",radius:a}
            : {...definition,id:`${definition.id}/${id}`,shape:"rectangle",width:a,height:b};
        instances.push({x,y,rotation,definition:d,partId});
    };
    for (const primitive of compound) {
        if (primitive.kind === "rectangle") {
            const p = transform(primitive.x,primitive.y);
            add(primitive.id,p.x,p.y,angle+(primitive.rotationRadians??0),"rectangle",primitive.width,primitive.height);
        } else {
            const p1=transform(primitive.x1,primitive.y1),p2=transform(primitive.x2,primitive.y2);
            const dx=p2.x-p1.x,dy=p2.y-p1.y,length=Math.hypot(dx,dy);
            if (length>1e-6) add(primitive.id+"/spine",(p1.x+p2.x)/2,(p1.y+p2.y)/2,Math.atan2(dy,dx),"rectangle",length,primitive.radius*2,primitive.id);
            add(primitive.id+"/start",p1.x,p1.y,0,"circle",primitive.radius,0,primitive.id);
            add(primitive.id+"/end",p2.x,p2.y,0,"circle",primitive.radius,0,primitive.id);
        }
    }
    return instances;
}
function selectContact(best:DynamicCollisionManifold|null, candidate:DynamicCollisionManifold|null):DynamicCollisionManifold|null {
    return candidate && (!best || candidate.penetrationDepth>best.penetrationDepth) ? candidate : best;
}
/** Compound contact identity is optional metadata on the shared manifold contract. */
export type CompoundContactManifold = DynamicCollisionManifold & { readonly firstPartId?: string; readonly secondPartId?: string };
export function getCompoundContactPart(manifold: DynamicCollisionManifold, side: "first" | "second"): string | undefined {
    const contact = manifold as CompoundContactManifold;
    return side === "first" ? contact.firstPartId : contact.secondPartId;
}
function detectCompoundPair(first:DynamicCollidable,second:DynamicCollidable):DynamicCollisionManifold|null {
    let best:DynamicCollisionManifold|null=null;
    for (const a of getPrimitiveInstances(first)) for (const b of getPrimitiveInstances(second)) {
        PortalDiag.active?.count("compoundPrimitiveTests");
        const hit = detectShapePair(a.x,a.y,a.rotation,a.definition,b.x,b.y,b.rotation,b.definition);
        if (hit) PortalDiag.active?.count("compoundContacts");
        best=selectContact(best,hit ? {...hit,firstPartId:a.partId,secondPartId:b.partId} : null);
    }
    return best;
}
function detectCompoundAgainstFixed(dynamic:DynamicCollidable,fixed:FixedCollisionShape):DynamicCollisionManifold|null {
    let best:DynamicCollisionManifold|null=null;
    for (const a of getPrimitiveInstances(dynamic)) {
        const b:DynamicObstacleDefinition = fixed.shape === "circle"
            ? {...a.definition,id:fixed.id,shape:"circle",radius:fixed.radius,material:fixed.material}
            : {...a.definition,id:fixed.id,shape:"rectangle",width:fixed.width,height:fixed.height,material:fixed.material};
        PortalDiag.active?.count("compoundPrimitiveTests");
        const hit = detectShapePair(a.x,a.y,a.rotation,a.definition,fixed.positionX,fixed.positionY,fixed.shape==="rectangle"?fixed.rotationRadians:0,b);
        if (hit) PortalDiag.active?.count("compoundContacts");
        best=selectContact(best,hit ? {...hit,firstPartId:a.partId} : null);
    }
    return best;
}

/** C4: test a proposed orientation through the existing compound narrow phase. */
export function detectCompoundAtRotation(
    body: DynamicCollidable,
    rotation: number,
    fixed: FixedCollisionShape,
): DynamicCollisionManifold | null {
    const proxy: DynamicCollidable = {
        ...body,
        getDefinition: () => body.getDefinition(),
        getX: () => body.getX(),
        getY: () => body.getY(),
        getRotationRadians: () => rotation,
        getCompoundCollisionGeometry: () => body.getCompoundCollisionGeometry?.() ?? [],
        getVelocityX: () => body.getVelocityX(),
        getVelocityY: () => body.getVelocityY(),
        getAngularVelocity: () => body.getAngularVelocity(),
        getInverseMass: () => body.getInverseMass(),
        getInverseMomentOfInertia: () => body.getInverseMomentOfInertia(),
        applyImpulseAtWorldPoint: (ix,iy,x,y) => body.applyImpulseAtWorldPoint(ix,iy,x,y),
        translate: (dx,dy) => body.translate(dx,dy),
    };
    return detectDynamicCollidableAgainstFixedCollision(proxy, fixed);
}

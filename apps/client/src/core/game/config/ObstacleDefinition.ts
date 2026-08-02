import {
    DEFAULT_GAME_VIEWPORT_DEFINITION,
} from "./GameViewportDefinition";

import type {
    RigidBodyDefinition,
} from "./RigidBodyDefinition";

import type {
    PhysicsMaterial,
} from "../physics/PhysicsMaterial";

// -----------------------------------------------------------------------------
// Shared Shape Types
// -----------------------------------------------------------------------------

export type ObstacleShape =
    | "rectangle"
    | "triangle"
    | "circle";

/**
 * Compatibility alias retained for the working
 * Milestone 4A static-obstacle implementation.
 */
export type StaticObstacleShape =
    ObstacleShape;

// -----------------------------------------------------------------------------
// Static Obstacle Material
// -----------------------------------------------------------------------------

/**
 * Milestone 4A material format.
 *
 * StaticObstacleCollision.ts currently expects
 * collisionFriction rather than friction, so this
 * interface remains unchanged until that file is
 * updated during the next Milestone 4B step.
 */
export interface ObstaclePhysicsMaterial {

    /**
     * Percentage of normal impact speed preserved
     * after collision.
     *
     * Expected range:
     *
     * 0 = no bounce
     * 1 = fully elastic bounce
     */
    readonly restitution: number;

    /**
     * Percentage of tangential speed removed during
     * the Milestone 4A static collision response.
     */
    readonly collisionFriction: number;
}

// -----------------------------------------------------------------------------
// Triangle Geometry
// -----------------------------------------------------------------------------

export interface TrianglePointDefinition {
    readonly x: number;
    readonly y: number;
}

export type TrianglePointTuple = readonly [
    TrianglePointDefinition,
    TrianglePointDefinition,
    TrianglePointDefinition,
];

// -----------------------------------------------------------------------------
// Static Obstacle Definitions
// -----------------------------------------------------------------------------

interface StaticObstacleDefinitionBase {

    readonly id: string;

    readonly shape:
    StaticObstacleShape;

    readonly positionX: number;
    readonly positionY: number;

    readonly fillColor: number;
    readonly outlineColor: number;
    readonly outlineWidth: number;

    readonly material:
    ObstaclePhysicsMaterial;
}

export interface RectangleObstacleDefinition
    extends StaticObstacleDefinitionBase {

    readonly shape: "rectangle";

    readonly width: number;
    readonly height: number;
}

export interface TriangleObstacleDefinition
    extends StaticObstacleDefinitionBase {

    readonly shape: "triangle";

    /**
     * Triangle vertices expressed in local
     * coordinates relative to positionX and
     * positionY.
     */
    readonly points:
    TrianglePointTuple;
}

export interface CircleObstacleDefinition
    extends StaticObstacleDefinitionBase {

    readonly shape: "circle";

    readonly radius: number;
}

export type StaticObstacleDefinition =
    | RectangleObstacleDefinition
    | TriangleObstacleDefinition
    | CircleObstacleDefinition;

// -----------------------------------------------------------------------------
// Dynamic Obstacle Definitions
// -----------------------------------------------------------------------------

interface DynamicObstacleDefinitionBase {

    readonly id: string;

    readonly shape:
    ObstacleShape;

    readonly positionX: number;
    readonly positionY: number;

    /**
     * Initial world rotation in radians.
     *
     * Rectangle and triangle colliders will use
     * this value when their collision geometry is
     * upgraded for Milestone 4B.
     */
    readonly rotationRadians: number;

    readonly fillColor: number;
    readonly outlineColor: number;
    readonly outlineWidth: number;

    /**
     * Dynamic collision material.
     *
     * Unlike the Milestone 4A material, this uses
     * a friction coefficient for impulse-based
     * collision response.
     */
    readonly material:
    PhysicsMaterial;

    /**
     * Mass, damping, sleeping, and speed-limit
     * configuration for the obstacle.
     */
    readonly rigidBody:
    RigidBodyDefinition;
}

export interface DynamicRectangleObstacleDefinition
    extends DynamicObstacleDefinitionBase {

    readonly shape: "rectangle";

    readonly width: number;
    readonly height: number;
}

export interface DynamicTriangleObstacleDefinition
    extends DynamicObstacleDefinitionBase {

    readonly shape: "triangle";

    /**
     * Vertices expressed in local coordinates
     * relative to the obstacle center.
     */
    readonly points:
    TrianglePointTuple;
}

export interface DynamicCircleObstacleDefinition
    extends DynamicObstacleDefinitionBase {

    readonly shape: "circle";

    readonly radius: number;
}

export type DynamicObstacleDefinition =
    | DynamicRectangleObstacleDefinition
    | DynamicTriangleObstacleDefinition
    | DynamicCircleObstacleDefinition;

// -----------------------------------------------------------------------------
// Milestone 4A Static Test Layout
// -----------------------------------------------------------------------------

/**
 * Existing Milestone 4A layout.
 *
 * This remains available while Milestone 4B is
 * connected incrementally. World.ts currently
 * uses this collection.
 */
export const DEFAULT_STATIC_OBSTACLE_DEFINITIONS:
    readonly StaticObstacleDefinition[] = [

        {
            id: "test-rectangle",
            shape: "rectangle",

            positionX:
                DEFAULT_GAME_VIEWPORT_DEFINITION
                    .width *
                0.285,
            positionY:
                DEFAULT_GAME_VIEWPORT_DEFINITION
                    .height *
                0.3,

            width: 150,
            height: 70,

            fillColor: 0x4f6d7a,
            outlineColor: 0x263238,
            outlineWidth: 3,

            material: {
                restitution: 0.74,
                collisionFriction: 0.08,
            },
        },

        {
            id: "test-triangle",
            shape: "triangle",

            positionX:
                DEFAULT_GAME_VIEWPORT_DEFINITION
                    .width *
                0.73,
            positionY:
                DEFAULT_GAME_VIEWPORT_DEFINITION
                    .height *
                (205 / 600),

            points: [
                {
                    x: 0,
                    y: -65,
                },
                {
                    x: -72,
                    y: 55,
                },
                {
                    x: 72,
                    y: 55,
                },
            ],

            fillColor: 0xc96f3b,
            outlineColor: 0x5d2c12,
            outlineWidth: 3,

            material: {
                restitution: 0.82,
                collisionFriction: 0.05,
            },
        },

        {
            id: "test-circle",
            shape: "circle",

            positionX:
                DEFAULT_GAME_VIEWPORT_DEFINITION
                    .width *
                0.525,
            positionY:
                DEFAULT_GAME_VIEWPORT_DEFINITION
                    .height *
                (445 / 600),

            radius: 58,

            fillColor: 0x6f58a8,
            outlineColor: 0x30234f,
            outlineWidth: 3,

            material: {
                restitution: 0.68,
                collisionFriction: 0.12,
            },
        },
    ];

// -----------------------------------------------------------------------------
// Milestone 4B Dynamic Test Layout
// -----------------------------------------------------------------------------

/**
 * Dynamic replacements for the three Milestone 4A
 * test obstacles.
 *
 * Their positions and dimensions remain the same,
 * making it easier to compare static and dynamic
 * collision behaviour.
 *
 * The mass differences are intentional:
 *
 * Rectangle = medium-heavy
 * Triangle  = light
 * Circle    = heavy
 */
export const DEFAULT_DYNAMIC_OBSTACLE_DEFINITIONS:
    readonly DynamicObstacleDefinition[] = [

        {
            id: "dynamic-test-rectangle",
            shape: "rectangle",

            positionX:
                DEFAULT_GAME_VIEWPORT_DEFINITION
                    .width *
                0.285,
            positionY:
                DEFAULT_GAME_VIEWPORT_DEFINITION
                    .height *
                0.3,

            rotationRadians: 0,

            width: 150,
            height: 70,

            fillColor: 0x4f6d7a,
            outlineColor: 0x263238,
            outlineWidth: 3,

            material: {
                restitution: 0.72,
                friction: 0.20,
            },

            rigidBody: {
                bodyType: "dynamic",

                /*
                 * Medium-heavy body.
                 *
                 * It should move clearly when struck,
                 * but resist the Ball more than the
                 * triangle.
                 */
                mass: 60,

                linearDamping: 1.8,
                angularDamping: 2.6,

                sleepLinearSpeedThreshold: 4,
                sleepAngularSpeedThreshold: 0.08,
                sleepDelay: 0.50,

                maximumLinearSpeed: 700,
                maximumAngularSpeed: 8,
            },
        },

        {
            id: "dynamic-test-triangle",
            shape: "triangle",

            positionX:
                DEFAULT_GAME_VIEWPORT_DEFINITION
                    .width *
                0.73,
            positionY:
                DEFAULT_GAME_VIEWPORT_DEFINITION
                    .height *
                (205 / 600),

            rotationRadians: 0,

            points: [
                {
                    x: 0,
                    y: -65,
                },
                {
                    x: -72,
                    y: 55,
                },
                {
                    x: 72,
                    y: 55,
                },
            ],

            fillColor: 0xc96f3b,
            outlineColor: 0x5d2c12,
            outlineWidth: 3,

            material: {
                restitution: 0.80,
                friction: 0.14,
            },

            rigidBody: {
                bodyType: "dynamic",

                /*
                 * Light body.
                 *
                 * It should translate noticeably and
                 * gain visible angular velocity from
                 * off-center impacts.
                 */
                mass: 2,

                linearDamping: 1.6,
                angularDamping: 2.2,

                sleepLinearSpeedThreshold: 4,
                sleepAngularSpeedThreshold: 0.08,
                sleepDelay: 0.45,

                maximumLinearSpeed: 850,
                maximumAngularSpeed: 10,
            },
        },

        {
            id: "dynamic-test-circle",
            shape: "circle",

            positionX:
                DEFAULT_GAME_VIEWPORT_DEFINITION
                    .width *
                0.525,
            positionY:
                DEFAULT_GAME_VIEWPORT_DEFINITION
                    .height *
                (445 / 600),

            rotationRadians: 0,

            radius: 58,

            fillColor: 0x6f58a8,
            outlineColor: 0x30234f,
            outlineWidth: 3,

            material: {
                restitution: 0.66,
                friction: 0.24,
            },

            rigidBody: {
                bodyType: "dynamic",

                /*
                 * Heavy body.
                 *
                 * It should move less than the other
                 * obstacles while still responding to
                 * powerful direct impacts.
                 */
                mass: 10,

                linearDamping: 2,
                angularDamping: 2.8,

                sleepLinearSpeedThreshold: 4,
                sleepAngularSpeedThreshold: 0.08,
                sleepDelay: 0.55,

                maximumLinearSpeed: 600,
                maximumAngularSpeed: 7,
            },
        },
    ];
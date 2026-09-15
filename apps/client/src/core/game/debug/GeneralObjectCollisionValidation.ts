import type {
    DynamicObstacleDefinition,
} from "../config/ObstacleDefinition";

import type {
    DynamicCollidable,
} from "../physics/DynamicCollidable";

import {
    detectDynamicCollidableCollision,
    detectDynamicCollidableAgainstFixedCollision,
} from "../physics/DynamicCollidableCollision";

import type {
    FixedCollisionShape,
} from "../physics/DynamicCollidableCollision";

import {
    DynamicCollisionSystem,
} from "../physics/DynamicCollisionSystem";

import {
    DynamicStaticCollisionSystem,
} from "../physics/DynamicStaticCollisionSystem";

import {
    PhysicsWorld,
} from "../physics/PhysicsWorld";

interface ValidationResult {
    readonly name: string;
    readonly passed: boolean;
}

class ValidationCollidable
    implements DynamicCollidable {

    private velocityX = 0;
    private velocityY = 0;
    private angularVelocity = 0;

    public constructor(
        private positionX: number,
        private positionY: number,
        private rotationRadians: number,
        private readonly definition:
            DynamicObstacleDefinition,
    ) {
    }

    public getDefinition():
        DynamicObstacleDefinition {

        return this.definition;
    }

    public getX(): number {
        return this.positionX;
    }

    public getY(): number {
        return this.positionY;
    }

    public getRotationRadians(): number {
        return this.rotationRadians;
    }

    public getVelocityX(): number {
        return this.velocityX;
    }

    public getVelocityY(): number {
        return this.velocityY;
    }

    public getAngularVelocity(): number {
        return this.angularVelocity;
    }

    public getInverseMass(): number {
        return 1 /
            this.definition
                .rigidBody
                .mass;
    }

    public getInverseMomentOfInertia():
        number {

        return 1;
    }

    public applyImpulseAtWorldPoint(
        impulseX: number,
        impulseY: number,
        contactPointX: number,
        contactPointY: number,
    ): void {

        void contactPointX;
        void contactPointY;

        this.velocityX +=
            impulseX *
            this.getInverseMass();

        this.velocityY +=
            impulseY *
            this.getInverseMass();
    }

    public translate(
        deltaX: number,
        deltaY: number,
    ): void {

        this.positionX +=
            deltaX;

        this.positionY +=
            deltaY;
    }

    public setVelocity(
        x: number,
        y: number,
    ): void {

        this.velocityX = x;
        this.velocityY = y;
    }
}

const MATERIAL = {
    restitution: 0.4,
    friction: 0.2,
};

const RIGID_BODY = {
    bodyType: "dynamic" as const,
    mass: 2,
    linearDamping: 0,
    angularDamping: 0,
    sleepLinearSpeedThreshold: 0,
    sleepAngularSpeedThreshold: 0,
    sleepDelay: 1,
    maximumLinearSpeed: 1000,
    maximumAngularSpeed: 20,
};

function rectangleDefinition(
    id: string,
    width = 40,
    height = 30,
): DynamicObstacleDefinition {

    return {
        id,
        shape: "rectangle",
        positionX: 0,
        positionY: 0,
        rotationRadians: 0,
        width,
        height,
        fillColor: 0xffffff,
        outlineColor: 0x000000,
        outlineWidth: 0,
        material: MATERIAL,
        rigidBody: RIGID_BODY,
    };
}

function circleDefinition(
    id: string,
    radius = 15,
): DynamicObstacleDefinition {

    return {
        id,
        shape: "circle",
        positionX: 0,
        positionY: 0,
        rotationRadians: 0,
        radius,
        fillColor: 0xffffff,
        outlineColor: 0x000000,
        outlineWidth: 0,
        material: MATERIAL,
        rigidBody: RIGID_BODY,
    };
}

/**
 * Phase 8D-7D acceptance checks for the common object collision path.
 */
export class GeneralObjectCollisionValidation {

    public run(): boolean {
        const results: ValidationResult[] = [
            this.validateRectangleRectangle(),
            this.validateCircleCircle(),
            this.validateCircleRectangle(),
            this.validateDynamicSystem(),
            this.validateDynamicStaticRectangle(),
            this.validateHydrantStyleCircle(),
        ];

        for (
            const result
            of results
        ) {
            console.log(
                `[8D-7D] ${result.name}: ${result.passed ? "PASS" : "FAIL"}`,
            );
        }

        const passed =
            results.every(
                (
                    result:
                        ValidationResult,
                ): boolean =>
                    result.passed,
            );

        console.log(
            `[8D-7D] General Object Collision Integration: ${passed ? "PASS" : "FAIL"}`,
        );

        return passed;
    }

    private validateRectangleRectangle():
        ValidationResult {

        const first =
            new ValidationCollidable(
                0,
                0,
                Math.PI / 8,
                rectangleDefinition(
                    "rectangle-a",
                ),
            );

        const second =
            new ValidationCollidable(
                25,
                0,
                -Math.PI / 10,
                rectangleDefinition(
                    "rectangle-b",
                ),
            );

        return {
            name:
                "Rectangle vs Rectangle",
            passed:
                detectDynamicCollidableCollision(
                    first,
                    second,
                ) !== null,
        };
    }

    private validateCircleCircle():
        ValidationResult {

        const first =
            new ValidationCollidable(
                0,
                0,
                0,
                circleDefinition(
                    "circle-a",
                ),
            );

        const second =
            new ValidationCollidable(
                20,
                0,
                0,
                circleDefinition(
                    "circle-b",
                ),
            );

        return {
            name:
                "Circle vs Circle",
            passed:
                detectDynamicCollidableCollision(
                    first,
                    second,
                ) !== null,
        };
    }

    private validateCircleRectangle():
        ValidationResult {

        const circle =
            new ValidationCollidable(
                18,
                0,
                0,
                circleDefinition(
                    "circle",
                    12,
                ),
            );

        const rectangle =
            new ValidationCollidable(
                0,
                0,
                Math.PI / 6,
                rectangleDefinition(
                    "rectangle",
                    36,
                    28,
                ),
            );

        return {
            name:
                "Circle vs Rectangle",
            passed:
                detectDynamicCollidableCollision(
                    circle,
                    rectangle,
                ) !== null,
        };
    }

    private validateDynamicSystem():
        ValidationResult {

        const first =
            new ValidationCollidable(
                0,
                0,
                0,
                circleDefinition(
                    "sprinkler-style-a",
                    10,
                ),
            );

        const second =
            new ValidationCollidable(
                15,
                0,
                0,
                circleDefinition(
                    "sprinkler-style-b",
                    10,
                ),
            );

        first.setVelocity(
            80,
            0,
        );

        second.setVelocity(
            -20,
            0,
        );

        const beforeDistance =
            Math.abs(
                second.getX() -
                first.getX(),
            );

        const resolved =
            new DynamicCollisionSystem()
                .resolve([
                    first,
                    second,
                ]);

        const afterDistance =
            Math.abs(
                second.getX() -
                first.getX(),
            );

        return {
            name:
                "Dynamic Object vs Dynamic Object",
            passed:
                resolved > 0 &&
                afterDistance >
                beforeDistance,
        };
    }

    private validateDynamicStaticRectangle():
        ValidationResult {

        const dynamic =
            new ValidationCollidable(
                14,
                0,
                0,
                circleDefinition(
                    "dynamic-circle",
                    10,
                ),
            );

        const fixed:
            FixedCollisionShape = {
            id:
                "fixed-square",
            shape:
                "rectangle",
            positionX:
                0,
            positionY:
                0,
            rotationRadians:
                0,
            width:
                20,
            height:
                20,
            material:
                MATERIAL,
        };

        const beforeX =
            dynamic.getX();

        const manifold =
            detectDynamicCollidableAgainstFixedCollision(
                dynamic,
                fixed,
            );

        const physicsWorld =
            new PhysicsWorld();

        physicsWorld
            .registerDynamicCollidable(
                "8d7d-validation-dynamic",
                dynamic,
                {
                    participation: {
                        rigidBody:
                            true,
                        hose:
                            false,
                        groundWater:
                            false,
                        airborneWater:
                            false,
                    },
                },
            );

        physicsWorld
            .registerFixedShapeProvider(
                "8d7d-validation-fixed",
                () => fixed,
                {
                    participation: {
                        rigidBody:
                            true,
                        hose:
                            false,
                        groundWater:
                            false,
                        airborneWater:
                            false,
                    },
                },
            );

        const resolved =
            new DynamicStaticCollisionSystem()
                .resolve(
                    physicsWorld,
                );

        return {
            name:
                "Dynamic Object vs Static Object",
            passed:
                manifold !== null &&
                resolved > 0 &&
                dynamic.getX() >
                beforeX,
        };
    }

    private validateHydrantStyleCircle():
        ValidationResult {

        const dynamic =
            new ValidationCollidable(
                30,
                0,
                0,
                rectangleDefinition(
                    "fan-style",
                    20,
                    20,
                ),
            );

        const hydrant:
            FixedCollisionShape = {
            id:
                "hydrant-style",
            shape:
                "circle",
            positionX:
                0,
            positionY:
                0,
            radius:
                28,
            material: {
                restitution:
                    0.34,
                friction:
                    0.12,
            },
        };

        return {
            name:
                "Dynamic Object vs Hydrant Circle",
            passed:
                detectDynamicCollidableAgainstFixedCollision(
                    dynamic,
                    hydrant,
                ) !== null,
        };
    }
}

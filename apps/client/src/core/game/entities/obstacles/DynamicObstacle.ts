import {
    Container,
    Graphics,
} from "pixi.js";

import type {
    CourseBoundaryDefinition,
} from "../../config/CourseBoundaryDefinition";

import type {
    DynamicObstacleDefinition,
} from "../../config/ObstacleDefinition";

import {
    RigidBody2D,
} from "../../physics/RigidBody2D";

import {
    calculateRectangleMomentOfInertia,
    calculateSolidCircleMomentOfInertia,
    calculateTriangleMomentOfInertia,
} from "../../physics/RigidBodyMath";

import {
    Entity,
} from "../Entity";

export class DynamicObstacle extends Entity {

    private readonly definition:
        DynamicObstacleDefinition;

    private readonly courseBoundaryDefinition:
        CourseBoundaryDefinition;

    private readonly rigidBody:
        RigidBody2D;

    private visualContainer:
        Container | null = null;

    private graphics:
        Graphics | null = null;

    private rotationRadians = 0;

    constructor(
        definition:
            DynamicObstacleDefinition,

        courseBoundaryDefinition:
            CourseBoundaryDefinition,
    ) {
        super();

        this.definition =
            definition;

        this.courseBoundaryDefinition =
            courseBoundaryDefinition;

        this.rotationRadians =
            definition.rotationRadians;

        this.rigidBody =
            new RigidBody2D(
                definition.rigidBody,
                this.calculateMomentOfInertia(),
            );
    }

    protected onInitialize(): void {

        this.visualContainer =
            new Container();

        this.graphics =
            new Graphics();

        this.visualContainer.addChild(
            this.graphics,
        );

        this.container.addChild(
            this.visualContainer,
        );

        this.setPosition(
            this.definition.positionX,
            this.definition.positionY,
        );

        this.container.rotation =
            this.rotationRadians;

        this.drawObstacle();
    }

    protected onUpdate(
        deltaTime: number,
    ): void {

        const integration =
            this.rigidBody.integrate(
                deltaTime,
            );

        this.translate(
            integration.positionDeltaX,
            integration.positionDeltaY,
        );

        this.rotationRadians +=
            integration.rotationDelta;

        this.container.rotation =
            this.rotationRadians;

        this.resolveCourseBoundaryCollision();
    }

    protected onDestroy(): void {

        this.graphics?.destroy();

        this.graphics = null;
        this.visualContainer = null;

        this.container.destroy({
            children: true,
        });
    }

    public getDefinition():
        DynamicObstacleDefinition {

        return this.definition;
    }

    public getRigidBody():
        RigidBody2D {

        return this.rigidBody;
    }

    public getRotationRadians(): number {

        return this.rotationRadians;
    }

    public getVelocityX(): number {

        return this.rigidBody
            .getVelocityX();
    }

    public getVelocityY(): number {

        return this.rigidBody
            .getVelocityY();
    }

    public getAngularVelocity(): number {

        return this.rigidBody
            .getAngularVelocity();
    }

    public getInverseMass(): number {

        return this.rigidBody
            .getInverseMass();
    }

    public getInverseMomentOfInertia():
        number {

        return this.rigidBody
            .getInverseMomentOfInertia();
    }

    public applyImpulseAtWorldPoint(
        impulseX: number,
        impulseY: number,
        contactPointX: number,
        contactPointY: number,
    ): void {

        this.rigidBody
            .applyImpulseAtWorldPoint(
                impulseX,
                impulseY,
                contactPointX -
                this.getX(),
                contactPointY -
                this.getY(),
            );
    }

    public getBoundingRadius(): number {

        switch (
        this.definition.shape
        ) {
            case "rectangle":
                return Math.hypot(
                    this.definition.width / 2,
                    this.definition.height / 2,
                );

            case "circle":
                return this.definition.radius;

            case "triangle":
                return Math.max(
                    ...this.definition.points.map(
                        (
                            point,
                        ) =>
                            Math.hypot(
                                point.x,
                                point.y,
                            ),
                    ),
                );
        }
    }

    private calculateMomentOfInertia():
        number {

        const mass =
            this.definition
                .rigidBody
                .mass;

        switch (
        this.definition.shape
        ) {
            case "rectangle":
                return calculateRectangleMomentOfInertia(
                    mass,
                    this.definition.width,
                    this.definition.height,
                );

            case "circle":
                return calculateSolidCircleMomentOfInertia(
                    mass,
                    this.definition.radius,
                );

            case "triangle":
                return calculateTriangleMomentOfInertia(
                    mass,
                    this.definition.points,
                );
        }
    }

    private resolveCourseBoundaryCollision():
        void {

        if (
            this.rigidBody.isStatic()
        ) {
            return;
        }

        /*
         * Milestone 4B uses a conservative
         * bounding circle for obstacle-to-course
         * boundary collision. Shape-accurate
         * boundary contact can be added later.
         */
        const radius =
            this.getBoundingRadius();

        const minimumX =
            this.courseBoundaryDefinition
                .minimumX +
            radius;

        const maximumX =
            this.courseBoundaryDefinition
                .maximumX -
            radius;

        const minimumY =
            this.courseBoundaryDefinition
                .minimumY +
            radius;

        const maximumY =
            this.courseBoundaryDefinition
                .maximumY -
            radius;

        let correctedX =
            this.getX();

        let correctedY =
            this.getY();

        let velocityX =
            this.rigidBody
                .getVelocityX();

        let velocityY =
            this.rigidBody
                .getVelocityY();

        let collided = false;

        if (correctedX < minimumX) {
            correctedX = minimumX;

            if (velocityX < 0) {
                velocityX =
                    -velocityX *
                    this.definition
                        .material
                        .restitution;
            }

            collided = true;
        } else if (
            correctedX >
            maximumX
        ) {
            correctedX = maximumX;

            if (velocityX > 0) {
                velocityX =
                    -velocityX *
                    this.definition
                        .material
                        .restitution;
            }

            collided = true;
        }

        if (correctedY < minimumY) {
            correctedY = minimumY;

            if (velocityY < 0) {
                velocityY =
                    -velocityY *
                    this.definition
                        .material
                        .restitution;
            }

            collided = true;
        } else if (
            correctedY >
            maximumY
        ) {
            correctedY = maximumY;

            if (velocityY > 0) {
                velocityY =
                    -velocityY *
                    this.definition
                        .material
                        .restitution;
            }

            collided = true;
        }

        if (!collided) {
            return;
        }

        this.setPosition(
            correctedX,
            correctedY,
        );

        this.rigidBody.setVelocity(
            velocityX,
            velocityY,
        );

        this.rigidBody.setAngularVelocity(
            this.rigidBody
                .getAngularVelocity() *
            (
                1 -
                Math.min(
                    this.definition
                        .material
                        .friction,
                    1,
                )
            ),
        );
    }

    private drawObstacle(): void {

        if (!this.graphics) {
            return;
        }

        this.graphics.clear();

        switch (
        this.definition.shape
        ) {
            case "rectangle":
                this.graphics.rect(
                    -this.definition.width / 2,
                    -this.definition.height / 2,
                    this.definition.width,
                    this.definition.height,
                );
                break;

            case "circle":
                this.graphics.circle(
                    0,
                    0,
                    this.definition.radius,
                );
                break;

            case "triangle":
                this.graphics.poly(
                    this.definition.points.flatMap(
                        (
                            point,
                        ) => [
                                point.x,
                                point.y,
                            ],
                    ),
                );
                break;
        }

        this.graphics.fill(
            this.definition.fillColor,
        );

        this.graphics.stroke({
            color:
                this.definition
                    .outlineColor,

            width:
                this.definition
                    .outlineWidth,
        });
    }
}

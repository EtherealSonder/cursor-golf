import {
    Sprite,
} from "pixi.js";

import {
    DEFAULT_COURSE_BOUNDARY_DEFINITION,
} from "../../config/CourseBoundaryDefinition";

import {
    DEFAULT_FAN_DEFINITION,
} from "../../config/FanDefinition";

import type {
    CourseBoundaryDefinition,
} from "../../config/CourseBoundaryDefinition";

import type {
    FanDefinition,
} from "../../config/FanDefinition";

import type {
    LocalWindSourceDefinition,
} from "../../config/LocalWindDefinition";

import type {
    DynamicObstacleDefinition,
} from "../../config/ObstacleDefinition";

import type {
    LocalWindSystem,
} from "../../environment/LocalWindSystem";

import {
    calculateRectangleMomentOfInertia,
} from "../../physics/RigidBodyMath";

import {
    RigidBody2D,
} from "../../physics/RigidBody2D";

import {
    AssetLoader,
} from "../../../rendering/AssetLoader";

import {
    Entity,
} from "../Entity";

/**
 * Interactive physical Fan mechanism.
 *
 * The complete entity is authored facing right. Its rigid-body rotation is
 * the gameplay orientation and therefore drives the associated Local Wind
 * source. The internal rotor spin is presentation-only.
 */
export class Fan extends Entity {

    private readonly sourceDefinition:
        LocalWindSourceDefinition;

    private readonly localWindSystem:
        LocalWindSystem;

    private readonly definition:
        FanDefinition;

    private readonly courseBoundaryDefinition:
        CourseBoundaryDefinition;

    private readonly rigidBody:
        RigidBody2D;

    private readonly collisionDefinition:
        DynamicObstacleDefinition;

    private bodySprite:
        Sprite | null = null;

    private rotorSprite:
        Sprite | null = null;

    private rotationRadians = 0;

    constructor(
        sourceDefinition:
            LocalWindSourceDefinition,

        localWindSystem:
            LocalWindSystem,

        definition:
            FanDefinition =
            DEFAULT_FAN_DEFINITION,

        courseBoundaryDefinition:
            CourseBoundaryDefinition =
            DEFAULT_COURSE_BOUNDARY_DEFINITION,
    ) {
        super();

        this.validateSourceDefinition(
            sourceDefinition,
        );

        this.validateDefinition(
            definition,
        );

        this.sourceDefinition =
            sourceDefinition;

        this.localWindSystem =
            localWindSystem;

        this.definition =
            definition;

        this.courseBoundaryDefinition =
            courseBoundaryDefinition;

        this.rotationRadians =
            sourceDefinition
                .directionRadians;

        this.collisionDefinition = {
            id:
                `fan-${sourceDefinition.id}`,
            shape:
                "rectangle",
            positionX:
                sourceDefinition.positionX,
            positionY:
                sourceDefinition.positionY,
            rotationRadians:
                sourceDefinition.directionRadians,
            width:
                definition.colliderWidth,
            height:
                definition.colliderHeight,
            fillColor:
                0xffffff,
            outlineColor:
                0x000000,
            outlineWidth:
                0,
            material:
                definition.material,
            rigidBody:
                definition.rigidBody,
        };

        this.rigidBody =
            new RigidBody2D(
                definition.rigidBody,
                calculateRectangleMomentOfInertia(
                    definition.rigidBody.mass,
                    definition.colliderWidth,
                    definition.colliderHeight,
                ),
            );
    }

    public getSourceDefinition():
        LocalWindSourceDefinition {

        return this.sourceDefinition;
    }

    /**
     * DynamicCollidable contract. The definition exists only for collision
     * geometry/material data. Fan presentation remains Sprite-based.
     */
    public getDefinition():
        DynamicObstacleDefinition {

        return this.collisionDefinition;
    }

    public getRotationRadians(): number {
        return this.rotationRadians;
    }

    public getVelocityX(): number {
        return this.rigidBody.getVelocityX();
    }

    public getVelocityY(): number {
        return this.rigidBody.getVelocityY();
    }

    public getAngularVelocity(): number {
        return this.rigidBody.getAngularVelocity();
    }

    public getInverseMass(): number {
        return this.rigidBody.getInverseMass();
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

    protected onInitialize():
        void {

        /*
         * Existing Local Wind definitions describe the airflow origin. Place
         * the physical body behind that point so the new outlet aligns with
         * the previously authored source position.
         */
        const directionX =
            Math.cos(
                this.rotationRadians,
            );

        const directionY =
            Math.sin(
                this.rotationRadians,
            );

        this.setPosition(
            this.sourceDefinition
                .positionX -
            directionX *
            this.definition
                .windOutletOffset,
            this.sourceDefinition
                .positionY -
            directionY *
            this.definition
                .windOutletOffset,
        );

        this.container.rotation =
            this.rotationRadians;

        this.createSprites();
        this.resolveCourseBoundaryCollision();
        this.synchronizeWindSourceTransform();
    }

    protected onUpdate(
        deltaTime: number,
    ): void {

        const safeDeltaTime =
            Number.isFinite(deltaTime)
                ? Math.max(0, deltaTime)
                : 0;

        const integration =
            this.rigidBody.integrate(
                safeDeltaTime,
            );

        this.translate(
            integration.positionDeltaX,
            integration.positionDeltaY,
        );

        this.rotationRadians +=
            integration.rotationDelta;

        this.rotationRadians =
            this.normalizeRadians(
                this.rotationRadians,
            );

        this.resolveCourseBoundaryCollision();

        this.container.rotation =
            this.rotationRadians;

        if (
            this.rotorSprite &&
            this.sourceDefinition.enabled
        ) {
            this.rotorSprite.rotation +=
                this.definition
                    .rotorRotationSpeed *
                safeDeltaTime;
        }

        this.synchronizeWindSourceTransform();
    }

    protected onDestroy():
        void {

        this.bodySprite?.destroy();
        this.rotorSprite?.destroy();

        this.bodySprite = null;
        this.rotorSprite = null;

        this.container.destroy({
            children: true,
        });
    }

    private createSprites():
        void {

        this.rotorSprite =
            new Sprite(
                AssetLoader.getTexture(
                    this.definition
                        .rotorTextureKey,
                ),
            );

        this.rotorSprite.anchor.set(
            0.5,
        );

        this.rotorSprite.width =
            this.definition
                .rotorRenderSize;

        this.rotorSprite.height =
            this.definition
                .rotorRenderSize;

        this.rotorSprite.position.set(
            this.definition
                .rotorOffsetX,
            this.definition
                .rotorOffsetY,
        );

        this.bodySprite =
            new Sprite(
                AssetLoader.getTexture(
                    this.definition
                        .bodyTextureKey,
                ),
            );

        this.bodySprite.anchor.set(
            0.5,
        );

        this.bodySprite.width =
            this.definition
                .bodyRenderWidth;

        this.bodySprite.height =
            this.definition
                .bodyRenderHeight;

        /*
         * Body first, rotor second.
         *
         * The rotor is intentionally rendered above the body so the complete
         * blade shape remains clearly visible inside the Fan opening.
         */
        this.container.addChild(
            this.bodySprite,
        );

        this.container.addChild(
            this.rotorSprite,
        );
    }

    private synchronizeWindSourceTransform():
        void {

        const directionX =
            Math.cos(
                this.rotationRadians,
            );

        const directionY =
            Math.sin(
                this.rotationRadians,
            );

        const outletX =
            this.getX() +
            directionX *
            this.definition
                .windOutletOffset;

        const outletY =
            this.getY() +
            directionY *
            this.definition
                .windOutletOffset;

        const updated =
            this.localWindSystem
                .updateSourceTransform(
                    this.sourceDefinition.id,
                    outletX,
                    outletY,
                    this.rotationRadians,
                );

        if (!updated) {
            throw new Error(
                `Fan could not synchronize Local Wind source '${this.sourceDefinition.id}'.`,
            );
        }
    }

    private resolveCourseBoundaryCollision():
        void {

        const radius =
            Math.hypot(
                this.definition
                    .colliderWidth / 2,
                this.definition
                    .colliderHeight / 2,
            );

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

        let collided =
            false;

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
        } else if (correctedX > maximumX) {
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
        } else if (correctedY > maximumY) {
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

    private normalizeRadians(
        radians: number,
    ): number {

        const fullTurn =
            Math.PI * 2;

        return (
            (
                radians +
                Math.PI
            ) %
            fullTurn +
            fullTurn
        ) %
            fullTurn -
            Math.PI;
    }

    private validateSourceDefinition(
        definition:
            LocalWindSourceDefinition,
    ): void {

        if (
            definition.id.trim().length ===
            0
        ) {
            throw new Error(
                "Fan source id cannot be empty.",
            );
        }

        if (
            ![
                definition.positionX,
                definition.positionY,
                definition.directionRadians,
            ].every(Number.isFinite)
        ) {
            throw new Error(
                `Fan '${definition.id}' requires finite position and direction values.`,
            );
        }
    }

    private validateDefinition(
        definition:
            FanDefinition,
    ): void {

        if (
            definition.bodyTextureKey.trim().length === 0 ||
            definition.rotorTextureKey.trim().length === 0
        ) {
            throw new Error(
                "Fan texture keys cannot be empty.",
            );
        }

        const positiveValues = [
            definition.bodyRenderWidth,
            definition.bodyRenderHeight,
            definition.rotorRenderSize,
            definition.colliderWidth,
            definition.colliderHeight,
            definition.windOutletOffset,
        ];

        if (
            !positiveValues.every(
                (value) =>
                    Number.isFinite(value) &&
                    value > 0,
            ) ||
            !Number.isFinite(
                definition.rotorOffsetX,
            ) ||
            !Number.isFinite(
                definition.rotorOffsetY,
            ) ||
            !Number.isFinite(
                definition.rotorRotationSpeed,
            )
        ) {
            throw new Error(
                "Fan visual and collider values are invalid.",
            );
        }
    }
}

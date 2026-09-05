import {
    Sprite,
} from "pixi.js";

import {
    DEFAULT_COURSE_BOUNDARY_DEFINITION,
} from "../../config/CourseBoundaryDefinition";

import {
    DEFAULT_DIRECTIONAL_FIRE_SOURCE_DEFINITION,
} from "../../config/DirectionalFireSourceDefinition";

import {
    DEFAULT_FIRE_TUBE_DEFINITION,
} from "../../config/FireTubeDefinition";

import type {
    CourseBoundaryDefinition,
} from "../../config/CourseBoundaryDefinition";

import type {
    FireTubeDefinition,
} from "../../config/FireTubeDefinition";

import type {
    DynamicObstacleDefinition,
} from "../../config/ObstacleDefinition";

import {
    FireSourceType,
} from "../../config/FireSourceDefinition";

import type {
    FireSourceSystem,
} from "../../environment/FireSourceSystem";

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

type FireTubeCycleState =
    | "firing"
    | "cooldown";

/**
 * Physical autonomous Fire-spitting course mechanism.
 *
 * The Sprite and rigid body own only the mechanism transform. The associated
 * Directional FireSource remains the authoritative heat source, and existing
 * Fire simulation/VFX consume that source normally.
 */
export class FireTube extends Entity {

    private readonly sourceId: string;

    private readonly initialPositionX: number;
    private readonly initialPositionY: number;
    private readonly initialRotationRadians: number;

    private readonly fireSourceSystem:
        FireSourceSystem;

    private readonly definition:
        FireTubeDefinition;

    private readonly courseBoundaryDefinition:
        CourseBoundaryDefinition;

    private readonly rigidBody:
        RigidBody2D;

    private readonly collisionDefinition:
        DynamicObstacleDefinition;

    private sprite:
        Sprite | null = null;

    private rotationRadians: number;

    private cycleState:
        FireTubeCycleState =
        "cooldown";

    private cycleTimeRemaining = 0;

    constructor(
        sourceId: string,
        positionX: number,
        positionY: number,
        rotationRadians: number,
        fireSourceSystem: FireSourceSystem,
        definition: FireTubeDefinition =
            DEFAULT_FIRE_TUBE_DEFINITION,
        courseBoundaryDefinition: CourseBoundaryDefinition =
            DEFAULT_COURSE_BOUNDARY_DEFINITION,
    ) {
        super();

        this.validateConstructorValues(
            sourceId,
            positionX,
            positionY,
            rotationRadians,
            definition,
        );

        this.sourceId = sourceId;
        this.initialPositionX = positionX;
        this.initialPositionY = positionY;
        this.initialRotationRadians = rotationRadians;
        this.rotationRadians = rotationRadians;
        this.fireSourceSystem = fireSourceSystem;
        this.definition = definition;
        this.courseBoundaryDefinition =
            courseBoundaryDefinition;

        this.collisionDefinition = {
            id: `fire-tube-collider-${sourceId}`,
            shape: "rectangle",
            positionX,
            positionY,
            rotationRadians,
            width: definition.colliderWidth,
            height: definition.colliderHeight,
            fillColor: 0xffffff,
            outlineColor: 0x000000,
            outlineWidth: 0,
            material: definition.material,
            rigidBody: definition.rigidBody,
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

    public getInverseMomentOfInertia(): number {
        return this.rigidBody.getInverseMomentOfInertia();
    }

    public applyImpulseAtWorldPoint(
        impulseX: number,
        impulseY: number,
        contactPointX: number,
        contactPointY: number,
    ): void {

        this.rigidBody.applyImpulseAtWorldPoint(
            impulseX,
            impulseY,
            contactPointX - this.getX(),
            contactPointY - this.getY(),
        );
    }

    public resetCycle(): void {
        this.chooseRandomInitialCycleState();
        this.synchronizeFireSourceTransform();
        this.synchronizeFireSourceEnabledState();
    }

    protected onInitialize(): void {
        this.setPosition(
            this.initialPositionX,
            this.initialPositionY,
        );

        this.container.rotation =
            this.rotationRadians;

        this.createSprite();
        this.resolveCourseBoundaryCollision();

        const outlet =
            this.calculateOutletPosition();

        const tuning =
            DEFAULT_DIRECTIONAL_FIRE_SOURCE_DEFINITION;

        this.fireSourceSystem.addSource({
            id: this.sourceId,
            type: FireSourceType.Directional,
            enabled: false,
            positionX: outlet.x,
            positionY: outlet.y,
            directionRadians: this.rotationRadians,
            length: tuning.length,
            halfWidth: tuning.halfWidth,
            heatPerSecond: tuning.heatPerSecond,
            endHeatMultiplier: tuning.endHeatMultiplier,
        });

        this.resetCycle();
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

        this.updateCycle(
            safeDeltaTime,
        );

        this.synchronizeFireSourceTransform();
        this.synchronizeFireSourceEnabledState();
    }

    protected onDestroy(): void {
        this.fireSourceSystem.removeSource(
            this.sourceId,
        );

        this.sprite?.destroy();
        this.sprite = null;

        this.container.destroy({
            children: true,
        });
    }

    private createSprite(): void {
        this.sprite =
            new Sprite(
                AssetLoader.getTexture(
                    this.definition.textureKey,
                ),
            );

        this.sprite.anchor.set(0.5);
        this.sprite.width =
            this.definition.renderWidth;
        this.sprite.height =
            this.definition.renderHeight;

        this.container.addChild(
            this.sprite,
        );
    }

    private updateCycle(
        deltaTime: number,
    ): void {
        this.cycleTimeRemaining -=
            deltaTime;

        if (this.cycleTimeRemaining > 0) {
            return;
        }

        if (this.cycleState === "firing") {
            this.cycleState = "cooldown";
            this.cycleTimeRemaining =
                this.randomRange(
                    this.definition.minimumCooldownDuration,
                    this.definition.maximumCooldownDuration,
                );
        } else {
            this.cycleState = "firing";
            this.cycleTimeRemaining =
                this.randomRange(
                    this.definition.minimumFiringDuration,
                    this.definition.maximumFiringDuration,
                );
        }
    }

    private chooseRandomInitialCycleState(): void {
        this.cycleState =
            Math.random() < 0.5
                ? "firing"
                : "cooldown";

        const fullDuration =
            this.cycleState === "firing"
                ? this.randomRange(
                    this.definition.minimumFiringDuration,
                    this.definition.maximumFiringDuration,
                )
                : this.randomRange(
                    this.definition.minimumCooldownDuration,
                    this.definition.maximumCooldownDuration,
                );

        /* Start partway through the phase so multiple tubes are staggered. */
        this.cycleTimeRemaining =
            fullDuration *
            this.randomRange(
                0.15,
                1,
            );
    }

    private synchronizeFireSourceTransform(): void {
        const outlet =
            this.calculateOutletPosition();

        const positionUpdated =
            this.fireSourceSystem.setSourcePosition(
                this.sourceId,
                outlet.x,
                outlet.y,
            );

        const directionUpdated =
            this.fireSourceSystem.setSourceDirection(
                this.sourceId,
                this.rotationRadians,
            );

        if (
            !positionUpdated ||
            !directionUpdated
        ) {
            throw new Error(
                `FireTube could not synchronize Fire source '${this.sourceId}'.`,
            );
        }
    }

    private synchronizeFireSourceEnabledState(): void {
        const updated =
            this.fireSourceSystem.setSourceEnabled(
                this.sourceId,
                this.cycleState === "firing",
            );

        if (!updated) {
            throw new Error(
                `FireTube could not update Fire source '${this.sourceId}'.`,
            );
        }
    }

    private calculateOutletPosition(): {
        readonly x: number;
        readonly y: number;
    } {
        return {
            x:
                this.getX() +
                Math.cos(this.rotationRadians) *
                this.definition.fireOutletOffset,
            y:
                this.getY() +
                Math.sin(this.rotationRadians) *
                this.definition.fireOutletOffset,
        };
    }

    private resolveCourseBoundaryCollision(): void {
        const radius =
            Math.hypot(
                this.definition.colliderWidth / 2,
                this.definition.colliderHeight / 2,
            );

        const minimumX =
            this.courseBoundaryDefinition.minimumX +
            radius;
        const maximumX =
            this.courseBoundaryDefinition.maximumX -
            radius;
        const minimumY =
            this.courseBoundaryDefinition.minimumY +
            radius;
        const maximumY =
            this.courseBoundaryDefinition.maximumY -
            radius;

        let correctedX = this.getX();
        let correctedY = this.getY();
        let velocityX = this.rigidBody.getVelocityX();
        let velocityY = this.rigidBody.getVelocityY();
        let collided = false;

        if (correctedX < minimumX) {
            correctedX = minimumX;
            if (velocityX < 0) {
                velocityX =
                    -velocityX *
                    this.definition.material.restitution;
            }
            collided = true;
        } else if (correctedX > maximumX) {
            correctedX = maximumX;
            if (velocityX > 0) {
                velocityX =
                    -velocityX *
                    this.definition.material.restitution;
            }
            collided = true;
        }

        if (correctedY < minimumY) {
            correctedY = minimumY;
            if (velocityY < 0) {
                velocityY =
                    -velocityY *
                    this.definition.material.restitution;
            }
            collided = true;
        } else if (correctedY > maximumY) {
            correctedY = maximumY;
            if (velocityY > 0) {
                velocityY =
                    -velocityY *
                    this.definition.material.restitution;
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
            this.rigidBody.getAngularVelocity() *
            (
                1 -
                Math.min(
                    this.definition.material.friction,
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

    private randomRange(
        minimum: number,
        maximum: number,
    ): number {
        return (
            minimum +
            Math.random() *
            (maximum - minimum)
        );
    }

    private validateConstructorValues(
        sourceId: string,
        positionX: number,
        positionY: number,
        rotationRadians: number,
        definition: FireTubeDefinition,
    ): void {
        if (sourceId.trim().length === 0) {
            throw new Error(
                "FireTube source id cannot be empty.",
            );
        }

        if (
            ![
                positionX,
                positionY,
                rotationRadians,
            ].every(Number.isFinite)
        ) {
            throw new Error(
                `FireTube '${sourceId}' requires finite position and rotation values.`,
            );
        }

        const positiveValues = [
            definition.renderWidth,
            definition.renderHeight,
            definition.colliderWidth,
            definition.colliderHeight,
            definition.fireOutletOffset,
            definition.minimumFiringDuration,
            definition.maximumFiringDuration,
            definition.minimumCooldownDuration,
            definition.maximumCooldownDuration,
        ];

        if (
            definition.textureKey.trim().length === 0 ||
            positiveValues.some(
                (value): boolean =>
                    !Number.isFinite(value) ||
                    value <= 0,
            ) ||
            definition.minimumFiringDuration >
            definition.maximumFiringDuration ||
            definition.minimumCooldownDuration >
            definition.maximumCooldownDuration
        ) {
            throw new Error(
                `FireTube '${sourceId}' has an invalid definition.`,
            );
        }
    }
}

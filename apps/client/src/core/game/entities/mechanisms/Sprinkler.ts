import {
    DEFAULT_SPRINKLER_DEFINITION,
    validateSprinklerDefinition,
} from "../../config/SprinklerDefinition";

import type { SprinklerDefinition } from "../../config/SprinklerDefinition";
import { WaterSourceType } from "../../config/WaterSourceDefinition";
import type { WaterSourceSystem } from "../../environment/WaterSourceSystem";

import {
    DEFAULT_COURSE_BOUNDARY_DEFINITION,
} from "../../config/CourseBoundaryDefinition";

import type {
    CourseBoundaryDefinition,
} from "../../config/CourseBoundaryDefinition";

import type {
    DynamicObstacleDefinition,
} from "../../config/ObstacleDefinition";

import {
    calculateSolidCircleMomentOfInertia,
} from "../../physics/RigidBodyMath";

import {
    RigidBody2D,
} from "../../physics/RigidBody2D";

import { Entity } from "../Entity";
import { SprinklerSpriteRenderer } from "./SprinklerSpriteRenderer";

export interface SprinklerNozzleWorldState {
    readonly nozzleIndex: number;
    readonly positionX: number;
    readonly positionY: number;
    readonly directionRadians: number;
}

/**
 * Phase 8B-3 four-nozzle Sprinkler.
 *
 * Phase 8B-5 upgrades the Sprinkler into a lightweight circular rigid body.
 * Its authoritative physical transform also drives all four nozzle transforms,
 * so Ball impacts immediately affect subsequent Water emissions.
 */
export class Sprinkler extends Entity {
    private spriteRenderer: SprinklerSpriteRenderer | null = null;
    private emissionAccumulator = 0;
    private emissionSequence = 0;
    private enabled = true;

    private readonly rigidBody:
        RigidBody2D;

    private readonly collisionDefinition:
        DynamicObstacleDefinition;

    public constructor(
        private readonly sourceId: string,
        positionX: number,
        positionY: number,
        private rotationRadians: number,
        private readonly waterSourceSystem: WaterSourceSystem,
        private readonly definition: SprinklerDefinition = DEFAULT_SPRINKLER_DEFINITION,
        private readonly courseBoundaryDefinition:
            CourseBoundaryDefinition =
            DEFAULT_COURSE_BOUNDARY_DEFINITION,
    ) {
        super();

        if (sourceId.trim().length === 0) {
            throw new Error("Sprinkler sourceId must not be empty.");
        }

        if (!Number.isFinite(positionX) || !Number.isFinite(positionY) || !Number.isFinite(rotationRadians)) {
            throw new Error(`Sprinkler '${sourceId}' transform must be finite.`);
        }

        validateSprinklerDefinition(definition);

        this.collisionDefinition = {
            id:
                `sprinkler-${sourceId}`,
            shape:
                "circle",
            positionX,
            positionY,
            rotationRadians,
            radius:
                definition.collisionRadius,
            fillColor:
                0xffffff,
            outlineColor:
                0x000000,
            outlineWidth: 0,
            material:
                definition.material,
            rigidBody:
                definition.rigidBody,
        };

        this.rigidBody =
            new RigidBody2D(
                definition.rigidBody,
                calculateSolidCircleMomentOfInertia(
                    definition.rigidBody.mass,
                    definition.collisionRadius,
                ),
            );

        this.setPosition(positionX, positionY);
        this.setRotationRadians(
            rotationRadians,
        );
    }

    public getDefinition():
        DynamicObstacleDefinition {

        return this.collisionDefinition;
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

    /**
     * Mechanism collision correction can move the Sprinkler after its normal
     * Entity update. Keep the visual transform synchronized in the same frame.
     */
    public synchronizeAfterCollisionResolution():
        void {

        this.resolveCourseBoundaryCollision();

        this.container.rotation =
            this.rotationRadians;
    }

    public getSourceId(): string {
        return this.sourceId;
    }

    public isEnabled(): boolean {
        return this.enabled;
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    public getRotationRadians(): number {
        return this.rotationRadians;
    }

    public setRotationRadians(rotationRadians: number): void {
        if (!Number.isFinite(rotationRadians)) {
            throw new Error(`Sprinkler '${this.sourceId}' rotation must be finite.`);
        }

        this.rotationRadians = rotationRadians;
        this.container.rotation = rotationRadians;
    }

    public getEmissionSequence(): number {
        return this.emissionSequence;
    }

    public getNozzleWorldStates(): readonly SprinklerNozzleWorldState[] {
        const states: SprinklerNozzleWorldState[] = [];

        for (let nozzleIndex = 0; nozzleIndex < this.definition.nozzleCount; nozzleIndex += 1) {
            const localAngle = nozzleIndex * Math.PI / 2;
            const worldAngle = this.rotationRadians + localAngle;

            states.push({
                nozzleIndex,
                positionX: this.getX() + Math.cos(worldAngle) * this.definition.nozzleOffset,
                positionY: this.getY() + Math.sin(worldAngle) * this.definition.nozzleOffset,
                directionRadians: worldAngle,
            });
        }

        return states;
    }

    /** Queues one simultaneous four-nozzle pulse immediately. */
    public emitImmediately(): number {
        if (!this.enabled || this.definition.flowRate <= 0) {
            return 0;
        }

        this.emissionSequence += 1;

        const waterPerPulse = this.definition.flowRate * this.definition.emissionInterval;
        const waterPerNozzle = waterPerPulse / this.definition.nozzleCount;

        for (const nozzle of this.getNozzleWorldStates()) {
            this.waterSourceSystem.queueEmissionRequest({
                sourceId: this.sourceId,
                sourceType: WaterSourceType.Sprinkler,
                sequence: this.emissionSequence,
                positionX: nozzle.positionX,
                positionY: nozzle.positionY,
                directionRadians: nozzle.directionRadians,
                launchSpeed: this.definition.launchSpeed,
                launchElevationRadians: this.definition.launchElevationRadians,
                waterAmount: waterPerNozzle,
                windResponse: this.definition.windResponse,
            });
        }

        return this.definition.nozzleCount;
    }

    protected onInitialize(): void {
        this.spriteRenderer =
            new SprinklerSpriteRenderer(
                this.definition,
            );

        this.container.rotation = this.rotationRadians;
        this.container.addChild(
            this.spriteRenderer.getSprite(),
        );

        this.resolveCourseBoundaryCollision();
    }

    protected onUpdate(deltaTime: number): void {
        const safeDeltaTime =
            Number.isFinite(deltaTime)
                ? Math.max(0, deltaTime)
                : 0;

        if (safeDeltaTime <= 0) {
            return;
        }

        const integration =
            this.rigidBody.integrate(
                safeDeltaTime,
            );

        this.translate(
            integration.positionDeltaX,
            integration.positionDeltaY,
        );

        this.rotationRadians =
            this.normalizeRadians(
                this.rotationRadians +
                integration.rotationDelta,
            );

        this.resolveCourseBoundaryCollision();

        this.container.rotation =
            this.rotationRadians;

        if (!this.enabled) {
            return;
        }

        this.emissionAccumulator += safeDeltaTime;

        const due = Math.floor((this.emissionAccumulator + 1e-12) / this.definition.emissionInterval);
        if (due <= 0) {
            return;
        }

        this.emissionAccumulator -= due * this.definition.emissionInterval;

        for (let pulseIndex = 0; pulseIndex < due; pulseIndex += 1) {
            this.emitImmediately();
        }
    }

    protected onDestroy(): void {
        this.spriteRenderer?.destroy();
        this.spriteRenderer = null;
        this.container.destroy({ children: false });
    }

    private resolveCourseBoundaryCollision():
        void {

        const radius =
            this.definition
                .collisionRadius;

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
            correctedX > maximumX
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
            correctedY > maximumY
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
    }

    private normalizeRadians(
        radians: number,
    ): number {

        const fullTurn =
            Math.PI * 2;

        let normalized =
            radians %
            fullTurn;

        if (normalized < 0) {
            normalized +=
                fullTurn;
        }

        return normalized;
    }

}

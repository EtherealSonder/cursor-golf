import { Entity } from "../Entity";
import type { DynamicCollidable } from "../../physics/DynamicCollidable";
import type { DynamicObstacleDefinition } from "../../config/ObstacleDefinition";
import {
    DEFAULT_ROCK_PRESENTATION_DEFINITION,
    type RockPresentationDefinition,
} from "../../config/RockPresentationDefinition";
import {
    DEFAULT_SMALL_ROCK_PHYSICS_DEFINITION,
    calculateSmallRockMass,
    createSmallRockRigidBodyDefinition,
} from "../../config/SmallRockPhysicsDefinition";
import { RigidBody2D } from "../../physics/RigidBody2D";
import { calculateSolidCircleMomentOfInertia } from "../../physics/RigidBodyMath";
import { ProceduralRockRenderer } from "./ProceduralRockRenderer";
import { RockPresentationType } from "./RockPresentationType";

export interface RockPresentationOptions {
    readonly type: RockPresentationType;
    readonly x: number;
    readonly y: number;
    readonly radius: number;
    readonly seed: number;
}

/**
 * R-ROCK-2 Rock entity.
 *
 * SmallRock is a real DynamicCollidable backed by RigidBody2D.
 * Small Rocks are dynamic full-solid colliders.
 * Boulders expose the same circular geometry to World as immovable fixed colliders.
 * Both types are eligible for Robot perception/targeting; only Small Rocks can be sucked.
 */
export class Rock extends Entity implements DynamicCollidable {
    private readonly renderer: ProceduralRockRenderer;
    private readonly collisionDefinition: DynamicObstacleDefinition;
    private readonly rigidBody: RigidBody2D | null;
    private rotationRadians = 0;
    private suctionCaptured = false;

    public constructor(
        private readonly options: RockPresentationOptions,
        definition: RockPresentationDefinition =
            DEFAULT_ROCK_PRESENTATION_DEFINITION,
    ) {
        super();

        this.renderer = new ProceduralRockRenderer(
            options.type,
            options.radius,
            options.seed,
            definition,
        );

        const isSmallRock =
            options.type === RockPresentationType.SmallRock;

        const rigidBodyDefinition =
            isSmallRock
                ? createSmallRockRigidBodyDefinition(options.radius)
                : {
                    bodyType: "static" as const,
                    mass: 1,
                    linearDamping: 0,
                    angularDamping: 0,
                    sleepLinearSpeedThreshold: 0,
                    sleepAngularSpeedThreshold: 0,
                    sleepDelay: 0,
                    maximumLinearSpeed: 0,
                    maximumAngularSpeed: 0,
                };

        this.collisionDefinition = {
            id: `rock-${this.id}`,
            shape: "circle",
            positionX: options.x,
            positionY: options.y,
            rotationRadians: 0,
            radius: options.radius,
            fillColor: 0,
            outlineColor: 0,
            outlineWidth: 0,
            material:
                DEFAULT_SMALL_ROCK_PHYSICS_DEFINITION.material,
            rigidBody: rigidBodyDefinition,
        };

        if (isSmallRock) {
            const mass =
                calculateSmallRockMass(options.radius);
            this.rigidBody = new RigidBody2D(
                rigidBodyDefinition,
                calculateSolidCircleMomentOfInertia(
                    mass,
                    options.radius,
                ),
            );
        } else {
            this.rigidBody = null;
        }

        this.setPosition(options.x, options.y);
    }

    public getPresentationType(): RockPresentationType {
        return this.options.type;
    }

    public isSmallRock(): boolean {
        return this.options.type === RockPresentationType.SmallRock;
    }

    public isBoulder(): boolean {
        return this.options.type === RockPresentationType.Boulder;
    }
    public beginSuctionCapture(): void {
        if (this.isSmallRock()) this.suctionCaptured = true;
    }
    public setSuctionCaptureScale(scale: number): void {
        if (this.suctionCaptured) this.container.scale.set(Math.max(0, Math.min(1, scale)));
    }
    public isSuctionCaptured(): boolean { return this.suctionCaptured; }

    public completeSuctionCapture(): void {
        if (!this.isSmallRock()) return;
        this.suctionCaptured = true;
        this.container.scale.set(0);
    }

    public getBoulderStaticCollisionMaterial(): {
        readonly restitution: number;
        readonly friction: number;
    } {
        return this.collisionDefinition.material;
    }

    public getRobotCollisionRadius(): number {
        return this.options.radius;
    }

    public canBeWindSuctionTarget(): boolean {
        return this.isSmallRock() && !this.suctionCaptured;
    }

    public getSeed(): number {
        return this.options.seed;
    }

    public getRadius(): number {
        return this.options.radius;
    }

    public getDefinition(): DynamicObstacleDefinition {
        return this.collisionDefinition;
    }

    public getRotationRadians(): number {
        return this.rotationRadians;
    }

    public getVelocityX(): number {
        return this.rigidBody?.getVelocityX() ?? 0;
    }

    public getVelocityY(): number {
        return this.rigidBody?.getVelocityY() ?? 0;
    }

    public getAngularVelocity(): number {
        return this.rigidBody?.getAngularVelocity() ?? 0;
    }

    public getInverseMass(): number {
        return this.rigidBody?.getInverseMass() ?? 0;
    }

    public getInverseMomentOfInertia(): number {
        return this.rigidBody?.getInverseMomentOfInertia() ?? 0;
    }

    public applyImpulseAtWorldPoint(
        impulseX: number,
        impulseY: number,
        contactPointX: number,
        contactPointY: number,
    ): void {
        if (!this.rigidBody) {
            return;
        }

        this.rigidBody.applyImpulseAtWorldPoint(
            impulseX,
            impulseY,
            contactPointX - this.getX(),
            contactPointY - this.getY(),
        );
    }

    protected onInitialize(): void {
        this.container.addChild(
            this.renderer.getContainer(),
        );
    }

    protected onUpdate(deltaTime: number): void {
        if (!this.rigidBody) {
            return;
        }

        const integration =
            this.rigidBody.integrate(deltaTime);

        this.translate(
            integration.positionDeltaX,
            integration.positionDeltaY,
        );

        this.rotationRadians +=
            integration.rotationDelta;

        this.container.rotation =
            this.rotationRadians;

        // Stone should stop with a deliberate clunk rather than spend seconds
        // microsliding on grass. This is deterministic and never adds jitter.
        if (
            !this.rigidBody.isSleeping() &&
            this.rigidBody.getLinearSpeed() <=
                DEFAULT_SMALL_ROCK_PHYSICS_DEFINITION
                    .roughSettleLinearSpeed &&
            Math.abs(this.rigidBody.getAngularVelocity()) <=
                DEFAULT_SMALL_ROCK_PHYSICS_DEFINITION
                    .roughSettleAngularSpeed
        ) {
            this.rigidBody.sleep();
        }
    }

    protected onDestroy(): void {
        this.renderer.destroy();
        this.container.removeFromParent();
        this.container.destroy({ children: false });
    }
}

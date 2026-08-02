import type {
    RigidBodyDefinition,
} from "../config/RigidBodyDefinition";

import {
    clampMagnitude,
    crossVectorVector,
    magnitude,
} from "./RigidBodyMath";

export class RigidBody2D {

    private readonly definition:
        RigidBodyDefinition;

    private readonly mass:
        number;

    private readonly inverseMass:
        number;

    private readonly momentOfInertia:
        number;

    private readonly inverseMomentOfInertia:
        number;

    private velocityX = 0;
    private velocityY = 0;

    private angularVelocity = 0;

    private sleeping = false;
    private sleepElapsedTime = 0;

    constructor(
        definition: RigidBodyDefinition,
        momentOfInertia: number,
    ) {
        this.validateDefinition(
            definition,
        );

        this.definition =
            definition;

        if (
            definition.bodyType ===
            "static"
        ) {
            this.mass =
                Number.POSITIVE_INFINITY;

            this.inverseMass = 0;

            this.momentOfInertia =
                Number.POSITIVE_INFINITY;

            this.inverseMomentOfInertia = 0;

            this.sleeping = true;

            return;
        }

        if (
            !Number.isFinite(
                momentOfInertia,
            ) ||
            momentOfInertia <= 0
        ) {
            throw new Error(
                "Dynamic rigid-body moment of inertia must be a finite number greater than 0.",
            );
        }

        this.mass =
            definition.mass;

        this.inverseMass =
            1 /
            definition.mass;

        this.momentOfInertia =
            momentOfInertia;

        this.inverseMomentOfInertia =
            1 /
            momentOfInertia;
    }

    public isStatic(): boolean {

        return (
            this.definition.bodyType ===
            "static"
        );
    }

    public isDynamic(): boolean {

        return !this.isStatic();
    }

    public getMass(): number {
        return this.mass;
    }

    public getInverseMass(): number {
        return this.inverseMass;
    }

    public getMomentOfInertia(): number {
        return this.momentOfInertia;
    }

    public getInverseMomentOfInertia(): number {
        return this.inverseMomentOfInertia;
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

    public getLinearSpeed(): number {

        return magnitude(
            this.velocityX,
            this.velocityY,
        );
    }

    public isSleeping(): boolean {
        return this.sleeping;
    }

    public setVelocity(
        velocityX: number,
        velocityY: number,
    ): void {

        if (this.isStatic()) {
            return;
        }

        this.velocityX =
            velocityX;

        this.velocityY =
            velocityY;

        this.clampVelocities();
        this.wake();
    }

    public setAngularVelocity(
        angularVelocity: number,
    ): void {

        if (this.isStatic()) {
            return;
        }

        this.angularVelocity =
            angularVelocity;

        this.clampVelocities();
        this.wake();
    }

    public applyLinearImpulse(
        impulseX: number,
        impulseY: number,
    ): void {

        if (this.isStatic()) {
            return;
        }

        this.velocityX +=
            impulseX *
            this.inverseMass;

        this.velocityY +=
            impulseY *
            this.inverseMass;

        this.clampVelocities();
        this.wake();
    }

    public applyImpulseAtWorldPoint(
        impulseX: number,
        impulseY: number,
        relativeContactX: number,
        relativeContactY: number,
    ): void {

        if (this.isStatic()) {
            return;
        }

        this.applyLinearImpulse(
            impulseX,
            impulseY,
        );

        const angularImpulse =
            crossVectorVector(
                relativeContactX,
                relativeContactY,
                impulseX,
                impulseY,
            );

        this.angularVelocity +=
            angularImpulse *
            this.inverseMomentOfInertia;

        this.clampVelocities();
        this.wake();
    }

    public getVelocityAtRelativePoint(
        relativePointX: number,
        relativePointY: number,
    ): {
        readonly x: number;
        readonly y: number;
    } {

        return {
            x:
                this.velocityX -
                this.angularVelocity *
                relativePointY,

            y:
                this.velocityY +
                this.angularVelocity *
                relativePointX,
        };
    }

    public integrate(
        deltaTime: number,
    ): {
        readonly positionDeltaX: number;
        readonly positionDeltaY: number;
        readonly rotationDelta: number;
    } {

        if (
            this.isStatic() ||
            this.sleeping ||
            deltaTime <= 0
        ) {
            return {
                positionDeltaX: 0,
                positionDeltaY: 0,
                rotationDelta: 0,
            };
        }

        const positionDeltaX =
            this.velocityX *
            deltaTime;

        const positionDeltaY =
            this.velocityY *
            deltaTime;

        const rotationDelta =
            this.angularVelocity *
            deltaTime;

        this.applyDamping(
            deltaTime,
        );

        this.updateSleeping(
            deltaTime,
        );

        return {
            positionDeltaX,
            positionDeltaY,
            rotationDelta,
        };
    }

    public wake(): void {

        if (this.isStatic()) {
            return;
        }

        this.sleeping = false;
        this.sleepElapsedTime = 0;
    }

    public sleep(): void {

        if (this.isStatic()) {
            return;
        }

        this.velocityX = 0;
        this.velocityY = 0;
        this.angularVelocity = 0;

        this.sleepElapsedTime = 0;
        this.sleeping = true;
    }

    private applyDamping(
        deltaTime: number,
    ): void {

        const linearFactor =
            Math.exp(
                -this.definition
                    .linearDamping *
                deltaTime,
            );

        const angularFactor =
            Math.exp(
                -this.definition
                    .angularDamping *
                deltaTime,
            );

        this.velocityX *=
            linearFactor;

        this.velocityY *=
            linearFactor;

        this.angularVelocity *=
            angularFactor;
    }

    private updateSleeping(
        deltaTime: number,
    ): void {

        const belowLinearThreshold =
            this.getLinearSpeed() <=
            this.definition
                .sleepLinearSpeedThreshold;

        const belowAngularThreshold =
            Math.abs(
                this.angularVelocity,
            ) <=
            this.definition
                .sleepAngularSpeedThreshold;

        if (
            !belowLinearThreshold ||
            !belowAngularThreshold
        ) {
            this.sleepElapsedTime = 0;
            return;
        }

        this.sleepElapsedTime +=
            deltaTime;

        if (
            this.sleepElapsedTime >=
            this.definition
                .sleepDelay
        ) {
            this.sleep();
        }
    }

    private clampVelocities(): void {

        const clampedLinearVelocity =
            clampMagnitude(
                this.velocityX,
                this.velocityY,
                this.definition
                    .maximumLinearSpeed,
            );

        this.velocityX =
            clampedLinearVelocity.x;

        this.velocityY =
            clampedLinearVelocity.y;

        this.angularVelocity =
            Math.max(
                -this.definition
                    .maximumAngularSpeed,
                Math.min(
                    this.angularVelocity,
                    this.definition
                        .maximumAngularSpeed,
                ),
            );
    }

    private validateDefinition(
        definition:
            RigidBodyDefinition,
    ): void {

        if (
            definition.bodyType ===
            "dynamic" &&
            (
                !Number.isFinite(
                    definition.mass,
                ) ||
                definition.mass <= 0
            )
        ) {
            throw new Error(
                "Dynamic rigid-body mass must be a finite number greater than 0.",
            );
        }

        const finiteNonNegativeValues = [
            definition.linearDamping,
            definition.angularDamping,
            definition.sleepLinearSpeedThreshold,
            definition.sleepAngularSpeedThreshold,
            definition.sleepDelay,
            definition.maximumLinearSpeed,
            definition.maximumAngularSpeed,
        ];

        if (
            finiteNonNegativeValues.some(
                (
                    value: number,
                ) =>
                    !Number.isFinite(
                        value,
                    ) ||
                    value < 0,
            )
        ) {
            throw new Error(
                "Rigid-body damping, thresholds, delays, and speed limits must be finite non-negative numbers.",
            );
        }

        if (
            definition.bodyType ===
            "dynamic" &&
            (
                definition.maximumLinearSpeed <=
                0 ||
                definition.maximumAngularSpeed <=
                0
            )
        ) {
            throw new Error(
                "Dynamic rigid-body speed limits must be greater than 0.",
            );
        }
    }
}

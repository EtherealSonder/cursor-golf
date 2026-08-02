import {
    Graphics,
} from "pixi.js";

import type {
    StaticObstacleDefinition,
} from "../../config/ObstacleDefinition";

import {
    Entity,
} from "../Entity";

export class StaticObstacle extends Entity {

    private readonly definition:
        StaticObstacleDefinition;

    private graphics:
        Graphics | null = null;

    constructor(
        definition:
            StaticObstacleDefinition,
    ) {
        super();

        this.validateDefinition(
            definition,
        );

        this.definition =
            definition;
    }

    public getDefinition():
        StaticObstacleDefinition {

        return this.definition;
    }

    protected onInitialize(): void {

        this.graphics =
            new Graphics();

        this.setPosition(
            this.definition
                .positionX,
            this.definition
                .positionY,
        );

        this.drawObstacle();

        this.container.addChild(
            this.graphics,
        );
    }

    protected onUpdate(
        deltaTime: number,
    ): void {

        void deltaTime;
    }

    protected onDestroy(): void {

        this.graphics?.destroy();
        this.graphics = null;

        this.container.destroy({
            children: true,
        });
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

            case "triangle": {
                const [
                    first,
                    second,
                    third,
                ] =
                    this.definition.points;

                this.graphics.moveTo(
                    first.x,
                    first.y,
                );

                this.graphics.lineTo(
                    second.x,
                    second.y,
                );

                this.graphics.lineTo(
                    third.x,
                    third.y,
                );

                this.graphics.closePath();
                break;
            }
        }

        this.graphics.fill(
            this.definition
                .fillColor,
        );

        this.graphics.stroke({
            width:
                this.definition
                    .outlineWidth,

            color:
                this.definition
                    .outlineColor,
        });
    }

    private validateDefinition(
        definition:
            StaticObstacleDefinition,
    ): void {

        if (
            definition.id.trim()
                .length === 0
        ) {
            throw new Error(
                "Static obstacle id cannot be empty.",
            );
        }

        if (
            !Number.isFinite(
                definition.positionX,
            ) ||
            !Number.isFinite(
                definition.positionY,
            )
        ) {
            throw new Error(
                `Static obstacle '${definition.id}' position must contain finite values.`,
            );
        }

        if (
            definition.material
                .restitution < 0 ||
            definition.material
                .restitution > 1
        ) {
            throw new Error(
                `Static obstacle '${definition.id}' restitution must be between 0 and 1.`,
            );
        }

        if (
            definition.material
                .collisionFriction < 0 ||
            definition.material
                .collisionFriction > 1
        ) {
            throw new Error(
                `Static obstacle '${definition.id}' collision friction must be between 0 and 1.`,
            );
        }

        if (
            definition.outlineWidth < 0
        ) {
            throw new Error(
                `Static obstacle '${definition.id}' outline width cannot be negative.`,
            );
        }

        switch (
        definition.shape
        ) {
            case "rectangle":
                if (
                    definition.width <= 0 ||
                    definition.height <= 0
                ) {
                    throw new Error(
                        `Rectangle obstacle '${definition.id}' dimensions must be greater than 0.`,
                    );
                }
                break;

            case "circle":
                if (
                    definition.radius <= 0
                ) {
                    throw new Error(
                        `Circle obstacle '${definition.id}' radius must be greater than 0.`,
                    );
                }
                break;

            case "triangle": {
                const [
                    a,
                    b,
                    c,
                ] =
                    definition.points;

                const signedAreaTwice =
                    (
                        b.x - a.x
                    ) *
                    (
                        c.y - a.y
                    ) -
                    (
                        b.y - a.y
                    ) *
                    (
                        c.x - a.x
                    );

                if (
                    Math.abs(
                        signedAreaTwice,
                    ) < 0.000001
                ) {
                    throw new Error(
                        `Triangle obstacle '${definition.id}' points must form a non-degenerate triangle.`,
                    );
                }
                break;
            }
        }
    }
}
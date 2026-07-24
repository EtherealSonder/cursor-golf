import { Application, Graphics } from "pixi.js";

import { Ball } from "../entities/Ball";
import { Entity } from "../entities/Entity";

export class World {
    private readonly app: Application;

    private readonly entities: Entity[] = [];

    private ball: Ball | null = null;

    constructor(app: Application) {
        this.app = app;
    }

    public initialize(): void {
        this.createCourse();

        this.ball = new Ball();

        this.addEntity(this.ball);
    }

    public update(deltaTime: number): void {
        for (const entity of this.entities) {
            entity.update(deltaTime);
        }
    }

    public destroy(): void {
        for (const entity of this.entities) {
            entity.destroy();
        }

        this.entities.length = 0;

        this.ball = null;
    }

    public addEntity(entity: Entity): void {
        entity.initialize();

        this.entities.push(entity);

        this.app.stage.addChild(entity.getContainer());
    }

    public removeEntity(entity: Entity): void {
        const index = this.entities.indexOf(entity);

        if (index === -1) {
            return;
        }

        entity.destroy();

        this.entities.splice(index, 1);

        if (entity === this.ball) {
            this.ball = null;
        }
    }

    public getEntities(): readonly Entity[] {
        return this.entities;
    }

    public getBall(): Ball | null {
        return this.ball;
    }

    private createCourse(): void {
        const course = new Graphics();

        course.rect(0, 0, 1000, 600);
        course.fill(0x2f8f2f);

        this.app.stage.addChild(course);
    }
}
import { Application, Graphics } from "pixi.js";

import { AimIndicator } from "../entities/AimIndicator";
import { Ball } from "../entities/Ball";
import { Club } from "../entities/Club";
import { Entity } from "../entities/Entity";

export class World {
    private readonly app: Application;

    private readonly entities: Entity[] = [];

    private ball: Ball | null = null;
    private club: Club | null = null;
    private aimIndicator: AimIndicator | null = null;

    constructor(app: Application) {
        this.app = app;
    }

    public initialize(): void {
        this.createCourse();

        this.ball = new Ball();
        this.addEntity(this.ball);

        this.club = new Club();
        this.addEntity(this.club);

        this.aimIndicator = new AimIndicator();
        this.addEntity(this.aimIndicator);

        //
        // The golf club now behaves as the cursor,
        // so it should always remain visible.
        //

        this.club.show();

        //
        // The aim indicator is only shown while
        // preparing a shot.
        //

        this.aimIndicator.hide();
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
        this.club = null;
        this.aimIndicator = null;
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

        if (entity === this.club) {
            this.club = null;
        }

        if (entity === this.aimIndicator) {
            this.aimIndicator = null;
        }
    }

    public getEntities(): readonly Entity[] {
        return this.entities;
    }

    public getBall(): Ball | null {
        return this.ball;
    }

    public getClub(): Club | null {
        return this.club;
    }

    public getAimIndicator(): AimIndicator | null {
        return this.aimIndicator;
    }

    private createCourse(): void {
        const course = new Graphics();

        course.rect(0, 0, 1000, 600);
        course.fill(0x2f8f2f);

        this.app.stage.addChild(course);
    }
}
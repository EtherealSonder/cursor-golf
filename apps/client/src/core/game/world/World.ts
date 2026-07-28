import {
    Application,
    Graphics,
} from "pixi.js";

import { AimIndicator } from "../entities/AimIndicator";
import { Ball } from "../entities/Ball";
import { Club } from "../entities/Club";
import { Connector } from "../entities/Connector";
import { Entity } from "../entities/Entity";
import { ShotFeedback } from "../ui/ShotFeedback";

export class World {

    private readonly app:
        Application;

    private readonly entities:
        Entity[] = [];

    private ball:
        Ball | null = null;

    private connector:
        Connector | null = null;

    private club:
        Club | null = null;

    private aimIndicator:
        AimIndicator | null = null;

    private shotFeedback:
        ShotFeedback | null = null;

    constructor(
        app: Application,
    ) {

        this.app = app;
    }

    public initialize(): void {

        this.createCourse();

        // ---------------------------------------------------
        // Create Ball
        // ---------------------------------------------------

        this.ball =
            new Ball();

        this.addEntity(
            this.ball,
        );

        // ---------------------------------------------------
        // Create Connector
        // ---------------------------------------------------

        this.connector =
            new Connector();

        this.connector.initialize();

        const connectorGraphics =
            this.connector.getGraphics();

        if (!connectorGraphics) {
            throw new Error(
                "World could not initialize because the Connector graphics do not exist.",
            );
        }

        /*
         * At this point the stage contains:
         *
         * Course
         * Ball
         *
         * Insert Connector before Ball so it
         * renders underneath the Ball.
         */
        const ballStageIndex =
            this.app.stage.getChildIndex(
                this.ball.getContainer(),
            );

        this.app.stage.addChildAt(
            connectorGraphics,
            ballStageIndex,
        );

        // ---------------------------------------------------
        // Create Club
        // ---------------------------------------------------

        this.club =
            new Club();

        this.addEntity(
            this.club,
        );

        // ---------------------------------------------------
        // Create Aim Indicator
        // ---------------------------------------------------

        this.aimIndicator =
            new AimIndicator(
                this.club
                    .getDefinition()
                    .aimGuide,
            );

        this.addEntity(
            this.aimIndicator,
        );

        // ---------------------------------------------------
        // Create Shot Feedback
        // ---------------------------------------------------

        /*
         * ShotFeedback is added after the normal
         * shot visuals so its temporary text is
         * rendered above the Ball, Club, Connector,
         * and AimIndicator.
         */
        this.shotFeedback =
            new ShotFeedback();

        this.addEntity(
            this.shotFeedback,
        );

        /*
         * Final display hierarchy:
         *
         * Course
         * Connector
         * Ball
         * Club
         * Aim indicator
         * Shot feedback
         */

        /*
         * The golf club behaves as the cursor,
         * so it should always remain visible.
         */
        this.club.show();

        /*
         * The aim indicator is only shown while
         * preparing a shot.
         */
        this.aimIndicator.hide();
    }

    public update(
        deltaTime: number,
    ): void {

        /*
         * Update normal gameplay entities first.
         *
         * This now also updates ShotFeedback and
         * advances all active text animations.
         */
        for (
            const entity
            of this.entities
        ) {
            entity.update(
                deltaTime,
            );
        }

        /*
         * Render Connector after Ball and Club
         * have updated.
         *
         * Delta time is passed into Connector so
         * its visual pulse remains frame-rate
         * independent.
         */
        if (
            this.connector &&
            this.ball &&
            this.club
        ) {
            this.connector.render(
                this.ball,
                this.club,
                deltaTime,
            );
        }
    }

    public destroy(): void {

        /*
         * Destroy normal entities first.
         *
         * ShotFeedback is part of this collection,
         * so any remaining text is also destroyed.
         */
        for (
            const entity
            of this.entities
        ) {
            entity.destroy();
        }

        this.entities.length = 0;

        /*
         * Connector is separately owned by World
         * because it does not extend Entity.
         */
        this.connector?.destroy();

        this.ball = null;
        this.connector = null;
        this.club = null;
        this.aimIndicator = null;
        this.shotFeedback = null;
    }

    public addEntity(
        entity: Entity,
    ): void {

        entity.initialize();

        this.entities.push(
            entity,
        );

        this.app.stage.addChild(
            entity.getContainer(),
        );
    }

    public removeEntity(
        entity: Entity,
    ): void {

        const index =
            this.entities.indexOf(
                entity,
            );

        if (index === -1) {
            return;
        }

        entity.destroy();

        this.entities.splice(
            index,
            1,
        );

        if (entity === this.ball) {
            this.ball = null;
        }

        if (entity === this.club) {
            this.club = null;
        }

        if (
            entity ===
            this.aimIndicator
        ) {
            this.aimIndicator = null;
        }

        if (
            entity ===
            this.shotFeedback
        ) {
            this.shotFeedback = null;
        }
    }

    public getEntities():
        readonly Entity[] {

        return this.entities;
    }

    public getBall():
        Ball | null {

        return this.ball;
    }

    public getConnector():
        Connector | null {

        return this.connector;
    }

    public getClub():
        Club | null {

        return this.club;
    }

    public getAimIndicator():
        AimIndicator | null {

        return this.aimIndicator;
    }

    public getShotFeedback():
        ShotFeedback | null {

        return this.shotFeedback;
    }

    private createCourse(): void {

        const course =
            new Graphics();

        course.rect(
            0,
            0,
            1000,
            600,
        );

        course.fill(
            0x2f8f2f,
        );

        this.app.stage.addChild(
            course,
        );
    }
}
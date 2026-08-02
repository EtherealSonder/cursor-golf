import {
    Application,
    Graphics,
} from "pixi.js";

import {
    DEFAULT_COURSE_BOUNDARY_DEFINITION,
} from "../config/CourseBoundaryDefinition";

import {
    WindTuningController,
} from "../debug/WindTuningController";

import {
    WindValidationMetrics,
} from "../debug/WindValidationMetrics";

import { AimIndicator } from "../entities/AimIndicator";

import {
    Ball,
} from "../entities/Ball";

import { Club } from "../entities/Club";
import { Connector } from "../entities/Connector";
import { Entity } from "../entities/Entity";

import {
    DynamicObstacle,
} from "../entities/obstacles/DynamicObstacle";

import {
    WindManager,
} from "../environment/WindManager";

import { ShotFeedback } from "../ui/ShotFeedback";

export class World {

    // -------------------------------------------------------
    // Core Application
    // -------------------------------------------------------

    private readonly app:
        Application;

    // -------------------------------------------------------
    // Environmental Systems
    // -------------------------------------------------------

    /**
     * Authoritative environmental wind owner.
     */
    private readonly windManager:
        WindManager;

    /**
     * Development-only controller used to apply
     * deterministic C7 wind-validation presets.
     */
    private readonly windTuningController:
        WindTuningController;

    /**
     * Structured C7 shot measurement system.
     *
     * It is created after the Ball because it reads
     * the Ball's authoritative movement diagnostics.
     */
    private windValidationMetrics:
        WindValidationMetrics | null =
        null;

    // -------------------------------------------------------
    // Entity Collections
    // -------------------------------------------------------

    private readonly entities:
        Entity[] = [];

    private readonly dynamicObstacles:
        DynamicObstacle[] = [];

    // -------------------------------------------------------
    // Core Gameplay Entities
    // -------------------------------------------------------

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

        this.windManager =
            new WindManager();

        /*
         * The tuning controller receives the same
         * WindManager used by Ball physics and the
         * React Wind HUD.
         */
        this.windTuningController =
            new WindTuningController(
                this.windManager,
            );
    }

    // -------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------

    public initialize(): void {

        this.createCourse();

        // ---------------------------------------------------
        // C7 Open-Field Validation
        // ---------------------------------------------------

        /*
         * Temporary obstacle entities are intentionally
         * not created during open-field wind validation.
         *
         * Their definitions, classes, collision detection,
         * and impulse-response systems remain unchanged and
         * can be restored after wind tuning is complete.
         */

        // ---------------------------------------------------
        // Create Ball
        // ---------------------------------------------------

        this.ball =
            new Ball(
                undefined,
                undefined,
                [],
                this.dynamicObstacles,
                this.windManager,
            );

        this.addEntity(
            this.ball,
        );

        this.windValidationMetrics =
            new WindValidationMetrics(
                this.ball,
                this.windManager,
                this.windTuningController,
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

        this.shotFeedback =
            new ShotFeedback();

        this.addEntity(
            this.shotFeedback,
        );

        this.club.show();

        this.aimIndicator.hide();

    }

    public update(
        deltaTime: number,
    ): void {

        for (
            const entity
            of this.entities
        ) {
            entity.update(
                deltaTime,
            );
        }

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

        this.windValidationMetrics
            ?.update();
    }

    public destroy(): void {

        for (
            const entity
            of this.entities
        ) {
            entity.destroy();
        }

        this.entities.length = 0;

        this.dynamicObstacles.length = 0;

        this.connector?.destroy();

        this.windValidationMetrics
            ?.destroy();

        this.windValidationMetrics =
            null;

        this.windTuningController
            .destroy();

        this.windManager.reset();

        this.ball = null;
        this.connector = null;
        this.club = null;
        this.aimIndicator = null;
        this.shotFeedback = null;
    }

    // -------------------------------------------------------
    // C7 Validation Reset
    // -------------------------------------------------------

    /**
     * Returns the Ball and its validation state to the
     * original visible viewport centre.
     */
    public resetBall(): void {

        if (!this.ball) {
            return;
        }

        this.ball.resetToInitialPosition();

        this.aimIndicator?.hide();

        this.club?.resetShotVisuals();

        this.windValidationMetrics
            ?.resetMeasurement();
    }

    // -------------------------------------------------------
    // Entity Management
    // -------------------------------------------------------

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

        const entityIndex =
            this.entities.indexOf(
                entity,
            );

        if (
            entityIndex ===
            -1
        ) {
            return;
        }

        entity.destroy();

        this.entities.splice(
            entityIndex,
            1,
        );

        const dynamicObstacleIndex =
            this.dynamicObstacles.indexOf(
                entity as DynamicObstacle,
            );

        if (
            dynamicObstacleIndex !==
            -1
        ) {
            this.dynamicObstacles.splice(
                dynamicObstacleIndex,
                1,
            );
        }

        if (
            entity ===
            this.ball
        ) {
            this.ball = null;
        }

        if (
            entity ===
            this.club
        ) {
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

    // -------------------------------------------------------
    // Environmental System Queries
    // -------------------------------------------------------

    public getWindManager():
        WindManager {

        return this.windManager;
    }

    public getWindTuningController():
        WindTuningController {

        return this.windTuningController;
    }

    public getWindValidationMetrics():
        WindValidationMetrics {

        if (!this.windValidationMetrics) {
            throw new Error(
                "Wind validation metrics are not available before World initialization.",
            );
        }

        return this.windValidationMetrics;
    }

    // -------------------------------------------------------
    // Entity Queries
    // -------------------------------------------------------

    public getEntities():
        readonly Entity[] {

        return this.entities;
    }

    public getDynamicObstacles():
        readonly DynamicObstacle[] {

        return this.dynamicObstacles;
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

    // -------------------------------------------------------
    // Course Rendering
    // -------------------------------------------------------

    private createCourse(): void {

        const course =
            new Graphics();

        const courseWidth =
            DEFAULT_COURSE_BOUNDARY_DEFINITION
                .maximumX -
            DEFAULT_COURSE_BOUNDARY_DEFINITION
                .minimumX;

        const courseHeight =
            DEFAULT_COURSE_BOUNDARY_DEFINITION
                .maximumY -
            DEFAULT_COURSE_BOUNDARY_DEFINITION
                .minimumY;

        course.rect(
            DEFAULT_COURSE_BOUNDARY_DEFINITION
                .minimumX,

            DEFAULT_COURSE_BOUNDARY_DEFINITION
                .minimumY,

            courseWidth,
            courseHeight,
        );

        course.fill(
            0x2f8f2f,
        );

        this.app.stage.addChild(
            course,
        );
    }
} 
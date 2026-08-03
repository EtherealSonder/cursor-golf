import {
    Application,
    Container,
    Graphics,
    TilingSprite,
} from "pixi.js";

import {
    Camera,
} from "../camera/Camera";

import {
    CameraShake,
} from "../camera/CameraShake";

import {
    CameraFeedbackController,
} from "../controllers/CameraFeedbackController";

import {
    DEFAULT_COURSE_BOUNDARY_DEFINITION,
} from "../config/CourseBoundaryDefinition";

import {
    DEFAULT_COURSE_VISUAL_DEFINITION,
} from "../config/CourseVisualDefinition";

import {
    ProceduralObstacleFieldGenerator,
} from "../generation/ProceduralObstacleFieldGenerator";

import type {
    CourseVisualDefinition,
} from "../config/CourseVisualDefinition";

import type {
    StaticObstacleDefinition,
} from "../config/ObstacleDefinition";

import {
    WindTuningController,
} from "../debug/WindTuningController";

import {
    WindValidationMetrics,
} from "../debug/WindValidationMetrics";

import {
    AimIndicator,
} from "../entities/AimIndicator";

import {
    Ball,
} from "../entities/Ball";

import type {
    BallImpactEvent,
} from "../entities/Ball";

import {
    Club,
} from "../entities/Club";

import {
    Connector,
} from "../entities/Connector";

import {
    Entity,
} from "../entities/Entity";

import {
    DynamicObstacle,
} from "../entities/obstacles/DynamicObstacle";

import {
    StaticObstacle,
} from "../entities/obstacles/StaticObstacle";

import {
    WindManager,
} from "../environment/WindManager";

import {
    ShotFeedback,
} from "../ui/ShotFeedback";

import {
    AssetLoader,
} from "../../rendering/AssetLoader";

export class World {

    // -------------------------------------------------------
    // Core Application
    // -------------------------------------------------------

    private readonly app:
        Application;

    // -------------------------------------------------------
    // World Rendering Structure
    // -------------------------------------------------------

    /**
     * Shared PixiJS parent for every world-space
     * display object.
     *
     * World-space gameplay coordinates remain
     * unchanged. Camera movement is represented by
     * moving this single container in the opposite
     * direction from the Camera position.
     */
    private readonly worldContainer:
        Container;

    /**
     * Screen-space PixiJS parent.
     *
     * This container does not move with the Camera.
     *
     * It currently contains the temporary Camera
     * activation-boundary debug rectangle.
     */
    private readonly screenOverlayContainer:
        Container;

    /**
     * Temporary screen-space Camera activation
     * boundary display.
     */
    private cameraActivationDebugGraphics:
        Graphics | null = null;

    /**
     * Repeating terrain background.
     *
     * It is always inserted as the first child of the
     * World Container so gameplay objects render
     * above it.
     */
    private courseBackground:
        TilingSprite | null = null;

    /**
     * Presentation configuration for the temporary
     * course terrain.
     */
    private readonly courseVisualDefinition:
        CourseVisualDefinition;

    // -------------------------------------------------------
    // Camera System
    // -------------------------------------------------------

    /**
     * Authoritative world Camera.
     *
     * Camera position represents the world coordinate
     * displayed at the top-left corner of the logical
     * game viewport.
     */
    private readonly camera:
        Camera;

    private readonly cameraShake:
        CameraShake;

    private readonly cameraFeedbackController:
        CameraFeedbackController;

    private unsubscribeFromBallImpacts:
        (() => void) | null =
        null;

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
     * deterministic wind-validation presets.
     */
    private readonly windTuningController:
        WindTuningController;

    /**
     * Structured shot-measurement system.
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

    /**
     * Generated static definitions are passed to the
     * Ball collision system and also used to construct
     * visible StaticObstacle entities.
     */
    private staticObstacleDefinitions:
        readonly StaticObstacleDefinition[] = [];

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

        courseVisualDefinition:
            CourseVisualDefinition =
            DEFAULT_COURSE_VISUAL_DEFINITION,
    ) {

        this.app =
            app;

        this.validateCourseVisualDefinition(
            courseVisualDefinition,
        );

        this.courseVisualDefinition =
            courseVisualDefinition;

        /*
         * Every world-space PixiJS object is attached
         * beneath this container.
         *
         * React HUD elements remain outside PixiJS and
         * are unaffected by this transform.
         */
        this.worldContainer =
            new Container();

        /*
         * Screen-space PixiJS content is kept separate
         * from the Camera-controlled World Container.
         */
        this.screenOverlayContainer =
            new Container();

        /*
         * World owns the Camera because the Camera
         * describes which region of this World is
         * visible.
         */
        this.camera =
            new Camera(
                undefined,
                DEFAULT_COURSE_BOUNDARY_DEFINITION,
            );

        this.cameraShake =
            new CameraShake();

        this.cameraFeedbackController =
            new CameraFeedbackController(
                this.cameraShake,
            );

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

        /*
         * The Pixi stage remains fixed.
         *
         * Only the World Container receives Camera
         * transforms.
         */
        this.app.stage.addChild(
            this.worldContainer,
        );

        /*
         * Overlay is added after the World Container,
         * ensuring debug graphics remain above the
         * moving game world.
         */
        this.app.stage.addChild(
            this.screenOverlayContainer,
        );

        /*
         * Course is created first so it remains behind
         * every later world-space display object.
         */
        this.createCourse();

        this.createCameraActivationDebugGraphics();

        // ---------------------------------------------------
        // Procedural Obstacle Field
        // ---------------------------------------------------

        /*
         * Generate deterministic obstacle definitions
         * before constructing the Ball.
         *
         * Static definitions are consumed by the
         * existing static collision pipeline.
         *
         * DynamicObstacle instances are consumed by
         * the existing impulse-based rigid-body
         * collision pipeline.
         */
        const obstacleField =
            new ProceduralObstacleFieldGenerator()
                .generate(
                    DEFAULT_COURSE_BOUNDARY_DEFINITION,
                );

        this.staticObstacleDefinitions =
            obstacleField
                .staticDefinitions;

        for (
            const definition
            of this.staticObstacleDefinitions
        ) {
            this.addEntity(
                new StaticObstacle(
                    definition,
                ),
            );
        }

        for (
            const definition
            of obstacleField
                .dynamicDefinitions
        ) {
            const obstacle =
                new DynamicObstacle(
                    definition,
                    DEFAULT_COURSE_BOUNDARY_DEFINITION,
                );

            this.dynamicObstacles.push(
                obstacle,
            );

            this.addEntity(
                obstacle,
            );
        }

        console.log(
            "Procedural obstacle field created.",
            {
                staticObstacles:
                    this.staticObstacleDefinitions
                        .length,

                dynamicObstacles:
                    this.dynamicObstacles
                        .length,
            },
        );

        // ---------------------------------------------------
        // Create Ball
        // ---------------------------------------------------

        this.ball =
            new Ball(
                undefined,
                undefined,
                this.staticObstacleDefinitions,
                this.dynamicObstacles,
                this.windManager,
            );

        this.addEntity(
            this.ball,
        );

        this.unsubscribeFromBallImpacts =
            this.ball.subscribeToImpacts(
                (
                    event:
                        BallImpactEvent,
                ): void => {

                    this.cameraFeedbackController
                        .triggerCollision(
                            event.type,
                            event.impactSpeed,
                        );
                },
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

        /*
         * The Ball has already been added to the
         * World Container.
         *
         * Insert Connector at the Ball's current
         * display index so Connector remains directly
         * behind the Ball and above the terrain.
         */
        const ballWorldIndex =
            this.worldContainer
                .getChildIndex(
                    this.ball
                        .getContainer(),
                );

        this.worldContainer.addChildAt(
            connectorGraphics,
            ballWorldIndex,
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

        /*
         * Apply the configured initial Camera position
         * before the first rendered frame.
         */
        this.applyCameraTransform();
    }

    /**
     * Updates every screen-space system after the
     * browser game area changes dimensions.
     */
    public resizeViewport(
        viewportWidth: number,
        viewportHeight: number,
    ): void {

        this.camera
            .setViewportSize(
                viewportWidth,
                viewportHeight,
            );

        this.applyCameraTransform();

        if (
            this.cameraActivationDebugGraphics
        ) {
            this.drawCameraActivationDebugGraphics();
        }
    }

    public updateCamera(
        deltaTime: number,
    ): void {

        this.camera.update(
            deltaTime,
        );

        this.cameraShake.update(
            deltaTime,
        );

        this.applyCameraTransform();
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

        /*
         * Entity destroy methods remove and destroy
         * their own display containers.
         */
        for (
            const entity
            of this.entities
        ) {
            entity.destroy();
        }

        this.entities.length =
            0;

        this.dynamicObstacles.length =
            0;

        this.staticObstacleDefinitions =
            [];

        /*
         * Connector is not an Entity and therefore
         * owns a separate lifecycle.
         */
        this.connector?.destroy();

        this.connector =
            null;

        this.unsubscribeFromBallImpacts?.();

        this.unsubscribeFromBallImpacts =
            null;

        this.cameraFeedbackController
            .clear();

        this.windValidationMetrics
            ?.destroy();

        this.windValidationMetrics =
            null;

        this.windTuningController
            .destroy();

        this.windManager.reset();

        /*
         * Screen-space debug graphics are owned
         * directly by World.
         */
        this.cameraActivationDebugGraphics
            ?.destroy();

        this.cameraActivationDebugGraphics =
            null;

        /*
         * Terrain background is owned directly by
         * World.
         */
        this.courseBackground
            ?.destroy();

        this.courseBackground =
            null;

        /*
         * Entity, Connector, Course and debug display
         * objects have already destroyed themselves.
         *
         * Destroy the empty parent containers without
         * recursively destroying children again.
         */
        this.worldContainer.destroy({
            children:
                false,
        });

        this.screenOverlayContainer.destroy({
            children:
                false,
        });

        this.camera
            .resetToInitialPosition();

        this.ball =
            null;

        this.club =
            null;

        this.aimIndicator =
            null;

        this.shotFeedback =
            null;
    }

    // -------------------------------------------------------
    // Ball and Camera Reset
    // -------------------------------------------------------

    /**
     * Returns the Ball and validation state to the
     * original visible viewport centre.
     *
     * Camera position and its shared World Container
     * transform are also reset immediately.
     */
    public resetBall(): void {

        if (!this.ball) {
            return;
        }

        this.ball
            .resetToInitialPosition();

        this.camera
            .resetToInitialPosition();

        this.cameraFeedbackController
            .clear();

        this.applyCameraTransform();

        this.aimIndicator
            ?.hide();

        this.club
            ?.resetShotVisuals();

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

        /*
         * Entity positions remain authoritative
         * world-space coordinates.
         *
         * Camera presentation is inherited from the
         * shared parent container.
         */
        this.worldContainer.addChild(
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
            this.ball =
                null;
        }

        if (
            entity ===
            this.club
        ) {
            this.club =
                null;
        }

        if (
            entity ===
            this.aimIndicator
        ) {
            this.aimIndicator =
                null;
        }

        if (
            entity ===
            this.shotFeedback
        ) {
            this.shotFeedback =
                null;
        }
    }

    // -------------------------------------------------------
    // Camera Rendering
    // -------------------------------------------------------

    /**
     * Applies the Camera's authoritative base
     * position to the shared World Container.
     *
     * Moving the Camera right makes the world appear
     * to move left.
     *
     * Moving the Camera down makes the world appear
     * to move up.
     */
    private applyCameraTransform(): void {

        const requestedShakeOffset =
            this.cameraShake
                .getOffset();

        /*
         * Clamp only the render offset. The base Camera
         * remains authoritative for input and gameplay.
         */
        const minimumShakeOffsetX =
            this.camera
                .getPositionX() -
            this.camera
                .getMaximumPositionX();

        const maximumShakeOffsetX =
            this.camera
                .getPositionX() -
            this.camera
                .getMinimumPositionX();

        const minimumShakeOffsetY =
            this.camera
                .getPositionY() -
            this.camera
                .getMaximumPositionY();

        const maximumShakeOffsetY =
            this.camera
                .getPositionY() -
            this.camera
                .getMinimumPositionY();

        const safeShakeOffsetX =
            Math.max(
                minimumShakeOffsetX,
                Math.min(
                    requestedShakeOffset.x,
                    maximumShakeOffsetX,
                ),
            );

        const safeShakeOffsetY =
            Math.max(
                minimumShakeOffsetY,
                Math.min(
                    requestedShakeOffset.y,
                    maximumShakeOffsetY,
                ),
            );

        this.worldContainer
            .position
            .set(
                -this.camera
                    .getPositionX() +
                safeShakeOffsetX,

                -this.camera
                    .getPositionY() +
                safeShakeOffsetY,
            );
    }

    // -------------------------------------------------------
    // Camera Queries
    // -------------------------------------------------------

    public getCamera():
        Camera {

        return this.camera;
    }

    public getCameraFeedbackController():
        CameraFeedbackController {

        return this.cameraFeedbackController;
    }

    public getCameraShake():
        CameraShake {

        return this.cameraShake;
    }

    /**
     * Exposes the shared PixiJS World Container for
     * diagnostics and future rendering systems.
     *
     * Gameplay systems should not directly change its
     * position.
     */
    public getWorldContainer():
        Container {

        return this.worldContainer;
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
    // Camera Debug Rendering
    // -------------------------------------------------------

    private createCameraActivationDebugGraphics():
        void {

        const definition =
            this.camera
                .getDefinition();

        if (
            !definition
                .debugActivationBoundaryVisible
        ) {
            return;
        }

        if (
            this.cameraActivationDebugGraphics
        ) {
            throw new Error(
                "Camera activation debug graphics have already been created.",
            );
        }

        this.cameraActivationDebugGraphics =
            new Graphics();

        this.screenOverlayContainer.addChild(
            this.cameraActivationDebugGraphics,
        );

        this.drawCameraActivationDebugGraphics();
    }

    /**
     * Redraws the fixed screen-space activation
     * rectangle from the Camera's current responsive
     * viewport dimensions.
     */
    private drawCameraActivationDebugGraphics():
        void {

        if (
            !this.cameraActivationDebugGraphics
        ) {
            return;
        }

        const horizontalInset =
            this.camera
                .getHorizontalActivationInset();

        const verticalInset =
            this.camera
                .getVerticalActivationInset();

        const activationWidth =
            Math.max(
                0,
                this.camera
                    .getViewportWidth() -
                horizontalInset *
                2,
            );

        const activationHeight =
            Math.max(
                0,
                this.camera
                    .getViewportHeight() -
                verticalInset *
                2,
            );

        this.cameraActivationDebugGraphics
            .clear();

        this.cameraActivationDebugGraphics
            .rect(
                horizontalInset,
                verticalInset,
                activationWidth,
                activationHeight,
            );

        this.cameraActivationDebugGraphics
            .stroke({
                width:
                    2,

                color:
                    0xffffff,

                alpha:
                    0.75,
            });
    }

    // -------------------------------------------------------
    // Course Rendering
    // -------------------------------------------------------

    private createCourse(): void {

        if (this.courseBackground) {
            throw new Error(
                "World course background has already been created.",
            );
        }

        const terrainTexture =
            AssetLoader.getTexture(
                this.courseVisualDefinition
                    .terrainTextureKey,
            );

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

        this.courseBackground =
            new TilingSprite({
                texture:
                    terrainTexture,

                width:
                    courseWidth,

                height:
                    courseHeight,
            });

        /*
         * TilingSprite local coordinates begin at
         * zero.
         *
         * Move the complete background rectangle to
         * the course's world-space minimum corner.
         */
        this.courseBackground
            .position
            .set(
                DEFAULT_COURSE_BOUNDARY_DEFINITION
                    .minimumX,

                DEFAULT_COURSE_BOUNDARY_DEFINITION
                    .minimumY,
            );

        /*
         * Scale the repeated texture pattern without
         * changing the TilingSprite's world-space
         * width or height.
         */
        this.courseBackground
            .tileScale
            .set(
                this.courseVisualDefinition
                    .terrainTileScaleX,

                this.courseVisualDefinition
                    .terrainTileScaleY,
            );

        this.courseBackground.alpha =
            this.courseVisualDefinition
                .terrainAlpha;

        this.courseBackground.tint =
            this.courseVisualDefinition
                .terrainTint;

        /*
         * Terrain is inserted at index zero.
         *
         * Connector, Ball, Club, AimIndicator,
         * ShotFeedback and future obstacles therefore
         * remain above the background.
         */
        this.worldContainer.addChildAt(
            this.courseBackground,
            0,
        );
    }

    // -------------------------------------------------------
    // Course Visual Validation
    // -------------------------------------------------------

    private validateCourseVisualDefinition(
        definition:
            CourseVisualDefinition,
    ): void {

        if (
            definition
                .terrainTextureKey
                .trim()
                .length ===
            0
        ) {
            throw new Error(
                "Course terrain texture key cannot be empty.",
            );
        }

        if (
            !Number.isFinite(
                definition
                    .terrainTileScaleX,
            ) ||
            definition
                .terrainTileScaleX <=
            0
        ) {
            throw new Error(
                "Course terrainTileScaleX must be a finite number greater than zero.",
            );
        }

        if (
            !Number.isFinite(
                definition
                    .terrainTileScaleY,
            ) ||
            definition
                .terrainTileScaleY <=
            0
        ) {
            throw new Error(
                "Course terrainTileScaleY must be a finite number greater than zero.",
            );
        }

        if (
            !Number.isFinite(
                definition
                    .terrainAlpha,
            ) ||
            definition
                .terrainAlpha <
            0 ||
            definition
                .terrainAlpha >
            1
        ) {
            throw new Error(
                "Course terrainAlpha must remain between zero and one.",
            );
        }

        if (
            !Number.isFinite(
                definition
                    .terrainTint,
            ) ||
            definition
                .terrainTint <
            0 ||
            definition
                .terrainTint >
            0xffffff
        ) {
            throw new Error(
                "Course terrainTint must be a valid hexadecimal color between 0x000000 and 0xffffff.",
            );
        }
    }
}
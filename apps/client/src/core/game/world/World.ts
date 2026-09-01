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
    DEFAULT_HOLE_DEFINITION,
} from "../config/HoleDefinition";

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
    PerformanceDebugOverlay,
} from "../debug/PerformanceDebugOverlay";

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
    Hole,
} from "../entities/Hole";

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
    WindVisualizer,
} from "../environment/WindVisualizer";

import {
    SurfaceSystem,
} from "../surface/SurfaceSystem";

import {
    SurfaceType,
} from "../surface/SurfaceType";

import {
    SurfaceState,
} from "../surface/SurfaceState";

import {
    ShotFeedback,
} from "../ui/ShotFeedback";

import {
    AssetLoader,
} from "../../rendering/AssetLoader";

const SURFACE_TEST_ZONES_ENABLED =
    false;

const PHASE_2_SURFACE_ZONES = [
    {
        id: "phase-2-wet-grass-zone",
        surfaceType: SurfaceType.Grass,
        x: 80,
        y: 60,
        width: 360,
        height: 260,
    },
    {
        id: "phase-2-scorched-grass-zone",
        surfaceType: SurfaceType.Grass,
        x: 760,
        y: 60,
        width: 360,
        height: 260,
    },
    {
        id: "phase-2-dry-sand-zone",
        surfaceType: SurfaceType.Sand,
        x: 80,
        y: 400,
        width: 360,
        height: 260,
    },
    {
        id: "phase-2-wet-sand-zone",
        surfaceType: SurfaceType.Sand,
        x: 760,
        y: 400,
        width: 360,
        height: 260,
    },
] as const;

const PHASE_2_SURFACE_VISUALS = {
    normalGrass: {
        fillColor: 0x82b53b,
        fillAlpha: 0.18,
        outlineColor: 0x6f9d31,
    },
    wetGrass: {
        fillColor: 0x4aa6a6,
        fillAlpha: 0.42,
        outlineColor: 0x2f7f86,
    },
    scorchedGrass: {
        fillColor: 0x5d3a24,
        fillAlpha: 0.72,
        outlineColor: 0x3d2417,
    },
    drySand: {
        fillColor: 0xd7b36a,
        fillAlpha: 0.82,
        outlineColor: 0xb48a45,
    },
    wetSand: {
        fillColor: 0x9f7b4f,
        fillAlpha: 0.86,
        outlineColor: 0x745638,
    },
    outlineAlpha: 0.9,
    outlineWidth: 4,
} as const;

export class World {

    private readonly app:
        Application;

    private readonly worldContainer:
        Container;

    private readonly screenOverlayContainer:
        Container;

    private cameraActivationDebugGraphics:
        Graphics | null = null;

    private performanceDebugOverlay:
        PerformanceDebugOverlay | null =
        null;

    private courseBackground:
        TilingSprite | null = null;

    /**
     * Temporary Phase 2 world-space visualization for
     * authored surface zones.
     *
     * Physics authority remains SurfaceSystem.
     */
    private surfaceGraphics:
        Graphics | null = null;

    private readonly courseVisualDefinition:
        CourseVisualDefinition;

    private readonly camera:
        Camera;

    private readonly cameraShake:
        CameraShake;

    private readonly cameraFeedbackController:
        CameraFeedbackController;

    private unsubscribeFromBallImpacts:
        (() => void) | null =
        null;

    private unsubscribeFromSurfaceChanges:
        (() => void) | null =
        null;

    // -------------------------------------------------------
    // Environmental Systems
    // -------------------------------------------------------

    private readonly windManager:
        WindManager;

    private windVisualizer:
        WindVisualizer | null =
        null;

    private readonly surfaceSystem:
        SurfaceSystem;

    private readonly windTuningController:
        WindTuningController;

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

    private staticObstacleDefinitions:
        readonly StaticObstacleDefinition[] = [];

    // -------------------------------------------------------
    // Core Gameplay Entities
    // -------------------------------------------------------

    private ball:
        Ball | null = null;

    private hole:
        Hole | null = null;

    private connector:
        Connector | null = null;

    private club:
        Club | null = null;

    private aimIndicator:
        AimIndicator | null = null;

    private shotFeedback:
        ShotFeedback | null = null;

    constructor(
        app:
            Application,

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

        this.worldContainer =
            new Container();

        this.screenOverlayContainer =
            new Container();

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

        this.surfaceSystem =
            new SurfaceSystem(
                SurfaceType.Grass,
            );

        this.windTuningController =
            new WindTuningController(
                this.windManager,
            );
    }

    // -------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------

    public initialize():
        void {

        this.app.stage.addChild(
            this.worldContainer,
        );

        this.app.stage.addChild(
            this.screenOverlayContainer,
        );

        this.createCourse();

        if (
            SURFACE_TEST_ZONES_ENABLED
        ) {
            this.createPhase2SurfaceZones();

            this.createSurfaceGraphics();

            this.unsubscribeFromSurfaceChanges =
                this.surfaceSystem
                    .subscribeToChanges(
                        (): void => {

                            this.drawSurfaceGraphics();
                        },
                    );
        }

        this.createWindVisualizer();

        this.createCameraActivationDebugGraphics();

        this.createPerformanceDebugOverlay();

        // ---------------------------------------------------
        // Procedural Obstacle Field
        // ---------------------------------------------------

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
                this.surfaceSystem,
            );

        this.addEntity(
            this.ball,
        );

        this.unsubscribeFromBallImpacts =
            this.ball
                .subscribeToImpacts(
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

        // ---------------------------------------------------
        // Create Hole
        // ---------------------------------------------------

        this.hole =
            new Hole(
                this.ball,
                DEFAULT_HOLE_DEFINITION,
            );

        this.addEntity(
            this.hole,
        );

        const ballDisplayIndex =
            this.worldContainer
                .getChildIndex(
                    this.ball
                        .getContainer(),
                );

        this.worldContainer
            .setChildIndex(
                this.hole
                    .getContainer(),
                ballDisplayIndex,
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

        this.connector
            .initialize();

        const connectorGraphics =
            this.connector
                .getGraphics();

        if (
            !connectorGraphics
        ) {
            throw new Error(
                "World could not initialize because the Connector graphics do not exist.",
            );
        }

        const ballWorldIndex =
            this.worldContainer
                .getChildIndex(
                    this.ball
                        .getContainer(),
                );

        this.worldContainer
            .addChildAt(
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

        this.applyCameraTransform();
    }

    public resizeViewport(
        viewportWidth:
            number,

        viewportHeight:
            number,
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

        this.performanceDebugOverlay
            ?.setViewportSize(
                viewportWidth,
                viewportHeight,
            );
    }

    public updateCamera(
        deltaTime:
            number,
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
        deltaTime:
            number,
    ): void {

        this.surfaceSystem
            .update(
                deltaTime,
            );

        this.windVisualizer
            ?.update(
                deltaTime,
            );

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

        this.performanceDebugOverlay
            ?.update(
                deltaTime,
            );
    }

    public destroy():
        void {

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

        this.connector
            ?.destroy();

        this.connector =
            null;

        this.unsubscribeFromBallImpacts
            ?.();

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

        this.windVisualizer
            ?.destroy();

        this.windVisualizer =
            null;

        this.windManager
            .reset();

        this.unsubscribeFromSurfaceChanges
            ?.();

        this.unsubscribeFromSurfaceChanges =
            null;

        this.surfaceSystem
            .clearZones();

        this.cameraActivationDebugGraphics
            ?.destroy();

        this.cameraActivationDebugGraphics =
            null;

        this.performanceDebugOverlay
            ?.destroy();

        this.performanceDebugOverlay =
            null;

        this.surfaceGraphics
            ?.destroy();

        this.surfaceGraphics =
            null;

        this.courseBackground
            ?.destroy();

        this.courseBackground =
            null;

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

        this.hole =
            null;

        this.club =
            null;

        this.aimIndicator =
            null;

        this.shotFeedback =
            null;
    }

    // -------------------------------------------------------
    // Reset
    // -------------------------------------------------------

    public resetBall():
        void {

        if (
            !this.ball
        ) {
            return;
        }

        this.ball
            .resetToInitialPosition();

        this.hole
            ?.resetEntryState();

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
        entity:
            Entity,
    ): void {

        entity.initialize();

        this.entities.push(
            entity,
        );

        this.worldContainer.addChild(
            entity
                .getContainer(),
        );
    }

    public removeEntity(
        entity:
            Entity,
    ): void {

        const entityIndex =
            this.entities
                .indexOf(
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
            this.dynamicObstacles
                .indexOf(
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
            this.hole
        ) {
            this.hole =
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

    private applyCameraTransform():
        void {

        const requestedShakeOffset =
            this.cameraShake
                .getOffset();

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
    // Queries
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

    public getWorldContainer():
        Container {

        return this.worldContainer;
    }

    public getWindManager():
        WindManager {

        return this.windManager;
    }

    public getSurfaceSystem():
        SurfaceSystem {

        return this.surfaceSystem;
    }

    public getWindTuningController():
        WindTuningController {

        return this.windTuningController;
    }

    public getWindValidationMetrics():
        WindValidationMetrics {

        if (
            !this.windValidationMetrics
        ) {
            throw new Error(
                "Wind validation metrics are not available before World initialization.",
            );
        }

        return this.windValidationMetrics;
    }

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

    public getHole():
        Hole | null {

        return this.hole;
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
    // Wind Visualization
    // -------------------------------------------------------

    private createWindVisualizer():
        void {

        if (
            this.windVisualizer
        ) {
            throw new Error(
                "World wind visualizer has already been created.",
            );
        }

        this.windVisualizer =
            new WindVisualizer(
                this.windManager,
                this.camera,
            );

        /*
         * Course background occupies index 0.
         *
         * Insert wind immediately above the terrain.
         * If temporary surface visuals exist, they
         * remain above wind after this insertion.
         */
        this.worldContainer
            .addChildAt(
                this.windVisualizer
                    .getGraphics(),

                Math.min(
                    1,
                    this.worldContainer
                        .children
                        .length,
                ),
            );
    }

    // -------------------------------------------------------
    // Phase 2 Surface States
    // -------------------------------------------------------

    private createPhase2SurfaceZones():
        void {

        if (
            this.surfaceSystem
                .getZones()
                .length >
            0
        ) {
            throw new Error(
                "World surface zones have already been created.",
            );
        }

        for (
            const definition
            of PHASE_2_SURFACE_ZONES
        ) {
            this.surfaceSystem
                .addZone(
                    definition,
                );
        }

        this.surfaceSystem
            .setZoneState(
                "phase-2-wet-grass-zone",
                SurfaceState.Wet,
            );

        this.surfaceSystem
            .setZoneState(
                "phase-2-scorched-grass-zone",
                SurfaceState.Scorched,
            );

        this.surfaceSystem
            .setZoneState(
                "phase-2-wet-sand-zone",
                SurfaceState.Wet,
            );
    }

    private createSurfaceGraphics():
        void {

        if (
            this.surfaceGraphics
        ) {
            throw new Error(
                "World surface graphics have already been created.",
            );
        }

        this.surfaceGraphics =
            new Graphics();

        /*
         * Course background is index 0. Insert the
         * surface visualization immediately above it,
         * before obstacle/entity display objects.
         */
        this.worldContainer
            .addChildAt(
                this.surfaceGraphics,
                Math.min(
                    1,
                    this.worldContainer
                        .children
                        .length,
                ),
            );

        this.drawSurfaceGraphics();
    }

    private drawSurfaceGraphics():
        void {

        if (
            !this.surfaceGraphics
        ) {
            return;
        }

        this.surfaceGraphics
            .clear();

        for (
            const zone
            of this.surfaceSystem
                .getZones()
        ) {
            const definition =
                zone.getDefinition();

            const sample =
                this.surfaceSystem
                    .getSurfaceAt(
                        definition.x +
                        definition.width /
                        2,

                        definition.y +
                        definition.height /
                        2,
                    );

            const visual =
                this.getSurfaceVisual(
                    sample.surfaceType,
                    sample.surfaceState,
                );

            this.surfaceGraphics
                .rect(
                    definition.x,
                    definition.y,
                    definition.width,
                    definition.height,
                );

            this.surfaceGraphics
                .fill({
                    color:
                        visual.fillColor,

                    alpha:
                        visual.fillAlpha,
                });

            this.surfaceGraphics
                .rect(
                    definition.x,
                    definition.y,
                    definition.width,
                    definition.height,
                );

            this.surfaceGraphics
                .stroke({
                    width:
                        PHASE_2_SURFACE_VISUALS
                            .outlineWidth,

                    color:
                        visual.outlineColor,

                    alpha:
                        PHASE_2_SURFACE_VISUALS
                            .outlineAlpha,
                });
        }
    }

    private getSurfaceVisual(
        surfaceType:
            SurfaceType,

        surfaceState:
            SurfaceState,
    ): {
        readonly fillColor: number;
        readonly fillAlpha: number;
        readonly outlineColor: number;
    } {

        if (
            surfaceType ===
            SurfaceType.Grass
        ) {
            switch (
            surfaceState
            ) {
                case SurfaceState.Wet:
                    return PHASE_2_SURFACE_VISUALS
                        .wetGrass;

                case SurfaceState.Scorched:
                    return PHASE_2_SURFACE_VISUALS
                        .scorchedGrass;

                case SurfaceState.Normal:
                    return PHASE_2_SURFACE_VISUALS
                        .normalGrass;

                default:
                    throw new Error(
                        `Unsupported Grass surface state '${surfaceState}'.`,
                    );
            }
        }

        if (
            surfaceType ===
            SurfaceType.Sand
        ) {
            switch (
            surfaceState
            ) {
                case SurfaceState.Wet:
                    return PHASE_2_SURFACE_VISUALS
                        .wetSand;

                case SurfaceState.Dry:
                    return PHASE_2_SURFACE_VISUALS
                        .drySand;

                default:
                    throw new Error(
                        `Unsupported Sand surface state '${surfaceState}'.`,
                    );
            }
        }

        throw new Error(
            `Unsupported surface type '${surfaceType}'.`,
        );
    }

    // -------------------------------------------------------
    // Performance Debug Overlay
    // -------------------------------------------------------

    private createPerformanceDebugOverlay():
        void {

        if (
            this.performanceDebugOverlay
        ) {
            throw new Error(
                "World performance debug overlay has already been created.",
            );
        }

        this.performanceDebugOverlay =
            new PerformanceDebugOverlay();

        this.performanceDebugOverlay
            .setViewportSize(
                this.camera
                    .getViewportWidth(),

                this.camera
                    .getViewportHeight(),
            );

        this.screenOverlayContainer
            .addChild(
                this.performanceDebugOverlay
                    .getContainer(),
            );
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

        this.screenOverlayContainer
            .addChild(
                this.cameraActivationDebugGraphics,
            );

        this.drawCameraActivationDebugGraphics();
    }

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

    private createCourse():
        void {

        if (
            this.courseBackground
        ) {
            throw new Error(
                "World course background has already been created.",
            );
        }

        const terrainTexture =
            AssetLoader
                .getTexture(
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

        this.courseBackground
            .position
            .set(
                DEFAULT_COURSE_BOUNDARY_DEFINITION
                    .minimumX,

                DEFAULT_COURSE_BOUNDARY_DEFINITION
                    .minimumY,
            );

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

        this.worldContainer
            .addChildAt(
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
            )
        ) {
            throw new Error(
                "Course terrainTint must be a finite number.",
            );
        }
    }
}

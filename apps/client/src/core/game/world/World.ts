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
    DEFAULT_FIRE_TEST_DEFINITION,
} from "../config/FireTestDefinition";

import {
    DEFAULT_WIND_VISUAL_DEFINITION,
} from "../config/WindVisualDefinition";

import {
    DEFAULT_LOCAL_WIND_VISUAL_DEFINITION,
} from "../config/LocalWindDefinition";

import {
    DEFAULT_HOLE_DEFINITION,
} from "../config/HoleDefinition";

import {
    FireDirectionalValidation,
} from "../debug/FireDirectionalValidation";

import type {
    FireDirectionalValidationState,
    FireDirectionalValidationStateListener,
} from "../debug/FireDirectionalValidation";

import {
    DEFAULT_FIRE_WIND_TEST_DEFINITION,
    getFireWindTestConfiguration,
} from "../config/FireWindTestDefinition";

import type {
    FireWindTestConfigurationId,
} from "../config/FireWindTestDefinition";

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
    Fan,
} from "../entities/mechanisms/Fan";

import {
    DynamicObstacle,
} from "../entities/obstacles/DynamicObstacle";

import {
    StaticObstacle,
} from "../entities/obstacles/StaticObstacle";

import {
    FireManager,
} from "../environment/FireManager";

import {
    FireVisualizer,
} from "../environment/FireVisualizer";

import {
    EnvironmentField,
} from "../environment/EnvironmentField";

import {
    EnvironmentFieldVisualizer,
} from "../environment/EnvironmentFieldVisualizer";

import {
    WindManager,
} from "../environment/WindManager";

import {
    WindVisualizer,
} from "../environment/WindVisualizer";

import {
    LocalWindSystem,
} from "../environment/LocalWindSystem";

import {
    LocalWindVisualizer,
} from "../environment/LocalWindVisualizer";

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
     * Development-only world-space surface visualization.
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

    private readonly localWindSystem:
        LocalWindSystem;

    private localWindVisualizer:
        LocalWindVisualizer | null =
        null;

    private readonly fans:
        Fan[] = [];

    private readonly surfaceSystem:
        SurfaceSystem;

    private readonly environmentField:
        EnvironmentField;

    private environmentFieldVisualizer:
        EnvironmentFieldVisualizer | null =
        null;

    private readonly fireManager:
        FireManager;

    private fireVisualizer:
        FireVisualizer | null =
        null;

    private fireDirectionalValidation:
        FireDirectionalValidation | null =
        null;

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

        this.localWindSystem =
            new LocalWindSystem(
                getFireWindTestConfiguration(
                    DEFAULT_FIRE_WIND_TEST_DEFINITION
                        .defaultConfigurationId,
                ).sources,
            );

        this.surfaceSystem =
            new SurfaceSystem(
                SurfaceType.Grass,
            );

        this.environmentField =
            new EnvironmentField(
                this.surfaceSystem,
            );

        this.fireManager =
            new FireManager(
                this.surfaceSystem,
                this.environmentField,
                this.localWindSystem,
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
        }

        if (
            DEFAULT_FIRE_TEST_DEFINITION
                .enabled
        ) {
            this.createPhase4FireTestSurfaceZones();
        }

        if (
            SURFACE_TEST_ZONES_ENABLED ||
            DEFAULT_FIRE_TEST_DEFINITION
                .enabled
        ) {
            this.createSurfaceGraphics();

            this.unsubscribeFromSurfaceChanges =
                this.surfaceSystem
                    .subscribeToChanges(
                        (): void => {

                            this.drawSurfaceGraphics();
                        },
                    );
        }

        if (
            DEFAULT_WIND_VISUAL_DEFINITION
                .enabled
        ) {
            this.createWindVisualizer();
        }

        this.createLocalWindVisualizer();

        this.createFanEntities();

        this.createEnvironmentFieldVisualizer();

        this.createFireVisualizer();

        this.createFireDirectionalValidation();

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
                this.localWindSystem,
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

        this.fireManager
            .update(
                deltaTime,
            );

        this.fireDirectionalValidation
            ?.update();

        this.windVisualizer
            ?.update(
                deltaTime,
            );

        this.localWindVisualizer
            ?.update(
                deltaTime,
            );

        this.environmentFieldVisualizer
            ?.update();

        this.fireVisualizer
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

        this.fireDirectionalValidation
            ?.destroy();

        this.fireDirectionalValidation =
            null;

        this.fireVisualizer
            ?.destroy();

        this.fireVisualizer =
            null;

        this.fireManager
            .setValidationRandomSeed(
                null,
            );

        this.fireManager
            .reset();

        this.environmentFieldVisualizer
            ?.destroy();

        this.environmentFieldVisualizer =
            null;

        this.environmentField
            .reset();

        this.localWindVisualizer
            ?.destroy();

        this.localWindVisualizer =
            null;

        this.fans.length =
            0;

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
            .clearStateRegions();

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
    // Fire / Wind Test Harness
    // -------------------------------------------------------

    public applyFireWindTestConfiguration(
        configurationId:
            FireWindTestConfigurationId,
    ): void {

        const configuration =
            getFireWindTestConfiguration(
                configurationId,
            );

        this.resetFireTestState();
        this.destroyFanEntities();
        this.localWindSystem.replaceSources(configuration.sources);
        this.createFanEntities();
    }

    public igniteTestFireAtScreenPosition(
        screenX: number,
        screenY: number,
    ): boolean {

        if (
            !Number.isFinite(screenX) ||
            !Number.isFinite(screenY)
        ) {
            return false;
        }

        const worldX =
            screenX + this.camera.getPositionX();

        const worldY =
            screenY + this.camera.getPositionY();

        const sampledWind =
            this.localWindSystem
                .getAccelerationAt(
                    worldX,
                    worldY,
                );

        this.fireManager
            .setValidationRandomSeed(
                DEFAULT_FIRE_WIND_TEST_DEFINITION
                    .deterministicSeed,
            );

        const ignited =
            this.fireManager
                .igniteArea(
                    worldX,
                    worldY,
                    DEFAULT_FIRE_WIND_TEST_DEFINITION
                        .ignitionRadius,
                    DEFAULT_FIRE_WIND_TEST_DEFINITION
                        .ignitionCount,
                ) >
            0;

        if (ignited) {
            this.fireDirectionalValidation
                ?.begin(
                    worldX,
                    worldY,
                    sampledWind.x,
                    sampledWind.y,
                );

            console.log(
                "Fire directional validation started.",
                {
                    ignitionX:
                        worldX,
                    ignitionY:
                        worldY,
                    windX:
                        sampledWind.x,
                    windY:
                        sampledWind.y,
                },
            );
        }

        return ignited;
    }

    public resetFireTestState(): void {

        this.fireManager.reset();

        this.fireManager
            .setValidationRandomSeed(
                null,
            );

        this.fireDirectionalValidation
            ?.reset();

        this.environmentField.reset();

        this.surfaceSystem.removeStateRegionsByIdPrefix(
            "fire-scorch-",
        );

        this.environmentFieldVisualizer?.update();
    }

    private createFireDirectionalValidation():
        void {

        if (
            this.fireDirectionalValidation
        ) {
            throw new Error(
                "World Fire directional validation has already been created.",
            );
        }

        this.fireDirectionalValidation =
            new FireDirectionalValidation(
                this.fireManager,
                DEFAULT_FIRE_WIND_TEST_DEFINITION
                    .minimumDirectionalDisplacement,
                DEFAULT_FIRE_WIND_TEST_DEFINITION
                    .directionMatchThreshold,
                DEFAULT_FIRE_WIND_TEST_DEFINITION
                    .minimumDownwindToUpwindRatio,
                DEFAULT_FIRE_WIND_TEST_DEFINITION
                    .debugArrowLength,
                DEFAULT_FIRE_WIND_TEST_DEFINITION
                    .debugArrowHeadLength,
            );

        this.worldContainer
            .addChild(
                this.fireDirectionalValidation
                    .getGraphics(),
            );
    }

    public getFireDirectionalValidationState():
        FireDirectionalValidationState | null {

        return this.fireDirectionalValidation
            ?.getState() ??
            null;
    }

    public subscribeToFireDirectionalValidation(
        listener:
            FireDirectionalValidationStateListener,
    ): () => void {

        if (
            !this.fireDirectionalValidation
        ) {
            throw new Error(
                "Fire directional validation is unavailable before World initialization.",
            );
        }

        return this.fireDirectionalValidation
            .subscribe(
                listener,
            );
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

    public getLocalWindSystem():
        LocalWindSystem {

        return this.localWindSystem;
    }

    public getFans():
        readonly Fan[] {

        return this.fans;
    }

    public getSurfaceSystem():
        SurfaceSystem {

        return this.surfaceSystem;
    }

    public getEnvironmentField():
        EnvironmentField {

        return this.environmentField;
    }

    public getFireManager():
        FireManager {

        return this.fireManager;
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
    // Environment Field Visualization
    // -------------------------------------------------------

    private createEnvironmentFieldVisualizer():
        void {

        if (
            this.environmentFieldVisualizer
        ) {
            throw new Error(
                "World environment field visualizer has already been created.",
            );
        }

        this.environmentFieldVisualizer =
            new EnvironmentFieldVisualizer(
                this.app,
                this.environmentField,
            );

        this.worldContainer
            .addChild(
                this.environmentFieldVisualizer
                    .getContainer(),
            );

        this.environmentFieldVisualizer
            .update();
    }

    // -------------------------------------------------------
    // Fire
    // -------------------------------------------------------

    private createFireVisualizer():
        void {

        if (
            this.fireVisualizer
        ) {
            throw new Error(
                "World fire visualizer has already been created.",
            );
        }

        this.fireVisualizer =
            new FireVisualizer(
                this.fireManager,
            );

        /*
         * Fire is world-space presentation. At this point
         * initialization has not created gameplay entities,
         * so adding it now keeps it above terrain/surface
         * state visuals and below obstacles/entities.
         */
        this.worldContainer
            .addChild(
                this.fireVisualizer
                    .getContainer(),
            );
    }

    private createPhase4FireTestSurfaceZones():
        void {

        this.surfaceSystem
            .addZone(
                DEFAULT_FIRE_TEST_DEFINITION
                    .sandBlocker,
            );
    }

    // -------------------------------------------------------
    // Local Wind / Fan Test Mechanisms
    // -------------------------------------------------------

    private createLocalWindVisualizer():
        void {

        if (
            this.localWindVisualizer
        ) {
            throw new Error(
                "World local wind visualizer has already been created.",
            );
        }

        if (
            !DEFAULT_LOCAL_WIND_VISUAL_DEFINITION
                .enabled
        ) {
            return;
        }

        this.localWindVisualizer =
            new LocalWindVisualizer(
                this.localWindSystem,
            );

        this.worldContainer
            .addChildAt(
                this.localWindVisualizer
                    .getGraphics(),

                Math.min(
                    1,
                    this.worldContainer
                        .children
                        .length,
                ),
            );
    }

    private destroyFanEntities(): void {

        for (
            let index = this.fans.length - 1;
            index >= 0;
            index -= 1
        ) {
            const fan = this.fans[index];

            if (fan) {
                this.removeEntity(fan);
            }
        }

        this.fans.length = 0;
    }

    private createFanEntities():
        void {

        if (
            this.fans.length >
            0
        ) {
            throw new Error(
                "World Fan entities have already been created.",
            );
        }

        for (
            const source
            of this.localWindSystem
                .getSources()
        ) {
            if (
                !source.enabled ||
                source.id.startsWith(
                    "fire-validation-field-",
                )
            ) {
                continue;
            }

            const fan =
                new Fan(
                    source,
                );

            this.fans.push(
                fan,
            );

            this.addEntity(
                fan,
            );
        }
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
         * Surface-state visuals remain above wind.
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
    // Surface States
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

        if (this.surfaceGraphics) {
            throw new Error(
                "World surface graphics have already been created.",
            );
        }

        this.surfaceGraphics =
            new Graphics();

        this.worldContainer.addChildAt(
            this.surfaceGraphics,
            Math.min(
                2,
                this.worldContainer.children.length,
            ),
        );
    }

    private drawSurfaceGraphics():
        void {

        this.surfaceGraphics
            ?.clear();
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

        if (this.courseBackground) {
            throw new Error(
                "World course background has already been created.",
            );
        }

        const minX =
            DEFAULT_COURSE_BOUNDARY_DEFINITION.minimumX;

        const minY =
            DEFAULT_COURSE_BOUNDARY_DEFINITION.minimumY;

        const width =
            DEFAULT_COURSE_BOUNDARY_DEFINITION.maximumX -
            minX;

        const height =
            DEFAULT_COURSE_BOUNDARY_DEFINITION.maximumY -
            minY;

        this.courseBackground =
            new TilingSprite({
                texture:
                    AssetLoader.getTexture(
                        this.courseVisualDefinition
                            .grassTextureKey,
                    ),
                width,
                height,
            });

        this.courseBackground.position.set(
            minX,
            minY,
        );

        this.courseBackground.tileScale.set(
            this.courseVisualDefinition
                .grassTileScale,
        );

        this.courseBackground.alpha =
            this.courseVisualDefinition
                .terrainAlpha;

        this.worldContainer.addChildAt(
            this.courseBackground,
            0,
        );

        this.createSandTexture();
    }

    private createSandTexture():
        void {

        const definition =
            DEFAULT_FIRE_TEST_DEFINITION
                .sandBlocker;

        const sand =
            new TilingSprite({
                texture:
                    AssetLoader.getTexture(
                        this.courseVisualDefinition
                            .sandTextureKey,
                    ),
                width:
                    definition.width,
                height:
                    definition.height,
            });

        sand.position.set(
            definition.x,
            definition.y,
        );

        sand.tileScale.set(
            this.courseVisualDefinition
                .sandTileScale,
        );

        sand.alpha =
            this.courseVisualDefinition
                .terrainAlpha;

        this.worldContainer.addChildAt(
            sand,
            Math.min(
                1,
                this.worldContainer.children.length,
            ),
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
            definition.grassTextureKey.trim().length === 0 ||
            definition.sandTextureKey.trim().length === 0
        ) {
            throw new Error(
                "Course terrain texture keys cannot be empty.",
            );
        }

        if (
            !Number.isFinite(definition.grassTileScale) ||
            !Number.isFinite(definition.sandTileScale) ||
            !Number.isFinite(definition.terrainAlpha)
        ) {
            throw new Error(
                "Course visual definition values must be finite.",
            );
        }

        if (
            definition.grassTileScale <= 0 ||
            definition.sandTileScale <= 0
        ) {
            throw new Error(
                "Course terrain tile scales must be greater than zero.",
            );
        }

        if (
            definition.terrainAlpha < 0 ||
            definition.terrainAlpha > 1
        ) {
            throw new Error(
                "Course terrain alpha must be between zero and one.",
            );
        }
    }

}

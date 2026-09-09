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
    getPerformanceBenchmarkDefinition,
} from "../config/PerformanceBenchmarkDefinition";

import type {
    PerformanceBenchmarkDefinition,
    PerformanceBenchmarkFireTubeDefinition,
    PerformanceBenchmarkId,
} from "../config/PerformanceBenchmarkDefinition";

import {
    DEFAULT_FIRE_TEST_DEFINITION,
} from "../config/FireTestDefinition";

import {
    DEFAULT_HOLE_DEFINITION,
} from "../config/HoleDefinition";

import {
    DEFAULT_BALL_TRAIL_DEFINITION,
} from "../config/BallTrailDefinition";

import {
    FireDirectionalValidation,
} from "../debug/FireDirectionalValidation";

import {
    FireFieldIgnitionValidation,
} from "../debug/FireFieldIgnitionValidation";

import type {
    FireFieldIgnitionValidationState,
} from "../debug/FireFieldIgnitionValidation";

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
    PerformanceMetrics,
} from "../debug/PerformanceMetrics";

import {
    LocalWindDebugVisualizer,
} from "../debug/LocalWindDebugVisualizer";

import {
    WaterFieldValidation,
} from "../debug/WaterFieldValidation";

import {
    WaterFieldVisualizer,
} from "../debug/WaterFieldVisualizer";

import {
    DEFAULT_WATER_DEBUG_DEFINITION,
} from "../config/WaterDebugDefinition";

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
    FireTube,
} from "../entities/mechanisms/FireTube";

import {
    DynamicObstacle,
} from "../entities/obstacles/DynamicObstacle";

import type {
    DynamicCollidable,
} from "../physics/DynamicCollidable";

import {
    DynamicCollisionSystem,
} from "../physics/DynamicCollisionSystem";

import {
    StaticObstacle,
} from "../entities/obstacles/StaticObstacle";

import {
    FireManager,
} from "../environment/FireManager";

import {
    FireSourceSystem,
} from "../environment/FireSourceSystem";

import {
    FireSourceVisualizer,
} from "../environment/FireSourceVisualizer";

import {
    FireVfxSystem,
} from "../fire-vfx/FireVfxSystem";

import {
    WindVfxSystem,
} from "../wind-vfx/WindVfxSystem";

import {
    BallTrail,
} from "../vfx/BallTrail";

import {
    EnvironmentField,
} from "../environment/EnvironmentField";

import {
    WaterField,
} from "../environment/WaterField";

import {
    WindManager,
} from "../environment/WindManager";

import {
    LocalWindSystem,
} from "../environment/LocalWindSystem";

import {
    SurfaceSystem,
} from "../surface/SurfaceSystem";

import {
    SurfaceType,
} from "../surface/SurfaceType";

import {
    ShotFeedback,
} from "../ui/ShotFeedback";

import {
    AssetLoader,
} from "../../rendering/AssetLoader";

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

    private readonly performanceMetrics:
        PerformanceMetrics =
        new PerformanceMetrics();

    private activePerformanceBenchmark:
        PerformanceBenchmarkDefinition | null =
        null;

    private fireVfxEnabled =
        true;

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

    private windVfxSystem:
        WindVfxSystem | null =
        null;

    private localWindDebugVisualizer:
        LocalWindDebugVisualizer | null =
        null;

    private readonly localWindSystem:
        LocalWindSystem;

    private readonly fans:
        Fan[] = [];

    private readonly fireTubes:
        FireTube[] = [];

    private readonly surfaceSystem:
        SurfaceSystem;

    private readonly environmentField:
        EnvironmentField;

    /**
     * Phase 8A authoritative standing-Water storage.
     *
     * WaterField is deliberately independent from EnvironmentField during
     * 8A. Surface moisture, Fire response, Ball response, and Water VFX are
     * connected in later Water phases.
     */
    private readonly waterField:
        WaterField;

    private readonly fireManager:
        FireManager;

    private readonly fireSourceSystem:
        FireSourceSystem;

    private fireSourceVisualizer:
        FireSourceVisualizer | null =
        null;

    private fireVfxSystem:
        FireVfxSystem | null =
        null;

    private fireDirectionalValidation:
        FireDirectionalValidation | null =
        null;

    private fireFieldIgnitionValidation:
        FireFieldIgnitionValidation | null =
        null;

    private waterFieldValidation:
        WaterFieldValidation | null =
        null;

    private waterFieldVisualizer:
        WaterFieldVisualizer | null =
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

    /**
     * Shared live collection consumed by Ball. It contains generic dynamic
     * obstacles plus interactive mechanisms such as Fans.
     */
    private readonly dynamicCollidables:
        DynamicCollidable[] = [];

    /**
     * Phase G mechanism-only collision collection.
     *
     * Ball continues to consume dynamicCollidables. This collection is kept
     * deliberately narrower so this phase adds only:
     *
     * Fan <-> Fan
     * Fan <-> FireTube
     * FireTube <-> FireTube
     */
    private readonly mechanismCollidables:
        DynamicCollidable[] = [];

    private readonly dynamicCollisionSystem:
        DynamicCollisionSystem;

    private staticObstacleDefinitions:
        readonly StaticObstacleDefinition[] = [];

    // -------------------------------------------------------
    // Core Gameplay Entities
    // -------------------------------------------------------

    private ball:
        Ball | null = null;

    /**
     * H2 presentation-only motion trail.
     *
     * Ball remains the sole authority for position and velocity.
     */
    private ballTrail:
        BallTrail | null = null;

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

        this.waterField =
            new WaterField();

        this.fireSourceSystem =
            new FireSourceSystem(
                this.environmentField,
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

        this.dynamicCollisionSystem =
            new DynamicCollisionSystem();
    }

    // -------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------

    public initialize():
        void {

        /*
         * G1 render-order invariant.
         *
         * Explicit zIndex values are used for interaction-critical entities so
         * later-created Fans or Fire Tubes can never cover the Golf Club.
         */
        this.worldContainer.sortableChildren =
            true;

        this.app.stage.addChild(
            this.worldContainer,
        );

        this.app.stage.addChild(
            this.screenOverlayContainer,
        );

        this.createCourse();

        if (
            DEFAULT_FIRE_TEST_DEFINITION
                .enabled
        ) {
            this.createPhase4FireTestSurfaceZones();
        }

        if (
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

        this.createWindVfxSystem();

        this.createLocalWindDebugVisualizer();

        this.createFanEntities();


        this.createFireSourceVisualizer();

        this.createFireVfxSystem();

        this.createFireDirectionalValidation();

        this.createFireFieldIgnitionValidation();

        this.createWaterFieldValidation();

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

            this.dynamicCollidables.push(
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
                this.dynamicCollidables,
                this.windManager,
                this.surfaceSystem,
                this.localWindSystem,
            );

        this.addEntity(
            this.ball,
        );

        this.createBallTrail();

        this.createWaterFieldVisualizer();

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

        this.createFireTubeEntities();

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

        /*
         * The Club is the player's world-space interaction tool and must
         * remain readable above mechanisms regardless of creation order.
         */
        this.club
            .getContainer()
            .zIndex =
            1000;

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

        /*
         * Phase 8A-3 authoritative Water depth transport.
         *
         * Water remains independent from surfaces, Fire, Wind, Ball physics,
         * and presentation at this stage.
         */
        this.waterField
            .update(
                deltaTime,
            );

        this.waterFieldVisualizer
            ?.update(
                deltaTime,
            );

        this.fireSourceSystem
            .update(
                deltaTime,
            );

        this.fireManager
            .update(
                deltaTime,
            );

        this.fireDirectionalValidation
            ?.update();

        this.fireFieldIgnitionValidation
            ?.update(
                deltaTime,
            );

        this.fireSourceVisualizer
            ?.update();

        if (
            this.fireVfxEnabled
        ) {
            this.fireVfxSystem
                ?.update(
                    deltaTime,
                );
        }

        for (
            const entity
            of this.entities
        ) {
            entity.update(
                deltaTime,
            );
        }

        /*
         * H2. Sample the Ball only after its authoritative physics update.
         * The trail is presentation-only and never feeds state back into Ball.
         */
        this.ballTrail
            ?.update(
                deltaTime,
            );

        /*
         * G2/G3. Resolve physical mechanism pairs only after their rigid-body
         * integration for this frame. The shared response solver applies
         * penetration correction, normal impulse, friction and angular
         * impulse.
         */
        this.dynamicCollisionSystem
            .resolve(
                this.mechanismCollidables,
            );

        /*
         * Collision correction can change mechanism positions after their
         * normal update. Synchronize their visual/environmental transforms
         * immediately so Wind and Fire never lag one frame behind physics.
         */
        for (
            const fan
            of this.fans
        ) {
            fan.synchronizeAfterCollisionResolution();
        }

        for (
            const fireTube
            of this.fireTubes
        ) {
            fireTube.synchronizeAfterCollisionResolution();
        }

        this.forceBenchmarkFireTubeSourcesIfRequired();

        this.localWindDebugVisualizer
            ?.update();

        this.windVfxSystem
            ?.update(
                deltaTime,
            );

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

        this.performanceMetrics
            .update(
                deltaTime,
            );

        this.performanceDebugOverlay
            ?.update(
                deltaTime,
                this.performanceMetrics
                    .getSnapshot(),
                {
                    benchmarkLabel:
                        this.activePerformanceBenchmark
                            ?.label ??
                        "Normal Runtime",

                    windVfxEnabled:
                        this.windVfxSystem
                            ?.isEnabled() ??
                        false,

                    fireVfxEnabled:
                        this.fireVfxEnabled,

                    fanCount:
                        this.fans.length,

                    fireTubeCount:
                        this.fireTubes.length,

                    windParticleCount:
                        this.windVfxSystem
                            ?.getActiveParticleCount() ??
                        0,

                    windParticleCapacity:
                        this.windVfxSystem
                            ?.getParticleCapacity() ??
                        0,

                    fireParticleCount:
                        this.fireVfxSystem
                            ?.getActiveParticleCount() ??
                        0,

                    fireParticleCapacity:
                        this.fireVfxSystem
                            ?.getParticleCapacity() ??
                        0,

                    fireCellCount:
                        this.fireManager
                            .getActiveCellCount(),
                },
            );
    }

    public destroy():
        void {

        this.ballTrail
            ?.destroy();

        this.ballTrail =
            null;

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

        this.dynamicCollidables.length =
            0;

        this.mechanismCollidables.length =
            0;

        this.fireTubes.length =
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

        this.fireFieldIgnitionValidation =
            null;

        this.waterFieldValidation =
            null;

        this.waterFieldVisualizer
            ?.destroy();

        this.waterFieldVisualizer =
            null;

        this.fireSourceVisualizer
            ?.destroy();

        this.fireSourceVisualizer =
            null;

        this.fireSourceSystem
            .clearSources();

        this.fireVfxSystem
            ?.destroy();

        this.fireVfxSystem =
            null;

        this.fireManager
            .setValidationRandomSeed(
                null,
            );

        this.fireManager
            .reset();

        this.fireVfxSystem
            ?.reset();

        this.environmentField
            .reset();

        this.waterField
            .reset();

        this.localWindDebugVisualizer
            ?.destroy();

        this.localWindDebugVisualizer =
            null;

        this.windVfxSystem
            ?.destroy();

        this.windVfxSystem =
            null;

        this.fans.length =
            0;

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

        this.performanceMetrics
            .reset();

        this.activePerformanceBenchmark =
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

        this.ballTrail
            ?.reset();

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
    // Fire Source Debug Bridge
    // -------------------------------------------------------

    public setFireSourceDebugVisible(visible: boolean): void {
        this.fireSourceVisualizer?.setDebugVisible(visible);
    }

    public isFireSourceDebugVisible(): boolean {
        return this.fireSourceVisualizer?.isDebugVisible() ?? false;
    }

    private getWorldPositionFromScreen(
        screenX: number,
        screenY: number,
    ): {
        readonly x: number;
        readonly y: number;
    } | null {

        if (
            !Number.isFinite(screenX) ||
            !Number.isFinite(screenY)
        ) {
            return null;
        }

        return this.camera
            .viewportToWorld(
                screenX,
                screenY,
            );
    }

    // -------------------------------------------------------
    // G4/G5 Performance Benchmark Harness
    // -------------------------------------------------------

    public applyPerformanceBenchmark(
        benchmarkId:
            PerformanceBenchmarkId,
    ): void {

        const benchmark =
            getPerformanceBenchmarkDefinition(
                benchmarkId,
            );

        /*
         * Clear authoritative Fire/environment state before replacing
         * mechanisms. This prevents the previous benchmark's heat, burn,
         * particles or FireCells from contaminating the next measurement.
         */
        this.resetFireTestState();

        this.destroyFanEntities();
        this.destroyFireTubeEntities();

        this.localWindSystem
            .replaceSources(
                benchmark.fanSources,
            );

        this.windManager
            .setWind(
                benchmark
                    .globalWindDirectionDegrees,

                benchmark
                    .globalWindStrength,
            );

        this.createFanEntities();

        this.createBenchmarkFireTubeEntities(
            benchmark.fireTubes,
        );

        this.fireManager
            .setValidationRandomSeed(
                benchmark
                    .fireRandomSeed,
            );

        this.windVfxSystem
            ?.setEnabled(
                benchmark
                    .windVfxEnabled,
            );

        this.setFireVfxEnabled(
            benchmark
                .fireVfxEnabled,
        );

        this.activePerformanceBenchmark =
            benchmark;

        this.forceBenchmarkFireTubeSourcesIfRequired();

        this.performanceMetrics
            .beginProfiling(
                benchmark.profiling,
            );

        this.performanceDebugOverlay
            ?.resetDisplay();

        console.log(
            "Performance benchmark applied.",
            {
                id:
                    benchmark.id,

                fans:
                    benchmark
                        .fanSources
                        .length,

                fireTubes:
                    benchmark
                        .fireTubes
                        .length,

                windVfxEnabled:
                    benchmark
                        .windVfxEnabled,

                fireVfxEnabled:
                    benchmark
                        .fireVfxEnabled,

                warmupSeconds:
                    benchmark.profiling.warmupSeconds,

                measurementSeconds:
                    benchmark.profiling.measurementSeconds,
            },
        );
    }

    public clearPerformanceBenchmark():
        void {

        if (
            !this.activePerformanceBenchmark
        ) {
            return;
        }

        this.resetFireTestState();

        this.destroyFanEntities();
        this.destroyFireTubeEntities();

        const normalConfiguration =
            getFireWindTestConfiguration(
                DEFAULT_FIRE_WIND_TEST_DEFINITION
                    .defaultConfigurationId,
            );

        this.localWindSystem
            .replaceSources(
                normalConfiguration
                    .sources,
            );

        this.windManager
            .reset();

        this.createFanEntities();
        this.createFireTubeEntities();

        this.windVfxSystem
            ?.setEnabled(
                true,
            );

        this.setFireVfxEnabled(
            true,
        );

        this.fireManager
            .setValidationRandomSeed(
                null,
            );

        this.activePerformanceBenchmark =
            null;

        this.performanceMetrics
            .reset();

        this.performanceDebugOverlay
            ?.resetDisplay();
    }

    public getActivePerformanceBenchmarkId():
        PerformanceBenchmarkId | null {

        return this.activePerformanceBenchmark
            ?.id ??
            null;
    }

    public getPerformanceSnapshot() {
        return this.performanceMetrics
            .getSnapshot();
    }

    private setFireVfxEnabled(
        enabled:
            boolean,
    ): void {

        this.fireVfxEnabled =
            enabled;

        if (
            !this.fireVfxSystem
        ) {
            return;
        }

        if (!enabled) {
            this.fireVfxSystem
                .reset();
        }

        this.fireVfxSystem
            .getContainer()
            .visible =
            enabled;
    }

    private forceBenchmarkFireTubeSourcesIfRequired():
        void {

        if (
            !this.activePerformanceBenchmark
                ?.forceFireTubesFiring
        ) {
            return;
        }

        for (
            const definition
            of this.activePerformanceBenchmark
                .fireTubes
        ) {
            this.fireSourceSystem
                .setSourceEnabled(
                    definition.sourceId,
                    true,
                );
        }
    }

    // -------------------------------------------------------
    // Fire / Wind Test Harness
    // -------------------------------------------------------

    public applyFireWindTestConfiguration(
        configurationId:
            FireWindTestConfigurationId,
    ): void {

        if (
            this.activePerformanceBenchmark
        ) {
            this.clearPerformanceBenchmark();
        }

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

        const worldPosition =
            this.getWorldPositionFromScreen(
                screenX,
                screenY,
            );

        if (!worldPosition) {
            return false;
        }

        const worldX =
            worldPosition.x;

        const worldY =
            worldPosition.y;

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

    public resetActiveFireOnly(): void {

        this.fireManager.reset();

        this.fireVfxSystem
            ?.resetActiveFireOnly();

        this.fireManager
            .setValidationRandomSeed(
                null,
            );

        this.fireDirectionalValidation
            ?.reset();

        this.fireFieldIgnitionValidation
            ?.reset();

        /*
         * EnvironmentField is intentionally NOT reset here.
         * Fuel depletion, burn and scorch persist so the same
         * ground can be tested for re-ignition.
         */
    }

    public resetFireEnvironment(): void {

        this.resetFireTestState();
    }

    public resetFireTestState(): void {

        this.fireManager.reset();

        this.fireVfxSystem
            ?.reset();

        this.fireManager
            .setValidationRandomSeed(
                null,
            );

        this.fireDirectionalValidation
            ?.reset();

        this.fireFieldIgnitionValidation
            ?.reset();

        this.removeNonFireTubeSources();

        for (
            const fireTube
            of this.fireTubes
        ) {
            fireTube.resetCycle();
        }

        this.environmentField.reset();

        this.surfaceSystem.removeStateRegionsByIdPrefix(
            "fire-scorch-",
        );
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
    // Fire Field-Ignition Validation
    // -------------------------------------------------------

    private createFireFieldIgnitionValidation():
        void {

        if (
            this.fireFieldIgnitionValidation
        ) {
            throw new Error(
                "World Fire field ignition validation has already been created.",
            );
        }

        this.fireFieldIgnitionValidation =
            new FireFieldIgnitionValidation(
                this.fireManager,
            );
    }

    public getFireFieldIgnitionValidationState():
        FireFieldIgnitionValidationState | null {

        return this.fireFieldIgnitionValidation
            ?.getState() ??
            null;
    }

    // -------------------------------------------------------
    // Water Field Validation
    // -------------------------------------------------------

    private createWaterFieldValidation():
        void {

        if (
            this.waterFieldValidation
        ) {
            throw new Error(
                "World WaterField validation has already been created.",
            );
        }

        this.waterFieldValidation =
            new WaterFieldValidation(
                this.waterField,
            );

        this.waterFieldValidation
            .run();
    }

    public getWaterFieldValidationState() {

        return this.waterFieldValidation
            ?.getState() ??
            null;
    }

    // -------------------------------------------------------
    // Water Field Debug Visualization
    // -------------------------------------------------------

    private createWaterFieldVisualizer():
        void {

        if (
            this.waterFieldVisualizer
        ) {
            throw new Error(
                "World WaterField visualizer has already been created.",
            );
        }

        if (
            !this.ball
        ) {
            throw new Error(
                "World WaterField visualizer requires the Ball to be initialized first.",
            );
        }

        this.waterFieldVisualizer =
            new WaterFieldVisualizer(
                this.waterField,
            );

        /*
         * Phase 8A-6 temporary visible deposit.
         *
         * Position it relative to the initialized Ball so it always begins
         * inside the initial gameplay viewport. Phase 8B replaces this with
         * real Water sources such as the sprinkler.
         */
        if (
            DEFAULT_WATER_DEBUG_DEFINITION
                .enabled &&
            DEFAULT_WATER_DEBUG_DEFINITION
                .createValidationDeposit
        ) {
            const ballContainer =
                this.ball
                    .getContainer();

            this.waterField
                .injectWaterWithMomentum(
                    ballContainer.x +
                    DEFAULT_WATER_DEBUG_DEFINITION
                        .validationDepositOffsetX,

                    ballContainer.y +
                    DEFAULT_WATER_DEBUG_DEFINITION
                        .validationDepositOffsetY,

                    DEFAULT_WATER_DEBUG_DEFINITION
                        .validationDepositAmount,

                    DEFAULT_WATER_DEBUG_DEFINITION
                        .validationDepositVelocityX,

                    DEFAULT_WATER_DEBUG_DEFINITION
                        .validationDepositVelocityY,
                );
        }

        this.worldContainer
            .addChild(
                this.waterFieldVisualizer
                    .getGraphics(),
            );

        this.waterFieldVisualizer
            .redrawImmediately();
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

        if (
            entity instanceof DynamicObstacle
        ) {
            const dynamicObstacleIndex =
                this.dynamicObstacles
                    .indexOf(
                        entity,
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
        }

        if (
            entity instanceof DynamicObstacle ||
            entity instanceof Fan ||
            entity instanceof FireTube
        ) {
            const dynamicCollidableIndex =
                this.dynamicCollidables
                    .indexOf(
                        entity,
                    );

            if (
                dynamicCollidableIndex !==
                -1
            ) {
                this.dynamicCollidables.splice(
                    dynamicCollidableIndex,
                    1,
                );
            }
        }

        if (
            entity instanceof Fan ||
            entity instanceof FireTube
        ) {
            const mechanismCollidableIndex =
                this.mechanismCollidables
                    .indexOf(
                        entity,
                    );

            if (
                mechanismCollidableIndex !==
                -1
            ) {
                this.mechanismCollidables.splice(
                    mechanismCollidableIndex,
                    1,
                );
            }
        }

        if (
            entity instanceof Fan
        ) {
            const fanIndex =
                this.fans.indexOf(
                    entity,
                );

            if (
                fanIndex !==
                -1
            ) {
                this.fans.splice(
                    fanIndex,
                    1,
                );
            }
        }

        if (
            entity instanceof FireTube
        ) {
            const fireTubeIndex =
                this.fireTubes.indexOf(
                    entity,
                );

            if (fireTubeIndex !== -1) {
                this.fireTubes.splice(
                    fireTubeIndex,
                    1,
                );
            }
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

        const zoom =
            this.camera
                .getZoom();

        const requestedShakeOffset =
            this.cameraShake
                .getOffset();

        /*
         * CameraShake offsets are presentation-space pixels.
         *
         * Camera boundary distances are world-space values, so they are
         * multiplied by zoom before clamping the screen-space shake.
         */
        const minimumShakeOffsetX =
            (
                this.camera
                    .getPositionX() -
                this.camera
                    .getMaximumPositionX()
            ) *
            zoom;

        const maximumShakeOffsetX =
            (
                this.camera
                    .getPositionX() -
                this.camera
                    .getMinimumPositionX()
            ) *
            zoom;

        const minimumShakeOffsetY =
            (
                this.camera
                    .getPositionY() -
                this.camera
                    .getMaximumPositionY()
            ) *
            zoom;

        const maximumShakeOffsetY =
            (
                this.camera
                    .getPositionY() -
                this.camera
                    .getMinimumPositionY()
            ) *
            zoom;

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

        /*
         * Scale world-space presentation while keeping the screen overlay
         * unscaled. Authoritative gameplay coordinates remain unchanged.
         */
        this.worldContainer
            .scale
            .set(
                zoom,
            );

        this.worldContainer
            .position
            .set(
                -this.camera
                    .getPositionX() *
                zoom +
                safeShakeOffsetX,

                -this.camera
                    .getPositionY() *
                zoom +
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

    public setLocalWindDebugVisible(
        visible:
            boolean,
    ): void {
        this.localWindDebugVisualizer
            ?.setVisible(
                visible,
            );
    }

    public isLocalWindDebugVisible():
        boolean {
        return this.localWindDebugVisualizer
            ?.isVisible() ??
            false;
    }

    public getFans():
        readonly Fan[] {

        return this.fans;
    }

    public getFireTubes():
        readonly FireTube[] {

        return this.fireTubes;
    }

    public getSurfaceSystem():
        SurfaceSystem {

        return this.surfaceSystem;
    }

    public getEnvironmentField():
        EnvironmentField {

        return this.environmentField;
    }

    public getWaterField():
        WaterField {

        return this.waterField;
    }

    public getFireManager():
        FireManager {

        return this.fireManager;
    }

    public getFireSourceSystem():
        FireSourceSystem {

        return this.fireSourceSystem;
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
    // Ball Trail
    // -------------------------------------------------------

    private createBallTrail():
        void {

        if (
            this.ballTrail
        ) {
            throw new Error(
                "World Ball trail has already been created.",
            );
        }

        if (
            !this.ball
        ) {
            throw new Error(
                "World cannot create the Ball trail before the Ball exists.",
            );
        }

        this.ballTrail =
            new BallTrail(
                this.ball,
                DEFAULT_BALL_TRAIL_DEFINITION,
            );

        const ballContainer =
            this.ball
                .getContainer();

        const ballDisplayIndex =
            this.worldContainer
                .getChildIndex(
                    ballContainer,
                );

        /*
         * Keep the trail immediately behind the Ball in world-space.
         * Both retain the normal zIndex so terrain ordering remains intact.
         */
        this.worldContainer
            .addChildAt(
                this.ballTrail
                    .getContainer(),
                Math.max(
                    0,
                    ballDisplayIndex,
                ),
            );
    }

    // -------------------------------------------------------
    // Fire Sources
    // -------------------------------------------------------

    private createFireSourceVisualizer():
        void {

        if (
            this.fireSourceVisualizer
        ) {
            throw new Error(
                "World Fire source visualizer has already been created.",
            );
        }

        this.fireSourceVisualizer =
            new FireSourceVisualizer(
                this.fireSourceSystem,
            );

        this.worldContainer
            .addChild(
                this.fireSourceVisualizer
                    .getContainer(),
            );

        this.fireSourceVisualizer
            .update();
    }

    // -------------------------------------------------------
    // Fire
    // -------------------------------------------------------

    private createFireVfxSystem():
        void {

        if (
            this.fireVfxSystem
        ) {
            throw new Error(
                "World Fire VFX system has already been created.",
            );
        }

        this.fireVfxSystem =
            new FireVfxSystem(
                this.fireManager,
                this.fireSourceSystem,
                this.environmentField,
                this.localWindSystem,
            );

        /*
         * FIRE-VFX-5 normal runtime Fire presentation path.
         *
         * GroundFireEmitter reads FireManager.
         * JetFireEmitter reads Directional FireSource records.
         * Both feed the same pooled particle material.
         *
         * FireSourceSystem remains authoritative for Jet heat deposition and
         * source direction. VFX remains presentation-only.
         *
         * The container is world-space and presentation-only.
         */
        this.worldContainer
            .addChild(
                this.fireVfxSystem
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

    private destroyFanEntities():
        void {

        while (
            this.fans.length >
            0
        ) {
            const fan =
                this.fans[
                this.fans.length -
                1
                ];

            if (!fan) {
                this.fans.pop();

                continue;
            }

            this.removeEntity(
                fan,
            );
        }
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
                    this.localWindSystem,
                );

            this.fans.push(
                fan,
            );

            this.dynamicCollidables.push(
                fan,
            );

            this.mechanismCollidables.push(
                fan,
            );

            this.addEntity(
                fan,
            );
        }
    }

    // -------------------------------------------------------
    // Fire Tube Mechanisms
    // -------------------------------------------------------

    private destroyFireTubeEntities():
        void {

        for (
            let index =
                this.fireTubes.length -
                1;

            index >=
            0;

            index -=
            1
        ) {
            const fireTube =
                this.fireTubes[
                index
                ];

            if (
                fireTube
            ) {
                this.removeEntity(
                    fireTube,
                );
            }
        }

        this.fireTubes.length =
            0;
    }

    private createBenchmarkFireTubeEntities(
        definitions:
            readonly PerformanceBenchmarkFireTubeDefinition[],
    ): void {

        if (
            this.fireTubes.length >
            0
        ) {
            throw new Error(
                "World Fire Tube entities have already been created.",
            );
        }

        for (
            const definition
            of definitions
        ) {
            const fireTube =
                new FireTube(
                    definition.sourceId,
                    definition.positionX,
                    definition.positionY,
                    definition.rotationRadians,
                    this.fireSourceSystem,
                );

            this.fireTubes.push(
                fireTube,
            );

            this.dynamicCollidables.push(
                fireTube,
            );

            this.mechanismCollidables.push(
                fireTube,
            );

            this.addEntity(
                fireTube,
            );
        }
    }

    private createFireTubeEntities(): void {
        if (this.fireTubes.length > 0) {
            throw new Error(
                "World Fire Tube entities have already been created.",
            );
        }

        const count =
            2 +
            Math.floor(
                Math.random() * 2,
            );

        const positions:
            { readonly x: number; readonly y: number }[] = [];

        for (
            let index = 0;
            index < count;
            index += 1
        ) {
            const position =
                this.findFireTubeSpawnPosition(
                    positions,
                );

            positions.push(
                position,
            );

            const fireTube =
                new FireTube(
                    `fire-tube-${index + 1}`,
                    position.x,
                    position.y,
                    Math.random() * Math.PI * 2 - Math.PI,
                    this.fireSourceSystem,
                );

            this.fireTubes.push(
                fireTube,
            );

            this.dynamicCollidables.push(
                fireTube,
            );

            this.mechanismCollidables.push(
                fireTube,
            );

            this.addEntity(
                fireTube,
            );
        }
    }

    private findFireTubeSpawnPosition(
        existingPositions:
            readonly { readonly x: number; readonly y: number }[],
    ): { readonly x: number; readonly y: number } {
        const boundary =
            DEFAULT_COURSE_BOUNDARY_DEFINITION;

        const margin = 180;
        const minimumSeparation = 360;
        const obstacleSeparation = 150;
        const gameplayEntitySeparation = 260;

        for (
            let attempt = 0;
            attempt < 80;
            attempt += 1
        ) {
            const x =
                boundary.minimumX +
                margin +
                Math.random() *
                (
                    boundary.maximumX -
                    boundary.minimumX -
                    margin * 2
                );

            const y =
                boundary.minimumY +
                margin +
                Math.random() *
                (
                    boundary.maximumY -
                    boundary.minimumY -
                    margin * 2
                );

            const tooCloseToAnotherTube =
                existingPositions.some(
                    (position): boolean =>
                        Math.hypot(
                            x - position.x,
                            y - position.y,
                        ) < minimumSeparation,
                );

            if (tooCloseToAnotherTube) {
                continue;
            }

            const tooCloseToStaticObstacle =
                this.staticObstacleDefinitions.some(
                    (obstacle): boolean =>
                        Math.hypot(
                            x - obstacle.positionX,
                            y - obstacle.positionY,
                        ) < obstacleSeparation,
                );

            if (tooCloseToStaticObstacle) {
                continue;
            }

            const tooCloseToDynamicObstacle =
                this.dynamicObstacles.some(
                    (obstacle): boolean =>
                        Math.hypot(
                            x - obstacle.getX(),
                            y - obstacle.getY(),
                        ) < obstacleSeparation,
                );

            if (tooCloseToDynamicObstacle) {
                continue;
            }

            const tooCloseToFan =
                this.fans.some(
                    (fan): boolean =>
                        Math.hypot(
                            x - fan.getX(),
                            y - fan.getY(),
                        ) < obstacleSeparation,
                );

            if (tooCloseToFan) {
                continue;
            }

            const tooCloseToBall =
                this.ball
                    ? Math.hypot(
                        x - this.ball.getX(),
                        y - this.ball.getY(),
                    ) < gameplayEntitySeparation
                    : false;

            const tooCloseToHole =
                this.hole
                    ? Math.hypot(
                        x - this.hole.getX(),
                        y - this.hole.getY(),
                    ) < gameplayEntitySeparation
                    : false;

            if (
                tooCloseToBall ||
                tooCloseToHole
            ) {
                continue;
            }

            return { x, y };
        }

        /*
         * Extremely unlikely fallback. It remains safely inside the course
         * even if a very dense procedural obstacle layout rejects all tries.
         */
        return {
            x:
                (boundary.minimumX + boundary.maximumX) / 2 +
                existingPositions.length * 240,
            y:
                (boundary.minimumY + boundary.maximumY) / 2,
        };
    }

    private removeNonFireTubeSources(): void {
        const sourceIdsToRemove =
            this.fireSourceSystem
                .getSources()
                .filter(
                    (source): boolean =>
                        !source.getId().startsWith(
                            "fire-tube-",
                        ),
                )
                .map(
                    (source): string =>
                        source.getId(),
                );

        for (
            const sourceId
            of sourceIdsToRemove
        ) {
            this.fireSourceSystem.removeSource(
                sourceId,
            );
        }
    }

    // -------------------------------------------------------
    // Local Wind Debug Visualization
    // -------------------------------------------------------

    private createLocalWindDebugVisualizer():
        void {

        if (this.localWindDebugVisualizer) {
            throw new Error(
                "World Local Wind debug visualizer has already been created.",
            );
        }

        this.localWindDebugVisualizer =
            new LocalWindDebugVisualizer(
                this.localWindSystem,
            );

        /*
         * Debug geometry is placed above the normal Wind VFX so the exact
         * simulation volume remains readable while diagnosing particle
         * placement. It remains presentation-only.
         */
        this.worldContainer
            .addChild(
                this.localWindDebugVisualizer
                    .getGraphics(),
            );
    }

    // -------------------------------------------------------
    // Wind Visualization
    // -------------------------------------------------------

    private createWindVfxSystem():
        void {

        if (this.windVfxSystem) {
            throw new Error(
                "World Wind VFX system has already been created.",
            );
        }

        this.windVfxSystem =
            new WindVfxSystem(
                this.windManager,
                this.localWindSystem,
                this.camera,
            );

        this.worldContainer
            .addChildAt(
                this.windVfxSystem
                    .getContainer(),
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

        /*
         * Render the striped Grass texture at a larger scale so each mowing
         * band reads as a broad golf-fairway stripe instead of a dense
         * pinstripe pattern.
         *
         * This is presentation-only. Surface physics and camera zoom remain
         * unchanged.
         */
        this.courseBackground.tileScale.set(
            this.courseVisualDefinition
                .grassTileScale *
            3,
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

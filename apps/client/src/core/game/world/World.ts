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
    DEFAULT_FIRE_MOISTURE_TEST_DEFINITION,
} from "../config/FireMoistureTestDefinition";

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
    FireSourceSystem,
} from "../environment/FireSourceSystem";

import {
    FireSourceVisualizer,
} from "../environment/FireSourceVisualizer";

import {
    FireSourceTestController,
} from "../debug/FireSourceTestController";

import {
    FireVfxSystem,
} from "../fire-vfx/FireVfxSystem";

import {
    FireSourceType,
} from "../config/FireSourceDefinition";

import {
    DEFAULT_FIRE_SOURCE_TEST_DEFINITION,
} from "../config/FireSourceTestDefinition";

import {
    DEFAULT_DIRECTIONAL_FIRE_SOURCE_DEFINITION,
} from "../config/DirectionalFireSourceDefinition";

import {
    EnvironmentField,
} from "../environment/EnvironmentField";

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

    /**
     * Development-only visualization of continuous moisture test bands.
     * EnvironmentField remains authoritative; this Graphics object is
     * presentation only.
     */
    private fireMoistureTestGraphics:
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

    private readonly fireManager:
        FireManager;

    private readonly fireSourceSystem:
        FireSourceSystem;

    private readonly fireSourceTestController:
        FireSourceTestController;

    private fireSourceVisualizer:
        FireSourceVisualizer | null =
        null;

    private fireSourceTestSequence =
        0;

    private fireVisualizer:
        FireVisualizer | null =
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

        this.fireSourceSystem =
            new FireSourceSystem(
                this.environmentField,
            );

        this.fireSourceTestController =
            new FireSourceTestController(
                this.fireSourceSystem,
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
            DEFAULT_FIRE_MOISTURE_TEST_DEFINITION
                .enabled
        ) {
            this.applyFireMoistureTestLayout();
            this.createFireMoistureTestGraphics();
        }

        if (
            DEFAULT_WIND_VISUAL_DEFINITION
                .enabled
        ) {
            this.createWindVisualizer();
        }

        this.createLocalWindVisualizer();

        this.createFanEntities();


        this.createFireSourceVisualizer();

        this.createFireVisualizer();

        this.createFireVfxSystem();

        this.createFireDirectionalValidation();

        this.createFireFieldIgnitionValidation();

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

        this.fireSourceTestController
            .update(
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

        this.windVisualizer
            ?.update(
                deltaTime,
            );

        this.localWindVisualizer
            ?.update(
                deltaTime,
            );

        this.fireSourceVisualizer
            ?.update();

        this.fireVisualizer
            ?.update(
                deltaTime,
            );

        this.fireVfxSystem
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

        this.fireFieldIgnitionValidation =
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

        this.fireVfxSystem
            ?.reset();

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

        this.fireMoistureTestGraphics
            ?.destroy();

        this.fireMoistureTestGraphics =
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
    // Fire Source Test Bridge
    // -------------------------------------------------------

    public placePointFireSourceAtScreenPosition(
        screenX: number,
        screenY: number,
    ): boolean {

        const worldPosition =
            this.getWorldPositionFromScreen(
                screenX,
                screenY,
            );

        if (!worldPosition) {
            return false;
        }

        this.fireSourceTestSequence +=
            1;

        this.fireSourceSystem.addSource({
            id:
                `fire-test-point-${this.fireSourceTestSequence}`,
            type:
                FireSourceType.Point,
            enabled:
                true,
            positionX:
                worldPosition.x,
            positionY:
                worldPosition.y,
            radius:
                DEFAULT_FIRE_SOURCE_TEST_DEFINITION
                    .pointRadius,
            heatAmount:
                DEFAULT_FIRE_SOURCE_TEST_DEFINITION
                    .pointHeatAmount,
        });

        return true;
    }

    public placePersistentFireSourceAtScreenPosition(
        screenX: number,
        screenY: number,
    ): boolean {

        const worldPosition =
            this.getWorldPositionFromScreen(
                screenX,
                screenY,
            );

        if (!worldPosition) {
            return false;
        }

        this.fireSourceTestSequence +=
            1;

        this.fireSourceSystem.addSource({
            id:
                `fire-test-persistent-${this.fireSourceTestSequence}`,
            type:
                FireSourceType.Persistent,
            enabled:
                true,
            positionX:
                worldPosition.x,
            positionY:
                worldPosition.y,
            radius:
                DEFAULT_FIRE_SOURCE_TEST_DEFINITION
                    .persistentRadius,
            heatPerSecond:
                DEFAULT_FIRE_SOURCE_TEST_DEFINITION
                    .persistentHeatPerSecond,
        });

        return true;
    }

    public placeDirectionalFireSourceAtScreenPositions(
        originScreenX: number,
        originScreenY: number,
        targetScreenX: number,
        targetScreenY: number,
    ): boolean {

        const origin =
            this.getWorldPositionFromScreen(
                originScreenX,
                originScreenY,
            );

        const target =
            this.getWorldPositionFromScreen(
                targetScreenX,
                targetScreenY,
            );

        if (!origin || !target) {
            return false;
        }

        const deltaX =
            target.x -
            origin.x;

        const deltaY =
            target.y -
            origin.y;

        const dragLengthSquared =
            deltaX * deltaX +
            deltaY * deltaY;

        /*
         * Reject a near-zero drag because it does not provide a stable
         * directional intent.
         */
        if (dragLengthSquared < 16) {
            return false;
        }

        const tuning =
            DEFAULT_DIRECTIONAL_FIRE_SOURCE_DEFINITION;

        this.fireSourceTestSequence +=
            1;

        this.fireSourceSystem.addSource({
            id:
                `fire-test-directional-${this.fireSourceTestSequence}`,
            type:
                FireSourceType.Directional,
            enabled:
                true,
            positionX:
                origin.x,
            positionY:
                origin.y,
            directionRadians:
                Math.atan2(
                    deltaY,
                    deltaX,
                ),
            length:
                tuning.length,
            halfWidth:
                tuning.halfWidth,
            heatPerSecond:
                tuning.heatPerSecond,
            endHeatMultiplier:
                tuning.endHeatMultiplier,
        });

        return true;
    }

    public placeSweepingFireSourceAtScreenPositions(
        originScreenX: number,
        originScreenY: number,
        targetScreenX: number,
        targetScreenY: number,
    ): boolean {
        const origin = this.getWorldPositionFromScreen(originScreenX, originScreenY);
        const target = this.getWorldPositionFromScreen(targetScreenX, targetScreenY);
        if (!origin || !target) return false;
        const dx = target.x - origin.x;
        const dy = target.y - origin.y;
        if (dx * dx + dy * dy < 16) return false;
        const tuning = DEFAULT_DIRECTIONAL_FIRE_SOURCE_DEFINITION;
        const initialDirection = Math.atan2(dy, dx);
        this.fireSourceTestSequence += 1;
        const sourceId = `fire-test-sweeping-${this.fireSourceTestSequence}`;
        this.fireSourceSystem.addSource({
            id: sourceId,
            type: FireSourceType.Directional,
            enabled: true,
            positionX: origin.x,
            positionY: origin.y,
            directionRadians: initialDirection,
            length: tuning.length,
            halfWidth: tuning.halfWidth,
            heatPerSecond: tuning.heatPerSecond,
            endHeatMultiplier: tuning.endHeatMultiplier,
        });
        this.fireSourceTestController.registerSweepingSource(sourceId, initialDirection);
        return true;
    }

    public clearFireSources():
        void {

        this.fireSourceTestController.clear();
        this.fireSourceSystem.clearSources();
    }

    public getActiveFireSourceCount(): number {
        return this.fireSourceSystem.getActiveSourceCount();
    }

    public setFireSourceDebugVisible(visible: boolean): void {
        this.fireSourceVisualizer?.setDebugVisible(visible);
    }

    public isFireSourceDebugVisible(): boolean {
        return this.fireSourceVisualizer?.isDebugVisible() ?? false;
    }

    public setAllFireSourcesEnabled(
        enabled: boolean,
    ): void {

        for (
            const source
            of this.fireSourceSystem
                .getSources()
        ) {
            source.setEnabled(
                enabled,
            );
        }
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

        return {
            x:
                screenX +
                this.camera.getPositionX(),

            y:
                screenY +
                this.camera.getPositionY(),
        };
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
            ?.reset();

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

        this.fireSourceTestController.clear();
        this.fireSourceSystem.clearSources();

        this.fireSourceTestSequence =
            0;

        this.environmentField.reset();

        if (
            DEFAULT_FIRE_MOISTURE_TEST_DEFINITION
                .enabled
        ) {
            this.applyFireMoistureTestLayout();
        }

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
    // Fire Moisture Test Harness
    // -------------------------------------------------------

    private applyFireMoistureTestLayout():
        void {

        for (
            const band
            of DEFAULT_FIRE_MOISTURE_TEST_DEFINITION
                .bands
        ) {
            this.environmentField
                .setMoistureInRectangle(
                    band.x,
                    band.y,
                    band.width,
                    band.height,
                    band.moisture,
                );
        }
    }

    private createFireMoistureTestGraphics():
        void {

        if (
            this.fireMoistureTestGraphics
        ) {
            throw new Error(
                "World Fire moisture test graphics have already been created.",
            );
        }

        if (
            !DEFAULT_FIRE_MOISTURE_TEST_DEFINITION
                .enabled
        ) {
            return;
        }

        this.fireMoistureTestGraphics =
            new Graphics();

        for (
            const band
            of DEFAULT_FIRE_MOISTURE_TEST_DEFINITION
                .bands
        ) {
            this.fireMoistureTestGraphics
                .rect(
                    band.x,
                    band.y,
                    band.width,
                    band.height,
                )
                .fill({
                    color:
                        band.color,
                    alpha:
                        DEFAULT_FIRE_MOISTURE_TEST_DEFINITION
                            .overlayAlpha,
                })
                .stroke({
                    width:
                        2,
                    color:
                        DEFAULT_FIRE_MOISTURE_TEST_DEFINITION
                            .outlineColor,
                    alpha:
                        DEFAULT_FIRE_MOISTURE_TEST_DEFINITION
                            .outlineAlpha,
                });
        }

        /*
         * Keep the test overlay directly above terrain and below Fire,
         * Wind presentation, obstacles, and gameplay entities.
         */
        this.worldContainer
            .addChildAt(
                this.fireMoistureTestGraphics,
                Math.min(
                    2,
                    this.worldContainer
                        .children
                        .length,
                ),
            );

        console.log(
            "Fire moisture test bands active.",
            DEFAULT_FIRE_MOISTURE_TEST_DEFINITION
                .bands
                .map(
                    (band) => ({
                        label:
                            band.label,
                        moisture:
                            band.moisture,
                        x:
                            band.x,
                        y:
                            band.y,
                        width:
                            band.width,
                        height:
                            band.height,
                    }),
                ),
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
                this.environmentField,
            );

        /*
         * Phase 4B-6E-R1/R2 installs only the cheap connected burning base.
         * Experimental metaball/noise/cluster renderers and ember emitters
         * are intentionally inactive while we establish the FPS baseline.
         *
         * The container is world-space and presentation-only.
         */
        this.worldContainer
            .addChild(
                this.fireVfxSystem
                    .getContainer(),
            );
    }

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

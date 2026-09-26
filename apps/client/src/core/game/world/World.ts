// O6 final Water optimization: integration remains behavior-neutral; Water gameplay logic stays in its owning systems.
import {
    Application,
    Container,
    Graphics,
    Text,
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
    DEFAULT_FIRE_ROBOT_DEFINITION,
    DEFAULT_WATER_ROBOT_DEFINITION,
    DEFAULT_WIND_ROBOT_DEFINITION,
} from "../config/RobotDefinition";

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
    DEFAULT_HYDRANT_HOSE_DEFINITION,
} from "../config/HydrantHoseDefinition";

import {
    DEFAULT_BALL_TRAIL_DEFINITION,
} from "../config/BallTrailDefinition";

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
    PerformanceMetrics,
} from "../debug/PerformanceMetrics";

import {
    WaterPerformanceProfiler,
} from "../debug/WaterPerformanceProfiler";


import {
    DEFAULT_WORLD_PERFORMANCE_PROFILE_DEFINITION,
} from "../debug/WorldPerformanceProfileDefinition";

import {
    ScalarFieldTexture,
} from "../../rendering/ScalarFieldTexture";

import {
    LocalWindDebugVisualizer,
} from "../debug/LocalWindDebugVisualizer";

import {
    RobotDebugVisualizer,
} from "../debug/RobotDebugVisualizer";

import {
    HoseJetBallForceSystem,
} from "../physics/water/HoseJetBallForceSystem";
import {
    LocalWindDynamicForceSystem,
} from "../physics/wind/LocalWindDynamicForceSystem";
import {
    WindSuctionCaptureSystem,
} from "../physics/wind/WindSuctionCaptureSystem";
import { ROBOT_HOSE_JET_BALL_FORCE_DEFINITION } from "../config/HoseJetBallForceDefinition";
import { FireSourceType } from "../config/FireSourceDefinition";

import {
    StandingWaterRenderer,
} from "../water-vfx/StandingWaterRenderer";

import {
    WaterVfxSystem,
} from "../water-vfx/WaterVfxSystem";

import {
    SprinklerWaterVfx,
} from "../water-vfx/SprinklerWaterVfx";

import {
    HoseWaterVfx,
} from "../water-vfx/HoseWaterVfx";

import {
    WaterDepositDebugController,
} from "../debug/WaterDepositDebugController";

import {
    DEFAULT_WATER_DEBUG_DEFINITION,
} from "../config/WaterDebugDefinition";

import {
    AirborneWaterVisualizer,
} from "../debug/AirborneWaterVisualizer";

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
    RadialBumper,
} from "../entities/mechanisms/RadialBumper";

import {
    DirectionalBumper,
} from "../entities/mechanisms/DirectionalBumper";

import { RotatingPaddle } from "../entities/mechanisms/RotatingPaddle";

import {
    DirectionalBumperTargeting,
} from "../entities/mechanisms/DirectionalBumperTargeting";

import {
    DirectionalBumperImpactVfx,
} from "../entities/mechanisms/DirectionalBumperImpactVfx";

import {
    DirectionalBumperCollisionSystem,
} from "../physics/DirectionalBumperCollisionSystem";

import {
    DirectionalBumperWaterCollisionSystem,
} from "../physics/DirectionalBumperWaterCollisionSystem";
import { RotatingPaddleBallInteractionSystem } from "../physics/RotatingPaddleBallInteractionSystem";
import { RotatingPaddleDynamicInteractionSystem } from "../physics/RotatingPaddleDynamicInteractionSystem";
import { RotatingPaddleWaterCollisionSystem } from "../physics/RotatingPaddleWaterCollisionSystem";
import { RotatingPaddleCenterCollisionSystem } from "../physics/RotatingPaddleCenterCollisionSystem";
import { RotatingPaddleWaterDispersalSystem } from "../environment/RotatingPaddleWaterDispersalSystem";

import {
    FireTube,
} from "../entities/mechanisms/FireTube";

import {
    Sprinkler,
} from "../entities/mechanisms/Sprinkler";

import {
    HydrantHose,
} from "../entities/mechanisms/HydrantHose";

import {
    DynamicObstacle,
} from "../entities/obstacles/DynamicObstacle";

import {
    DynamicCollisionSystem,
} from "../physics/DynamicCollisionSystem";

import {
    DynamicStaticCollisionSystem,
} from "../physics/DynamicStaticCollisionSystem";

import {
    RadialBumperCollisionSystem,
} from "../physics/RadialBumperCollisionSystem";

import {
    PhysicsWorld,
} from "../physics/PhysicsWorld";

import {
    StaticCollisionResponderRegistry,
} from "../physics/StaticCollisionResponder";

import {
    HoseCollisionSystem,
} from "../physics/rope/HoseCollisionSystem";

import {
    StaticObstacle,
} from "../entities/obstacles/StaticObstacle";

import {
    Robot,
} from "../entities/robots/Robot";

import {
    RobotNavigationQuery,
} from "../entities/robots/RobotNavigationQuery";

import {
    RobotInteractionRegistry,
} from "../entities/robots/RobotInteractionRegistry";

import {
    FireManager,
} from "../environment/FireManager";

import {
    FireSourceSystem,
} from "../environment/FireSourceSystem";

import {
    WaterFireInteraction,
} from "../environment/WaterFireInteraction";

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
    MoistureSurfaceBridge,
} from "../environment/MoistureSurfaceBridge";

import {
    WaterField,
} from "../environment/WaterField";

import {
    WaterObstacleField,
} from "../environment/WaterObstacleField";

import {
    WaterObstacleRegistrationSystem,
} from "../environment/WaterObstacleRegistrationSystem";

import {
    WaterGroundInteractionSystem,
} from "../environment/WaterGroundInteractionSystem";

import {
    WaterSourceSystem,
} from "../environment/WaterSourceSystem";

import {
    AirborneWaterSystem,
} from "../environment/AirborneWaterSystem";

import {
    AirborneWaterCollisionField,
} from "../environment/AirborneWaterCollisionField";

import {
    AirborneWaterCollisionResponse,
} from "../environment/AirborneWaterCollisionResponse";

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

import {
    WorldRenderLayer,
} from "../../rendering/WorldRenderLayer";

import {
    WorldPresentationLayers,
} from "../../rendering/WorldPresentationLayers";

import {
    WetGroundRenderer,
} from "../../rendering/WetGroundRenderer";

import {
    PresentationVisibilityQuery,
} from "../../rendering/PresentationVisibilityQuery";

import {
    ContourRefreshScheduler,
} from "../../rendering/ContourRefreshScheduler";

import { RotatingPaddleWaterDispersalValidation } from "../debug/RotatingPaddleWaterDispersalValidation";

export class World {

    private readonly app:
        Application;

    private readonly worldContainer:
        Container;

    private readonly presentationLayers:
        WorldPresentationLayers;

    private readonly screenOverlayContainer:
        Container;

    private cameraActivationDebugGraphics:
        Graphics | null = null;

    private performanceSummaryText:
        Text | null = null;

    private readonly performanceMetrics:
        PerformanceMetrics =
        new PerformanceMetrics();

    private readonly waterPerformanceProfiler:
        WaterPerformanceProfiler =
        new WaterPerformanceProfiler(
            DEFAULT_WORLD_PERFORMANCE_PROFILE_DEFINITION,
        );

    private readonly contourRefreshScheduler =
        new ContourRefreshScheduler();

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

    /** Phase 8C-6F continuous ground-moisture texture presentation. */
    private wetGroundRenderer:
        WetGroundRenderer | null =
        null;

    private readonly courseVisualDefinition:
        CourseVisualDefinition;

    private readonly camera:
        Camera;

    private readonly presentationVisibilityQuery:
        PresentationVisibilityQuery;

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

    private readonly localWindDynamicForceSystem:
        LocalWindDynamicForceSystem;

    private readonly windSuctionCaptureSystem:
        WindSuctionCaptureSystem;

    private readonly fans:
        Fan[] = [];

    /** DB-5 deterministic multi-bumper test layout. */
    private readonly radialBumpers: RadialBumper[] = [];
    private readonly directionalBumpers: DirectionalBumper[] = [];
    private readonly directionalBumperImpactVfx: DirectionalBumperImpactVfx[] = [];

    /** RP-1 continuously powered surface mechanisms. */
    private readonly rotatingPaddles: RotatingPaddle[] = [];
    private readonly rotatingPaddleBallInteractionSystem = new RotatingPaddleBallInteractionSystem();
    private readonly rotatingPaddleDynamicInteractionSystem = new RotatingPaddleDynamicInteractionSystem();
    private readonly rotatingPaddleWaterCollisionSystem = new RotatingPaddleWaterCollisionSystem();
    private readonly rotatingPaddleCenterCollisionSystem = new RotatingPaddleCenterCollisionSystem();
    private readonly rotatingPaddleWaterDispersalSystem = new RotatingPaddleWaterDispersalSystem();
    private readonly rotatingPaddleWaterDispersalValidation = new RotatingPaddleWaterDispersalValidation();
    private rotatingPaddleWaterDiagnosticElapsed = 0;

    private readonly fireTubes:
        FireTube[] = [];

    /** Phase 8B-3 Water mechanisms. Stationary until the later physics step. */
    private readonly sprinklers:
        Sprinkler[] = [];

    /** Unregister callbacks for Sprinklers exposed to Robot perception/navigation. */
    private readonly sprinklerRobotInteractionUnregister =
        new Map<Sprinkler, () => void>();

    /** Phase 8B-10A fixed Hydrant with physical segmented Hose. */
    private hydrantHose:
        HydrantHose | null = null;

    /** General Hose-versus-world collision pass introduced by 8D-7C. */
    private hoseCollisionSystem:
        HoseCollisionSystem | null = null;

    /** Phase 8B-12 continuous Hose jet -> Ball gameplay response. */
    private hoseJetBallForceSystem:
        HoseJetBallForceSystem | null = null;
    private waterRobotJetBallForceSystem: HoseJetBallForceSystem | null = null;
    private secondWaterRobotJetBallForceSystem: HoseJetBallForceSystem | null = null;

    private readonly surfaceSystem:
        SurfaceSystem;

    private readonly environmentField:
        EnvironmentField;

    /** Phase 8C-6 continuous-moisture to categorical-surface adapter. */
    private readonly moistureSurfaceBridge:
        MoistureSurfaceBridge;

    /**
     * Phase 8A authoritative standing-Water storage.
     *
     * WaterField is deliberately independent from EnvironmentField during
     * 8A. Surface moisture, Fire response, Ball response, and Water VFX are
     * connected in later Water phases.
     */
    private readonly waterField:
        WaterField;

    /**
     * Phase 8D-1 cached Water-grid occupancy for static solid geometry.
     *
     * This foundation is intentionally not connected to WaterFlowSolver yet.
     */
    private readonly waterObstacleField:
        WaterObstacleField;

    /** Phase 8D-7 live gameplay-collider to Water-collider bridge. */
    private readonly waterObstacleRegistrationSystem:
        WaterObstacleRegistrationSystem;

    /** Phase 8C bridge between standing Water and ground environment state. */
    private readonly waterGroundInteractionSystem:
        WaterGroundInteractionSystem;

    /** Phase 8B registry/timing owner for Water-producing sources. */
    private readonly waterSourceSystem:
        WaterSourceSystem;

    /** Phase 8D-5 continuous static collision queries for airborne Water. */
    private readonly airborneWaterCollisionField:
        AirborneWaterCollisionField;

    /** RB-4 exceptional static-collider response policy for airborne Water. */
    private readonly airborneWaterCollisionResponse:
        AirborneWaterCollisionResponse;

    /** Phase 8B-2 authoritative transport for Water currently in flight. */
    private readonly airborneWaterSystem:
        AirborneWaterSystem;

    private readonly fireManager:
        FireManager;

    private readonly fireSourceSystem:
        FireSourceSystem;

    /** Phase 8F-1 policy boundary between Water and Fire simulations. */
    private readonly waterFireInteraction:
        WaterFireInteraction;

    private fireSourceVisualizer:
        FireSourceVisualizer | null =
        null;

    private fireVfxSystem:
        FireVfxSystem | null =
        null;

    private fireDirectionalValidation:
        FireDirectionalValidation | null =
        null;
    /** Phase 8I-1 production standing-Water presentation. */
    private standingWaterRenderer:
        StandingWaterRenderer | null =
        null;

    /** Phase 8I-4 shared presentation-only Water VFX foundation. */
    private waterVfxSystem:
        WaterVfxSystem | null =
        null;

    /** 8I-8A unsubscribe handle for the authoritative Ball splash event bridge. */
    private ballWaterSplashVfxUnsubscribe:
        (() => void) | null =
        null;

    /** Phase 8I-5 production Sprinkler Water presentation. */
    private sprinklerWaterVfx:
        SprinklerWaterVfx | null =
        null;

    /** Phase 8I-6A production Hose Water body presentation. */
    private hoseWaterVfx:
        HoseWaterVfx | null =
        null;

    /** Hose-style production stream for the Water Robot attack. */
    private waterRobotHoseVfx:
        HoseWaterVfx | null =
        null;

    private secondWaterRobotHoseVfx:
        HoseWaterVfx | null = null;

    /** Phase 8C-8A interactive primary-button Water deposit tool. */
    private waterDepositDebugController:
        WaterDepositDebugController | null =
        null;

    /** Phase 8B-4 presentation-only airborne Water stream debug view. */
    private airborneWaterVisualizer:
        AirborneWaterVisualizer | null =
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
     * Phase 8D-7E authoritative physical registration layer.
     *
     * World still owns gameplay entities. PhysicsWorld owns their collider
     * registration and exposes filtered stable views to collision consumers.
     */
    private readonly physicsWorld:
        PhysicsWorld;

    private readonly staticCollisionResponders:
        StaticCollisionResponderRegistry;

    private readonly robotInteractionRegistry:
        RobotInteractionRegistry;

    private readonly dynamicCollisionSystem:
        DynamicCollisionSystem;

    /** Phase 8D-7D movable gameplay objects versus fixed world geometry. */
    private readonly dynamicStaticCollisionSystem:
        DynamicStaticCollisionSystem;

    /** One contact-state system per bumper prevents cross-bumper latching. */
    private readonly radialBumperCollisionSystems: RadialBumperCollisionSystem[] = [];
    private readonly directionalBumperTargetingSystems: DirectionalBumperTargeting[] = [];
    private readonly directionalBumperCollisionSystems: DirectionalBumperCollisionSystem[] = [];
    private readonly directionalBumperWaterCollisionSystem = new DirectionalBumperWaterCollisionSystem();

    private staticObstacleDefinitions:
        readonly StaticObstacleDefinition[] = [];

    // -------------------------------------------------------
    // Core Gameplay Entities
    // -------------------------------------------------------

    private ball:
        Ball | null = null;

    /** R-2.1 autonomous enemy prototype with local obstacle avoidance. */
    private fireRobot:
        Robot | null = null;

    /** Water elemental variant using the shared Robot AI. */
    private waterRobot:
        Robot | null = null;

    private secondFireRobot: Robot | null = null;
    private secondWaterRobot: Robot | null = null;

    /** Wind elemental variant using shared Robot AI and Local Wind suction. */
    private windRobot: Robot | null = null;

    /** Second Wind Robot used by the expanded environmental stress-test scene. */
    private secondWindRobot: Robot | null = null;

    private robotDebugVisualizer:
        RobotDebugVisualizer | null = null;

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

        this.presentationLayers =
            new WorldPresentationLayers(
                this.worldContainer,
            );

        this.screenOverlayContainer =
            new Container();

        this.camera =
            new Camera(
                undefined,
                DEFAULT_COURSE_BOUNDARY_DEFINITION,
            );

        this.presentationVisibilityQuery =
            new PresentationVisibilityQuery(
                () => ({
                    minimumX: this.camera.getPositionX(),
                    minimumY: this.camera.getPositionY(),
                    maximumX:
                        this.camera.getPositionX() +
                        this.camera.getVisibleWorldWidth(),
                    maximumY:
                        this.camera.getPositionY() +
                        this.camera.getVisibleWorldHeight(),
                }),
            );

        this.cameraShake =
            new CameraShake();

        this.cameraFeedbackController =
            new CameraFeedbackController(
                this.cameraShake,
            );

        this.physicsWorld =
            new PhysicsWorld();

        this.staticCollisionResponders =
            new StaticCollisionResponderRegistry();

        this.robotInteractionRegistry =
            new RobotInteractionRegistry();

        this.windManager =
            new WindManager();

        this.localWindSystem =
            new LocalWindSystem(
                getFireWindTestConfiguration(
                    DEFAULT_FIRE_WIND_TEST_DEFINITION
                        .defaultConfigurationId,
                ).sources,
            );

        this.localWindDynamicForceSystem =
            new LocalWindDynamicForceSystem(
                this.localWindSystem,
                this.physicsWorld,
            );

        this.windSuctionCaptureSystem =
            new WindSuctionCaptureSystem(
                this.localWindSystem,
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

        this.waterObstacleField =
            new WaterObstacleField(
                this.waterField,
            );

        this.waterField
            .setObstacleField(
                this.waterObstacleField,
            );

        this.waterGroundInteractionSystem =
            new WaterGroundInteractionSystem(
                this.waterField,
                this.environmentField,
                this.surfaceSystem,
            );

        this.moistureSurfaceBridge =
            new MoistureSurfaceBridge(
                this.environmentField,
                this.surfaceSystem,
            );

        this.waterSourceSystem =
            new WaterSourceSystem();

        this.airborneWaterCollisionField =
            new AirborneWaterCollisionField();

        this.airborneWaterCollisionResponse =
            new AirborneWaterCollisionResponse();

        this.waterObstacleRegistrationSystem =
            new WaterObstacleRegistrationSystem(
                this.physicsWorld,
                this.waterObstacleField,
                this.airborneWaterCollisionField,
            );

        this.airborneWaterSystem =
            new AirborneWaterSystem(
                this.waterField,
                undefined,
                this.windManager,
                this.localWindSystem,
                this.airborneWaterCollisionField,
                this.airborneWaterCollisionResponse,
            );
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

        this.waterFireInteraction =
            new WaterFireInteraction();

        this.windTuningController =
            new WindTuningController(
                this.windManager,
            );

        this.dynamicCollisionSystem =
            new DynamicCollisionSystem();

        this.dynamicStaticCollisionSystem =
            new DynamicStaticCollisionSystem();

    }

    // -------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------

    public initialize():
        void {

        /*
         * Phase 8B-14B: WorldPresentationLayers now owns deterministic
         * world-space ordering. Entity creation order is no longer global
         * presentation order.
         */
        this.app.stage.addChild(
            this.worldContainer,
        );

        this.app.stage.addChild(
            this.screenOverlayContainer,
        );

        this.createPerformanceSummaryText();
        this.createCourse();


        this.createWetGroundRenderer();
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
        this.createCameraActivationDebugGraphics();

        ScalarFieldTexture
            .setPerformanceProfiler(
                this.waterPerformanceProfiler,
            );

        // ---------------------------------------------------
        // R-2.1 Robot Navigation Test Obstacles
        // ---------------------------------------------------

        this.staticObstacleDefinitions = [
            { id: "robot-test-square-1", shape: "rectangle", positionX: 760, positionY: 260, width: 72, height: 72, fillColor: 0x8b6f47, outlineColor: 0x2f2419, outlineWidth: 2.6, material: { restitution: 0.45, collisionFriction: 0.24 } },
            { id: "robot-test-square-2", shape: "rectangle", positionX: 980, positionY: 460, width: 108, height: 108, fillColor: 0x8b6f47, outlineColor: 0x2f2419, outlineWidth: 2.6, material: { restitution: 0.45, collisionFriction: 0.24 } },
            { id: "robot-test-square-3", shape: "rectangle", positionX: 1500, positionY: 240, width: 84, height: 84, fillColor: 0x8b6f47, outlineColor: 0x2f2419, outlineWidth: 2.6, material: { restitution: 0.45, collisionFriction: 0.24 } },
            { id: "robot-test-square-4", shape: "rectangle", positionX: 1620, positionY: 610, width: 128, height: 128, fillColor: 0x8b6f47, outlineColor: 0x2f2419, outlineWidth: 2.6, material: { restitution: 0.45, collisionFriction: 0.24 } },
            { id: "robot-test-square-5", shape: "rectangle", positionX: 1180, positionY: 720, width: 64, height: 64, fillColor: 0x8b6f47, outlineColor: 0x2f2419, outlineWidth: 2.6, material: { restitution: 0.45, collisionFriction: 0.24 } },
            { id: "robot-test-square-6", shape: "rectangle", positionX: 1840, positionY: 390, width: 96, height: 96, fillColor: 0x8b6f47, outlineColor: 0x2f2419, outlineWidth: 2.6, material: { restitution: 0.45, collisionFriction: 0.24 } },
            // Expanded stress-test blockers. These remain deterministic so FPS and
            // interaction comparisons are repeatable between runs.
            { id: "robot-test-square-7", shape: "rectangle", positionX: 560, positionY: 600, width: 88, height: 88, fillColor: 0x8b6f47, outlineColor: 0x2f2419, outlineWidth: 2.6, material: { restitution: 0.45, collisionFriction: 0.24 } },
            { id: "robot-test-square-8", shape: "rectangle", positionX: 1320, positionY: 300, width: 76, height: 112, fillColor: 0x8b6f47, outlineColor: 0x2f2419, outlineWidth: 2.6, material: { restitution: 0.45, collisionFriction: 0.24 } },
            { id: "robot-test-square-9", shape: "rectangle", positionX: 2050, positionY: 650, width: 112, height: 76, fillColor: 0x8b6f47, outlineColor: 0x2f2419, outlineWidth: 2.6, material: { restitution: 0.45, collisionFriction: 0.24 } },
            { id: "robot-test-square-10", shape: "rectangle", positionX: 2140, positionY: 220, width: 72, height: 104, fillColor: 0x8b6f47, outlineColor: 0x2f2419, outlineWidth: 2.6, material: { restitution: 0.45, collisionFriction: 0.24 } },
        ];

        for (const definition of this.staticObstacleDefinitions) {
            this.physicsWorld.registerStaticDefinition(definition);
            this.robotInteractionRegistry.registerStaticObstacle(definition);
            this.addEntity(new StaticObstacle(definition));
        }

        // ---------------------------------------------------
        // DB-5 Multi-bumper development layout
        // ---------------------------------------------------
        // These are deterministic, deliberately scattered test placements rather
        // than per-load randomness. They stay clear of the brown blocker layout
        // and the current mechanism spawn regions, keeping collision tests repeatable.
        const radialBumperPlacements = [
            { id: "radial-bumper-test-1", x: 1080, y: 150 },
            { id: "radial-bumper-test-2", x: 2240, y: 500 },
        ];

        for (const placement of radialBumperPlacements) {
            const bumper = new RadialBumper(placement.id, placement.x, placement.y);
            const collision = bumper.getCollisionDefinition();
            this.radialBumpers.push(bumper);
            this.radialBumperCollisionSystems.push(new RadialBumperCollisionSystem());
            this.physicsWorld.registerStaticDefinition(collision);
            this.robotInteractionRegistry.register({
                id: collision.id,
                label: "Radial Bumper",
                capabilities: { navigationBlocker: true, attackTarget: true, visionOccluder: true },
                shape: { kind: "circle", radius: collision.shape === "circle" ? collision.radius : 39 },
                getX: (): number => bumper.getX(),
                getY: (): number => bumper.getY(),
            });
            this.staticCollisionResponders.register(collision.id, bumper.getCollisionResponder());
            this.airborneWaterCollisionResponse.registerReflector(
                collision.id, bumper.getWaterReflectionDefinition(),
            );
            this.addEntity(bumper);
        }

        // One Directional Bumper for each cardinal direction: right, down, left, up.
        const directionalBumperPlacements = [
            { id: "directional-bumper-test-right", x: 700, y: 430, rotation: 0 },
            { id: "directional-bumper-test-down", x: 1080, y: 360, rotation: Math.PI / 2 },
            { id: "directional-bumper-test-left", x: 1460, y: 450, rotation: Math.PI },
            { id: "directional-bumper-test-up", x: 1980, y: 430, rotation: -Math.PI / 2 },
        ];

        for (const placement of directionalBumperPlacements) {
            const bumper = new DirectionalBumper(
                placement.id, placement.x, placement.y, placement.rotation,
            );
            this.directionalBumpers.push(bumper);
            this.directionalBumperTargetingSystems.push(new DirectionalBumperTargeting());
            this.directionalBumperCollisionSystems.push(new DirectionalBumperCollisionSystem());
            this.physicsWorld.registerFixedShapeProvider(
                bumper.getColliderId(),
                () => bumper.getWaterCollisionShape(),
            );

            // DB-6: Directional Bumpers participate in the same generic Robot
            // interaction registry as Radial Bumpers. A circle around the pivot
            // covers the full moving arm without requiring Robot AI to understand
            // oriented rectangles.
            this.robotInteractionRegistry.register({
                id: bumper.getColliderId(),
                label: "Directional Bumper",
                capabilities: { navigationBlocker: true, attackTarget: true, visionOccluder: false },
                shape: { kind: "circle", radius: bumper.getDefinition().armLength },
                getX: (): number => bumper.getX(),
                getY: (): number => bumper.getY(),
            });

            // The live fixed-shape provider above supplies the current animated
            // arm pose to airborne Water. This adapter changes the terminal Water
            // impact into the same reflected response used by RB-4.
            this.directionalBumperWaterCollisionSystem.register(
                bumper,
                this.airborneWaterCollisionResponse,
            );

            this.addEntity(bumper);

            const impactVfx = new DirectionalBumperImpactVfx(bumper.getDefinition());
            this.directionalBumperImpactVfx.push(impactVfx);
            this.addEntity(impactVfx);
        }

        // ---------------------------------------------------
        // RP-1 Rotating Paddles
        // ---------------------------------------------------
        // Authored clear test positions. These are surface mechanisms, so their
        // sprites sit above ground state but beneath standing Water and actors.
        const rotatingPaddlePlacements = [
            // RP-2.2 focused test lane: two paddles vertically aligned with clear grass around them.
            { id: "rotating-paddle-clockwise", x: 900, y: 280, direction: "clockwise" as const },
            { id: "rotating-paddle-counter-clockwise", x: 900, y: 700, direction: "counterClockwise" as const },
        ];
        for (const placement of rotatingPaddlePlacements) {
            const paddle = new RotatingPaddle(
                placement.id, placement.x, placement.y, placement.direction,
            );
            this.rotatingPaddles.push(paddle);
            this.rotatingPaddleWaterCollisionSystem.register(this.physicsWorld, paddle);

            // RP-3.1: the cream center stopper is a normal Robot-world object:
            // it blocks navigation, occludes vision and can be deliberately
            // targeted so Water Robot attacks can exercise its Water collision.
            this.robotInteractionRegistry.register({
                id: `${paddle.getId()}:robot-center-target`,
                label: "Rotating paddle center",
                capabilities: { navigationBlocker: true, attackTarget: true, visionOccluder: true },
                shape: { kind: "circle", radius: paddle.getCenterStopperRadius() },
                getX: (): number => paddle.getX(),
                getY: (): number => paddle.getY(),
            });

            this.addEntity(paddle, WorldRenderLayer.SurfaceMechanisms);
        }

        // ---------------------------------------------------
        // Create Ball
        // ---------------------------------------------------

        this.ball =
            new Ball(
                undefined,
                undefined,
                this.physicsWorld
                    .getRigidStaticDefinitions(),
                this.staticCollisionResponders,
                this.physicsWorld
                    .getRigidDynamicCollidables(),
                this.windManager,
                this.surfaceSystem,
                this.waterField,
            );

        this.addEntity(
            this.ball,
            WorldRenderLayer.GameplayActors,
        );

        // Ball intentionally remains outside PhysicsWorld's dynamic-collider list
        // because it consumes that list for obstacle collision. Register it only
        // with the generic Local Wind force bridge to avoid self-collision.
        this.localWindDynamicForceSystem
            .registerAdditionalBody(
                this.ball,
            );

        this.createBallTrail();

        this.robotInteractionRegistry.register({
            id: "ball", label: "Ball",
            capabilities: { navigationBlocker: true, attackTarget: true, visionOccluder: true },
            shape: { kind: "circle", radius: 14 },
            getX: (): number => this.ball?.getX() ?? -100000,
            getY: (): number => this.ball?.getY() ?? -100000,
        });

        // Authoritative airborne Water can push the Ball without consuming
        // the packet, so normal downstream/ground deposition is preserved.
        this.airborneWaterSystem.registerImpactAwareTarget({
            id: "ball-water-jet",
            radius: this.ball.getRadius(),
            maximumImpactHeight: this.ball.getRadius() * 2.25,
            getX: () => this.ball?.getX() ?? -100000,
            getY: () => this.ball?.getY() ?? -100000,
            notifyImpact: () => { /* Ball does not use Robot impact awareness. */ },
        });

        this.createFireRobotR1R2();

        this.createStandingWaterRenderer();

        this.createWaterVfxSystem();
        this.createWaterRobot();
        this.createWindRobot();

        // Normal development population: one Robot of each element.

        this.connectBallWaterSplashVfx();
        this.createWaterDepositDebugController();

        this.createAirborneWaterVisualizer();
        const waterRobotAttackSource = this.waterRobot?.getWaterAttackSource();
        if (waterRobotAttackSource) {
            this.airborneWaterVisualizer?.setSourceHidden(
                waterRobotAttackSource.getWaterSourceId(),
                true,
            );
        }
        const secondWaterRobotAttackSource = this.secondWaterRobot?.getWaterAttackSource();
        if (secondWaterRobotAttackSource) {
            this.airborneWaterVisualizer?.setSourceHidden(
                secondWaterRobotAttackSource.getWaterSourceId(),
                true,
            );
        }

        this.createSprinklerEntities();
        this.registerRobotR4MechanismTargets();

        this.createSprinklerWaterVfx();

        // R-1/R-2 robot test scene intentionally omits Hydrant/Hose and Fire Tube.
        // Their implementations remain intact and can be restored after robot validation.
        this.createWaterGameObjectIntegration();


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
            WorldRenderLayer.GroundState,
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

        if (
            !this.ball
        ) {
            throw new Error(
                "World requires Ball before attaching Connector presentation.",
            );
        }

        const gameplayActors =
            this.presentationLayers
                .getLayer(
                    WorldRenderLayer.GameplayActors,
                );

        const ballContainer =
            this.ball
                .getContainer();

        const ballDisplayIndex =
            gameplayActors
                .getChildIndex(
                    ballContainer,
                );

        /*
         * Connector is a relationship visual between Club and Ball, but it
         * must remain physically beneath the Ball as in the original
         * presentation. Keeping both in GameplayActors and inserting the
         * Connector immediately before the Ball preserves that local order
         * without weakening the global semantic layer hierarchy.
         */
        gameplayActors.addChildAt(
            connectorGraphics,
            Math.max(
                0,
                ballDisplayIndex,
            ),
        );

        // ---------------------------------------------------
        // Create Club
        // ---------------------------------------------------

        this.club =
            new Club();

        this.addEntity(
            this.club,
            WorldRenderLayer.GameplayActors,
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
            WorldRenderLayer.GameplayIndicators,
        );

        // ---------------------------------------------------
        // Create Shot Feedback
        // ---------------------------------------------------

        this.shotFeedback =
            new ShotFeedback();

        this.addEntity(
            this.shotFeedback,
            WorldRenderLayer.GameplayIndicators,
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

    }

    public updateCamera(
        deltaTime:
            number,
    ): void {

        this.camera.update(
            deltaTime,
        );

        // O3.1: Camera position is authoritative now. Refresh presentation
        // world bounds here so culling never uses the previous Camera frame.
        this.presentationVisibilityQuery.refresh();

        this.cameraShake.update(
            deltaTime,
        );

        this.applyCameraTransform();
    }

    public update(
        deltaTime:
            number,
    ): void {

        // O3 presentation culling: snapshot Camera bounds once per frame.
        // Simulation remains world-authoritative and never consumes this query.
        this.presentationVisibilityQuery.refresh();

        this.applyPresentationDiagnosticMode();

        this.waterPerformanceProfiler
            .beginFrame();

        this.localWindSystem
            .beginPerformanceFrame();

        this.localWindSystem
            .updateImpactAwareTargets();

        this.contourRefreshScheduler
            .beginFrame();

        this.waterPerformanceProfiler.measure("surface", (): void => {
            this.surfaceSystem.update(deltaTime);
        });



        /*
         * Phase 8B-7 Water transport order:
         * source timing -> immutable emission handoff -> Wind-responsive
         * airborne flight -> ground impact -> standing-Water simulation.
         */
        this.waterPerformanceProfiler.measure("waterSources", (): void => {
            this.waterSourceSystem.update(deltaTime);
            this.airborneWaterSystem.consumeEmissionRequests(
                this.waterSourceSystem.drainEmissionRequests(),
            );
        });

        this.waterPerformanceProfiler
            .measure(
                "airborneWater",
                (): void => {
                    this.airborneWaterSystem
                        .update(
                            deltaTime,
                        );
                },
            );

        /*
         * Phase 8F-10: 8I is not consuming gameplay events yet, so discard
         * previous-frame events before producing this frame's contacts.
         */
        this.waterFireInteraction.clearGameplayEvents();
        this.fireSourceSystem.beginDirectionalWaterSuppressionFrame();
        this.fireSourceSystem.beginDirectionalObstacleSuppressionFrame();
        this.updateDirectionalFireObstacleSuppression();

        const airborneWaterSweeps =
            this.airborneWaterSystem.getLastMovementSweeps();

        this.waterPerformanceProfiler.measure(
            "waterFireAirborneDirectional",
            (): void => {
                this.waterFireInteraction.updateAirborneWaterDirectionalFire(
                    airborneWaterSweeps,
                    this.fireSourceSystem,
                );
            },
        );

        this.waterPerformanceProfiler.measure(
            "waterFireAirborneGround",
            (): void => {
                this.waterFireInteraction.updateAirborneWaterGroundFire(
                    airborneWaterSweeps,
                    this.fireManager,
                );
            },
        );

        this.airborneWaterVisualizer?.update();

        this.waterPerformanceProfiler.measure("sprinklerWaterVfx", (): void => {
            this.sprinklerWaterVfx?.update(deltaTime);
        });
        this.waterPerformanceProfiler.measure("waterImpactVfx", (): void => {
            this.waterVfxSystem?.updateSprinklerImpacts(
                deltaTime,
                this.sprinklers,
                this.airborneWaterSystem,
            );
        });
        if (this.sprinklerWaterVfx) {
            const sprinklerPerformance = this.sprinklerWaterVfx.getPerformanceDetails();
            this.waterPerformanceProfiler.recordSprinklerDeepProfileDetails({
                ...sprinklerPerformance,
                totalSources: this.sprinklers.length,
                culledSources: Math.max(0, this.sprinklers.length - sprinklerPerformance.activeSources),
                dropletRenderer: {
                    ...sprinklerPerformance.dropletRenderer,
                    activeSlots: Math.max(
                        0,
                        sprinklerPerformance.dropletRenderer.totalSlots -
                        sprinklerPerformance.dropletRenderer.hiddenSlots,
                    ),
                    updatedSlots: sprinklerPerformance.preparedPackets,
                    renderedSlots: sprinklerPerformance.renderedElements,
                },
            });
        }

        this.waterPerformanceProfiler.measure("hoseWaterVfx", (): void => {
            this.hoseWaterVfx?.update(deltaTime);
            this.waterRobotHoseVfx?.update(deltaTime);
            this.secondWaterRobotHoseVfx?.update(deltaTime);
        });

        /*
         * Phase 8I-5: advance presentation-only Water particles and the
         * stable downstream material animation used by current-state Sprinkler ribbons.
         */
        this.waterPerformanceProfiler.measure("waterVfxCore", (): void => {
            this.waterVfxSystem
                ?.update(
                    deltaTime,
                );
        });
        // RP-3.1: apply powered-surface momentum after airborne deposition and
        // before the authoritative Water solver transports standing Water.
        for (const paddle of this.rotatingPaddles) {
            this.rotatingPaddleWaterDispersalSystem.update(
                deltaTime,
                this.waterField,
                paddle,
                this.rotatingPaddleWaterDispersalValidation,
            );
        }
        this.rotatingPaddleWaterDiagnosticElapsed += deltaTime;
        if (this.rotatingPaddleWaterDiagnosticElapsed >= 1) {
            this.rotatingPaddleWaterDiagnosticElapsed = 0;
            this.rotatingPaddleWaterDispersalValidation.flushToConsole();
        }

        this.waterPerformanceProfiler
            .measure(
                "waterSimulation",
                (): void => {
                    this.waterField
                        .update(
                            deltaTime,
                        );
                },
            );



        this.waterPerformanceProfiler.measure(
            "waterGroundInteraction",
            (): void => {
                this.waterGroundInteractionSystem.update(deltaTime);
            },
        );

        this.waterPerformanceProfiler.recordGroundInteractionBreakdown(
            this.waterGroundInteractionSystem.getPerformanceBreakdown(),
        );
        this.waterPerformanceProfiler.recordGroundInteractionWorkload(
            this.waterGroundInteractionSystem.getWorkload(),
        );

        this.waterPerformanceProfiler.measure(
            "moistureSurfaceBridge",
            (): void => {
                this.moistureSurfaceBridge.update(deltaTime);
            },
        );


        /*
         * Phase 8F-2: resolve meaningful standing-Water overlap before the
         * Fire simulation advances, so extinguished Ground Fire cannot
         * deposit heat, burn fuel, scorch, or spread during this frame.
         */
        this.waterPerformanceProfiler.measure(
            "waterFireStandingGround",
            (): void => {
                this.waterFireInteraction.updateStandingWaterGroundFire(
                    this.waterField,
                    this.fireManager,
                );
            },
        );

        this.waterPerformanceProfiler.measure(
            "waterFireStandingDirectional",
            (): void => {
                this.waterFireInteraction.updateStandingWaterDirectionalFire(
                    this.waterField,
                    this.fireSourceSystem,
                    deltaTime,
                );
            },
        );



        /*
                 * Phase 8C-6F:
                 * presentation uploads small grid-resolution textures at controlled
                 * intervals. The GPU linearly interpolates the scalar Water/moisture
                 * samples across one quad per layer.
                 */
        this.waterPerformanceProfiler
            .measure(
                "wetGround",
                (): void => {
                    this.wetGroundRenderer
                        ?.update(
                            deltaTime,
                        );
                },
            );

        this.waterDepositDebugController
            ?.update(
                deltaTime,
            );

        this.waterPerformanceProfiler
            .measure(
                "standingWater",
                (): void => {
                    this.standingWaterRenderer
                        ?.update(
                            deltaTime,
                        );
                },
            );



        let fireSourceSystemMilliseconds = 0;
        this.waterPerformanceProfiler.measure("fireSimulation", (): void => {
            const fireSourceStartedAt = performance.now();
            this.fireSourceSystem.update(deltaTime);
            fireSourceSystemMilliseconds = performance.now() - fireSourceStartedAt;
            this.fireManager.update(deltaTime);
        });

        this.waterPerformanceProfiler.measure(
            "fireDirectionalValidation",
            (): void => {
                this.fireDirectionalValidation?.update();
            },
        );

        this.waterPerformanceProfiler.measure(
            "fireSourceVisualizer",
            (): void => {
                this.fireSourceVisualizer?.update();
            },
        );

        this.waterPerformanceProfiler.measure(
            "fireVfxUpdate",
            (): void => {
                if (this.fireVfxEnabled) {
                    this.fireVfxSystem?.update(deltaTime);
                }
            },
        );

        if (this.fireVfxSystem) {
            const fireProfile =
                this.fireVfxSystem.getPerformanceDetails();
            const fireSimulationProfile =
                this.fireManager.getPerformanceDetails();
            this.waterPerformanceProfiler.recordFireDeepProfileDetails({
                fireSourceSystemMilliseconds,
                simulationTotalMilliseconds: fireSimulationProfile.totalMilliseconds,
                simulationPeakMilliseconds: fireSimulationProfile.peakMilliseconds,
                activeCellLoopMilliseconds: fireSimulationProfile.activeCellLoopMilliseconds,
                samplingMilliseconds: fireSimulationProfile.samplingMilliseconds,
                environmentInfluenceMilliseconds: fireSimulationProfile.environmentInfluenceMilliseconds,
                spreadMilliseconds: fireSimulationProfile.spreadMilliseconds,
                fieldIgnitionMilliseconds: fireSimulationProfile.fieldIgnitionMilliseconds,
                cleanupMilliseconds: fireSimulationProfile.cleanupMilliseconds,
                commitMilliseconds: fireSimulationProfile.commitMilliseconds,
                heatCoolingMilliseconds: fireSimulationProfile.heatCoolingMilliseconds,
                simulationActiveCells: fireSimulationProfile.activeCells,
                spreadPasses: fireSimulationProfile.spreadPasses,
                pendingIgnitions: fireSimulationProfile.pendingIgnitions,
                expiredCells: fireSimulationProfile.expiredCells,
                hotCandidates: fireSimulationProfile.hotCandidates,
                groundEmitterMilliseconds:
                    fireProfile.groundEmitterMilliseconds,
                directionalEmitterMilliseconds:
                    fireProfile.directionalEmitterMilliseconds,
                poolUpdateMilliseconds:
                    fireProfile.poolUpdateMilliseconds,
                scorchRendererMilliseconds:
                    fireProfile.scorchRendererMilliseconds,
                directionalRegionMilliseconds:
                    fireProfile.directionalRegionMilliseconds,
                directionalSuppressionMilliseconds:
                    fireProfile.directionalSuppressionMilliseconds,
                activeGroundParticles:
                    fireProfile.activeGroundParticles,
                activeDirectionalParticles:
                    fireProfile.activeDirectionalParticles,
                activeParticles:
                    fireProfile.activeParticles,
                particleCapacity:
                    fireProfile.particleCapacity,
                acquireAttempts:
                    fireProfile.acquireAttempts,
                acquireSuccesses:
                    fireProfile.acquireSuccesses,
                reusedParticles:
                    fireProfile.reusedParticles,
                createdParticles:
                    fireProfile.createdParticles,
                groundSpawnAttempts:
                    fireProfile.groundEmitter.spawnAttempts,
                groundSpawned:
                    fireProfile.groundEmitter.spawned,
                groundSpawnSkipped:
                    fireProfile.groundEmitter.skipped,
                directionalSpawnAttempts:
                    fireProfile.directionalEmitter.spawnAttempts,
                directionalSpawned:
                    fireProfile.directionalEmitter.spawned,
                directionalSpawnSkipped:
                    fireProfile.directionalEmitter.skipped,
                activeDirectionalSources:
                    fireProfile.directionalEmitter.activeSources,
                collisionSweeps:
                    fireProfile.collision.collisionSweeps,
                collisionHits:
                    fireProfile.collision.collisionHits,
                groundCollisionSweeps:
                    fireProfile.collision.groundCollisionSweeps,
                groundCollisionHits:
                    fireProfile.collision.groundCollisionHits,
                directionalCollisionSweeps:
                    fireProfile.collision.directionalCollisionSweeps,
                directionalCollisionHits:
                    fireProfile.collision.directionalCollisionHits,
            });
        }



        // DB-5: each Directional Bumper evaluates the same generic target population
        // independently. Each bumper owns its own approach/re-arm state.
        if (this.directionalBumpers.length > 0) {
            const candidates: Array<{ id: string; x: number; y: number; velocityX: number; velocityY: number; radius: number }> = [];
            if (this.ball) {
                candidates.push({
                    id: "ball", x: this.ball.getX(), y: this.ball.getY(),
                    velocityX: this.ball.getVelocityX(), velocityY: this.ball.getVelocityY(),
                    radius: this.ball.getRadius(),
                });
            }
            for (const body of this.physicsWorld.getMovableRigidDynamicCollidables()) {
                const definition = body.getDefinition();
                const radius = definition.shape === "circle"
                    ? definition.radius
                    : definition.shape === "rectangle"
                        ? Math.hypot(definition.width, definition.height) * 0.5
                        : 0;
                if (radius <= 0) continue;
                candidates.push({
                    id: definition.id, x: body.getX(), y: body.getY(),
                    velocityX: body.getVelocityX(), velocityY: body.getVelocityY(), radius,
                });
            }

            for (let bumperIndex = 0; bumperIndex < this.directionalBumpers.length; bumperIndex += 1) {
                const bumper = this.directionalBumpers[bumperIndex];
                const targeting = this.directionalBumperTargetingSystems[bumperIndex];
                if (!bumper || !targeting) continue;

                let selected: { id: string; evaluation: ReturnType<DirectionalBumperTargeting["evaluate"]> } | null = null;
                for (const candidate of candidates) {
                    const evaluation = targeting.evaluate(
                        bumper.getX(), bumper.getY(), bumper.getIdleAngleRadians(), candidate, bumper.getDefinition(),
                    );
                    if (evaluation.solution && (!selected || evaluation.diagnostic.distanceToServiceArm < selected.evaluation.diagnostic.distanceToServiceArm)) {
                        selected = { id: candidate.id, evaluation };
                    }
                }

                const evaluation = selected?.evaluation ?? null;
                const strikeRequested = bumper.isIdle() && evaluation?.solution !== null && evaluation?.solution !== undefined;
                const strikeAccepted = strikeRequested && evaluation?.solution
                    ? bumper.beginStrike(evaluation.solution.targetAngleRadians)
                    : false;
                if (strikeAccepted && selected) targeting.markApproachServiced(selected.id);
            }
        }

        /*
         * Stress-test profiling keeps Robot AI separate from ordinary entity
         * updates while preserving the original entity-list update order.
         */
        for (let entityIndex = 0; entityIndex < this.entities.length; entityIndex += 1) {
            const entity = this.entities[entityIndex];
            if (!entity) continue;

            if (entity instanceof Robot) {
                this.waterPerformanceProfiler.measure("robotAI", (): void => {
                    entity.update(deltaTime);
                });
            } else {
                this.waterPerformanceProfiler.measure("entities", (): void => {
                    entity.update(deltaTime);
                });
            }
        }

        /*
         * Apply Local Wind after entities synchronize their current-frame source
         * transforms. Impulses are consumed by each body's normal physics update;
         * mass response comes from DynamicCollidable inverse mass.
         */
        this.waterPerformanceProfiler.measure("localWindForces", (): void => {
            this.localWindDynamicForceSystem.update(deltaTime);
        });
        this.waterPerformanceProfiler.measure("windSuction", (): void => {
            this.windSuctionCaptureSystem.update(deltaTime);
            this.processCompletedWindSuctionCaptures();
        });

        this.robotDebugVisualizer
            ?.update();

        if (
            this.ball &&
            this.waterVfxSystem
        ) {
            this.waterVfxSystem
                .updateBallTraversal(
                    this.ball,
                );
        }
        /*
                 * Phase 8B-12:
                 * HydrantHose has now advanced rope/nozzle physics and synchronized
                 * its current pressure/source state. Apply the continuous jet impulse
                 * to Ball from that authoritative current-frame mechanism state.
                 *
                 * Ball itself appears earlier in the entity list, so position
                 * integration occurs on the following Ball physics frame. Velocity is
                 * updated immediately through Ball.applyImpulseAtWorldPoint().
                 */
        this.waterPerformanceProfiler.measure("hoseBallForce", (): void => {
            this.hoseJetBallForceSystem?.update(deltaTime);
            this.waterRobotJetBallForceSystem?.update(deltaTime);
            this.secondWaterRobotJetBallForceSystem?.update(deltaTime);
        });

        /*
         * H2. Sample the Ball only after its authoritative physics update.
         * The trail is presentation-only and never feeds state back into Ball.
         */
        this.waterPerformanceProfiler.measure("ballTrail", (): void => {
            this.ballTrail?.update(deltaTime);
        });



        // RP-1: after Ball integration, drive its tangential component toward
        // each overlapping rotating surface and resolve the solid center stopper.
        if (this.ball) {
            for (const paddle of this.rotatingPaddles) {
                this.rotatingPaddleCenterCollisionSystem.resolve(this.ball, paddle);
                this.rotatingPaddleBallInteractionSystem.update(deltaTime, this.ball, paddle);
            }
        }

        // RP-2: the same continuously powered surface now acts on every registered
        // movable rigid DynamicCollidable. Fan, Sprinkler, Robots and future rigid
        // bodies participate automatically through PhysicsWorld registration.
        for (const paddle of this.rotatingPaddles) {
            this.rotatingPaddleDynamicInteractionSystem.update(
                deltaTime,
                this.physicsWorld,
                paddle,
            );
        }

        /*
         * G2/G3. Resolve physical mechanism pairs only after their rigid-body
         * integration for this frame. The shared response solver applies
         * penetration correction, normal impulse, friction and angular
         * impulse.
         */
        /*
         * Phase 8D-7E:
         * Collision consumers now obtain their populations from PhysicsWorld.
         * Registration is centralized; collision mathematics is unchanged.
         */
        this.waterPerformanceProfiler.measure("dynamicCollisions", (): void => {
            this.dynamicCollisionSystem.resolve(
                this.physicsWorld.getRigidDynamicCollidables(),
            );
            for (let bumperIndex = 0; bumperIndex < this.radialBumpers.length; bumperIndex += 1) {
                const bumper = this.radialBumpers[bumperIndex];
                const collisionSystem = this.radialBumperCollisionSystems[bumperIndex];
                if (!bumper || !collisionSystem) continue;
                collisionSystem.resolve(this.physicsWorld, bumper);
            }

            if (this.ball) {
                for (let bumperIndex = 0; bumperIndex < this.directionalBumpers.length; bumperIndex += 1) {
                    const bumper = this.directionalBumpers[bumperIndex];
                    const collisionSystem = this.directionalBumperCollisionSystems[bumperIndex];
                    const impactVfx = this.directionalBumperImpactVfx[bumperIndex];
                    if (!bumper || !collisionSystem) continue;

                    collisionSystem.resolve(this.ball, bumper, this.physicsWorld);
                    const impact = collisionSystem.consumePoweredImpact();
                    if (!impact) continue;

                    bumper.playImpactAnimation();
                    const outgoingSpeed = Math.hypot(impact.outgoingX, impact.outgoingY);
                    const definition = bumper.getDefinition();
                    const strengthRange = Math.max(1, definition.maximumLaunchSpeed - definition.minimumLaunchSpeed);
                    const strength = Math.max(0, Math.min(1,
                        (outgoingSpeed - definition.minimumLaunchSpeed) / strengthRange,
                    ));
                    impactVfx?.emit({
                        x: impact.x, y: impact.y,
                        outgoingX: impact.outgoingX, outgoingY: impact.outgoingY, strength,
                    });
                }
            }
            this.dynamicStaticCollisionSystem.resolve(this.physicsWorld);
        });



        /*
         * 8D-7C: the flexible Hose participates in the same world collider
         * population without being converted into a rigid DynamicCollidable.
         */
        this.waterPerformanceProfiler.measure("hoseCollisions", (): void => {
            if (this.hydrantHose && this.hoseCollisionSystem) {
                this.hoseCollisionSystem.resolve(this.physicsWorld);
                this.hydrantHose.synchronizeAfterExternalCollision();
            }
        });



        /*
         * Collision correction can change mechanism positions after their
         * normal update. Synchronize their visual/environmental transforms
         * immediately so Wind and Fire never lag one frame behind physics.
         */
        this.waterPerformanceProfiler.measure("mechanismSync", (): void => {
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

            for (
                const sprinkler
                of this.sprinklers
            ) {
                sprinkler.synchronizeAfterCollisionResolution();
            }
        });



        this.waterPerformanceProfiler.measure("waterObstacleSync", (): void => {
            this.waterObstacleRegistrationSystem.synchronize();
        });



        this.forceBenchmarkFireTubeSourcesIfRequired();

        this.waterPerformanceProfiler.measure("windPresentation", (): void => {
            this.localWindDebugVisualizer?.update();
            this.windVfxSystem?.update(deltaTime);
        });

        if (this.windVfxSystem) {
            const windProfile =
                this.windVfxSystem.getPerformanceDetails();
            const localWindProfile =
                this.localWindSystem.getPerformanceDetails();
            this.waterPerformanceProfiler.recordWindDeepProfileDetails({
                globalEmitterMilliseconds:
                    windProfile.globalEmitterMilliseconds,
                localEmitterMilliseconds:
                    windProfile.localEmitterMilliseconds,
                poolBookkeepingMilliseconds:
                    windProfile.poolBookkeepingMilliseconds,
                activeParticles:
                    windProfile.activeParticles,
                particleCapacity:
                    windProfile.particleCapacity,
                acquireAttempts:
                    windProfile.acquireAttempts,
                acquireSuccesses:
                    windProfile.acquireSuccesses,
                releases:
                    windProfile.releases,
                globalSpawnAttempts:
                    windProfile.globalEmitter.spawnAttempts,
                globalSpawned:
                    windProfile.globalEmitter.spawned,
                localSpawnAttempts:
                    windProfile.localEmitter.spawnAttempts,
                localSpawned:
                    windProfile.localEmitter.spawned,
                activeLocalSources:
                    windProfile.localEmitter.activeSources,
                localWindQueries:
                    localWindProfile.queryCount,
                localWindQueryMilliseconds:
                    localWindProfile.queryMilliseconds,
            });
        }

        this.waterPerformanceProfiler.measure("gameplayPresentation", (): void => {
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
        });










        this.waterPerformanceProfiler.measure("debugAndMetrics", (): void => {
            this.performanceMetrics
                .update(
                    deltaTime,
                );

            this.updatePerformanceSummaryText();
        });

        this.waterPerformanceProfiler.setGlobalWaterCounts(
            this.airborneWaterSystem.getActivePacketCount(),
            this.environmentField.getTrackedMoistureIndices().length,
        );

        this.waterPerformanceProfiler.setStressTestCounts(
            [
                this.fireRobot,
                this.secondFireRobot,
                this.waterRobot,
                this.secondWaterRobot,
                this.windRobot,
                this.secondWindRobot,
            ].filter((robot): robot is Robot => robot !== null).length,
            this.physicsWorld.getRigidDynamicCollidables().length,
            this.fans.length,
            this.sprinklers.length,
        );

        this.waterPerformanceProfiler
            .endFrame(
                deltaTime,
            );


    }

    public destroy():
        void {
        this.sprinklerWaterVfx
            ?.destroy();

        this.sprinklerWaterVfx = null;

        this.hoseWaterVfx
            ?.destroy();

        this.hoseWaterVfx = null;

        this.waterRobotHoseVfx?.destroy();
        this.waterRobotHoseVfx = null;
        this.secondWaterRobotHoseVfx?.destroy();
        this.secondWaterRobotHoseVfx = null;

        this.airborneWaterVisualizer
            ?.destroy();

        this.airborneWaterVisualizer =
            null;

        this.ballWaterSplashVfxUnsubscribe
            ?.();

        this.ballWaterSplashVfxUnsubscribe =
            null;

        this.waterVfxSystem
            ?.destroy();

        this.waterVfxSystem =
            null;

        this.ballTrail
            ?.destroy();

        this.ballTrail =
            null;

        this.robotDebugVisualizer
            ?.destroy();

        this.robotDebugVisualizer =
            null;

        this.fireRobot =
            null;

        this.waterRobot =
            null;
        this.secondFireRobot = null;
        this.secondWaterRobot = null;
        this.windRobot = null;
        this.secondWindRobot = null;

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

        this.robotInteractionRegistry.clear();
        this.sprinklerRobotInteractionUnregister.clear();

        for (const system of this.radialBumperCollisionSystems) system.reset();
        for (const system of this.directionalBumperCollisionSystems) system.reset();
        for (const targeting of this.directionalBumperTargetingSystems) targeting.reset();
        this.radialBumperCollisionSystems.length = 0;
        this.directionalBumperCollisionSystems.length = 0;
        this.directionalBumperTargetingSystems.length = 0;
        this.radialBumpers.length = 0;
        this.directionalBumpers.length = 0;
        this.directionalBumperImpactVfx.length = 0;
        this.airborneWaterCollisionResponse.clear();

        this.physicsWorld
            .clear();

        this.fireTubes.length =
            0;

        this.sprinklers.length =
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

        this.hoseJetBallForceSystem =
            null;

        this.waterDepositDebugController
            ?.destroy();

        this.waterDepositDebugController =
            null;

        this.standingWaterRenderer
            ?.destroy();

        this.standingWaterRenderer =
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
        this.waterGroundInteractionSystem
            .reset();

        this.moistureSurfaceBridge
            .reset();

        this.environmentField
            .reset();

        this.airborneWaterSystem
            .reset();

        this.waterSourceSystem
            .clearSources();

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

        ScalarFieldTexture
            .setPerformanceProfiler(
                null,
            );

        this.performanceMetrics
            .reset();

        this.activePerformanceBenchmark =
            null;
        this.wetGroundRenderer
            ?.destroy();

        this.wetGroundRenderer =
            null;

        this.surfaceGraphics
            ?.destroy();

        this.surfaceGraphics =
            null;

        this.courseBackground
            ?.destroy();

        this.courseBackground =
            null;

        this.presentationLayers
            .destroy();

        this.worldContainer.destroy({
            children:
                false,
        });

        this.performanceSummaryText
            ?.destroy();

        this.performanceSummaryText =
            null;

        this.screenOverlayContainer.destroy({
            children:
                false,
        });

        this.camera
            .resetToInitialPosition();

        this.hydrantHose =
            null;

        this.hoseCollisionSystem =
            null;

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

        this.waterVfxSystem
            ?.resetBallWaterTraversal();

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

    public recordFramePresentationDiagnostics(
        gameUpdateMilliseconds: number,
        pixiRenderMilliseconds: number,
    ): void {

        this.waterPerformanceProfiler
            .recordFramePresentationDiagnostics(
                gameUpdateMilliseconds,
                pixiRenderMilliseconds,
                this.getPresentationDiagnosticMode(),
                this.fireVfxSystem
                    ?.getActiveParticleCount() ?? 0,
                this.windVfxSystem
                    ?.getActiveParticleCount() ?? 0,
                this.waterVfxSystem
                    ?.getActiveParticleCount() ?? 0,
            );
    }

    private getPresentationDiagnosticMode(): string {
        const mode =
            new URLSearchParams(
                window.location.search,
            ).get(
                "vfxdiag",
            ) ??
            "all";

        switch (mode) {
            case "fire-off":
            case "wind-off":
            case "water-off":
            case "all-off":
                return mode;

            default:
                return "all";
        }
    }

    private applyPresentationDiagnosticMode(): void {
        const mode =
            this.getPresentationDiagnosticMode();

        const hideFire =
            mode === "fire-off" ||
            mode === "all-off";

        const hideWind =
            mode === "wind-off" ||
            mode === "all-off";

        const hideWater =
            mode === "water-off" ||
            mode === "all-off";

        if (this.fireVfxSystem) {
            const fireVisible =
                this.fireVfxEnabled &&
                !hideFire;

            this.fireVfxSystem
                .getGroundContainer()
                .visible =
                fireVisible;

            this.fireVfxSystem
                .getAirborneContainer()
                .visible =
                fireVisible;
        }

        if (this.windVfxSystem) {
            const benchmarkWindEnabled =
                this.activePerformanceBenchmark
                    ?.windVfxEnabled ??
                true;

            this.windVfxSystem
                .setEnabled(
                    benchmarkWindEnabled &&
                    !hideWind,
                );
        }

        if (this.waterVfxSystem) {
            this.waterVfxSystem
                .getGroundContainer()
                .visible =
                !hideWater;

            this.waterVfxSystem
                .getAirborneContainer()
                .visible =
                !hideWater;

            this.waterVfxSystem
                .getStreamRenderer()
                .getContainer()
                .visible =
                !hideWater;
        }

        if (this.standingWaterRenderer) {
            this.standingWaterRenderer
                .getDisplayObject()
                .visible =
                !hideWater;
        }

        if (this.wetGroundRenderer) {
            this.wetGroundRenderer
                .getDisplayObject()
                .visible =
                !hideWater;
        }
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
            .getGroundContainer()
            .visible =
            enabled;

        this.fireVfxSystem
            .getAirborneContainer()
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

        this.removeNonFireTubeSources();

        for (
            const fireTube
            of this.fireTubes
        ) {
            fireTube.resetCycle();
        }

        this.environmentField.reset();
        this.moistureSurfaceBridge.reset();
        this.wetGroundRenderer?.redrawImmediately();

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

        this.presentationLayers
            .getLayer(
                WorldRenderLayer.Debug,
            )
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
    // Phase 8E-1 Ball Footprint Water Sampling Validation


    // -------------------------------------------------------
    // Phase 8E-2 Ball Water Interaction Contract Validation


    // -------------------------------------------------------
    // Phase 8E-3 Surface + Standing Water Resistance Validation


    // -------------------------------------------------------
    // Phase 8E-4 Standing-Water Drag Validation


    // -------------------------------------------------------
    // Phase 8E-5 Nonlinear Water Depth Slowdown + Debug


    // -------------------------------------------------------
    // Surface Resistance Tuning Validation


    // -------------------------------------------------------
    // Phase 8E-6 Smooth Water Entry/Exit Validation


    // -------------------------------------------------------
    // Phase 8E-7 Splash Physics Event System Validation


    // -------------------------------------------------------
    // Phase 8E-8 Controlled Shot-Distance Comparison


    // -------------------------------------------------------
    // Phase 8E-9 30/60/120 FPS Stability




    // -------------------------------------------------------
    // Water Field Debug Visualization
    // -------------------------------------------------------

    // -------------------------------------------------------
    // Phase 8C-8A Interactive Water Deposit Debug Tool
    // -------------------------------------------------------

    // -------------------------------------------------------
    // Phase 8D-1 Water Obstacle Occupancy Foundation



    // -------------------------------------------------------
    // Phase 8D-2 Ground-Water Solid Cell Exclusion



    // -------------------------------------------------------
    // Phase 8D-3 Obstacle-Aware Neighbor Flow



    // -------------------------------------------------------
    // Phase 8D-4 Boundary Accumulation + Flow Tuning



    // -------------------------------------------------------
    // Phase 8D-5 Airborne Water Static Collision



    // -------------------------------------------------------
    // Phase 8D-6 Jet Obstruction + Impact Deposition
    // -------------------------------------------------------

    // The temporary authoritative WaterField diagnostic visualizer used
    // during 8I diagnosis has been removed. StandingWaterRenderer is the
    // normal runtime standing-Water presentation path.

    private createWaterDepositDebugController():
        void {

        if (
            this.waterDepositDebugController
        ) {
            throw new Error(
                "World WaterDepositDebugController has already been created.",
            );
        }

        this.waterDepositDebugController =
            new WaterDepositDebugController(
                this.app.canvas,
                this.waterField,
                (
                    screenX:
                        number,

                    screenY:
                        number,
                ) => {
                    return this.getWorldPositionFromScreen(
                        screenX,
                        screenY,
                    );
                },
                DEFAULT_WATER_DEBUG_DEFINITION,
            );

        if (
            DEFAULT_WATER_DEBUG_DEFINITION
                .interactiveDepositEnabled
        ) {
            console.info(
                "[8C-8A] Interactive Water deposit enabled. Hold LEFT MOUSE over the game world to deposit Water. Normal left-mouse golf input is temporarily reserved by this debug tool.",
            );
        }
    }

    private createStandingWaterRenderer():
        void {

        if (
            this.standingWaterRenderer
        ) {
            throw new Error(
                "World standing-Water renderer has already been created.",
            );
        }

        this.standingWaterRenderer =
            new StandingWaterRenderer(
                this.waterField,
                undefined,
                this.waterPerformanceProfiler,
                this.contourRefreshScheduler,
                this.presentationVisibilityQuery,
            );

        this.presentationLayers
            .getLayer(
                WorldRenderLayer.StandingWater,
            )
            .addChild(
                this.standingWaterRenderer
                    .getDisplayObject(),
            );

        this.standingWaterRenderer
            .redrawImmediately();
    }

    // -------------------------------------------------------
    // Phase 8I-4 Shared Water VFX Foundation
    // -------------------------------------------------------

    private createWaterVfxSystem():
        void {

        if (
            this.waterVfxSystem
        ) {
            throw new Error(
                "World Water VFX system has already been created.",
            );
        }

        this.waterVfxSystem =
            new WaterVfxSystem();

        this.presentationLayers
            .getLayer(
                WorldRenderLayer.WaterEffects,
            )
            .addChild(
                this.waterVfxSystem
                    .getGroundContainer(),
            );

        this.presentationLayers
            .getLayer(
                WorldRenderLayer.AirborneEffects,
            )
            .addChild(
                this.waterVfxSystem
                    .getAirborneContainer(),
            );

        /*
         * 8I-6A.1: continuous stream geometry belongs below physical Hose
         * artwork/nozzles. Reparent only the shared stream renderer; airborne
         * droplets and other secondary VFX remain in AirborneEffects.
         */
        this.presentationLayers
            .getLayer(
                WorldRenderLayer.WaterEffects,
            )
            .addChild(
                this.waterVfxSystem
                    .getStreamRenderer()
                    .getContainer(),
            );
    }

    private connectBallWaterSplashVfx():
        void {

        if (
            this.ballWaterSplashVfxUnsubscribe
        ) {
            throw new Error(
                "World Ball Water splash VFX listener is already connected.",
            );
        }

        this.ballWaterSplashVfxUnsubscribe =
            this.ball.addWaterSplashListener(
                (event): void => {
                    this.waterVfxSystem
                        ?.handleBallSplash(event);
                },
            );
    }

    // -------------------------------------------------------
    // Phase 8B-4 Airborne Water Debug Presentation
    // -------------------------------------------------------

    private createAirborneWaterVisualizer(): void {
        if (this.airborneWaterVisualizer) {
            throw new Error(
                "World AirborneWater visualizer has already been created.",
            );
        }

        this.airborneWaterVisualizer =
            new AirborneWaterVisualizer(
                this.airborneWaterSystem,
            );

        this.presentationLayers
            .getLayer(
                WorldRenderLayer.WaterEffects,
            )
            .addChild(
                this.airborneWaterVisualizer
                    .getGraphics(),
            );
    }

    // -------------------------------------------------------
    // Phase 8B-3 Sprinkler Mechanism
    // -------------------------------------------------------

    private createSprinklerEntities(): void {
        if (this.sprinklers.length > 0) {
            throw new Error("World Sprinkler entities have already been created.");
        }
        if (!this.ball) {
            throw new Error("World requires Ball before creating Sprinklers.");
        }

        const placements = [
            // RP-2.2 focused test layout: one sprinkler above and one below the paddle lane.
            { id: "sprinkler-1", x: 900, y: 110, rotation: Math.PI / 2 },
            { id: "sprinkler-2", x: 900, y: 870, rotation: -Math.PI / 2 },
        ];

        for (const placement of placements) {
            const sprinkler = new Sprinkler(
                placement.id, placement.x, placement.y, placement.rotation, this.waterSourceSystem,
            );
            this.sprinklers.push(sprinkler);

            this.physicsWorld
                .registerDynamicCollidable(
                    placement.id,
                    sprinkler,
                    {
                        ownerSourceIds: [
                            sprinkler.getSourceId(),
                        ],
                    },
                );

            this.windSuctionCaptureSystem.registerTarget({
                id: placement.id,
                body: sprinkler,
                beginCapture: (): void => {
                    sprinkler.beginSuctionCapture();
                    // Remove gameplay obstruction immediately at nozzle contact.
                    // The visual Entity remains alive until the shrink completes.
                    this.physicsWorld.unregisterDynamicBody(sprinkler);
                    this.sprinklerRobotInteractionUnregister.get(sprinkler)?.();
                    this.sprinklerRobotInteractionUnregister.delete(sprinkler);
                },
                setCaptureScale: (scale: number): void => {
                    sprinkler.setSuctionCaptureScale(scale);
                },
            });

            this.addEntity(sprinkler);
        }
    }


    // -------------------------------------------------------
    // Phase 8I-5 Production Sprinkler Water VFX
    // -------------------------------------------------------

    private createSprinklerWaterVfx(): void {
        if (!this.waterVfxSystem) {
            throw new Error("World requires WaterVfxSystem before Sprinkler Water VFX.");
        }
        this.sprinklerWaterVfx = new SprinklerWaterVfx(
            this.sprinklers,
            this.airborneWaterSystem,
            this.waterVfxSystem,
            this.waterVfxSystem.getDefinition().sprinkler,
            this.presentationVisibilityQuery,
        );
        for (const sprinkler of this.sprinklers) {
            this.airborneWaterVisualizer?.setSourceHidden(sprinkler.getSourceId(), true);
        }
    }

    // -------------------------------------------------------
    // Phase 8I-6A Production Hose Water Body VFX
    // -------------------------------------------------------

    // -------------------------------------------------------
    // Phase 8D-7 Actual Game Object Integration
    // -------------------------------------------------------

    private createWaterGameObjectIntegration(): void {
        if (this.hydrantHose) {
            const hoseSourceId =
                this.hydrantHose
                    .getWaterSourceId();

            this.physicsWorld
                .registerFixedShapeProvider(
                    "hydrant-1",
                    () => {
                        const anchor =
                            this.hydrantHose!
                                .getAnchorPosition();

                        return {
                            id:
                                "hydrant-body",
                            shape:
                                "circle",
                            positionX:
                                anchor.x,
                            positionY:
                                anchor.y,
                            radius:
                                DEFAULT_HYDRANT_HOSE_DEFINITION
                                    .hydrantCollisionRadius,
                            material: {
                                restitution:
                                    DEFAULT_HYDRANT_HOSE_DEFINITION
                                        .hydrantCollisionRestitution,
                                friction:
                                    DEFAULT_HYDRANT_HOSE_DEFINITION
                                        .hydrantCollisionFriction,
                            },
                        };
                    },
                    {
                        ownerSourceIds: [
                            `${hoseSourceId}-burst`,
                        ],
                    },
                );

            this.physicsWorld
                .registerAirbornePolylineProvider(
                    "hydrant-hose-1",
                    DEFAULT_HYDRANT_HOSE_DEFINITION
                        .hoseObstacleCollisionRadius,
                    () =>
                        this.hydrantHose!
                            .getRopePoints(),
                    {
                        ownerSourceIds: [
                            hoseSourceId,
                            `${hoseSourceId}-burst`,
                        ],
                    },
                );
        }

        this.waterObstacleRegistrationSystem
            .synchronize();










    }

    // -------------------------------------------------------
    // Phase 8B-12 Hose Jet -> Ball Force
    // -------------------------------------------------------

    /**
     * Establish one authoritative solid-obstacle cutoff for every enabled
     * directional Fire source before simulation and presentation consume its
     * effective length. This prevents particles/heat from reappearing beyond
     * the first blocking object.
     */
    private updateDirectionalFireObstacleSuppression(): void {
        for (const source of this.fireSourceSystem.getSources()) {
            const definition = source.getDefinition();
            if (!source.isEnabled() || definition.type !== FireSourceType.Directional) continue;

            const direction = source.getDirectionRadians();
            const startX = source.getPositionX();
            const startY = source.getPositionY();
            const endX = startX + Math.cos(direction) * definition.length;
            const endY = startY + Math.sin(direction) * definition.length;
            const hit = this.airborneWaterCollisionField.sweep(
                startX, startY, endX, endY, source.getId(),
            );
            if (!hit) continue;

            const contactDistance = Math.max(0, definition.length * hit.fraction - 2);
            this.fireSourceSystem.suppressDirectionalSourceFromObstacleDistance(
                source.getId(), contactDistance,
            );
        }
    }

    public getHoseJetBallForceSample() {
        return this.hoseJetBallForceSystem
            ?.getLastSample() ??
            null;
    }

    // -------------------------------------------------------
    // Phase 8B-10A Hydrant + Hose Entity
    // -------------------------------------------------------

    // -------------------------------------------------------
    // R-2.1 Fire Robot Navigation
    // -------------------------------------------------------

    private createFireRobotR1R2(): void {
        const definition = {
            ...DEFAULT_FIRE_ROBOT_DEFINITION,
            positionX: 650,
            positionY: 280,
            roamRadius: 320,
        };
        if (!definition.enabled) {
            return;
        }

        if (this.fireRobot) {
            throw new Error("World Fire Robot R-2.1 has already been created.");
        }

        const navigationQuery =
            new RobotNavigationQuery(
                this.robotInteractionRegistry,
                DEFAULT_COURSE_BOUNDARY_DEFINITION,
                definition.id,
            );

        this.fireRobot =
            new Robot(
                definition,
                navigationQuery,
                this.robotInteractionRegistry,
                this.fireSourceSystem,
                this.waterSourceSystem,
                this.localWindSystem,
            );

        this.robotInteractionRegistry.register({
            id: definition.id, label: "Fire Robot",
            capabilities: { navigationBlocker: true, attackTarget: true, visionOccluder: true },
            shape: { kind: "circle", radius: definition.navigationRadius },
            getX: (): number => this.fireRobot?.getX() ?? -100000,
            getY: (): number => this.fireRobot?.getY() ?? -100000,
        });

        this.addEntity(
            this.fireRobot,
            WorldRenderLayer.GameplayActors,
        );

        // R-9 shared Robot physical/elemental impact awareness. The Robot is
        // kinematic: Ball collision response deflects the Ball but never moves it.
        this.physicsWorld.registerDynamicCollidable(
            `${definition.id}-physics`,
            this.fireRobot,
            { participation: { impactAwareness: true } },
        );

        this.airborneWaterSystem.registerImpactAwareTarget({
            id: definition.id,
            radius: definition.navigationRadius,
            getX: () => this.fireRobot?.getX() ?? -100000,
            getY: () => this.fireRobot?.getY() ?? -100000,
            notifyImpact: (x, y, sourceId) => this.fireRobot?.notifyExternalImpact({
                sourceKind: "water", sourceId, positionX: x, positionY: y,
            }),
        });

        this.localWindSystem.registerImpactAwareTarget({
            id: definition.id,
            radius: definition.navigationRadius,
            getX: () => this.fireRobot?.getX() ?? -100000,
            getY: () => this.fireRobot?.getY() ?? -100000,
            notifyImpact: (x, y, sourceId) => this.fireRobot?.notifyExternalImpact({
                sourceKind: "wind", sourceId, positionX: x, positionY: y,
            }),
        });

        if (definition.debugEnabled) {
            this.robotDebugVisualizer =
                new RobotDebugVisualizer(
                    this.fireRobot,
                );

            this.presentationLayers
                .getLayer(WorldRenderLayer.Debug)
                .addChild(
                    this.robotDebugVisualizer
                        .getContainer(),
                );

            this.robotDebugVisualizer
                .update();
        }
    }

    /** Water Robot reuses the complete shared Robot behaviour and swaps only elemental output/art. */
    private createWaterRobot(): void {
        if (!DEFAULT_WATER_ROBOT_DEFINITION.enabled) return;
        if (this.waterRobot || this.secondWaterRobot) {
            throw new Error("World Water Robot test pair has already been created.");
        }
        if (!this.waterVfxSystem) {
            throw new Error("World requires WaterVfxSystem before Water Robot VFX.");
        }

        // RP-3.5 deterministic Water test pair. Robot artwork/nozzle faces +X at
        // its authored zero rotation, so each Robot starts directly left of its
        // assigned paddle and initially faces that paddle.
        const placements = [
            { idSuffix: "rp35-upper", x: 620, y: 280 },
            { idSuffix: "rp35-lower", x: 620, y: 700 },
        ] as const;

        const createTestRobot = (
            placement: (typeof placements)[number],
            isSecond: boolean,
        ): Robot => {
            const definition = {
                ...DEFAULT_WATER_ROBOT_DEFINITION,
                id: `${DEFAULT_WATER_ROBOT_DEFINITION.id}-${placement.idSuffix}`,
                positionX: placement.x,
                positionY: placement.y,
                // Keep the Robots near their dedicated paddles during this test.
                roamRadius: 90,
            };
            const navigationQuery = new RobotNavigationQuery(
                this.robotInteractionRegistry,
                DEFAULT_COURSE_BOUNDARY_DEFINITION,
                definition.id,
            );
            const robot = new Robot(
                definition,
                navigationQuery,
                this.robotInteractionRegistry,
                this.fireSourceSystem,
                this.waterSourceSystem,
                this.localWindSystem,
            );

            this.robotInteractionRegistry.register({
                id: definition.id,
                label: isSecond ? "Water Robot 2" : "Water Robot 1",
                capabilities: {
                    navigationBlocker: true,
                    attackTarget: true,
                    visionOccluder: true,
                },
                shape: { kind: "circle", radius: definition.navigationRadius },
                getX: () => robot.getX(),
                getY: () => robot.getY(),
            });

            this.addEntity(robot, WorldRenderLayer.GameplayActors);
            this.physicsWorld.registerDynamicCollidable(
                `${definition.id}-physics`,
                robot,
                { participation: { impactAwareness: true } },
            );

            this.airborneWaterSystem.registerImpactAwareTarget({
                id: definition.id,
                radius: definition.navigationRadius,
                getX: () => robot.getX(),
                getY: () => robot.getY(),
                notifyImpact: (x, y, sourceId) => robot.notifyExternalImpact({
                    sourceKind: "water",
                    sourceId,
                    positionX: x,
                    positionY: y,
                }),
            });

            this.localWindSystem.registerImpactAwareTarget({
                id: definition.id,
                radius: definition.navigationRadius,
                getX: () => robot.getX(),
                getY: () => robot.getY(),
                notifyImpact: (x, y, sourceId) => robot.notifyExternalImpact({
                    sourceKind: "wind",
                    sourceId,
                    positionX: x,
                    positionY: y,
                }),
            });

            return robot;
        };

        this.waterRobot = createTestRobot(placements[0], false);
        this.secondWaterRobot = createTestRobot(placements[1], true);

        const firstAttack = this.waterRobot.getWaterAttackSource();
        const secondAttack = this.secondWaterRobot.getWaterAttackSource();
        if (!firstAttack || !secondAttack) {
            throw new Error("RP-3.5 Water Robot test pair did not create Water attack sources.");
        }

        this.waterRobotHoseVfx = new HoseWaterVfx(
            firstAttack,
            this.airborneWaterSystem,
            this.waterVfxSystem,
            this.waterVfxSystem.getDefinition().hose,
        );
        this.secondWaterRobotHoseVfx = new HoseWaterVfx(
            secondAttack,
            this.airborneWaterSystem,
            this.waterVfxSystem,
            this.waterVfxSystem.getDefinition().hose,
        );

        this.airborneWaterVisualizer?.setSourceHidden(firstAttack.getWaterSourceId(), true);
        this.airborneWaterVisualizer?.setSourceHidden(secondAttack.getWaterSourceId(), true);

        if (this.ball) {
            this.waterRobotJetBallForceSystem = new HoseJetBallForceSystem(
                firstAttack,
                this.ball,
                ROBOT_HOSE_JET_BALL_FORCE_DEFINITION,
                this.airborneWaterSystem,
                this.physicsWorld,
            );
            this.secondWaterRobotJetBallForceSystem = new HoseJetBallForceSystem(
                secondAttack,
                this.ball,
                ROBOT_HOSE_JET_BALL_FORCE_DEFINITION,
                this.airborneWaterSystem,
                this.physicsWorld,
            );
        }
    }

    /** Wind Robot reuses shared AI and drives an authoritative conical Local Wind pull source. */
    private createWindRobot(): void {
        const definition = {
            ...DEFAULT_WIND_ROBOT_DEFINITION,
            positionX: 650,
            positionY: 700,
            roamRadius: 320,
        };
        if (!definition.enabled) return;
        if (this.windRobot) throw new Error("World Wind Robot has already been created.");

        const navigationQuery = new RobotNavigationQuery(
            this.robotInteractionRegistry, DEFAULT_COURSE_BOUNDARY_DEFINITION, definition.id,
        );
        this.windRobot = new Robot(
            definition, navigationQuery, this.robotInteractionRegistry,
            this.fireSourceSystem, this.waterSourceSystem, this.localWindSystem,
        );
        const robot = this.windRobot;

        this.robotInteractionRegistry.register({
            id: definition.id, label: "Wind Robot",
            capabilities: { navigationBlocker: true, attackTarget: true, visionOccluder: true },
            shape: { kind: "circle", radius: definition.navigationRadius },
            getX: () => robot?.getX() ?? -100000,
            getY: () => robot?.getY() ?? -100000,
        });

        this.addEntity(robot, WorldRenderLayer.GameplayActors);
        this.physicsWorld.registerDynamicCollidable(
            `${definition.id}-physics`, robot, { participation: { impactAwareness: true } },
        );
        this.airborneWaterSystem.registerImpactAwareTarget({
            id: definition.id, radius: definition.navigationRadius,
            getX: () => robot?.getX() ?? -100000,
            getY: () => robot?.getY() ?? -100000,
            notifyImpact: (x, y, sourceId) => robot?.notifyExternalImpact({
                sourceKind: "water", sourceId, positionX: x, positionY: y,
            }),
        });
        this.localWindSystem.registerImpactAwareTarget({
            id: definition.id, radius: definition.navigationRadius,
            getX: () => robot?.getX() ?? -100000,
            getY: () => robot?.getY() ?? -100000,
            notifyImpact: (x, y, sourceId) => robot?.notifyExternalImpact({
                sourceKind: "wind", sourceId, positionX: x, positionY: y,
            }),
        });
    }

    /** R-4: mechanisms are explicitly classified once, not hard-coded in Robot AI. */
    private registerRobotR4MechanismTargets(): void {
        for (let index = 0; index < this.fans.length; index += 1) {
            const fan = this.fans[index];
            if (!fan) continue;
            this.robotInteractionRegistry.register({
                id: `fan-${index}`, label: "Fan",
                capabilities: { navigationBlocker: true, attackTarget: true, visionOccluder: true },
                shape: { kind: "circle", radius: 42 },
                getX: (): number => fan.getX(), getY: (): number => fan.getY(),
            });
        }
        for (let index = 0; index < this.sprinklers.length; index += 1) {
            const sprinkler = this.sprinklers[index];
            if (!sprinkler) continue;
            const unregister = this.robotInteractionRegistry.register({
                id: `sprinkler-${index}`, label: "Sprinkler",
                capabilities: { navigationBlocker: true, attackTarget: true, visionOccluder: true },
                shape: { kind: "circle", radius: 30 },
                getX: (): number => sprinkler.getX(), getY: (): number => sprinkler.getY(),
            });
            this.sprinklerRobotInteractionUnregister.set(sprinkler, unregister);
        }
    }

    /**
     * Finalizes capture only after the shrink animation has completed. World
     * unregisters every live reference before Entity.destroy() can invalidate
     * the Sprinkler transform used by Robot vision/navigation.
     */
    private processCompletedWindSuctionCaptures(): void {
        for (const target of this.windSuctionCaptureSystem.consumeCompletedTargets()) {
            const sprinkler = this.sprinklers.find((candidate) => candidate === target.body);
            if (!sprinkler) continue;

            sprinkler.completeSuctionCapture();
            this.removeEntity(sprinkler);
        }
    }

    // -------------------------------------------------------
    // Entity Management
    // -------------------------------------------------------

    public addEntity(
        entity:
            Entity,

        layer:
            WorldRenderLayer =
            WorldRenderLayer.PhysicalObjects,
    ): void {

        entity.initialize();

        this.entities.push(
            entity,
        );

        this.presentationLayers
            .getLayer(
                layer,
            )
            .addChild(
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

        // World-owned registrations must be released before destroy() nulls
        // presentation state that Robot vision/navigation callbacks may read.
        if (entity instanceof Sprinkler) {
            this.sprinklerRobotInteractionUnregister.get(entity)?.();
            this.sprinklerRobotInteractionUnregister.delete(entity);

            // The registry entry is gone now, but a Robot targeting controller may
            // still retain that entry during its target-loss grace window. Release
            // those direct references before destroy() invalidates Entity.getX/Y().
            this.fireRobot?.invalidateCurrentTarget();
            this.waterRobot?.invalidateCurrentTarget();
            this.secondFireRobot?.invalidateCurrentTarget();
            this.secondWaterRobot?.invalidateCurrentTarget();
            this.secondWindRobot?.invalidateCurrentTarget();
            this.windRobot?.invalidateCurrentTarget();
            this.windSuctionCaptureSystem.unregisterTarget(entity.getSourceId());
            this.physicsWorld.unregisterDynamicBody(entity);
            this.waterSourceSystem.removeSource(entity.getSourceId());

            const sprinklerIndex = this.sprinklers.indexOf(entity);
            if (sprinklerIndex !== -1) this.sprinklers.splice(sprinklerIndex, 1);
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
            this.physicsWorld
                .unregisterDynamicBody(
                    entity,
                );
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
            this.hydrantHose
        ) {
            this.hoseWaterVfx
                ?.reset();

            this.hydrantHose =
                null;
            this.hoseCollisionSystem =
                null;
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

    public getMoistureSurfaceBridge():
        MoistureSurfaceBridge {

        return this.moistureSurfaceBridge;
    }

    public getWaterField():
        WaterField {

        return this.waterField;
    }

    public getWaterSourceSystem():
        WaterSourceSystem {

        return this.waterSourceSystem;
    }

    public getAirborneWaterSystem():
        AirborneWaterSystem {

        return this.airborneWaterSystem;
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

        const gameplayActors =
            this.presentationLayers
                .getLayer(
                    WorldRenderLayer.GameplayActors,
                );

        const ballContainer =
            this.ball
                .getContainer();

        const ballDisplayIndex =
            gameplayActors
                .getChildIndex(
                    ballContainer,
                );

        gameplayActors.addChildAt(
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

        this.presentationLayers
            .getLayer(
                WorldRenderLayer.Debug,
            )
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

        /*
         * Fire VFX consumes the same PhysicsWorld-derived airborne obstacle
         * cache as airborne Water. Synchronize before constructing the Fire
         * presentation collision adapter so static objects, mechanisms and
         * Hydrant Hose geometry are available immediately.
         */
        this.waterObstacleRegistrationSystem
            .synchronize();

        this.fireVfxSystem =
            new FireVfxSystem(
                this.fireManager,
                this.fireSourceSystem,
                this.environmentField,
                this.localWindSystem,
                this.waterObstacleRegistrationSystem
                    .getAirborneCollisionField(),
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
        this.presentationLayers
            .getLayer(
                WorldRenderLayer.GroundState,
            )
            .addChild(
                this.fireVfxSystem
                    .getGroundContainer(),
            );

        this.presentationLayers
            .getLayer(
                WorldRenderLayer.AirborneEffects,
            )
            .addChild(
                this.fireVfxSystem
                    .getAirborneContainer(),
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

        if (this.fans.length > 0) {
            throw new Error("World Fan entities have already been created.");
        }

        const existingSources = this.localWindSystem.getSources();
        const template = existingSources.find((candidate): boolean =>
            candidate.enabled && !candidate.id.startsWith("fire-validation-field-"),
        ) ?? existingSources.find((candidate): boolean => candidate.enabled) ?? existingSources[0];

        const fanPlacements = [
            { id: "stress-fan-wind-1", x: 520, y: 180, directionRadians: Math.PI / 2 },
            { id: "stress-fan-wind-2", x: 1240, y: 620, directionRadians: -Math.PI / 2 },
        ];

        const preservedSources = existingSources.filter(
            (candidate): boolean => !candidate.id.startsWith("stress-fan-wind-") && candidate.id !== "8d7-test-fan-wind",
        );
        const fanSources = fanPlacements.map((placement) => ({
            id: placement.id,
            positionX: placement.x,
            positionY: placement.y,
            directionRadians: placement.directionRadians,
            range: template?.range ?? 560,
            startHalfWidth: template?.startHalfWidth ?? 55,
            endHalfWidth: template?.endHalfWidth ?? 55,
            acceleration: template?.acceleration ?? 1100,
            endStrengthMultiplier: template?.endStrengthMultiplier ?? 0.60,
            edgeFalloffFraction: template?.edgeFalloffFraction ?? 0.22,
            flowMode: "push" as const,
            enabled: true,
        }));

        this.localWindSystem.replaceSources([
            ...preservedSources,
            ...fanSources,
        ]);

        for (const placement of fanPlacements) {
            const source = this.localWindSystem.getSources().find(
                (candidate): boolean => candidate.id === placement.id,
            );
            if (!source) {
                throw new Error(`World could not create stress-test Fan source ${placement.id}.`);
            }

            const fan = new Fan(
                {
                    ...source,
                    positionX: placement.x,
                    positionY: placement.y,
                    directionRadians: placement.directionRadians,
                },
                this.localWindSystem,
            );
            this.fans.push(fan);
            this.physicsWorld.registerDynamicCollidable(`fan-${source.id}`, fan);
            this.addEntity(fan);
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

            this.physicsWorld
                .registerDynamicCollidable(
                    `fire-tube-${definition.sourceId}`,
                    fireTube,
                );

            this.addEntity(
                fireTube,
            );
        }
    }

    private createFireTubeEntities(): void {
        if (this.fireTubes.length > 0) {
            throw new Error("World Fire Tube entities have already been created.");
        }
        if (!this.ball) {
            throw new Error("World requires Ball before creating the 8D-7 Fire Tube.");
        }

        const fireTube = new FireTube(
            "fire-tube-1",
            this.ball.getX() + 500,
            this.ball.getY(),
            Math.PI / 2,
            this.fireSourceSystem,
        );
        this.fireTubes.push(fireTube);

        this.physicsWorld
            .registerDynamicCollidable(
                "fire-tube-1",
                fireTube,
            );

        this.addEntity(fireTube);
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
        this.presentationLayers
            .getLayer(
                WorldRenderLayer.Debug,
            )
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

        this.presentationLayers
            .getLayer(
                WorldRenderLayer.AirborneEffects,
            )
            .addChild(
                this.windVfxSystem
                    .getContainer(),
            );
    }

    // -------------------------------------------------------
    // Phase 8C-6C Wet Surface Presentation
    // -------------------------------------------------------

    private createWetGroundRenderer():
        void {
        if (
            this.wetGroundRenderer
        ) {
            throw new Error(
                "World WetGroundRenderer has already been created.",
            );
        }

        this.wetGroundRenderer =
            new WetGroundRenderer(
                this.environmentField,
                this.surfaceSystem,
                undefined,
                this.waterPerformanceProfiler,
                this.contourRefreshScheduler,
                this.presentationVisibilityQuery,
            );

        /*
         * Ground moisture is below standing Water, so a retreating puddle
         * naturally reveals the darker retained Wet footprint underneath it.
         */
        this.presentationLayers
            .getLayer(
                WorldRenderLayer.GroundState,
            )
            .addChild(
                this.wetGroundRenderer
                    .getDisplayObject(),
            );

        this.wetGroundRenderer
            .redrawImmediately();
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

        this.presentationLayers
            .getLayer(
                WorldRenderLayer.Debug,
            )
            .addChild(
                this.surfaceGraphics,
            );
    }

    private drawSurfaceGraphics():
        void {

        this.surfaceGraphics
            ?.clear();
    }


    // -------------------------------------------------------
    // Lightweight Runtime Performance Summary
    // -------------------------------------------------------

    private createPerformanceSummaryText():
        void {

        if (this.performanceSummaryText) {
            return;
        }

        this.performanceSummaryText =
            new Text({
                text: "FPS: --  |  Frame: -- ms",
                style: {
                    fontFamily: "monospace",
                    fontSize: 14,
                    fill: 0xffffff,
                    stroke: {
                        color: 0x000000,
                        width: 3,
                    },
                },
            });

        this.performanceSummaryText.position.set(
            12,
            12,
        );

        this.performanceSummaryText.zIndex =
            10000;

        this.screenOverlayContainer
            .addChild(
                this.performanceSummaryText,
            );
    }

    private updatePerformanceSummaryText():
        void {

        if (!this.performanceSummaryText) {
            return;
        }

        const snapshot =
            this.performanceMetrics
                .getSnapshot();

        this.performanceSummaryText.text =
            `FPS: ${snapshot.currentFps.toFixed(0)}  |  Frame: ${snapshot.currentFrameTimeMilliseconds.toFixed(2)} ms`;
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

        this.presentationLayers
            .getLayer(
                WorldRenderLayer.BaseTerrain,
            )
            .addChild(
                this.courseBackground,
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

        this.presentationLayers
            .getLayer(
                WorldRenderLayer.BaseTerrain,
            )
            .addChild(
                sand,
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

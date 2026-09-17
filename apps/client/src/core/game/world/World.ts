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
    HoseJetBallForceSystem,
} from "../physics/water/HoseJetBallForceSystem";

import {
    WaterFieldVisualizer,
} from "../debug/WaterFieldVisualizer";

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
    PhysicsWorld,
} from "../physics/PhysicsWorld";

import {
    HoseCollisionSystem,
} from "../physics/rope/HoseCollisionSystem";

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

    /** Phase 8C-6F continuous ground-moisture texture presentation. */
    private wetGroundRenderer:
        WetGroundRenderer | null =
        null;

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

    /** Phase 8B-3 Water mechanisms. Stationary until the later physics step. */
    private readonly sprinklers:
        Sprinkler[] = [];

    /** Phase 8B-10A fixed Hydrant with physical segmented Hose. */
    private hydrantHose:
        HydrantHose | null = null;

    /** General Hose-versus-world collision pass introduced by 8D-7C. */
    private hoseCollisionSystem:
        HoseCollisionSystem | null = null;

    /** Phase 8B-12 continuous Hose jet -> Ball gameplay response. */
    private hoseJetBallForceSystem:
        HoseJetBallForceSystem | null =
        null;

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
    /**
             * Standing-Water presentation uses the WaterField-driven visualizer.
             * Wet Ground remains independently rendered beneath it.
             */
    private waterFieldVisualizer:
        WaterFieldVisualizer | null =
        null;

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

    private readonly dynamicCollisionSystem:
        DynamicCollisionSystem;

    /** Phase 8D-7D movable gameplay objects versus fixed world geometry. */
    private readonly dynamicStaticCollisionSystem:
        DynamicStaticCollisionSystem;

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

        this.cameraShake =
            new CameraShake();

        this.cameraFeedbackController =
            new CameraFeedbackController(
                this.cameraShake,
            );

        this.physicsWorld =
            new PhysicsWorld();

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

        this.createPerformanceDebugOverlay();

        // ---------------------------------------------------
        // Procedural Obstacle Field
        // ---------------------------------------------------

        const obstacleField =
            new ProceduralObstacleFieldGenerator()
                .generate(
                    DEFAULT_COURSE_BOUNDARY_DEFINITION,
                );

        this.staticObstacleDefinitions = [
            ...obstacleField.staticDefinitions,
            {
                id: "8d7-test-square-1",
                shape: "rectangle",
                positionX: 760,
                positionY: 260,
                width: 72,
                height: 72,
                fillColor: 0x8b6f47,
                outlineColor: 0x2f2419,
                outlineWidth: 4,
                material: { restitution: 0.45, collisionFriction: 0.24 },
            },
            {
                id: "8d7-test-square-2",
                shape: "rectangle",
                positionX: 980,
                positionY: 460,
                width: 72,
                height: 72,
                fillColor: 0x8b6f47,
                outlineColor: 0x2f2419,
                outlineWidth: 4,
                material: { restitution: 0.45, collisionFriction: 0.24 },
            },
        ];

        for (
            const definition
            of this.staticObstacleDefinitions
        ) {
            this.physicsWorld
                .registerStaticDefinition(
                    definition,
                );

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

            this.physicsWorld
                .registerDynamicCollidable(
                    `dynamic-obstacle-${this.dynamicObstacles.length}`,
                    obstacle,
                );

            this.addEntity(
                obstacle,
            );
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
                this.physicsWorld
                    .getRigidDynamicCollidables(),
                this.windManager,
                this.surfaceSystem,
                this.localWindSystem,
                this.waterField,
            );

        this.addEntity(
            this.ball,
            WorldRenderLayer.GameplayActors,
        );
        this.createBallTrail();

        this.createWaterFieldVisualizer();

        this.createWaterDepositDebugController();

        this.createAirborneWaterVisualizer();

        this.createSprinklerEntities();

        this.createHydrantHoseEntity();

        /*
         * Phase 8D-7:
         * Create the deterministic Fire Tube before registering live gameplay
         * colliders with the Water obstacle bridge. This ensures the Fire Tube
         * exists when WaterGameObjectIntegrationValidation runs and remains
         * registered during normal runtime.
         */
        this.createFireTubeEntities();

        this.createWaterGameObjectIntegration();

        this.createHoseJetBallForceSystem();



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
         * Phase 8B-7 Water transport order:
         * source timing -> immutable emission handoff -> Wind-responsive
         * airborne flight -> ground impact -> standing-Water simulation.
         */
        this.waterSourceSystem
            .update(
                deltaTime,
            );

        this.airborneWaterSystem
            .consumeEmissionRequests(
                this.waterSourceSystem
                    .drainEmissionRequests(),
            );

        this.airborneWaterSystem
            .update(
                deltaTime,
            );

        /*
         * Phase 8F-10: 8I is not consuming gameplay events yet, so discard
         * previous-frame events before producing this frame's contacts.
         */
        this.waterFireInteraction.clearGameplayEvents();

        /*
         * Phase 8F-4 suppression is rebuilt from only the current transport
         * sweeps. Clearing first guarantees that moving or stopping Water
         * restores the complete directional Fire jet automatically.
         */
        this.fireSourceSystem
            .beginDirectionalWaterSuppressionFrame();

        this.waterFireInteraction
            .updateAirborneWaterDirectionalFire(
                this.airborneWaterSystem
                    .getLastMovementSweeps(),
                this.fireSourceSystem,
            );

        /*
         * Phase 8F-3: resolve every fixed-step airborne Water movement sweep
         * immediately after transport. Ground Fire contacted by the stream is
         * removed before FireManager advances later in this frame.
         */
        this.waterFireInteraction
            .updateAirborneWaterGroundFire(
                this.airborneWaterSystem
                    .getLastMovementSweeps(),
                this.fireManager,
            );

        this.airborneWaterVisualizer
            ?.update();



        this.waterField
            .update(
                deltaTime,
            );



        this.waterGroundInteractionSystem
            .update(
                deltaTime,
            );




        this.moistureSurfaceBridge
            .update(
                deltaTime,
            );


        /*
         * Phase 8F-2: resolve meaningful standing-Water overlap before the
         * Fire simulation advances, so extinguished Ground Fire cannot
         * deposit heat, burn fuel, scorch, or spread during this frame.
         */
        this.waterFireInteraction
            .updateStandingWaterGroundFire(
                this.waterField,
                this.fireManager,
            );


        /*
         * Phase 8F-5: standing Water contributes to the same transient
         * directional suppression map already populated by 8F-4 airborne
         * Water. The earliest Water contact therefore limits the jet.
         */
        this.waterFireInteraction
            .updateStandingWaterDirectionalFire(
                this.waterField,
                this.fireSourceSystem,
            );



        /*
                 * Phase 8C-6F:
                 * presentation uploads small grid-resolution textures at controlled
                 * intervals. The GPU linearly interpolates the scalar Water/moisture
                 * samples across one quad per layer.
                 */
        this.wetGroundRenderer
            ?.update(
                deltaTime,
            );

        this.waterDepositDebugController
            ?.update(
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
                 * Phase 8B-12:
                 * HydrantHose has now advanced rope/nozzle physics and synchronized
                 * its current pressure/source state. Apply the continuous jet impulse
                 * to Ball from that authoritative current-frame mechanism state.
                 *
                 * Ball itself appears earlier in the entity list, so position
                 * integration occurs on the following Ball physics frame. Velocity is
                 * updated immediately through Ball.applyImpulseAtWorldPoint().
                 */
        this.hoseJetBallForceSystem
            ?.update(
                deltaTime,
            );

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
        /*
         * Phase 8D-7E:
         * Collision consumers now obtain their populations from PhysicsWorld.
         * Registration is centralized; collision mathematics is unchanged.
         */
        this.dynamicCollisionSystem
            .resolve(
                this.physicsWorld
                    .getRigidDynamicCollidables(),
            );

        this.dynamicStaticCollisionSystem
            .resolve(
                this.physicsWorld,
            );



        /*
         * 8D-7C: the flexible Hose participates in the same world collider
         * population without being converted into a rigid DynamicCollidable.
         */
        if (
            this.hydrantHose &&
            this.hoseCollisionSystem
        ) {
            this.hoseCollisionSystem.resolve(
                this.physicsWorld,
            );
            this.hydrantHose.synchronizeAfterExternalCollision();
        }



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

        for (
            const sprinkler
            of this.sprinklers
        ) {
            sprinkler.synchronizeAfterCollisionResolution();
        }



        this.waterObstacleRegistrationSystem
            .synchronize();



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
        this.airborneWaterVisualizer
            ?.destroy();

        this.airborneWaterVisualizer =
            null;

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

        this.performanceDebugOverlay
            ?.destroy();

        this.performanceDebugOverlay =
            null;

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

    private createWaterFieldVisualizer():
        void {

        if (
            this.waterFieldVisualizer
        ) {
            throw new Error(
                "World WaterField visualizer has already been created.",
            );
        }

        this.waterFieldVisualizer =
            new WaterFieldVisualizer(
                this.waterField,
            );

        this.presentationLayers
            .getLayer(
                WorldRenderLayer.StandingWater,
            )
            .addChild(
                this.waterFieldVisualizer
                    .getGraphics(),
            );

        this.waterFieldVisualizer
            .redrawImmediately();
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
            { id: "sprinkler-1", x: this.ball.getX() + 280, y: this.ball.getY() - 120, rotation: 0 },
            { id: "sprinkler-2", x: this.ball.getX() + 280, y: this.ball.getY() + 120, rotation: Math.PI / 4 },
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

            this.addEntity(sprinkler);
        }
    }

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

    private createHoseJetBallForceSystem():
        void {

        if (
            this.hoseJetBallForceSystem
        ) {
            throw new Error(
                "World Hose jet Ball-force system has already been created.",
            );
        }

        if (
            !this.hydrantHose ||
            !this.ball
        ) {
            throw new Error(
                "World requires HydrantHose and Ball before creating Hose jet Ball-force response.",
            );
        }

        this.hoseJetBallForceSystem =
            new HoseJetBallForceSystem(
                this.hydrantHose,
                this.ball,
            );
    }

    public getHoseJetBallForceSample() {
        return this.hoseJetBallForceSystem
            ?.getLastSample() ??
            null;
    }

    // -------------------------------------------------------
    // Phase 8B-10A Hydrant + Hose Entity
    // -------------------------------------------------------

    private createHydrantHoseEntity(): void {
        if (this.hydrantHose) {
            throw new Error(
                "World Hydrant Hose entity has already been created.",
            );
        }

        if (!this.ball) {
            throw new Error(
                "World requires Ball before creating the Hydrant Hose.",
            );
        }

        this.hydrantHose =
            new HydrantHose(
                "hydrant-hose-1",
                this.ball.getX() + 430,
                this.ball.getY() + 170,
                this.ball,
                this.waterSourceSystem,
            );

        this.addEntity(
            this.hydrantHose,
        );

        this.hoseCollisionSystem =
            new HoseCollisionSystem(
                this.hydrantHose.getRope(),
                this.hydrantHose.getDefinition(),
            );

        this.presentationLayers
            .getLayer(
                WorldRenderLayer.AirborneEffects,
            )
            .addChild(
                this.hydrantHose
                    .getNozzlePreSprayGraphics(),
            );
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
            entity instanceof FireTube ||
            entity instanceof Sprinkler
        ) {
            this.physicsWorld
                .unregisterDynamicBody(
                    entity,
                );
        }

        if (
            entity instanceof Sprinkler
        ) {
            const sprinklerIndex =
                this.sprinklers.indexOf(
                    entity,
                );

            if (
                sprinklerIndex !==
                -1
            ) {
                this.sprinklers.splice(
                    sprinklerIndex,
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
            this.hydrantHose
        ) {
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

        if (
            this.fans.length >
            0
        ) {
            throw new Error(
                "World Fan entities have already been created.",
            );
        }

        /*
         * Phase 8D-7 deterministic Fan fixture.
         *
         * Fan requires its Local Wind source id to exist inside
         * LocalWindSystem because the physical mechanism continuously
         * synchronizes the source transform as it moves and rotates.
         *
         * Normal Fire/Wind configurations are allowed to contain only
         * validation-field sources, so do not make World startup depend on
         * finding a pre-existing gameplay Fan source. Preserve every current
         * source and append one dedicated 8D-7 source when necessary.
         */
        const existingSources =
            this.localWindSystem
                .getSources();

        let source =
            existingSources
                .find(
                    (candidate): boolean =>
                        candidate.enabled &&
                        !candidate.id.startsWith(
                            "fire-validation-field-",
                        ),
                );

        if (
            !source
        ) {
            const template =
                existingSources
                    .find(
                        (candidate): boolean =>
                            candidate.enabled,
                    ) ??
                existingSources[0];

            const sourceId =
                "8d7-test-fan-wind";

            const deterministicSource = {
                id:
                    sourceId,

                positionX:
                    900,

                positionY:
                    180,

                directionRadians:
                    Math.PI / 2,

                range:
                    template?.range ??
                    560,

                startHalfWidth:
                    template?.startHalfWidth ??
                    55,

                endHalfWidth:
                    template?.endHalfWidth ??
                    55,

                acceleration:
                    template?.acceleration ??
                    1100,

                endStrengthMultiplier:
                    template?.endStrengthMultiplier ??
                    0.60,

                edgeFalloffFraction:
                    template?.edgeFalloffFraction ??
                    0.22,

                enabled:
                    true,
            };

            this.localWindSystem
                .replaceSources([
                    ...existingSources,
                    deterministicSource,
                ]);

            source =
                this.localWindSystem
                    .getSources()
                    .find(
                        (candidate): boolean =>
                            candidate.id ===
                            sourceId,
                    );
        }

        if (
            !source
        ) {
            throw new Error(
                "World could not create the deterministic 8D-7 Fan Local Wind source.",
            );
        }

        /*
         * Use a copy for the Fan's initial transform while keeping the same
         * registered source id. Fan.initialize() immediately synchronizes the
         * authoritative LocalWindSystem source to the physical outlet.
         */
        const fan =
            new Fan(
                {
                    ...source,
                    positionX:
                        900,
                    positionY:
                        180,
                    directionRadians:
                        Math.PI / 2,
                },
                this.localWindSystem,
            );

        this.fans.push(
            fan,
        );

        this.physicsWorld
            .registerDynamicCollidable(
                `fan-${source.id}`,
                fan,
            );

        this.addEntity(
            fan,
        );
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

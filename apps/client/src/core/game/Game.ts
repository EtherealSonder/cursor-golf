import { WorldModifierAmbienceController } from "./audio/WorldModifierAmbienceController";
import { BallMechanismAudioController } from "./audio/BallMechanismAudioController";
import { BumperImpactAudioController } from "./audio/BumperImpactAudioController";
import { BallPlatformAudioController } from "./audio/BallPlatformAudioController";
import { BallTraversalAudioController } from "./audio/BallTraversalAudioController";
import { BallCollisionAudioController } from "./audio/BallCollisionAudioController";
import { MineAudioController } from "./audio/MineAudioController";
import { RobotAudioController } from "./audio/RobotAudioController";
import { FanAudioController } from "./audio/FanAudioController";
import { GroundFireAudioController } from "./audio/GroundFireAudioController";
import { RobotFireAudioController } from "./audio/RobotFireAudioController";
import { SprinklerAudioController } from "./audio/SprinklerAudioController";
import { RobotWaterWindAudioController } from "./audio/RobotWaterWindAudioController";
import { WaterFillingAudioController } from "./audio/WaterFillingAudioController";
import { SpatialAudioManager } from "./audio/SpatialAudioManager";
import { GolfClubForegroundOverlay } from "./presentation/GolfClubForegroundOverlay";
import { CrateRewardController } from "./crate/CrateRewardController";
import { assertCrateRewardRegression } from "./debug/CrateRewardRegression";
import type { WorldModifierResolvedState } from "./world-modifiers/WorldModifierDefinition";
import type { WorldModifierDebugSelection } from "./world-modifiers/WorldModifierDebugController";
import { PixiPresentationProfiler as P3C2 } from "./debug/PixiPresentationProfiler";
import { WaterSubphaseProfiler as P3C1 } from "./debug/WaterSubphaseProfiler";
import { GeometryQueryAttributionProfiler as P3B1 } from "./debug/GeometryQueryAttributionProfiler";
import { PerformanceDiagnosticStatusOverlay as P3B1Overlay } from "./debug/PerformanceDiagnosticStatusOverlay";
import { Container } from "pixi.js";
import { BallEffectController } from "./ball-effects/BallEffectController";
import type { BallEffectSelection, BallEffectSnapshot } from "./ball-effects/BallEffectDefinition";
import { EngineLoop } from "../engine/EngineLoop";
import { EngineState } from "../engine/EngineState";
import { InputManager } from "../input/InputManager";
import { Renderer } from "../rendering/Renderer";
import { AssetLoader } from "../rendering/AssetLoader";
import { CameraController } from "./controllers/CameraController";
import { ShotCameraFollowController } from "./camera/ShotCameraFollowController";
import { PlayerController } from "./controllers/PlayerController";

import type {
    WindTuningState,
    WindTuningStateListener,
} from "./debug/WindTuningController";

import type {
    WindValidationState,
    WindValidationStateListener,
} from "./debug/WindValidationMetrics";

import type {
    FireDirectionalValidationState,
    FireDirectionalValidationStateListener,
} from "./debug/FireDirectionalValidation";

import type {
    WindState,
    WindStateListener,
} from "./environment/WindManager";

import type {
    FireWindTestConfigurationId,
} from "./config/FireWindTestDefinition";

import type {
    PerformanceBenchmarkId,
} from "./config/PerformanceBenchmarkDefinition";

import type {
    PerformanceSnapshot,
} from "./debug/PerformanceMetrics";

import { ShotController } from "./shot/ShotController";
import { World } from "./world/World";
import { isPerformanceInvestigationEnabled, isFrameStallAttributionP3A1, isBrowserMainThreadTraceP3A2 } from "./debug/PerformanceInvestigationDefinition";
import { FrameStallAttributionProfiler } from "./debug/FrameStallAttributionProfiler";
import { BrowserMainThreadTraceProfiler } from "./debug/BrowserMainThreadTraceProfiler";
import { BallLivesHud } from "./ui/BallLivesHud";
import { ResetBallButton } from "./ui/ResetBallButton";
import { BallDeathController } from "./death/BallDeathController";
import { BallRetryResult } from "./death/BallRetryRequest";
import { BallDeathArchitectureValidation } from "./debug/BallDeathArchitectureValidation";
import { DebuffHud } from "./ui/DebuffHud";
import { HighPowerBallIndicator } from "./ui/HighPowerBallIndicator";
import { HeavyBallIndicator } from "./ui/HeavyBallIndicator";
import { AimSwingIndicator } from "./ui/AimSwingIndicator";
import { StickyBallIndicator } from "./ui/StickyBallIndicator";
import { InvincibleBallIndicator } from "./ui/InvincibleBallIndicator";
import { GhostBallIndicator } from "./ui/GhostBallIndicator";
import { FireDebuffIndicator } from "./ui/FireDebuffIndicator";
import { BallHeatOverlay } from "./ui/BallHeatOverlay";
import { WaterDebuffIndicator } from "./ui/WaterDebuffIndicator";
import { BallDrowningOverlay } from "./ui/BallDrowningOverlay";
import { BallLifeState } from "./death/BallLifeState";
import { BallDeathTransitionController } from "./death/BallDeathTransitionController";
import { BallDeathTransitionRenderer } from "./death/BallDeathTransitionRenderer";
import { BallDeathTransitionValidation } from "./debug/BallDeathTransitionValidation";

import { ShotPowerBaselineValidation } from "./debug/ShotPowerBaselineValidation";
import { WaterSimulationEquivalenceValidation } from "./debug/WaterSimulationEquivalenceValidation";

export class Game {
    private readonly spatialAudio = new SpatialAudioManager();
    private readonly modifierAmbience = new WorldModifierAmbienceController(this.spatialAudio);
    private mineAudio: MineAudioController | null = null;
    private robotAudio: RobotAudioController | null = null;
    private fanAudio: FanAudioController | null = null;
    private groundFireAudio: GroundFireAudioController | null = null;
    private robotFireAudio: RobotFireAudioController | null = null;
    private sprinklerAudio: SprinklerAudioController | null = null;
    private robotWaterWindAudio: RobotWaterWindAudioController | null = null;
    private waterFillingAudio: WaterFillingAudioController | null = null;
    private unsubscribeCrateDestructionAudio: (() => void) | null = null;
    private ballCollisionAudio: BallCollisionAudioController | null = null;
    private ballTraversalAudio: BallTraversalAudioController | null = null;
    private ballMechanismAudio: BallMechanismAudioController | null = null;
    private bumperImpactAudio: BumperImpactAudioController | null = null;
    private ballPlatformAudio: BallPlatformAudioController | null = null;
    private readonly unlockAudioOnPointerDown = () => { this.spatialAudio.unlock(); };
    public setAudioMuted(muted: boolean): void { this.spatialAudio.setMuted(muted); }
    public setAudioMasterVolume(volume: number): void { this.spatialAudio.setMasterVolume(volume); }

    private readonly ballEffectController = new BallEffectController();
    private crateRewardController: CrateRewardController | null = null;
    private highPowerBallIndicator: HighPowerBallIndicator | null = null;
    private heavyBallIndicator: HeavyBallIndicator | null = null;
    private aimSwingIndicator: AimSwingIndicator | null = null;
    private stickyBallIndicator: StickyBallIndicator | null = null;
    private invincibleBallIndicator: InvincibleBallIndicator | null = null;
    private ghostBallIndicator: GhostBallIndicator | null = null;
    public getBallEffectSnapshot(): BallEffectSnapshot { return this.ballEffectController.getSnapshot(); }
    public subscribeToBallEffect(listener: (snapshot: BallEffectSnapshot) => void): () => void {
        return this.ballEffectController.subscribe(listener);
    }
    public getLevelId(): string | null { return this.world?.getLevelId() ?? null; }
    public debugSetBallEffect(effect: BallEffectSelection): void {
        if (!import.meta.env.DEV || this.getLevelId() !== "level-test") return;
        this.ballEffectController.apply(effect);
    }

    private readonly worldModifierListeners = new Set<(state: WorldModifierResolvedState | null) => void>();
    public getWorldModifierState(): WorldModifierResolvedState | null {
        return this.world?.getWorldModifierState() ?? null;
    }
    public subscribeToWorldModifier(listener: (state: WorldModifierResolvedState | null) => void): () => void {
        this.worldModifierListeners.add(listener);
        listener(this.getWorldModifierState());
        return () => { this.worldModifierListeners.delete(listener); };
    }
    /** The HUD receives the effective state, including temporary WM-3 override. */
    public getRolledWorldModifierState(): WorldModifierResolvedState | null {
        return this.world?.getWorldModifierRolledState() ?? null;
    }
    private notifyWorldModifier(): void {
        const state = this.getWorldModifierState();
        for (const listener of this.worldModifierListeners) listener(state);
    }
    public debugSetWorldModifier(selection: WorldModifierDebugSelection, seed: number): void {
        if (!import.meta.env.DEV || !this.world) return;
        this.world.debugSetWorldModifier(selection, seed);
        this.notifyWorldModifier();
    }

    private readonly p3b1StartedAt = performance.now();
    private readonly p3a2Profiler = isBrowserMainThreadTraceP3A2() ? new BrowserMainThreadTraceProfiler() : null;
    private readonly p3a1Profiler = isFrameStallAttributionP3A1() ? new FrameStallAttributionProfiler() : null;

    private shotPowerBaselineValidation: ShotPowerBaselineValidation | null = null;

    private readonly container:
        HTMLDivElement;

    private readonly renderer:
        Renderer;

    private readonly engineLoop:
        EngineLoop;

    private readonly inputManager:
        InputManager;

    private world:
        World | null = null;

    private golfClubForeground: GolfClubForegroundOverlay | null = null;


    private readonly shotCameraFollow = new ShotCameraFollowController();

    private cameraController:
        CameraController | null = null;

    private playerController:
        PlayerController | null = null;

    private shotController:
        ShotController | null = null;

    private hudContainer:
        Container | null = null;

    private ballLivesHud:
        BallLivesHud | null = null;

    private debuffHud:
        DebuffHud | null = null;

    private fireDebuffIndicator:
        FireDebuffIndicator | null = null;

    private ballHeatOverlay:
        BallHeatOverlay | null = null;

    private waterDebuffIndicator:
        WaterDebuffIndicator | null = null;


    private ballDrowningOverlay:
        BallDrowningOverlay | null = null;

    private resetBallButton:
        ResetBallButton | null = null;

    private ballDeathController:
        BallDeathController | null = null;

    private ballDeathValidation:
        BallDeathArchitectureValidation | null = null;

    private lifeLossAnimationTriggered = false;

    private readonly ballDeathTransitionController =
        new BallDeathTransitionController();

    private ballDeathTransitionRenderer:
        BallDeathTransitionRenderer | null = null;

    private ballDeathTransitionDeathX = 0;
    private ballDeathTransitionDeathY = 0;

    private unsubscribeBallDeathState:
        (() => void) | null = null;

    private state:
        EngineState =
        EngineState.Stopped;

    constructor(
        container: HTMLDivElement,
    ) {
        this.container =
            container;
        this.container.addEventListener("pointerdown", this.unlockAudioOnPointerDown, { capture: true });
        window.addEventListener("pointerdown", this.unlockAudioOnPointerDown, { capture: true });
        window.addEventListener("keydown", this.unlockAudioOnPointerDown, { capture: true });
        this.spatialAudio.unlock();

        this.renderer =
            new Renderer();

        this.engineLoop =
            new EngineLoop();

        this.inputManager =
            new InputManager(
                this.container,
            );

        this.renderer
            .setResizeListener(
                this.handleRendererResize,
            );

        this.engineLoop
            .setUpdateCallback(
                this.update,
            );
    }

    public async start():
        Promise<void> {

        if (
            this.state !==
            EngineState.Stopped
        ) {
            return;
        }

        this.state =
            EngineState.Initializing;

        await this.renderer.initialize(
            this.container,
        );

        await AssetLoader.initialize();

        const app =
            this.renderer
                .getApplication();

        if (!app) {
            this.state =
                EngineState.Stopped;

            return;
        }

        this.inputManager
            .setViewportSize(
                this.renderer
                    .getViewportWidth(),

                this.renderer
                    .getViewportHeight(),
            );

        this.world =
            new World(
                app,
            );

        this.world
            .resizeViewport(
                this.renderer
                    .getViewportWidth(),

                this.renderer
                    .getViewportHeight(),
            );

        this.world.initialize();
        this.spatialAudio.setCamera(this.world.getCamera());
        this.mineAudio?.dispose(); this.robotAudio?.dispose(); this.fanAudio?.dispose();
        this.groundFireAudio?.dispose(); this.robotFireAudio?.dispose(); this.sprinklerAudio?.dispose(); this.robotWaterWindAudio?.dispose(); this.waterFillingAudio?.dispose();
        this.mineAudio = new MineAudioController(this.world, this.spatialAudio);
        this.robotAudio = new RobotAudioController(this.world, this.spatialAudio);
        this.fanAudio = new FanAudioController(this.world, this.spatialAudio);
        this.groundFireAudio = new GroundFireAudioController(this.world, this.spatialAudio);
        this.robotFireAudio = new RobotFireAudioController(this.world, this.spatialAudio);
        this.sprinklerAudio = new SprinklerAudioController(this.world, this.spatialAudio);
        this.robotWaterWindAudio = new RobotWaterWindAudioController(this.world, this.spatialAudio);
        this.waterFillingAudio = new WaterFillingAudioController(this.world, this.spatialAudio);
        for (const id of ["world-modifier-downpour", "world-modifier-galewind"] as const) void this.spatialAudio.preload(id);
        void this.spatialAudio.preload("ground-fire");
        void this.spatialAudio.preload("robot-fire-attack");
        for (const id of ["water-sprinkler", "robot-water-attack", "robot-wind-attack", "water-filling-ground"] as const) void this.spatialAudio.preload(id);
        for (const id of ["mine-beep", "mine-explosion", "robot-walk", "robot-detected", "fan-wind"] as const) void this.spatialAudio.preload(id);
        this.unsubscribeCrateDestructionAudio?.();
        this.unsubscribeCrateDestructionAudio = this.world.subscribeCrateDestructionAudio(event => {
            const position = { x: event.x, y: event.y };
            if (event.cause === "ballImpact") {
                this.spatialAudio.play("crate-destroy", { position, gain: 0.3 });
                this.spatialAudio.play("golf-crate-powerup", { position });
            } else {
                this.spatialAudio.play("crate-destroy", { position });
            }
        });
        void this.spatialAudio.preload("crate-destroy");
        void this.spatialAudio.preload("golf-crate-powerup");
        void this.spatialAudio.preload("golf-ball-hit");
        for (const id of ["golf-ball-wall-impact", "golf-ball-metal-hit", "golf-ball-robot-hit", "golf-ball-sticky-impact"] as const) {
            void this.spatialAudio.preload(id);
        }
        this.ballCollisionAudio?.dispose();
        this.ballTraversalAudio?.dispose();
        this.ballMechanismAudio?.dispose();
        this.ballPlatformAudio?.dispose();
        const ballForAudio = this.world.getBall();
        if (ballForAudio) this.ballCollisionAudio = new BallCollisionAudioController(
            ballForAudio, this.world.getStickyBallAttachmentController(), this.spatialAudio,
        );
        this.ballTraversalAudio = ballForAudio ? new BallTraversalAudioController(ballForAudio, this.spatialAudio) : null;
        this.bumperImpactAudio?.dispose();
        this.bumperImpactAudio = new BumperImpactAudioController(this.world, this.spatialAudio);
        this.ballMechanismAudio = ballForAudio ? new BallMechanismAudioController(ballForAudio, this.world, this.spatialAudio) : null;
        this.ballPlatformAudio = ballForAudio ? new BallPlatformAudioController(ballForAudio, this.world, this.spatialAudio) : null;
        for (const id of ["golf-ball-bumper", "golf-ball-bush", "golf-ball-roll", "golf-ball-holed"] as const) void this.spatialAudio.preload(id);
        for (const id of ["golf-ball-water-splash-1", "golf-ball-water-splash-2", "golf-ball-water-splash-3", "golf-ball-sand"] as const) {
            void this.spatialAudio.preload(id);
        }
        this.golfClubForeground = new GolfClubForegroundOverlay(this.container);
        this.world.setBallEffectController(this.ballEffectController);
        this.notifyWorldModifier();
        // Explicit, development-only validation; never runs in normal gameplay or benchmarks.
        if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("o2bvalidate") === "1") {
            WaterSimulationEquivalenceValidation.run();
        }
        if (isPerformanceInvestigationEnabled()) console.info("[PERF] Pass A diagnostic dashboard enabled; rendering timing is CPU-side only.");
        

        // Startup camera authority is the live Ball spawn, not CameraDefinition's
        // generic (0, 0) fallback. Viewport size has already been resolved above.
        const initialBallPosition =
            this.world.getBallWorldPosition();
        if (initialBallPosition) {
            this.world.getCamera().snapToWorldPoint(
                initialBallPosition.x,
                initialBallPosition.y,
            );
        }

        BallDeathTransitionValidation.validate();

        this.ballDeathTransitionRenderer =
            new BallDeathTransitionRenderer(
                this.world.getCamera(),
            );

        this.ballDeathTransitionRenderer.resize(
            this.renderer.getViewportWidth(),
            this.renderer.getViewportHeight(),
        );

        app.stage.addChild(
            this.ballDeathTransitionRenderer.getContainer(),
        );

        /*
         * D-1 screen-space HUD. This container is attached directly to the
         * Pixi stage after World initialization, so it remains independent of
         * camera translation/shake and always renders above world presentation.
         */
        this.hudContainer =
            new Container();

        this.hudContainer.label =
            "GameHud";

        app.stage.addChild(
            this.hudContainer,
        );

        this.ballDeathController =
            new BallDeathController();
        this.crateRewardController = new CrateRewardController(this.ballDeathController, this.ballEffectController);
        this.world.setCrateRewardListener((event) => this.crateRewardController?.award(event)?.lines ?? null);
        if (import.meta.env.DEV) assertCrateRewardRegression();


        this.world.setBallDeathReporter(
            (cause) => {
                const event =
                    this.ballDeathController
                        ?.requestDeath(cause);

                if (!event) {
                    return;
                }

                // Only an accepted death ends a one-life ball effect.
                this.ballEffectController.clear();
                this.world?.lockBallForDeath();
                this.world?.forceAllRobotsIntoDeathCooldown();

                const deathPosition =
                    this.world
                        ?.getBallWorldPosition();

                if (deathPosition) {
                    this.ballDeathTransitionDeathX = deathPosition.x;
                    this.ballDeathTransitionDeathY = deathPosition.y;

                    this.ballDeathTransitionRenderer
                        ?.setDeathWorldPoint(
                            deathPosition.x,
                            deathPosition.y,
                        );
                }

                if (
                    this.ballDeathTransitionController
                        .begin()
                ) {
                    this.lifeLossAnimationTriggered = false;
                    this.world?.beginDeathCameraFocus();
                    this.playerController?.reset();
                    this.shotCameraFollow.reset();
        this.shotController?.reset();
        this.cameraController?.setShotFollowLocked(false);
                    this.world?.setClubVisible(false);
                }
            },
        );

        this.ballLivesHud =
            new BallLivesHud();

        this.unsubscribeBallDeathState =
            this.ballDeathController.subscribe(
                (snapshot) => {
                    this.ballLivesHud?.setLives(
                        snapshot.currentLives,
                        snapshot.maximumLives,
                    );
                },
            );

        this.ballLivesHud.layout(
            this.renderer.getViewportWidth(),
            this.renderer.getViewportHeight(),
        );

        this.hudContainer.addChild(
            this.ballLivesHud.getContainer(),
        );

        this.debuffHud =
            new DebuffHud();

        this.debuffHud.layout(
            this.renderer.getViewportWidth(),
        );

        this.hudContainer.addChild(
            this.debuffHud.getContainer(),
        );

        const ball =
            this.world.getBall();

        if (ball) {
            this.ballHeatOverlay =
                new BallHeatOverlay(ball);

            this.ballDrowningOverlay =
                new BallDrowningOverlay(ball);
        }

        this.resetBallButton =
            new ResetBallButton(
                () => {
                    this.resetBall();
                },
            );

        this.hudContainer.addChild(
            this.resetBallButton.getContainer(),
        );

        // D-3 uses real Fire death. The D-2 numeric-key death harness is
        // intentionally no longer instantiated during normal gameplay.
        this.ballDeathValidation =
            null;

        this.shotController =
            new ShotController(
                this.world,
                this.inputManager,
            );

        this.cameraController =
            new CameraController(
                this.inputManager,
                this.world.getCamera(),
            );

        this.playerController =
            new PlayerController(
                this.inputManager,
                this.world,
                this.shotController,
            );

        this.state =
            EngineState.Running;

        this.engineLoop.start();
    }

    // -------------------------------------------------------------------------
    // Environmental UI Bridge
    // -------------------------------------------------------------------------

    public getWindState():
        WindState | null {

        if (!this.world) {
            return null;
        }

        return this.world
            .getWindManager()
            .getState();
    }

    public subscribeToWindState(
        listener: WindStateListener,
    ): () => void {

        if (!this.world) {
            throw new Error(
                "Cannot subscribe to wind state before the Game has started.",
            );
        }

        return this.world
            .getWindManager()
            .subscribe(
                listener,
            );
    }

    // -------------------------------------------------------------------------
    // C7 Wind-Tuning Bridge
    // -------------------------------------------------------------------------

    public getWindTuningState():
        WindTuningState | null {

        if (!this.world) {
            return null;
        }

        return this.world
            .getWindTuningController()
            .getState();
    }

    public subscribeToWindTuningState(
        listener:
            WindTuningStateListener,
    ): () => void {

        if (!this.world) {
            throw new Error(
                "Cannot subscribe to wind tuning state before the Game has started.",
            );
        }

        return this.world
            .getWindTuningController()
            .subscribe(
                listener,
            );
    }

    public applyPreviousWindPreset():
        void {

        if (!this.world) {
            return;
        }

        const metrics =
            this.world
                .getWindValidationMetrics();

        if (metrics.isMeasuring()) {
            return;
        }

        metrics.clearLatestResult();

        this.world
            .getWindTuningController()
            .applyPreviousPreset();
    }

    public applyNextWindPreset():
        void {

        if (!this.world) {
            return;
        }

        const metrics =
            this.world
                .getWindValidationMetrics();

        if (metrics.isMeasuring()) {
            return;
        }

        metrics.clearLatestResult();

        this.world
            .getWindTuningController()
            .applyNextPreset();
    }

    public applyRandomWind():
        void {

        if (!this.world) {
            return;
        }

        const metrics =
            this.world
                .getWindValidationMetrics();

        if (metrics.isMeasuring()) {
            return;
        }

        metrics.clearLatestResult();

        this.world
            .getWindTuningController()
            .applyRandomWind();
    }

    // -------------------------------------------------------------------------
    // G4/G5 Performance Benchmark Bridge
    // -------------------------------------------------------------------------

    public applyPerformanceBenchmark(
        benchmarkId:
            PerformanceBenchmarkId,
    ): void {

        this.world
            ?.applyPerformanceBenchmark(
                benchmarkId,
            );
    }

    public clearPerformanceBenchmark():
        void {

        this.world
            ?.clearPerformanceBenchmark();
    }

    public getActivePerformanceBenchmarkId():
        PerformanceBenchmarkId | null {

        return this.world
            ?.getActivePerformanceBenchmarkId() ??
            null;
    }

    public getPerformanceSnapshot():
        PerformanceSnapshot | null {

        return this.world
            ?.getPerformanceSnapshot() ??
            null;
    }

    // -------------------------------------------------------------------------
    // Fire / Wind Test Bridge
    // -------------------------------------------------------------------------

    public applyFireWindTestConfiguration(
        configurationId:
            FireWindTestConfigurationId,
    ): void {

        this.world?.applyFireWindTestConfiguration(
            configurationId,
        );
    }

    // -------------------------------------------------------------------------
    // Fire Directional Validation Bridge
    // -------------------------------------------------------------------------

    public getFireDirectionalValidationState():
        FireDirectionalValidationState | null {

        return this.world
            ?.getFireDirectionalValidationState() ??
            null;
    }

    public subscribeToFireDirectionalValidation(
        listener:
            FireDirectionalValidationStateListener,
    ): () => void {

        if (!this.world) {
            throw new Error(
                "Cannot subscribe to Fire directional validation before the Game has started.",
            );
        }

        return this.world
            .subscribeToFireDirectionalValidation(
                listener,
            );
    }

    // -------------------------------------------------------------------------
    // Local Wind Debug Bridge
    // -------------------------------------------------------------------------

    public setLocalWindDebugVisible(visible: boolean): void {
        this.world?.setLocalWindDebugVisible(visible);
    }

    public isLocalWindDebugVisible(): boolean {
        return this.world?.isLocalWindDebugVisible() ?? false;
    }

    // -------------------------------------------------------------------------
    // Fire Source Debug Bridge
    // -------------------------------------------------------------------------

    public setFireSourceDebugVisible(visible: boolean): void {
        this.world?.setFireSourceDebugVisible(visible);
    }

    public isFireSourceDebugVisible(): boolean {
        return this.world?.isFireSourceDebugVisible() ?? false;
    }

    public clearActiveFire(): void {
        this.world?.resetActiveFireOnly();
    }

    public resetFireSourceTestEnvironment(): void {
        this.world?.resetFireEnvironment();
    }

    // -------------------------------------------------------------------------
    // C7 Validation Metrics Bridge
    // -------------------------------------------------------------------------

    public getWindValidationState():
        WindValidationState | null {

        if (!this.world) {
            return null;
        }

        return this.world
            .getWindValidationMetrics()
            .getState();
    }

    public subscribeToWindValidationState(
        listener:
            WindValidationStateListener,
    ): () => void {

        if (!this.world) {
            throw new Error(
                "Cannot subscribe to wind validation state before the Game has started.",
            );
        }

        return this.world
            .getWindValidationMetrics()
            .subscribe(
                listener,
            );
    }

    // -------------------------------------------------------------------------
    // C7 Ball Reset
    // -------------------------------------------------------------------------

    /**
     * Cancels any active shot preparation and returns
     * the Ball to its original visible start position.
     */
    public resetBall(): void {

        if (!this.world) {
            return;
        }

        this.playerController?.reset();
        this.shotCameraFollow.reset();
        this.shotController?.reset();
        this.cameraController?.setShotFollowLocked(false);
        this.world.resetBall();
    }

    /**
     * Gameplay retry is intentionally separate from the temporary manual reset.
     * A retry is legal only for the currently active accepted death.
     */
    public retryBallAfterDeath(): BallRetryResult | null {
        if (!this.world || !this.ballDeathController) {
            return null;
        }

        const request =
            this.ballDeathController.createRetryRequest();

        if (!request) {
            return this.ballDeathController.getSnapshot().currentLives <= 0
                ? BallRetryResult.GameOver
                : BallRetryResult.NotAwaitingRetry;
        }

        this.playerController?.reset();
        this.shotCameraFollow.reset();
        this.shotController?.reset();
        this.cameraController?.setShotFollowLocked(false);
        this.world.resetBallForRetry();

        return this.ballDeathController.acceptRetry(request);
    }

    // -------------------------------------------------------------------------
    // Responsive Viewport
    // -------------------------------------------------------------------------

    private handleRendererResize = (
        width: number,
        height: number,
    ): void => {

        this.inputManager
            .setViewportSize(
                width,
                height,
            );

        this.world
            ?.resizeViewport(
                width,
                height,
            );

        this.ballLivesHud
            ?.layout(
                width,
                height,
            );

        this.debuffHud
            ?.layout(
                width,
            );

        this.ballDeathTransitionRenderer
            ?.resize(
                width,
                height,
            );
    };

    // -------------------------------------------------------------------------
    // Frame Update
    // -------------------------------------------------------------------------

    private update = (
        deltaTime: number,
    ): void => {

        if (
            this.state !==
            EngineState.Running
        ) {
            return;
        }

        const gameUpdateStartedAt =
            performance.now();
        P3C2.recordFrame(gameUpdateStartedAt);
        const p3c2FrameStart = P3C2.start();
        if (P3B1.enabled) {
            P3B1.recordFrame(gameUpdateStartedAt);
            const elapsed = performance.now() - this.p3b1StartedAt;
            if (elapsed < 5000) P3B1Overlay.show(`P3-B1 | Warm-up: ${Math.max(0, Math.ceil((5000-elapsed)/1000))}s`);
            else if (elapsed < 65000) P3B1Overlay.show(`P3-B1 | Recording: ${Math.min(12,Math.floor((elapsed-5000)/5000)+1)}/12`);
        }
        if (P3C1.enabled) P3C1.recordFrame(gameUpdateStartedAt);
        let p3a1WorldMs = 0;

        this.ballDeathController
            ?.update(deltaTime);

        let transitionSnapshot =
            this.ballDeathTransitionController
                .update(deltaTime);

        if (
            transitionSnapshot.state === "lifeLoss" &&
            !this.lifeLossAnimationTriggered
        ) {
            this.lifeLossAnimationTriggered = true;
            this.ballLivesHud?.playPendingLifeLossAnimation();
        }

        if (
            transitionSnapshot.state === "relocating" &&
            transitionSnapshot.retryRequested &&
            this.ballDeathController
                ?.getSnapshot()
                .state === BallLifeState.AwaitingRetry
        ) {
            const camera = this.world?.getCamera();
            const cameraX = camera?.getPositionX() ?? 0;
            const cameraY = camera?.getPositionY() ?? 0;

            this.retryBallAfterDeath();

            this.world
                ?.beginBallDeathRetryRelocation(
                    this.ballDeathTransitionDeathX,
                    this.ballDeathTransitionDeathY,
                    cameraX,
                    cameraY,
                );

            this.ballDeathTransitionController
                .acknowledgeRetry();

            transitionSnapshot =
                this.ballDeathTransitionController
                    .getSnapshot();
        }

        if (transitionSnapshot.state === "relocating") {
            this.world
                ?.updateBallDeathRetryRelocation(
                    transitionSnapshot.progress,
                );

            const position =
                this.world
                    ?.getBallWorldPosition();

            if (position) {
                this.ballDeathTransitionRenderer
                    ?.setCurrentWorldPoint(
                        position.x,
                        position.y,
                    );
            }
        } else if (transitionSnapshot.state === "opening") {
            const position =
                this.world
                    ?.getBallWorldPosition();

            if (position) {
                this.ballDeathTransitionRenderer
                    ?.setCurrentWorldPoint(
                        position.x,
                        position.y,
                    );
            }
        }

        this.ballDeathTransitionRenderer
            ?.render(
                transitionSnapshot,
            );

        if (transitionSnapshot.state === "complete") {
            // Renderer intentionally hides directly from the fully open frame.
            // There is no intermediate full-charcoal frame.
            this.ballDeathTransitionController
                .finish();

            this.ballDeathTransitionRenderer
                ?.render(
                    this.ballDeathTransitionController
                        .getSnapshot(),
                );

            this.world?.unlockBallAfterRetry();
            this.ballDeathController?.beginRetryProtection();
            this.world
                ?.setClubVisible(true);
        }

        const cameraFocusActive =
            this.ballDeathTransitionController
                .isCameraFocusActive();

        const slowMotionActive =
            this.ballDeathTransitionController
                .isSlowMotionActive();

        const feedbackActive =
            cameraFocusActive || slowMotionActive;

        const gameplayFrozen =
            this.ballDeathTransitionController
                .isActive() &&
            !feedbackActive;

        if (feedbackActive) {
            const slowedDeltaTime =
                deltaTime *
                this.ballDeathTransitionController
                    .getGameplayTimeScale();

            this.cameraController?.setEnabled(false);

            // World motion continues slowly, but player control stays locked.
            const p3a1SlowWorldStart = (this.p3a1Profiler || this.p3a2Profiler) ? performance.now() : 0;
            P3C2.measure("worldUpdate", () => { this.world?.update(slowedDeltaTime); });
            if (this.p3a1Profiler || this.p3a2Profiler) p3a1WorldMs = performance.now() - p3a1SlowWorldStart;

            this.mineAudio?.update(deltaTime, this.ballDeathTransitionController.getGameplayTimeScale());
            this.robotAudio?.update(); this.fanAudio?.update();
            this.modifierAmbience.update(this.getWorldModifierState()?.modifier ?? null, deltaTime);
            this.groundFireAudio?.update(deltaTime); this.robotFireAudio?.update(); this.sprinklerAudio?.update(); this.robotWaterWindAudio?.update(); this.waterFillingAudio?.update(deltaTime);
            if (cameraFocusActive) {
                this.world?.updateDeathCameraFocus(
                    transitionSnapshot.progress,
                );
            } else {
                this.world?.keepDeathCameraCenteredOnBall();
            }
        } else if (!gameplayFrozen) {

        /*
         * Development/test input retained intentionally. Right-click creates
         * an authoritative FireManager ignition at the pointer world position.
         */
        if (
            this.inputManager
                .wasContextActionPressed() &&
            this.inputManager
                .isPointerInsideTarget() &&
            !(this.shotController
                ?.isPreparingShot() ?? false)
        ) {
            this.world
                ?.igniteTestFireAtScreenPosition(
                    this.inputManager
                        .getMouseX(),
                    this.inputManager
                        .getMouseY(),
                );
        }

        this.cameraController
            ?.setEnabled(
                !(this.shotController?.isPreparingShot() ?? false) &&
                !this.shotCameraFollow.isActive(),
            );
        this.cameraController?.setShotFollowLocked(this.shotCameraFollow.isActive());

        this.cameraController
            ?.update();

        this.world
            ?.updateCamera(
                deltaTime,
            );

        this.playerController
            ?.update(
                deltaTime,
            );

        this.shotController
            ?.update(deltaTime);
        if (this.shotController?.consumeSuccessfulContact()) {
            const shotPosition = this.world?.getBallWorldPosition();
            if (shotPosition) this.spatialAudio.play("golf-ball-hit", { position: shotPosition });
            this.shotCameraFollow.begin();
            this.cameraController?.setShotFollowLocked(true);
        }

        const p3a1WorldStart = (this.p3a1Profiler || this.p3a2Profiler) ? performance.now() : 0;
        this.world
            ?.update(deltaTime);
        p3a1WorldMs = (this.p3a1Profiler || this.p3a2Profiler) ? performance.now() - p3a1WorldStart : 0;
        if (this.world) {
            this.shotCameraFollow.update(deltaTime, this.world.getBall(), this.world.getCamera());
            if (this.shotCameraFollow.consumeCompletion()) {
                const mouse = this.world.getCamera().viewportToWorld(
                    this.inputManager.getMouseX(), this.inputManager.getMouseY());
                this.world.getClub()?.beginCursorReappearance(mouse.x, mouse.y);
                this.cameraController?.setShotFollowLocked(false);
            }
            if (this.shotCameraFollow.isActive()) {
                this.world.updateCamera(0);
            }
        }
        this.mineAudio?.update(deltaTime, 1);
        this.robotAudio?.update();
        this.fanAudio?.update();
        this.modifierAmbience.update(this.getWorldModifierState()?.modifier ?? null, deltaTime);
        this.groundFireAudio?.update(deltaTime);
        this.robotFireAudio?.update(); this.sprinklerAudio?.update(); this.robotWaterWindAudio?.update(); this.waterFillingAudio?.update(deltaTime);
        this.ballTraversalAudio?.update(deltaTime);
        this.ballMechanismAudio?.update();
        this.ballPlatformAudio?.update(deltaTime);
        this.shotPowerBaselineValidation?.update();

        }

        const fireHeat =
            this.world?.getBallFireHeat() ?? 0;

        this.ballHeatOverlay
            ?.setHeat(fireHeat);

        if (fireHeat > 0.0001) {
            if (!this.fireDebuffIndicator) {
                this.fireDebuffIndicator =
                    new FireDebuffIndicator();

                this.debuffHud?.add(
                    "fire-death",
                    this.fireDebuffIndicator.getContainer(),
                );
            }

            this.fireDebuffIndicator
                .setHeat(fireHeat);
        } else if (this.fireDebuffIndicator) {
            this.debuffHud?.remove(
                "fire-death",
            );

            this.fireDebuffIndicator =
                null;
        }

        /*
         * D-4 single-meter contract:
         * read once after World.update(), then fan out the exact same value to
         * both presentation consumers. Neither HUD nor sinking recalculates it.
         */
        const drowningMeter =
            this.world
                ?.getBallDrowningProgress() ??
            0;

        const ballInStandingWater =
            this.world
                ?.isBallInStandingWater() ??
            false;

        this.ballDrowningOverlay
            ?.setState(
                drowningMeter,
                ballInStandingWater,
            );

        const showWaterDebuff =
            this.world
                ?.shouldShowBallDrowningDebuff() ??
            false;

        if (showWaterDebuff) {
            if (!this.waterDebuffIndicator) {
                this.waterDebuffIndicator =
                    new WaterDebuffIndicator();

                /*
                 * Seed the visual before DebuffHud sees it, so a newly added
                 * entry can never render its constructor's empty state while
                 * the authoritative meter is already high.
                 */
                this.waterDebuffIndicator
                    .setProgress(
                        drowningMeter,
                    );

                this.debuffHud?.add(
                    "water-death",
                    this.waterDebuffIndicator
                        .getContainer(),
                );
            }

            /*
             * Reapply every frame even if the meter did not numerically
             * change. WaterDebuffIndicator deterministically rebuilds its blue
             * geometry from this exact same value used by Ball sinking.
             */
            this.waterDebuffIndicator
                .setProgress(
                    drowningMeter,
                );
        } else if (
            this.waterDebuffIndicator
        ) {
            this.debuffHud?.remove(
                "water-death",
            );

            this.waterDebuffIndicator =
                null;
        }

        // Mirror the authoritative effect state in the shared status queue.
        // Removal is animated by DebuffHud, so do not destroy the entry here.
        const showHighPower = this.ballEffectController.getSnapshot().active === "high-power";
        if (showHighPower) {
            if (!this.highPowerBallIndicator) {
                this.highPowerBallIndicator = new HighPowerBallIndicator();
                this.debuffHud?.add("high-power", this.highPowerBallIndicator.getContainer());
            }
        } else if (this.highPowerBallIndicator) {
            this.debuffHud?.remove("high-power");
            this.highPowerBallIndicator = null;
        }

        const showHeavyBall = this.ballEffectController.getSnapshot().active === "heavy";
        if (showHeavyBall) {
            if (!this.heavyBallIndicator) {
                this.heavyBallIndicator = new HeavyBallIndicator();
                this.debuffHud?.add("heavy", this.heavyBallIndicator.getContainer());
            }
        } else if (this.heavyBallIndicator) {
            this.debuffHud?.remove("heavy");
            this.heavyBallIndicator = null;
        }

        const showAimSwing = this.ballEffectController.getSnapshot().active === "aim-swing";
        if (showAimSwing) {
            if (!this.aimSwingIndicator) {
                this.aimSwingIndicator = new AimSwingIndicator();
                this.debuffHud?.add("aim-swing", this.aimSwingIndicator.getContainer());
            }
        } else if (this.aimSwingIndicator) {
            this.debuffHud?.remove("aim-swing");
            this.aimSwingIndicator = null;
        }

        const showStickyBall = this.ballEffectController.getSnapshot().active === "sticky";
        if (showStickyBall) {
            if (!this.stickyBallIndicator) {
                this.stickyBallIndicator = new StickyBallIndicator();
                this.debuffHud?.add("sticky", this.stickyBallIndicator.getContainer());
            }
        } else if (this.stickyBallIndicator) {
            this.debuffHud?.remove("sticky");
            this.stickyBallIndicator = null;
        }

        const showInvincibleBall = this.ballEffectController.getSnapshot().active === "invincible";
        if (showInvincibleBall) {
            if (!this.invincibleBallIndicator) {
                this.invincibleBallIndicator = new InvincibleBallIndicator();
                this.debuffHud?.add("invincible", this.invincibleBallIndicator.getContainer());
            }
        } else if (this.invincibleBallIndicator) {
            this.debuffHud?.remove("invincible");
            this.invincibleBallIndicator = null;
        }

        const showGhostBall = this.ballEffectController.getSnapshot().active === "ghost";
        if (showGhostBall) {
            if (!this.ghostBallIndicator) {
                this.ghostBallIndicator = new GhostBallIndicator();
                this.debuffHud?.add("ghost", this.ghostBallIndicator.getContainer());
            }
        } else if (this.ghostBallIndicator) {
            this.debuffHud?.remove("ghost");
            this.ghostBallIndicator = null;
        }

        this.ballLivesHud
            ?.update(deltaTime);

        this.debuffHud
            ?.update(deltaTime);

        this.renderer.render();
        this.golfClubForeground?.update(
            this.world?.getClub()?.getForegroundSprite() ?? null,
            this.renderer.getViewportWidth(),
            this.renderer.getViewportHeight(),
        );

        this.inputManager.update();

        P3C2.end("frameCallback",p3c2FrameStart);
        this.world
            ?.recordFramePresentationDiagnostics(
                performance.now() -
                    gameUpdateStartedAt,
                this.renderer
                    .getLastPixiRenderMilliseconds(),
            );
        if (this.p3a1Profiler || this.p3a2Profiler) {
            const frameEnd = performance.now();
            this.p3a2Profiler?.record(gameUpdateStartedAt, frameEnd, p3a1WorldMs, this.renderer.getLastPixiRenderMilliseconds());
        }
        if (this.p3a1Profiler) {
            const frameEnd = performance.now();
            this.p3a1Profiler.record(gameUpdateStartedAt, frameEnd, p3a1WorldMs,
                this.renderer.getLastPixiRenderMilliseconds(),
                this.world?.getP3A1Workload() ?? {waterPackets:0,fireParticles:0,windParticles:0});
        }
    };

    // -------------------------------------------------------------------------
    // Shutdown
    // -------------------------------------------------------------------------

    public stop(): void {
        this.container.removeEventListener("pointerdown", this.unlockAudioOnPointerDown, { capture: true });
        window.removeEventListener("pointerdown", this.unlockAudioOnPointerDown, { capture: true });
        window.removeEventListener("keydown", this.unlockAudioOnPointerDown, { capture: true });
        this.ballCollisionAudio?.dispose();
        this.ballCollisionAudio = null;
        this.ballTraversalAudio?.dispose();
        this.ballTraversalAudio = null;
        this.ballMechanismAudio?.dispose();
        this.ballMechanismAudio = null;
        this.bumperImpactAudio?.dispose();
        this.bumperImpactAudio = null;
        this.ballPlatformAudio?.dispose();
        this.ballPlatformAudio = null;
        this.mineAudio?.dispose(); this.robotAudio?.dispose(); this.fanAudio?.dispose();
        this.groundFireAudio?.dispose(); this.robotFireAudio?.dispose(); this.sprinklerAudio?.dispose(); this.robotWaterWindAudio?.dispose(); this.waterFillingAudio?.dispose();
        this.mineAudio = null; this.robotAudio = null; this.fanAudio = null;
        this.groundFireAudio = null; this.robotFireAudio = null; this.sprinklerAudio = null; this.robotWaterWindAudio = null; this.waterFillingAudio = null;
        this.modifierAmbience.dispose();
        this.spatialAudio.dispose();
        this.golfClubForeground?.destroy();
        this.golfClubForeground = null;

        if (
            this.state ===
            EngineState.Stopped ||
            this.state ===
            EngineState.Stopping
        ) {
            return;
        }

        this.state =
            EngineState.Stopping;

        this.engineLoop.stop();
        this.ballEffectController.clear();
        this.unsubscribeCrateDestructionAudio?.();
        this.unsubscribeCrateDestructionAudio = null;
        this.world?.setCrateRewardListener(null);
        this.crateRewardController = null;

        this.cameraController =
            null;

        this.playerController =
            null;

        this.shotController =
            null;

        this.ballDeathValidation?.destroy();

        this.ballDeathValidation =
            null;

        this.unsubscribeBallDeathState?.();

        this.unsubscribeBallDeathState =
            null;

        this.ballDeathController?.destroy();

        this.ballDeathController =
            null;

        this.resetBallButton?.destroy();

        this.resetBallButton =
            null;

        this.ballDeathTransitionRenderer?.destroy();
        this.ballDeathTransitionRenderer = null;
        this.ballDeathTransitionController.reset();

        this.ballDrowningOverlay?.destroy();
        this.ballDrowningOverlay = null;
        this.waterDebuffIndicator = null;

        this.ballHeatOverlay?.destroy();

        this.ballHeatOverlay =
            null;

        this.fireDebuffIndicator =
            null;

        this.highPowerBallIndicator = null;
        this.heavyBallIndicator = null;
        this.aimSwingIndicator = null;
        this.stickyBallIndicator = null;
        this.invincibleBallIndicator = null;
        this.ghostBallIndicator = null;

        this.debuffHud?.destroy();

        this.debuffHud =
            null;

        this.ballLivesHud?.destroy();

        this.ballLivesHud =
            null;

        this.hudContainer?.destroy({
            children: false,
        });

        this.hudContainer =
            null;

        this.world?.setBallDeathReporter(null);
        this.world?.destroy();

        this.world =
            null;
        this.notifyWorldModifier();

        this.inputManager.destroy(
            this.container,
        );

        this.renderer
            .setResizeListener(
                null,
            );

        this.renderer.destroy();

        this.state =
            EngineState.Stopped;
    }
}
import { Container } from "pixi.js";
import { EngineLoop } from "../engine/EngineLoop";
import { EngineState } from "../engine/EngineState";
import { InputManager } from "../input/InputManager";
import { Renderer } from "../rendering/Renderer";
import { AssetLoader } from "../rendering/AssetLoader";
import { CameraController } from "./controllers/CameraController";
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
import { BallLivesHud } from "./ui/BallLivesHud";
import { ResetBallButton } from "./ui/ResetBallButton";
import { BallDeathController } from "./death/BallDeathController";
import { BallRetryResult } from "./death/BallRetryRequest";
import { BallDeathArchitectureValidation } from "./debug/BallDeathArchitectureValidation";
import { DebuffHud } from "./ui/DebuffHud";
import { FireDebuffIndicator } from "./ui/FireDebuffIndicator";
import { BallHeatOverlay } from "./ui/BallHeatOverlay";
import { WaterDebuffIndicator } from "./ui/WaterDebuffIndicator";
import { BallDrowningOverlay } from "./ui/BallDrowningOverlay";
import { BallLifeState } from "./death/BallLifeState";
import { BallDeathTransitionController } from "./death/BallDeathTransitionController";
import { BallDeathTransitionRenderer } from "./death/BallDeathTransitionRenderer";
import { BallDeathTransitionValidation } from "./debug/BallDeathTransitionValidation";

export class Game {

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

        this.world.setBallDeathReporter(
            (cause) => {
                const event =
                    this.ballDeathController
                        ?.requestDeath(cause);

                if (!event) {
                    return;
                }

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
                    this.shotController?.reset();
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

        if (this.playerController) {
            this.playerController.reset();
        } else {
            this.shotController?.reset();
        }

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
        this.shotController?.reset();
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
            this.world?.update(slowedDeltaTime);

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
                !(this.shotController
                    ?.isPreparingShot() ?? false),
            );

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
            ?.update(
                deltaTime,
            );

        this.world
            ?.update(
                deltaTime,
            );

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

        this.ballLivesHud
            ?.update(deltaTime);

        this.debuffHud
            ?.update(deltaTime);

        this.renderer.render();

        this.inputManager.update();

        this.world
            ?.recordFramePresentationDiagnostics(
                performance.now() -
                    gameUpdateStartedAt,
                this.renderer
                    .getLastPixiRenderMilliseconds(),
            );
    };

    // -------------------------------------------------------------------------
    // Shutdown
    // -------------------------------------------------------------------------

    public stop(): void {

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
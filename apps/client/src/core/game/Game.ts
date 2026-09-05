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

import { ShotController } from "./shot/ShotController";
import { World } from "./world/World";

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

        console.log(
            "Game initialized.",
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

        console.log(
            "Game started.",
        );
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

        this.renderer.render();

        this.inputManager.update();
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

        console.log(
            "Game stopped.",
        );
    }
}
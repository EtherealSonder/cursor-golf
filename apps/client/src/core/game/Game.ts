import { EngineLoop } from "../engine/EngineLoop";
import { EngineState } from "../engine/EngineState";
import { InputManager } from "../input/InputManager";
import { Renderer } from "../rendering/Renderer";
import { AssetLoader } from "../rendering/AssetLoader";
import { PlayerController } from "./controllers/PlayerController";
import { ShotController } from "./shot/ShotController";
import { World } from "./world/World";

export class Game {
    private readonly container: HTMLDivElement;

    private readonly renderer: Renderer;
    private readonly engineLoop: EngineLoop;
    private readonly inputManager: InputManager;

    private world: World | null = null;
    private playerController: PlayerController | null = null;
    private shotController: ShotController | null = null;

    private state: EngineState = EngineState.Stopped;

    constructor(container: HTMLDivElement) {
        this.container = container;

        this.renderer = new Renderer();
        this.engineLoop = new EngineLoop();
        this.inputManager = new InputManager(this.container);

        this.engineLoop.setUpdateCallback(this.update);

        console.log("Game initialized.");
    }

    public async start(): Promise<void> {
        if (this.state !== EngineState.Stopped) {
            return;
        }

        this.state = EngineState.Initializing;

        //
        // Renderer
        //
        await this.renderer.initialize(this.container);

        //
        // Load every game asset BEFORE creating the world.
        //
        await AssetLoader.initialize();

        const app = this.renderer.getApplication();

        if (!app) {
            this.state = EngineState.Stopped;
            return;
        }

        //
        // World
        //
        this.world = new World(app);
        this.world.initialize();

        //
        // Controllers
        //
        this.shotController = new ShotController(
            this.world,
            this.inputManager,
        );

        this.playerController = new PlayerController(
            this.inputManager,
            this.world,
            this.shotController,
        );

        this.state = EngineState.Running;

        this.engineLoop.start();

        console.log("Game started.");
    }

    private update = (deltaTime: number): void => {
        if (this.state !== EngineState.Running) {
            return;
        }

        this.playerController?.update(deltaTime);

        this.shotController?.update(deltaTime);

        this.world?.update(deltaTime);

        this.renderer.render();

        this.inputManager.update();
    };

    public stop(): void {
        if (
            this.state === EngineState.Stopped ||
            this.state === EngineState.Stopping
        ) {
            return;
        }

        this.state = EngineState.Stopping;

        this.engineLoop.stop();

        this.playerController = null;
        this.shotController = null;

        this.world?.destroy();
        this.world = null;

        this.inputManager.destroy(this.container);

        this.renderer.destroy();

        this.state = EngineState.Stopped;

        console.log("Game stopped.");
    }
}
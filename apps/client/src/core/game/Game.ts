import { EngineLoop } from "../engine/EngineLoop";
import { EngineState } from "../engine/EngineState";
import { Renderer } from "../rendering/Renderer";
import { World } from "./world/World";
import { InputManager } from "../input/InputManager";
export class Game {
    private readonly container: HTMLDivElement;

    private readonly renderer: Renderer;
    private readonly engineLoop: EngineLoop;
    private readonly inputManager: InputManager;
    private world: World | null = null;

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

        await this.renderer.initialize(this.container);

        const app = this.renderer.getApplication();

        if (!app) {
            this.state = EngineState.Stopped;
            return;
        }

        this.world = new World(app);
        this.world.initialize();

        this.state = EngineState.Running;

        this.engineLoop.start();

        console.log("Game started.");
    }

    private update = (deltaTime: number): void => {
        if (this.state !== EngineState.Running) {
            return;
        }

        this.inputManager.update();

        this.world?.update(deltaTime);

        this.renderer.render();
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

        this.world?.destroy();
        this.world = null;
        this.inputManager.destroy(this.container);
        this.renderer.destroy();

        this.state = EngineState.Stopped;

        console.log("Game stopped.");
    }
}
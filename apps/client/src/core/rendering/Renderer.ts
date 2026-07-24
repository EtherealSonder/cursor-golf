import { Application } from "pixi.js";

export class Renderer {
    private app: Application | null = null;

    private initialized = false;
    private destroyed = false;

    constructor() {
        console.log("Renderer initialized.");
    }

    public async initialize(container: HTMLDivElement): Promise<void> {
        this.app = new Application();

        await this.app.init({
            width: 1000,
            height: 600,
            backgroundColor: 0x2f8f2f,
            antialias: true,
        });

        if (this.destroyed) {
            this.app.destroy(true);
            this.app = null;
            return;
        }

        container.appendChild(this.app.canvas);

        this.initialized = true;

        console.log("Pixi Renderer ready.");
    }

    public getApplication(): Application | null {
        return this.app;
    }

    public render(): void {
        // Reserved for future renderer-specific work.
    }

    public destroy(): void {
        this.destroyed = true;

        if (!this.initialized || this.app === null) {
            return;
        }

        this.app.destroy(true);

        this.app = null;
        this.initialized = false;

        console.log("Renderer destroyed.");
    }
}
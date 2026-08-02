import { Application } from "pixi.js";

import {
    DEFAULT_GAME_VIEWPORT_DEFINITION,
} from "../game/config/GameViewportDefinition";

export class Renderer {
    private app: Application | null = null;

    private initialized = false;
    private destroyed = false;

    constructor() {
        console.log("Renderer initialized.");
    }

    public async initialize(
        container: HTMLDivElement,
    ): Promise<void> {
        this.app = new Application();

        await this.app.init({
            width:
                DEFAULT_GAME_VIEWPORT_DEFINITION
                    .width,

            height:
                DEFAULT_GAME_VIEWPORT_DEFINITION
                    .height,

            backgroundColor: 0x2f8f2f,
            antialias: true,
        });

        if (this.destroyed) {
            this.app.destroy(true);
            this.app = null;
            return;
        }

        /*
         * The canvas keeps its 1200 × 720 logical
         * drawing buffer while CSS controls its
         * responsive displayed size.
         */
        this.app.canvas.classList.add(
            "game-canvas",
        );

        container.appendChild(
            this.app.canvas,
        );

        this.initialized = true;

        console.log(
            "Pixi Renderer ready.",
            {
                width:
                    DEFAULT_GAME_VIEWPORT_DEFINITION
                        .width,

                height:
                    DEFAULT_GAME_VIEWPORT_DEFINITION
                        .height,
            },
        );
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

import {
    Application,
    UPDATE_PRIORITY,
} from "pixi.js";

import {
    DEFAULT_GAME_VIEWPORT_DEFINITION,
} from "../game/config/GameViewportDefinition";

/**
 * Retained for compatibility with the current Game
 * integration.
 *
 * Fixed-resolution rendering does not emit resize
 * notifications because the logical viewport never
 * changes.
 */
export type RendererResizeListener = (
    width: number,
    height: number,
) => void;

export class Renderer {

    private app:
        Application | null =
        null;

    private initialized =
        false;

    private destroyed =
        false;

    private lastPixiRenderMilliseconds =
        0;

    private pixiRenderPeakMilliseconds =
        0;

    private readonly profiledPixiRender =
        (): void => {

            if (
                this.app === null ||
                this.destroyed
            ) {
                return;
            }

            const startedAt =
                performance.now();

            this.app.render();

            const elapsed =
                performance.now() -
                startedAt;

            this.lastPixiRenderMilliseconds =
                elapsed;

            this.pixiRenderPeakMilliseconds =
                Math.max(
                    this.pixiRenderPeakMilliseconds,
                    elapsed,
                );
        };

    /**
     * Retained so the current Game class remains
     * compatible.
     *
     * The listener is stored but is not repeatedly
     * invoked during browser resize because CSS owns
     * presentation scaling.
     */
    private resizeListener:
        RendererResizeListener | null =
        null;

    private readonly viewportWidth =
        DEFAULT_GAME_VIEWPORT_DEFINITION
            .width;

    private readonly viewportHeight =
        DEFAULT_GAME_VIEWPORT_DEFINITION
            .height;

    constructor() {
    }

    // -------------------------------------------------------
    // Resize Compatibility
    // -------------------------------------------------------

    /**
     * Retained for compatibility with Game.ts.
     *
     * The logical Pixi viewport is fixed, so browser
     * resize does not produce resize notifications.
     */
    public setResizeListener(
        listener:
            RendererResizeListener | null,
    ): void {

        this.resizeListener =
            listener;
    }

    // -------------------------------------------------------
    // Initialization
    // -------------------------------------------------------

    public async initialize(
        container:
            HTMLDivElement,
    ): Promise<void> {

        if (
            this.initialized ||
            this.destroyed
        ) {
            return;
        }

        this.app =
            new Application();

        await this.app.init({
            width:
                this.viewportWidth,

            height:
                this.viewportHeight,

            backgroundColor:
                0x2f8f2f,

            antialias:
                true,

            /*
             * The logical drawing surface remains
             * exactly 1200 × 720.
             *
             * Device-pixel scaling is intentionally
             * kept stable here. CSS handles browser
             * presentation size.
             */
            autoDensity:
                false,

            resolution:
                1,
        });

        if (
            this.destroyed
        ) {
            this.app.destroy(
                true,
            );

            this.app =
                null;

            return;
        }

        const canvas =
            this.app.canvas;

        canvas.classList.add(
            "game-canvas",
        );

        /*
         * Explicit logical canvas dimensions remain
         * stable for the lifetime of the Renderer.
         */
        canvas.width =
            this.viewportWidth;

        canvas.height =
            this.viewportHeight;

        container.appendChild(
            canvas,
        );

        /*
         * Diagnostic Pass 1B. Pixi's Application ticker normally owns the
         * render callback. Replace only that ticker callback with a measured
         * wrapper around the same Application.render() call. This does not
         * add a second render and does not change the game EngineLoop.
         */
        this.app.ticker.remove(
            this.app.render,
            this.app,
        );

        this.app.ticker.add(
            this.profiledPixiRender,
            undefined,
            UPDATE_PRIORITY.LOW,
        );

        this.initialized =
            true;

        /*
         * Notify once after initialization.
         *
         * This keeps any current Game integration
         * synchronized without introducing live
         * browser-resize processing.
         */
        this.resizeListener?.(
            this.viewportWidth,
            this.viewportHeight,
        );
    }

    // -------------------------------------------------------
    // Queries
    // -------------------------------------------------------

    public getApplication():
        Application | null {

        return this.app;
    }

    public getViewportWidth():
        number {

        return this.viewportWidth;
    }

    public getViewportHeight():
        number {

        return this.viewportHeight;
    }

    public isInitialized():
        boolean {

        return this.initialized;
    }

    public getLastPixiRenderMilliseconds():
        number {

        return this.lastPixiRenderMilliseconds;
    }

    public getPixiRenderPeakMilliseconds():
        number {

        return this.pixiRenderPeakMilliseconds;
    }

    // -------------------------------------------------------
    // Frame Rendering
    // -------------------------------------------------------

    public render(): void {

        /*
         * PixiJS renders through its own application
         * ticker and renderer lifecycle.
         *
         * This method remains available for future
         * renderer-specific frame work.
         */
    }

    // -------------------------------------------------------
    // Destruction
    // -------------------------------------------------------

    public destroy(): void {

        if (this.destroyed) {
            return;
        }

        this.destroyed =
            true;

        this.resizeListener =
            null;

        if (
            !this.initialized ||
            this.app ===
            null
        ) {
            return;
        }

        this.app.ticker.remove(
            this.profiledPixiRender,
        );

        this.app.destroy(
            true,
        );

        this.app =
            null;

        this.initialized =
            false;
    }
}
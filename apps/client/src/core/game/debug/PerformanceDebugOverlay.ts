import {
    Container,
    Graphics,
    Text,
    TextStyle,
} from "pixi.js";

import type {
    PerformanceSnapshot,
} from "./PerformanceMetrics";

const PERFORMANCE_DEBUG_ENABLED =
    true;

const PERFORMANCE_DISPLAY_REFRESH_SECONDS =
    0.25;

const OVERLAY_MARGIN =
    12;

const OVERLAY_PADDING_X =
    10;

const OVERLAY_PADDING_Y =
    8;

const OVERLAY_BACKGROUND_COLOR =
    0x111418;

const OVERLAY_BACKGROUND_ALPHA =
    0.82;

const OVERLAY_BORDER_COLOR =
    0xffffff;

const OVERLAY_BORDER_ALPHA =
    0.12;

const OVERLAY_BORDER_WIDTH =
    1;

const OVERLAY_TEXT_COLOR =
    0xffffff;

const OVERLAY_TEXT_FONT_SIZE =
    11;

const OVERLAY_TEXT_LINE_HEIGHT =
    15;

export interface PerformanceDebugRuntimeState {
    readonly benchmarkLabel:
    string;

    readonly windVfxEnabled:
    boolean;

    readonly fireVfxEnabled:
    boolean;

    readonly fanCount:
    number;

    readonly fireTubeCount:
    number;

    readonly windParticleCount:
    number;

    readonly windParticleCapacity:
    number;

    readonly fireParticleCount:
    number;

    readonly fireParticleCapacity:
    number;

    readonly fireCellCount:
    number;
}

/**
 * Development-only performance presentation.
 *
 * PerformanceMetrics owns timing accumulation. This class only rate-limits
 * text refresh and renders the latest supplied snapshot/runtime counters.
 */
export class PerformanceDebugOverlay {

    private readonly container:
        Container;

    private readonly background:
        Graphics;

    private readonly text:
        Text;

    private viewportWidth =
        0;

    private displayRefreshAccumulator =
        PERFORMANCE_DISPLAY_REFRESH_SECONDS;

    private destroyed =
        false;

    constructor() {

        this.container =
            new Container();

        this.background =
            new Graphics();

        this.text =
            new Text({
                text:
                    "PERFORMANCE\nWaiting for samples...",

                style:
                    new TextStyle({
                        fontFamily:
                            "monospace",

                        fontSize:
                            OVERLAY_TEXT_FONT_SIZE,

                        fill:
                            OVERLAY_TEXT_COLOR,

                        lineHeight:
                            OVERLAY_TEXT_LINE_HEIGHT,
                    }),
            });

        this.container.visible =
            PERFORMANCE_DEBUG_ENABLED;

        this.container.addChild(
            this.background,
        );

        this.container.addChild(
            this.text,
        );

        this.text.position.set(
            OVERLAY_PADDING_X,
            OVERLAY_PADDING_Y,
        );

        this.redrawBackground();

        this.reposition();
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    public update(
        deltaTime:
            number,

        snapshot:
            PerformanceSnapshot,

        runtimeState:
            PerformanceDebugRuntimeState,
    ): void {

        if (
            this.destroyed ||
            !PERFORMANCE_DEBUG_ENABLED
        ) {
            return;
        }

        if (
            Number.isFinite(
                deltaTime,
            ) &&
            deltaTime >
            0
        ) {
            this.displayRefreshAccumulator +=
                deltaTime;
        }

        if (
            this.displayRefreshAccumulator <
            PERFORMANCE_DISPLAY_REFRESH_SECONDS
        ) {
            return;
        }

        this.displayRefreshAccumulator =
            0;

        this.text.text =
            this.createDisplayText(
                snapshot,
                runtimeState,
            );

        this.redrawBackground();

        this.reposition();
    }

    public resetDisplay():
        void {

        if (
            this.destroyed
        ) {
            return;
        }

        this.displayRefreshAccumulator =
            PERFORMANCE_DISPLAY_REFRESH_SECONDS;
    }

    public destroy():
        void {

        if (
            this.destroyed
        ) {
            return;
        }

        this.destroyed =
            true;

        this.container
            .removeFromParent();

        this.container
            .destroy({
                children:
                    true,
            });
    }

    // -------------------------------------------------------------------------
    // Viewport
    // -------------------------------------------------------------------------

    public setViewportSize(
        viewportWidth:
            number,

        viewportHeight:
            number,
    ): void {

        void viewportHeight;

        if (
            !Number.isFinite(
                viewportWidth,
            ) ||
            viewportWidth <
            0
        ) {
            return;
        }

        this.viewportWidth =
            viewportWidth;

        this.reposition();
    }

    public getContainer():
        Container {

        return this.container;
    }

    // -------------------------------------------------------------------------
    // Rendering
    // -------------------------------------------------------------------------

    private createDisplayText(
        snapshot:
            PerformanceSnapshot,

        runtimeState:
            PerformanceDebugRuntimeState,
    ): string {

        const windVfxState =
            runtimeState
                .windVfxEnabled
                ? "ON"
                : "OFF";

        const fireVfxState =
            runtimeState
                .fireVfxEnabled
                ? "ON"
                : "OFF";

        return (
            `PERFORMANCE\n` +
            `BENCH  ${runtimeState.benchmarkLabel}\n` +
            `TIME   ${snapshot.elapsedSeconds.toFixed(1)} s  ` +
            `FRAMES ${snapshot.totalFrames}\n` +
            `FPS    ${snapshot.currentFps.toFixed(0)}  ` +
            `AVG ${snapshot.averageFps.toFixed(0)}  ` +
            `MIN ${snapshot.minimumFps.toFixed(0)}  ` +
            `MAX ${snapshot.maximumFps.toFixed(0)}\n` +
            `FRAME  ${snapshot.currentFrameTimeMilliseconds.toFixed(1)} ms  ` +
            `AVG ${snapshot.averageFrameTimeMilliseconds.toFixed(1)}\n` +
            `MINMS  ${snapshot.minimumFrameTimeMilliseconds.toFixed(1)}  ` +
            `MAXMS ${snapshot.maximumFrameTimeMilliseconds.toFixed(1)}\n` +
            `SPIKES ${snapshot.frameSpikeCount}  (>16.67 ms)\n` +
            `FANS   ${runtimeState.fanCount}  ` +
            `TUBES ${runtimeState.fireTubeCount}\n` +
            `WIND   ${windVfxState}  ` +
            `${runtimeState.windParticleCount}/${runtimeState.windParticleCapacity}\n` +
            `FIRE   ${fireVfxState}  ` +
            `${runtimeState.fireParticleCount}/${runtimeState.fireParticleCapacity}\n` +
            `CELLS  ${runtimeState.fireCellCount}`
        );
    }

    private redrawBackground():
        void {

        const backgroundWidth =
            this.text.width +
            OVERLAY_PADDING_X *
            2;

        const backgroundHeight =
            this.text.height +
            OVERLAY_PADDING_Y *
            2;

        this.background.clear();

        this.background
            .roundRect(
                0,
                0,
                backgroundWidth,
                backgroundHeight,
                5,
            );

        this.background
            .fill({
                color:
                    OVERLAY_BACKGROUND_COLOR,

                alpha:
                    OVERLAY_BACKGROUND_ALPHA,
            });

        this.background
            .roundRect(
                0,
                0,
                backgroundWidth,
                backgroundHeight,
                5,
            );

        this.background
            .stroke({
                width:
                    OVERLAY_BORDER_WIDTH,

                color:
                    OVERLAY_BORDER_COLOR,

                alpha:
                    OVERLAY_BORDER_ALPHA,
            });
    }

    private reposition():
        void {

        const overlayWidth =
            this.background.width;

        this.container.position.set(
            Math.max(
                OVERLAY_MARGIN,
                this.viewportWidth -
                overlayWidth -
                OVERLAY_MARGIN,
            ),

            OVERLAY_MARGIN,
        );
    }
}

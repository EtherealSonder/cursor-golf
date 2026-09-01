import {
    Container,
    Graphics,
    Text,
    TextStyle,
} from "pixi.js";

const PERFORMANCE_DEBUG_ENABLED =
    true;

const PERFORMANCE_SAMPLE_INTERVAL_SECONDS =
    0.25;

const OVERLAY_MARGIN =
    12;

const OVERLAY_PADDING_X =
    10;

const OVERLAY_PADDING_Y =
    7;

const OVERLAY_BACKGROUND_COLOR =
    0x111418;

const OVERLAY_BACKGROUND_ALPHA =
    0.78;

const OVERLAY_BORDER_COLOR =
    0xffffff;

const OVERLAY_BORDER_ALPHA =
    0.12;

const OVERLAY_BORDER_WIDTH =
    1;

const OVERLAY_TEXT_COLOR =
    0xffffff;

const OVERLAY_TEXT_FONT_SIZE =
    12;

const OVERLAY_TEXT_LINE_HEIGHT =
    17;

/**
 * Development-only FPS and average frame-time
 * monitor.
 *
 * The overlay samples every game update but refreshes
 * its rendered text only four times per second. This
 * prevents rapidly flickering numbers and avoids
 * rebuilding Text every frame.
 */
export class PerformanceDebugOverlay {

    private readonly container:
        Container;

    private readonly background:
        Graphics;

    private readonly text:
        Text;

    private viewportWidth = 0;

    private accumulatedTime = 0;

    private accumulatedFrames = 0;

    private displayedFps = 0;

    private displayedFrameTimeMilliseconds = 0;

    private destroyed = false;

    constructor() {

        this.container =
            new Container();

        this.background =
            new Graphics();

        this.text =
            new Text({
                text:
                    this.createDisplayText(
                        0,
                        0,
                    ),

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
    ): void {

        if (
            this.destroyed ||
            !PERFORMANCE_DEBUG_ENABLED
        ) {
            return;
        }

        if (
            !Number.isFinite(
                deltaTime,
            ) ||
            deltaTime <= 0
        ) {
            return;
        }

        this.accumulatedTime +=
            deltaTime;

        this.accumulatedFrames +=
            1;

        if (
            this.accumulatedTime <
            PERFORMANCE_SAMPLE_INTERVAL_SECONDS
        ) {
            return;
        }

        this.displayedFps =
            this.accumulatedFrames /
            this.accumulatedTime;

        this.displayedFrameTimeMilliseconds =
            (
                this.accumulatedTime /
                this.accumulatedFrames
            ) *
            1000;

        this.text.text =
            this.createDisplayText(
                this.displayedFps,
                this.displayedFrameTimeMilliseconds,
            );

        this.redrawBackground();

        this.reposition();

        this.accumulatedTime = 0;

        this.accumulatedFrames = 0;
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
            viewportWidth < 0
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
        fps:
            number,

        frameTimeMilliseconds:
            number,
    ): string {

        return (
            `FPS   ${fps.toFixed(0)}\n` +
            `FRAME ${frameTimeMilliseconds.toFixed(1)} ms`
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

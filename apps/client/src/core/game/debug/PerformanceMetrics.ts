export interface PerformanceSnapshot {
    readonly elapsedSeconds:
    number;

    readonly totalFrames:
    number;

    readonly currentFps:
    number;

    readonly averageFps:
    number;

    readonly minimumFps:
    number;

    readonly maximumFps:
    number;

    readonly currentFrameTimeMilliseconds:
    number;

    readonly averageFrameTimeMilliseconds:
    number;

    readonly minimumFrameTimeMilliseconds:
    number;

    readonly maximumFrameTimeMilliseconds:
    number;

    readonly frameSpikeCount:
    number;
}

const CURRENT_WINDOW_SECONDS =
    0.25;

const FRAME_SPIKE_THRESHOLD_SECONDS =
    1 / 60;

/**
 * Development-only frame timing accumulator.
 *
 * It measures the deltaTime already supplied by EngineLoop. This captures the
 * previous requestAnimationFrame interval, including the previous frame's game
 * update/render work and browser scheduling delay.
 *
 * Measurement is separate from Pixi overlay presentation so diagnostics can
 * later be logged/exported without coupling the collector to rendering.
 */
export class PerformanceMetrics {

    private elapsedSeconds =
        0;

    private totalFrames =
        0;

    private totalFrameTimeSeconds =
        0;

    private minimumFrameTimeSeconds =
        Number.POSITIVE_INFINITY;

    private maximumFrameTimeSeconds =
        0;

    private frameSpikeCount =
        0;

    private currentWindowTimeSeconds =
        0;

    private currentWindowFrames =
        0;

    private currentFps =
        0;

    private currentFrameTimeMilliseconds =
        0;

    public update(
        deltaTime:
            number,
    ): void {

        if (
            !Number.isFinite(
                deltaTime,
            ) ||
            deltaTime <=
            0
        ) {
            return;
        }

        this.elapsedSeconds +=
            deltaTime;

        this.totalFrames +=
            1;

        this.totalFrameTimeSeconds +=
            deltaTime;

        this.minimumFrameTimeSeconds =
            Math.min(
                this.minimumFrameTimeSeconds,
                deltaTime,
            );

        this.maximumFrameTimeSeconds =
            Math.max(
                this.maximumFrameTimeSeconds,
                deltaTime,
            );

        if (
            deltaTime >
            FRAME_SPIKE_THRESHOLD_SECONDS
        ) {
            this.frameSpikeCount +=
                1;
        }

        this.currentWindowTimeSeconds +=
            deltaTime;

        this.currentWindowFrames +=
            1;

        if (
            this.currentWindowTimeSeconds <
            CURRENT_WINDOW_SECONDS
        ) {
            return;
        }

        this.currentFps =
            this.currentWindowFrames /
            this.currentWindowTimeSeconds;

        this.currentFrameTimeMilliseconds =
            (
                this.currentWindowTimeSeconds /
                this.currentWindowFrames
            ) *
            1000;

        this.currentWindowTimeSeconds =
            0;

        this.currentWindowFrames =
            0;
    }

    public reset():
        void {

        this.elapsedSeconds =
            0;

        this.totalFrames =
            0;

        this.totalFrameTimeSeconds =
            0;

        this.minimumFrameTimeSeconds =
            Number.POSITIVE_INFINITY;

        this.maximumFrameTimeSeconds =
            0;

        this.frameSpikeCount =
            0;

        this.currentWindowTimeSeconds =
            0;

        this.currentWindowFrames =
            0;

        this.currentFps =
            0;

        this.currentFrameTimeMilliseconds =
            0;
    }

    public getSnapshot():
        PerformanceSnapshot {

        if (
            this.totalFrames <=
            0
        ) {
            return {
                elapsedSeconds:
                    0,

                totalFrames:
                    0,

                currentFps:
                    0,

                averageFps:
                    0,

                minimumFps:
                    0,

                maximumFps:
                    0,

                currentFrameTimeMilliseconds:
                    0,

                averageFrameTimeMilliseconds:
                    0,

                minimumFrameTimeMilliseconds:
                    0,

                maximumFrameTimeMilliseconds:
                    0,

                frameSpikeCount:
                    0,
            };
        }

        const averageFrameTimeSeconds =
            this.totalFrameTimeSeconds /
            this.totalFrames;

        const minimumFrameTimeSeconds =
            Number.isFinite(
                this.minimumFrameTimeSeconds,
            )
                ? this.minimumFrameTimeSeconds
                : 0;

        return {
            elapsedSeconds:
                this.elapsedSeconds,

            totalFrames:
                this.totalFrames,

            currentFps:
                this.currentFps,

            averageFps:
                averageFrameTimeSeconds >
                    0
                    ? 1 /
                    averageFrameTimeSeconds
                    : 0,

            minimumFps:
                this.maximumFrameTimeSeconds >
                    0
                    ? 1 /
                    this.maximumFrameTimeSeconds
                    : 0,

            maximumFps:
                minimumFrameTimeSeconds >
                    0
                    ? 1 /
                    minimumFrameTimeSeconds
                    : 0,

            currentFrameTimeMilliseconds:
                this.currentFrameTimeMilliseconds,

            averageFrameTimeMilliseconds:
                averageFrameTimeSeconds *
                1000,

            minimumFrameTimeMilliseconds:
                minimumFrameTimeSeconds *
                1000,

            maximumFrameTimeMilliseconds:
                this.maximumFrameTimeSeconds *
                1000,

            frameSpikeCount:
                this.frameSpikeCount,
        };
    }
}

import { PerformanceInvestigationCounters } from "./PerformanceInvestigationCounters";

/** Diagnostic only. PixiJS renders on a separate ticker, NOT inside Game.update. */
export type P3A1Frame = {
    frame: number;
    rafIntervalMs: number | null;
    gameExecutionMs: number;
    worldUpdateMs: number;
    gameOutsideWorldMs: number;
    pixiTickerRenderSampleMs: number;
    gapSincePreviousGameCallbackEndMs: number | null;
    previousGameExecutionMs: number | null;
    waterPackets: number;
    fireParticles: number;
    windParticles: number;
    polygonPointQueriesDelta: number;
    heapUsedMB: number | null;
};

type WindowSummary = {
    index: number; frames: number; averageIntervalMs: number;
    averageGameExecutionMs: number; maxIntervalMs: number; spikesOver50Ms: number;
};
type StallCapture = {
    severity: "slow" | "major" | "severe";
    frame: P3A1Frame;
    precedingFrames: P3A1Frame[];
};

let startupMessagePrinted = false;

/**
 * Samples the Game.update callback independently from Pixi's application ticker.
 * A long RAF interval is NOT automatically a long Game.update invocation.
 */
export class FrameStallAttributionProfiler {
    private readonly history: P3A1Frame[] = [];
    private readonly captures: StallCapture[] = [];
    private readonly started = performance.now();
    private readonly warmupEnds = this.started + 5000;
    private readonly ends = this.warmupEnds + 60000;
    private previousStart: number | null = null;
    private previousEnd: number | null = null;
    private previousExecution: number | null = null;
    private previousPolygon = PerformanceInvestigationCounters.get("polygonPoint");
    private frameId = 0;
    private complete = false;
    private totalFrames = 0;
    private totalExecution = 0;
    private totalWorld = 0;
    private totalRenderSample = 0;
    private totalInterval = 0;
    private intervalCount = 0;
    private readonly counts = { slow: 0, major: 0, severe: 0 };
    private maxInterval = 0;
    private readonly windows: WindowSummary[] = [];
    private windowFrames = 0;
    private windowInterval = 0;
    private windowExecution = 0;
    private windowMax = 0;
    private windowSpikes = 0;
    private windowIndex = 0;

    constructor() {
        if (!startupMessagePrinted) {
            startupMessagePrinted = true;
            console.info("[P3-A1] FULL FRAME ATTRIBUTION (corrected): 5s warm-up + 60s capture; all systems enabled.");
        }
    }

    public record(
        start: number, end: number, worldMs: number, pixiRenderSampleMs: number,
        workload: { waterPackets: number; fireParticles: number; windParticles: number },
    ): void {
        if (this.complete) return;
        const interval = this.previousStart === null ? null : start - this.previousStart;
        const gap = this.previousEnd === null ? null : Math.max(0, start - this.previousEnd);
        const previousExecution = this.previousExecution;
        const execution = Math.max(0, end - start);
        this.previousStart = start;
        this.previousEnd = end;
        this.previousExecution = execution;
        const polygon = PerformanceInvestigationCounters.get("polygonPoint");
        const polygonDelta = Math.max(0, polygon - this.previousPolygon);
        this.previousPolygon = polygon;
        if (start < this.warmupEnds) return;
        if (start >= this.ends) { this.finish(); return; }

        const heap = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
        const frame: P3A1Frame = {
            frame: ++this.frameId,
            rafIntervalMs: interval,
            gameExecutionMs: execution,
            worldUpdateMs: worldMs,
            gameOutsideWorldMs: Math.max(0, execution - worldMs),
            // Sampled from Pixi's own ticker; it is not a child of Game.update.
            pixiTickerRenderSampleMs: pixiRenderSampleMs,
            gapSincePreviousGameCallbackEndMs: gap,
            previousGameExecutionMs: previousExecution,
            waterPackets: workload.waterPackets,
            fireParticles: workload.fireParticles,
            windParticles: workload.windParticles,
            polygonPointQueriesDelta: polygonDelta,
            heapUsedMB: typeof heap === "number" ? heap / (1024 * 1024) : null,
        };
        const severity = interval !== null && interval >= 250 ? "severe"
            : interval !== null && interval >= 100 ? "major"
            : interval !== null && interval >= 50 ? "slow" : null;
        if (severity) {
            this.counts[severity]++;
            this.windowSpikes++;
            // Keep the worst events; don't print large objects in the hot path.
            this.captures.push({ severity, frame, precedingFrames: this.history.slice(-20) });
            this.captures.sort((a, b) => (b.frame.rafIntervalMs ?? 0) - (a.frame.rafIntervalMs ?? 0));
            if (this.captures.length > 5) this.captures.length = 5;
        }
        this.history.push(frame);
        if (this.history.length > 120) this.history.shift();
        this.totalFrames++;
        this.totalExecution += execution;
        this.totalWorld += worldMs;
        this.totalRenderSample += pixiRenderSampleMs;
        this.windowFrames++;
        this.windowExecution += execution;
        if (interval !== null) {
            this.totalInterval += interval;
            this.intervalCount++;
            this.windowInterval += interval;
            this.windowMax = Math.max(this.windowMax, interval);
            this.maxInterval = Math.max(this.maxInterval, interval);
        }
        const nextWindow = Math.min(12, Math.floor((start - this.warmupEnds) / 5000) + 1);
        if (nextWindow > this.windowIndex && this.windowIndex > 0) this.flushWindow();
        this.windowIndex = nextWindow;
    }

    private flushWindow(): void {
        if (!this.windowFrames) return;
        const item: WindowSummary = {
            index: this.windowIndex,
            frames: this.windowFrames,
            averageIntervalMs: this.windowInterval / Math.max(1, this.windowFrames),
            averageGameExecutionMs: this.windowExecution / this.windowFrames,
            maxIntervalMs: this.windowMax,
            spikesOver50Ms: this.windowSpikes,
        };
        this.windows.push(item);
        console.info(`[P3-A1 ${item.index}/12]`, JSON.stringify(item));
        this.windowFrames = 0;
        this.windowInterval = 0;
        this.windowExecution = 0;
        this.windowMax = 0;
        this.windowSpikes = 0;
    }

    private finish(): void {
        if (this.complete) return;
        this.flushWindow();
        this.complete = true;
        console.info("[P3-A1] 60-SECOND SUMMARY", JSON.stringify({
            frames: this.totalFrames,
            averageRafIntervalMs: this.totalInterval / Math.max(1, this.intervalCount),
            averageGameExecutionMs: this.totalExecution / Math.max(1, this.totalFrames),
            averageWorldUpdateMs: this.totalWorld / Math.max(1, this.totalFrames),
            averageGameOutsideWorldMs: (this.totalExecution - this.totalWorld) / Math.max(1, this.totalFrames),
            averagePixiTickerRenderSampleMs: this.totalRenderSample / Math.max(1, this.totalFrames),
            maxRafIntervalMs: this.maxInterval,
            spikeCounts: this.counts,
            windows: this.windows,
            topFiveStalls: this.captures,
            interpretation: "Game execution contains World update and other Game work. Pixi render is sampled from an independent ticker, not included in Game execution. RAF gaps can include Pixi ticker, browser scheduling, GC, or other tasks; no single cause is assumed. Pixi render timing measures CPU submission, not GPU completion.",
        }));
    }
}

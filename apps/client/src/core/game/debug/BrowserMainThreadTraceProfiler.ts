/** P3-A2 diagnostic-only bridge between Game callback timings and Chrome Performance traces.
 * The Long Tasks API cannot attribute GC, GPU, or scheduler stalls by itself.
 * DevTools Performance recording is required to inspect those causes.
 */
type LongTaskSample = { startMs: number; durationMs: number; name: string };
type StallSample = { frame: number; intervalMs: number; previousExecutionMs: number | null; gapMs: number | null; gameMs: number; worldMs: number; renderSampleMs: number };

export class BrowserMainThreadTraceProfiler {
    private readonly startedAt = performance.now();
    private readonly warmupEnd = this.startedAt + 5000;
    private readonly captureEnd = this.warmupEnd + 60000;
    private readonly longTasks: LongTaskSample[] = [];
    private readonly stalls: StallSample[] = [];
    private observer: PerformanceObserver | null = null;
    private lastStart: number | null = null;
    private lastEnd: number | null = null;
    private lastExecution: number | null = null;
    private frame = 0;
    private frames = 0;
    private totalInterval = 0;
    private intervals = 0;
    private totalGame = 0;
    private totalWorld = 0;
    private counts = { slow: 0, major: 0, severe: 0 };
    private complete = false;

    constructor() {
        console.info('[P3-A2] Browser main-thread trace: 5s warm-up + 60s capture. Start Chrome DevTools Performance recording now.');
        try {
            if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes.includes('longtask')) {
                this.observer = new PerformanceObserver(list => {
                    for (const e of list.getEntries()) {
                        if (e.startTime < this.warmupEnd || e.startTime >= this.captureEnd) continue;
                        this.longTasks.push({startMs: Math.round(e.startTime), durationMs: Math.round(e.duration * 10) / 10, name: e.name});
                        if (this.longTasks.length > 100) this.longTasks.shift();
                    }
                });
                this.observer.observe({entryTypes:['longtask']});
            } else console.info('[P3-A2] Long Tasks API unavailable; Chrome DevTools trace remains authoritative.');
        } catch (error) { console.warn('[P3-A2] Long Tasks observer unavailable', error); }
    }

    public record(start: number, end: number, worldMs: number, pixiRenderSampleMs: number): void {
        if (this.complete) return;
        const interval = this.lastStart === null ? null : start - this.lastStart;
        const gap = this.lastEnd === null ? null : Math.max(0, start - this.lastEnd);
        const previousExecution = this.lastExecution;
        const execution = Math.max(0, end - start);
        this.lastStart = start; this.lastEnd = end; this.lastExecution = execution;
        this.frame++;
        if (start < this.warmupEnd) return;
        if (start >= this.captureEnd) { this.finish(); return; }
        this.frames++; this.totalGame += execution; this.totalWorld += worldMs;
        if (interval !== null) { this.totalInterval += interval; this.intervals++; }
        if (interval !== null && interval >= 50) {
            const severity = interval >= 250 ? 'severe' : interval >= 100 ? 'major' : 'slow';
            this.counts[severity]++;
            const sample = {frame:this.frame, intervalMs:interval, previousExecutionMs:previousExecution, gapMs:gap, gameMs:execution, worldMs, renderSampleMs:pixiRenderSampleMs};
            this.stalls.push(sample);
            this.stalls.sort((a,b) => b.intervalMs - a.intervalMs);
            if (this.stalls.length > 10) this.stalls.pop();
        }
        // Sparse User Timing entries appear in Chrome's Timings track. Each
        // measurement is a Game callback only; Pixi's ticker is independent.
        if (this.frame % 30 === 0 || execution >= 50 || (interval !== null && interval >= 100)) {
            try {
                performance.measure('P3A2 Game callback', {start, end});
                performance.measure('P3A2 World update (inside Game)', {start, duration:Math.max(0, Math.min(worldMs, execution))});
                performance.clearMeasures('P3A2 Game callback');
                performance.clearMeasures('P3A2 World update (inside Game)');
                if (interval !== null && interval >= 100) performance.mark('P3A2 callback-after-stall ' + Math.round(interval) + 'ms');
            } catch { /* User Timing optional in older browsers */ }
        }
    }

    private finish(): void {
        if (this.complete) return;
        this.complete = true;
        this.observer?.disconnect();
        const summary = {
            frames:this.frames,
            averageCallbackIntervalMs:this.intervals ? this.totalInterval / this.intervals : null,
            averageGameExecutionMs:this.frames ? this.totalGame / this.frames : null,
            averageWorldUpdateMs:this.frames ? this.totalWorld / this.frames : null,
            spikeCounts:this.counts,
            topTenCallbackStalls:this.stalls,
            longTasksObserved:this.longTasks.length,
            topTenLongTasks:[...this.longTasks].sort((a,b)=>b.durationMs-a.durationMs).slice(0,10),
            note:'Callback gaps do not identify their cause. Inspect Chrome DevTools Main thread, Timings, GC, and Rendering tracks. Pixi rendering is on a separate ticker.'
        };
        console.info('[P3-A2] 60-SECOND SUMMARY', JSON.stringify(summary));
    }
}

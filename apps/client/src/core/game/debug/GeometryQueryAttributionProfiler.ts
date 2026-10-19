import { PerformanceDiagnosticStatusOverlay } from './PerformanceDiagnosticStatusOverlay';
import { isGeometryCallerSamplingEnabled } from './PerformanceInvestigationDefinition';

/** P3-B1: low-overhead, diagnostic-only attribution of authoritative boundary queries. */
type Bucket = { calls: number; timedSamples: number; sampledMs: number };
export class GeometryQueryAttributionProfiler {
    public static readonly enabled = isGeometryCallerSamplingEnabled();
    private static scope = 'outside-world-update';
    private static readonly buckets = new Map<string, Bucket>();
    private static readonly operations = new Map<string, Bucket>();
    // Stack attribution is intentionally sparse: collecting a stack for every point
    // would materially distort the very workload being measured.
    private static readonly callers = new Map<string, Bucket>();
    private static readonly callerSampleEvery = 1024;
    private static callerSamples = 0;
    private static readonly sampleEvery = 128;
    private static querySequence = 0;
    private static startedAt = performance.now();
    private static finished = false;
    private static frame = 0;
    private static recording = false;
    private static readonly warmupMs = 5000;
    private static readonly captureMs = 60000;
    private static readonly windowMs = 5000;
    private static windows: Array<{index:number;frames:number;queries:number;estimatedQueryMs:number}> = [];
    private static currentWindow = 0;
    private static currentWindowFrames = 0;
    private static currentWindowQueries = 0;
    private static currentWindowMs = 0;
    private static allQueries = 0;
    private static allEstimatedMs = 0;
    private static readonly maxBuckets = 80;
    public static setScope(scope: string): void { if (this.enabled) this.scope = scope; }
    public static beginQuery(): number {
        if (!this.enabled || this.finished) return 0;
        if (!this.recording) return 0;
        this.allQueries++; this.currentWindowQueries++;
        const b = this.getBucket(this.buckets, this.scope); b.calls++;
        const op = this.getBucket(this.operations, 'containsPoint'); op.calls++;
        this.querySequence++;
        if (this.querySequence % this.callerSampleEvery === 0) {
            const stack = new Error().stack?.split("\n") ?? [];
            // Select the first *external* caller rather than assuming a fixed
            // stack depth. Boundary fast paths and profiler wrappers can add frames.
            // Skip only frames from our instrumentation/boundary implementation;
            // keep the first real subsystem frame, including its source location.
            const caller = stack.slice(1).find((frame) =>
                !/GeometryQueryAttributionProfiler\.(?:ts|js)/.test(frame) &&
                !/CourseEnvironmentBoundary\.(?:ts|js)/.test(frame) &&
                !/\bat (?:Error|GeometryQueryAttributionProfiler\.)/.test(frame)
            )?.trim() ?? 'unknown external caller';
            const key = `${this.scope} | ${caller}`;
            this.getBucket(this.callers, key).calls++;
            this.callerSamples++;
        }
        return this.querySequence % this.sampleEvery === 0 ? performance.now() : 0;
    }
    public static endQuery(start: number): void {
        if (!start) return;
        const ms = performance.now() - start;
        const b = this.getBucket(this.buckets, this.scope);
        b.timedSamples++; b.sampledMs += ms;
        const op = this.getBucket(this.operations, 'containsPoint');
        op.timedSamples++; op.sampledMs += ms;
        const estimated = ms * this.sampleEvery;
        this.currentWindowMs += estimated; this.allEstimatedMs += estimated;
    }
    public static recordFrame(now = performance.now()): void {
        if (!this.enabled || this.finished) return;
        const elapsed = now - this.startedAt;
        if (elapsed < this.warmupMs) return;
        this.recording = true;
        const measurement = elapsed - this.warmupMs;
        const target = Math.min(12, Math.floor(measurement / this.windowMs));
        while (this.currentWindow < target && this.currentWindow < 12) {
            this.flushWindow();
        }
        if (measurement >= this.captureMs) { this.finish(); return; }
        this.currentWindowFrames++; this.frame++;
    }
    private static getBucket(map: Map<string,Bucket>, key: string): Bucket {
        let b = map.get(key);
        if (!b) {
            if (map.size >= this.maxBuckets) key = 'other';
            b = map.get(key);
            if (!b) { b = {calls:0,timedSamples:0,sampledMs:0}; map.set(key,b); }
        }
        return b;
    }
    private static flushWindow(): void {
        const entry = {index:this.currentWindow + 1, frames:this.currentWindowFrames, queries:this.currentWindowQueries, estimatedQueryMs:Math.round(this.currentWindowMs * 100)/100};
        this.windows.push(entry);
        console.info(`[P3-B1 ${entry.index}/12]`, JSON.stringify(entry));
        this.currentWindow++; this.currentWindowFrames=0; this.currentWindowQueries=0; this.currentWindowMs=0;
    }
    private static finish(): void {
        if (this.finished) return;
        this.finished = true; this.recording = false;
        const rank = (map:Map<string,Bucket>) => [...map.entries()].map(([name,b]) => ({name,calls:b.calls,samples:b.timedSamples,sampledMs:+b.sampledMs.toFixed(3),estimatedMs:+(b.timedSamples ? b.sampledMs/b.timedSamples*b.calls : 0).toFixed(2)})).sort((a,b)=>b.calls-a.calls);
        console.info('[P3-B1] 60-SECOND SUMMARY', JSON.stringify({frames:this.frame,queries:this.allQueries,queriesPerFrame:this.frame?this.allQueries/this.frame:0,byWorldPhase:rank(this.buckets),byOperation:rank(this.operations),callerSamples:this.callerSamples,sampledCallers:[...this.callers.entries()].map(([name,b])=>({name,samples:b.calls,estimatedCalls:b.calls*this.callerSampleEvery})).sort((a,b)=>b.samples-a.samples),callerSampleEvery:this.callerSampleEvery,windows:this.windows,note:'Timing is sampled every 128th query and estimated, not a full CPU profile. Phases attribute the currently executing World section. sampledCallers uses sparse Error.stack snapshots (1/1024 queries), and is approximate, not a full trace.'}));
        PerformanceDiagnosticStatusOverlay.complete();
    }
}

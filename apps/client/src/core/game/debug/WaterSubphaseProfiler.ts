import { PerformanceDiagnosticStatusOverlay } from "./PerformanceDiagnosticStatusOverlay";

/** P3-C1 diagnostic only. Timers are disabled outside ?perfdiag=P3C1. */
type Bucket = { calls: number; totalMs: number; maxMs: number };
export class WaterSubphaseProfiler {
    static readonly enabled = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("perfdiag")?.toUpperCase() === "P3C1";
    private static readonly started = performance.now();
    private static readonly buckets = new Map<string, Bucket>();
    private static readonly windows: Array<{index:number;frames:number;phases:Record<string,{calls:number;totalMs:number;maxMs:number}>}> = [];
    private static windowBuckets = new Map<string, Bucket>();
    private static index = 0;
    private static frames = 0;
    private static totalFrames = 0;
    private static finished = false;
    private static lastStatus = "";
    static start(): number { return this.enabled && !this.finished && performance.now() - this.started >= 5000 ? performance.now() : -1; }
    static end(name:string, start:number):void {
        if (start < 0 || !this.enabled || this.finished) return;
        const ms = performance.now() - start;
        for (const map of [this.buckets,this.windowBuckets]) {
            let b = map.get(name);
            if (!b) { b={calls:0,totalMs:0,maxMs:0};map.set(name,b); }
            b.calls++;b.totalMs+=ms;b.maxMs=Math.max(b.maxMs,ms);
        }
    }
    static measure(name:string, fn:()=>void):void {
        const start=this.start();
        try { fn(); } finally { this.end(name,start); }
    }
    private static snapshot(map:Map<string,Bucket>):Record<string,{calls:number;totalMs:number;maxMs:number}> {
        return Object.fromEntries([...map].map(([k,v])=>[k,{calls:v.calls,totalMs:+v.totalMs.toFixed(2),maxMs:+v.maxMs.toFixed(2)}]));
    }
    static recordFrame(now=performance.now()):void {
        if (!this.enabled || this.finished) return;
        const elapsed=now-this.started;
        if (elapsed < 5000) { this.status(`P3-C1 | Warm-up: ${Math.max(0,Math.ceil((5000-elapsed)/1000))}s`);return; }
        const target=Math.min(12,Math.floor((elapsed-5000)/5000));
        while(this.index < target) {
            const entry={index:this.index+1,frames:this.frames,phases:this.snapshot(this.windowBuckets)};
            this.windows.push(entry);
            console.info(`[P3-C1 ${entry.index}/12]`,JSON.stringify(entry));
            this.windowBuckets.clear();this.frames=0;this.index++;
        }
        if(elapsed>=65000) {
            this.finished=true;
            console.info('[P3-C1] 60-SECOND SUMMARY',JSON.stringify({frames:this.totalFrames,phases:this.snapshot(this.buckets),windows:this.windows,note:'Inclusive World water stages and nested vfx.* stages must not be summed together. Timings are CPU-side, not GPU timings.'}));
            PerformanceDiagnosticStatusOverlay.show('P3-C1 COMPLETE | 12/12 — You can now open DevTools and copy the console summary.',true);
            return;
        }
        this.frames++;this.totalFrames++;
        this.status(`P3-C1 | Recording: ${Math.min(12,this.index+1)}/12`);
    }
    private static status(text:string):void { if(this.lastStatus!==text) {this.lastStatus=text;PerformanceDiagnosticStatusOverlay.show(text);} }
}

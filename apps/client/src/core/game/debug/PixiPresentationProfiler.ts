import { PerformanceDiagnosticStatusOverlay } from "./PerformanceDiagnosticStatusOverlay";
import { P3C2_PROFILE } from "./PixiPresentationProfileDefinition";

type Bucket = { calls:number; totalMs:number; maxMs:number };
type Summary = {index:number; frames:number; phases:Record<string,Bucket>; displayObjects?:number};
/** CPU-side timings only. Pixi ticker render can occur outside Game.update. */
export class PixiPresentationProfiler {
    static readonly enabled = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("perfdiag")?.toUpperCase() === "P3C2";
    private static startedAt:number|null = null;
    private static readonly totals = new Map<string,Bucket>();
    private static readonly windows:Summary[] = [];
    private static current = new Map<string,Bucket>();
    private static windowIndex=0;
    private static frames=0;
    private static totalFrames=0;
    private static complete=false;
    private static lastStatus="";
    private static latestDisplayObjects=0;
    static start():number { return this.enabled && !this.complete && this.startedAt!==null && performance.now()-this.startedAt>=P3C2_PROFILE.warmupMs ? performance.now() : -1; }
    static end(name:string,start:number):void {
        if(start<0 || !this.enabled || this.complete)return;
        const ms=performance.now()-start;
        for(const map of [this.totals,this.current]) {
            let b=map.get(name);if(!b){b={calls:0,totalMs:0,maxMs:0};map.set(name,b);}
            b.calls++;b.totalMs+=ms;b.maxMs=Math.max(b.maxMs,ms);
        }
    }
    static measure(name:string,fn:()=>void):void {const start=this.start();try{fn();}finally{this.end(name,start);}}
    static setDisplayObjectCount(count:number):void {if(this.enabled && !this.complete)this.latestDisplayObjects=count;}
    private static snapshot(map:Map<string,Bucket>):Record<string,Bucket> {return Object.fromEntries([...map].map(([name,b])=>[name,{calls:b.calls,totalMs:+b.totalMs.toFixed(2),maxMs:+b.maxMs.toFixed(2)}]));}
    static recordFrame(now=performance.now()):void {
        if(!this.enabled||this.complete)return;
        if(this.startedAt===null)this.startedAt=now;
        const elapsed=now-this.startedAt;
        if(elapsed<P3C2_PROFILE.warmupMs){this.status(`P3-C2 | Warm-up: ${Math.max(0,Math.ceil((P3C2_PROFILE.warmupMs-elapsed)/1000))}s`);return;}
        const target=Math.min(P3C2_PROFILE.windows,Math.floor((elapsed-P3C2_PROFILE.warmupMs)/P3C2_PROFILE.windowMs));
        while(this.windowIndex<target){
            const entry={index:this.windowIndex+1,frames:this.frames,phases:this.snapshot(this.current),displayObjects:this.latestDisplayObjects};
            this.windows.push(entry);console.info(`[P3-C2 ${entry.index}/12]`,JSON.stringify(entry));
            this.current=new Map();this.frames=0;this.windowIndex++;
        }
        if(target===P3C2_PROFILE.windows){
            this.complete=true;
            console.info("[P3-C2] 60-SECOND SUMMARY",JSON.stringify({frames:this.totalFrames,phases:this.snapshot(this.totals),displayObjects:this.latestDisplayObjects,windows:this.windows,note:"CPU wall timings only. worldUpdate includes World presentation subphases; frameCallback includes worldUpdate. Pixi render runs in a separate ticker callback. Do not sum nested categories. Display object count is a snapshot, not a per-frame traversal."}));
            PerformanceDiagnosticStatusOverlay.show("P3-C2 COMPLETE | 12/12 — You can now open DevTools and copy the console summary.",true);return;
        }
        this.frames++;this.totalFrames++;this.status(`P3-C2 | Recording: ${Math.min(12,this.windowIndex+1)}/12`);
    }
    private static status(message:string):void {if(message!==this.lastStatus){this.lastStatus=message;PerformanceDiagnosticStatusOverlay.show(message);}}
}

/** Wall-clock windowed frame sampling; never interpret capped deltaTime as elapsed time. */
export class PerformanceDiagnosticFrameSampler {
 private lastTime:number|null=null;
 private samples:number[]=[];
 private elapsed=0;
 private firstTime:number|null=null;
 private stalls=0;
 private stallDurations:number[]=[];
 static isValidWindow(stats:{frames:number;elapsedMs:number},minimumFrames=20):boolean{return stats.frames>=minimumFrames && stats.elapsedMs>0;}
 reset():void {this.lastTime=null;this.firstTime=null;this.samples=[];this.elapsed=0;this.stalls=0;this.stallDurations=[];}
 record(now:number):void {if(this.firstTime===null)this.firstTime=now;if(this.lastTime!==null){const dt=now-this.lastTime;if(dt>0&&Number.isFinite(dt)){this.samples.push(dt);this.elapsed+=dt;if(dt>1000){this.stalls++;this.stallDurations.push(dt);}}}this.lastTime=now;}
 drain():{frames:number;elapsedMs:number;fps:number;averageMs:number;p95Ms:number;p99Ms:number;maxMs:number;spikes:number;browserStalls:number;stallDurationsMs:number[];wallElapsedMs:number}{
 const s=this.samples.filter(v=>v<=1000).sort((a,b)=>a-b),n=s.length,elapsed=s.reduce((a,b)=>a+b,0);
 const quantile=(p:number)=>n?s[Math.min(n-1,Math.ceil(n*p)-1)]:0;
 const r={frames:n,elapsedMs:elapsed,fps:elapsed>0?n*1000/elapsed:0,averageMs:n?elapsed/n:0,p95Ms:quantile(.95),p99Ms:quantile(.99),maxMs:n?s[n-1]:0,spikes:s.filter(v=>v>16.67).length,browserStalls:this.stalls,stallDurationsMs:[...this.stallDurations],wallElapsedMs:this.firstTime!==null&&this.lastTime!==null?this.lastTime-this.firstTime:0};this.samples=[];this.firstTime=null;this.lastTime=null;this.elapsed=0;this.stalls=0;this.stallDurations=[];return r;
 }
}

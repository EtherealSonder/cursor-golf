/** P0 wall-clock scheduling. Interrupted windows never roll over into later windows. */
export type BenchmarkWindowPhase = "warmup" | "measuring" | "recovery" | "complete";
export class PerformanceBenchmarkWindowScheduler {
 private phase:BenchmarkWindowPhase="warmup";
 private phaseStarted=0;private lastFrame=0;private accepted=0;private attempted=0;private rejected=0;
 constructor(private readonly warmupMs:number,private readonly windowMs:number,private readonly target:number,private readonly stallMs:number,private readonly maxRetries=5){}
 start(now:number):void{this.phase="warmup";this.phaseStarted=now;this.lastFrame=now;this.accepted=0;this.attempted=0;this.rejected=0;}
 get state():BenchmarkWindowPhase{return this.phase;}
 get acceptedWindows():number{return this.accepted;}
 get attemptedWindows():number{return this.attempted;}
 get rejectedWindows():number{return this.rejected;}
 get retryLimitReached():boolean{return this.rejected>=this.maxRetries;}
 /** Detect browser pauses before consuming a new sample. */
 tick(now:number):"wait"|"begin"|"sample"|"interrupted"|"deadline"|"done"{
  if(this.phase==="complete")return "done";
  const gap=now-this.lastFrame;this.lastFrame=now;
  if(!Number.isFinite(gap)||gap<0||gap>this.stallMs){
   if(this.phase==="measuring"){
    this.attempted++;this.rejected++;this.phase=this.retryLimitReached?"complete":"recovery";this.phaseStarted=now;
    return "interrupted";
   }
   this.phaseStarted=now;return "wait";
  }
  if(this.phase==="warmup"||this.phase==="recovery"){
   if(now-this.phaseStarted<this.warmupMs)return "wait";
   this.phase="measuring";this.phaseStarted=now;return "begin";
  }
  return now-this.phaseStarted>=this.windowMs?"deadline":"sample";
 }
 completeWindow(accepted:boolean,now:number):void{
  this.attempted++;if(accepted)this.accepted++;else this.rejected++;
  this.phase=this.accepted>=this.target||this.retryLimitReached?"complete":"recovery";
  this.phaseStarted=now;this.lastFrame=now;
 }
}

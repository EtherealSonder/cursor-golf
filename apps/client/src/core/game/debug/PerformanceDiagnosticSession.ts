import { PERFORMANCE_INVESTIGATION as D } from "./PerformanceInvestigationDefinition";
export class PerformanceDiagnosticSession {
 private p0Phase:"idle"|"warmup"|"measuring"|"interrupted"|"recovery"|"completed"="idle";
 public setP0Phase(phase:typeof this.p0Phase):void{this.p0Phase=phase;}
 public getP0Phase():typeof this.p0Phase{return this.p0Phase;}
 private started=performance.now();private index=0;private warmupSeconds:number=D.warmupSeconds;private sampleSeconds:number=D.sampleSeconds;private reportCount:number=D.reportCount;
 configure(warmupSeconds:number,sampleSeconds:number,reportCount:number):void{this.warmupSeconds=warmupSeconds;this.sampleSeconds=sampleSeconds;this.reportCount=reportCount;this.reset();}
 reset():void{this.started=performance.now();this.index=0;}
 isSampling(now=performance.now()):boolean{return this.index<this.reportCount&&now>=this.started+this.warmupSeconds*1000;}
 nextReport(now=performance.now()):number|null{
  if(this.index>=this.reportCount)return null;
  const deadline=this.started+(this.warmupSeconds+(this.index+1)*this.sampleSeconds)*1000;
  if(now<deadline)return null;
  return ++this.index;
 }
 getProgress():string{const now=performance.now();return this.index>=this.reportCount?'COMPLETE':!this.isSampling(now)?'WARM-UP':`REPORT ${this.index+1}/${this.reportCount}`;}
 /** Diagnostic automation may reset between unrelated workloads. */
 getReportIndex():number{return this.index;}
 isComplete():boolean{return this.index>=this.reportCount;}
}

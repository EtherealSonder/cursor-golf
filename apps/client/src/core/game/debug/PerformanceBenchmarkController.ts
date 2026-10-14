import { PerformanceBenchmarkWindowScheduler } from "./PerformanceBenchmarkWindowScheduler";
import { assessBenchmarkWindow } from "./PerformanceBenchmarkWindowValidation";
import { CourseGeometryAccelerationProfiler as Geo } from "./CourseGeometryAccelerationProfiler";
import {P0_BENCHMARK_SETTINGS as S, P0_SCENARIOS, assessBenchmarkWorkload} from "./PerformanceBenchmarkScenario";
import type {BenchmarkScenarioId,BenchmarkWorldIdentity} from "./PerformanceBenchmarkScenario";
import type {PerformanceDiagnosticFrameSampler} from "./PerformanceDiagnosticFrameSampler";
import type {DiagnosticWorkload} from "./PerformanceDiagnosticReport";
import type {WaterPerformanceSnapshot} from "./WaterPerformanceProfiler";
import {buildDiagnosticReport} from "./PerformanceDiagnosticReport";
import {PerformanceInvestigationCounters} from "./PerformanceInvestigationCounters";
/** P0 never mutates authoritative gameplay. It reports non-reproducibility honestly. */
export class PerformanceBenchmarkController {
 private readonly scheduler=new PerformanceBenchmarkWindowScheduler(S.warmupSeconds*1000,S.windowSeconds*1000,S.windowsPerRun,S.stallThresholdMs);
 private scenario:BenchmarkScenarioId="P0-S5";private active=false;private started=0;private run=1;
 private baselineWorkload:Record<string,number>={};private readonly reports:Record<string,unknown>[]=[];
 private identity:BenchmarkWorldIdentity={levelId:"unknown",spawnX:0,spawnY:0,fixtureRevision:"unknown",resetVerified:false,note:"No verified fixture reset"};
 public setScenario(id:BenchmarkScenarioId):void{if(this.active)return;this.scenario=id;}
 public getScenario():BenchmarkScenarioId{return this.scenario;}
 public isActive():boolean{return this.active;}
 public getProgress():string{return this.active?`P0 ${this.scenario} ${this.scheduler.state} accepted ${this.scheduler.acceptedWindows}/${S.windowsPerRun} attempts ${this.scheduler.attemptedWindows}`:`P0 ${this.scenario} idle`;}
 public start(identity:BenchmarkWorldIdentity):void{
  this.identity=identity;this.active=true;this.started=performance.now();this.scheduler.start(this.started);this.run=1;this.reports.length=0;PerformanceInvestigationCounters.reset();Geo.reset();
  if (false) console.info("[PERF-P0] START",JSON.stringify({scenario:this.scenario,settings:S,identity,warning:"Only a verified reconstructed fixture supports causal before/after comparisons. Scenarios are labels until separately authored."}));
 }
 public stop():void{this.active=false;}
 public update(now:number,sampler:PerformanceDiagnosticFrameSampler,snapshot:WaterPerformanceSnapshot,workload:DiagnosticWorkload,extra:Readonly<Record<string,number>>):void{
  if(!this.active)return;
  const action=this.scheduler.tick(now);
  if(action==="wait")return;
  if(action==="interrupted"){
   const stats=sampler.drain();const counters=this.collectCounters();
   const report={tag:"PASS-P0",scenario:this.scenario,run:this.run,window:this.scheduler.acceptedWindows+1,attempt:this.scheduler.attemptedWindows,windowStatus:"interrupted",valid:false,invalidReasons:[`Browser stall or interrupted frame gap; rejected window`,...stats.stallDurationsMs.map(v=>`stall ${v.toFixed(0)}ms`)],stats,counters,identity:this.identity};
   this.reports.push(report);console.warn("[PERF-P0] INTERRUPTED",JSON.stringify(report));
   this.finishIfComplete();return;
  }
  if(action==="begin"){
   sampler.reset();sampler.record(now);this.baselineWorkload=this.numericWorkload(workload,extra);
   PerformanceInvestigationCounters.reset();Geo.reset();return;
  }
  if(action==="done"){this.finishIfComplete();return;}
  sampler.record(now);
  if(action!=="deadline")return;
  const stats=sampler.drain();const counters=this.collectCounters();
  const drift=assessBenchmarkWorkload(this.baselineWorkload,this.numericWorkload(workload,extra));
  const assessment=assessBenchmarkWindow(stats,S.windowSeconds*1000,drift);
  const report=buildDiagnosticReport(this.scenario,this.scheduler.acceptedWindows+1,stats,snapshot,workload,counters) as Record<string,unknown>;
  const reasons=[...assessment.reasons];
  if(!this.identity.resetVerified)reasons.push("No verified fresh-world fixture reset");
  if(this.scenario!=="P0-S5")reasons.push("Scenario is a label only; dedicated scenario fixture was not constructed");
  report.tag="PASS-P0";report.scenario=this.scenario;report.scenarioPurpose=P0_SCENARIOS.find(s=>s.id===this.scenario)?.purpose;
  report.run=this.run;report.window=this.scheduler.acceptedWindows+1;report.attempt=this.scheduler.attemptedWindows+1;
  report.identity=this.identity;report.windowStatus=assessment.accepted?"accepted":"rejected";
  report.measurementValid=assessment.accepted;report.valid=assessment.accepted&&reasons.length===0;report.invalidReasons=reasons;
  report.workloadStart=this.baselineWorkload;report.workloadEnd=this.numericWorkload(workload,extra);
  this.reports.push(report);
  if (false) console.info(`[PERF-P0 ${report.windowStatus} ${this.scheduler.acceptedWindows+1}/${S.windowsPerRun}]`,JSON.stringify(report));
  this.scheduler.completeWindow(assessment.accepted,now);
  this.finishIfComplete();
 }
 private collectCounters():Record<string,number>{return {...PerformanceInvestigationCounters.drain(),...Object.fromEntries(Object.entries(Geo.drain()).map(([k,v])=>[`geometry.${k}`,v]))};}
 private finishIfComplete():void{
  if(this.scheduler.state!=="complete")return;
  this.active=false;
  const accepted=this.scheduler.acceptedWindows,attempted=this.scheduler.attemptedWindows,rejected=this.scheduler.rejectedWindows;
  if (false) console.info("[PERF-P0] COMPLETE",JSON.stringify({scenario:this.scenario,acceptedWindows:accepted,attemptedWindows:attempted,rejectedWindows:rejected,requestedWindows:S.windowsPerRun,requestedRepetitions:S.repetitions,completedRepetitions:1,complete:accepted===S.windowsPerRun,reason:accepted===S.windowsPerRun?"Measurement windows complete; no verified fresh-world reconstruction":"Retry limit reached; incomplete measurement",identity:this.identity,reports:this.reports}));
 }
 private numericWorkload(w:DiagnosticWorkload,c:Readonly<Record<string,number>>):Record<string,number>{return {waterPackets:w.waterPackets,windParticles:w.windParticles,fireParticles:w.fireParticles,backgroundEnabled:w.backgroundEnabled?1:0,...Object.fromEntries(Object.entries(c).filter(([k])=>k.startsWith("p0.fixture.")))};}
}

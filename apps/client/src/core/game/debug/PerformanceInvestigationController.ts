import { PERFORMANCE_INVESTIGATION, isWaterVfxIsolationB1, isWindVfxIsolationB3, isBackgroundAnimationIsolationB4, isFrameStallAttributionP3A1, isBrowserMainThreadTraceP3A2, isGeometryQueryAttributionP3B1, isWaterSubphaseProfilingP3C1, isPixiPresentationProfilingP3C2, isAllEnabledBaseline } from "./PerformanceInvestigationDefinition";
import { PerformanceDiagnosticStatusOverlay } from "./PerformanceDiagnosticStatusOverlay";
import { PerformanceDiagnosticRunCoordinator } from "./PerformanceDiagnosticRunCoordinator";
import { CourseGeometryAccelerationProfiler as Geo } from "./CourseGeometryAccelerationProfiler";
import {PerformanceBenchmarkController} from "./PerformanceBenchmarkController";
import type {BenchmarkScenarioId,BenchmarkWorldIdentity} from "./PerformanceBenchmarkScenario";
import { PASS_B_PRESETS } from "./PerformanceSimulationDiagnosticConfiguration";
import { PerformanceSimulationIsolationController } from "./PerformanceSimulationIsolationController";
import { Container } from "pixi.js";
import { PerformanceInvestigationCounters } from "./PerformanceInvestigationCounters";
import { PerformanceDiagnosticDashboard } from "./PerformanceDiagnosticDashboard";
import { PerformanceDiagnosticSession } from "./PerformanceDiagnosticSession";
import { PerformanceDiagnosticFrameSampler } from "./PerformanceDiagnosticFrameSampler";
import { PerformanceDiagnosticSummary } from "./PerformanceDiagnosticSummary";
import { buildDiagnosticReport } from "./PerformanceDiagnosticReport";
import type { DiagnosticWorkload } from "./PerformanceDiagnosticReport";
import { DEFAULT_DIAGNOSTIC_CONFIGURATION, DIAGNOSTIC_PRESETS, diagnosticLabel } from "./PerformanceDiagnosticConfiguration";
import type { PerformanceDiagnosticConfiguration } from "./PerformanceDiagnosticConfiguration";
import type { WaterPerformanceSnapshot } from "./WaterPerformanceProfiler";
export class PerformanceInvestigationController {
 private readonly runCoordinator=new PerformanceDiagnosticRunCoordinator();
 private readonly root=new Container();private readonly session=new PerformanceDiagnosticSession();
 private readonly sampler=new PerformanceDiagnosticFrameSampler();private readonly summary=new PerformanceDiagnosticSummary();
 private readonly dashboard:PerformanceDiagnosticDashboard | null;
 private readonly allEnabledBaseline = isAllEnabledBaseline();
 private lastOverlaySecond = -1;
 private baselineStartTime = 0;
 public readonly p0Benchmark=new PerformanceBenchmarkController();
 private p0Identity:BenchmarkWorldIdentity={levelId:"unknown",spawnX:0,spawnY:0,fixtureRevision:"unverified",resetVerified:false};
 public bindP0Identity(fn:()=>BenchmarkWorldIdentity):void{this.p0IdentityProvider=fn;}
 private p0IdentityProvider:(()=>BenchmarkWorldIdentity)|null=null;
 private config:PerformanceDiagnosticConfiguration={...DEFAULT_DIAGNOSTIC_CONFIGURATION};
 private onChange:((c:PerformanceDiagnosticConfiguration)=>void)|null=null;
 public readonly passBIsolation=new PerformanceSimulationIsolationController();
 private passBSequence=-1;
 private sequence=-1;private lastReport='';private samplingStarted=false;
 private baselineStarted=false;
 private readonly waterVfxIsolationB1 = isWaterVfxIsolationB1();
 private readonly windVfxIsolationB3 = isWindVfxIsolationB3();
 private readonly backgroundIsolationB4 = isBackgroundAnimationIsolationB4();
 private readonly p3a1 = isFrameStallAttributionP3A1();
 constructor(_mode:string){this.root.zIndex=20000;if(this.allEnabledBaseline){this.dashboard=null;return;}this.dashboard=new PerformanceDiagnosticDashboard(c=>this.change(c),()=>this.runAll(),()=>this.runPassB(),()=>this.runP0(),(id:BenchmarkScenarioId)=>this.p0Benchmark.setScenario(id));this.root.addChild(this.dashboard.getContainer());}
 public bindChange(fn:(c:PerformanceDiagnosticConfiguration)=>void):void{this.onChange=fn;fn(this.config);}
 public getConfiguration():PerformanceDiagnosticConfiguration{return this.config;}
 public layout(width:number):void{this.dashboard?.layout(width);}
 public getContainer():Container{return this.root;}
 private change(c:PerformanceDiagnosticConfiguration,automated=false):void{
  if(!automated){this.baselineStarted=false;this.runCoordinator.clear();this.p0Benchmark.stop();this.sequence=-1;this.passBSequence=-1;this.passBIsolation.restore();}
  this.config={...c};this.onChange?.(this.config);this.session.configure(PERFORMANCE_INVESTIGATION.warmupSeconds,PERFORMANCE_INVESTIGATION.sampleSeconds,automated?5:PERFORMANCE_INVESTIGATION.reportCount);this.sampler.reset();this.samplingStarted=false;
  PerformanceInvestigationCounters.reset();
  if(!automated)console.clear();
  if (!automated) console.info(`[PERF] ${diagnosticLabel(c)} | 5s warm-up then five 5s reports`);
 }
 private runP0():void{
  this.runCoordinator.claim("P0");
  try {
   this.sequence=-1;this.passBSequence=-1;this.passBIsolation.restore();
   this.change(DEFAULT_DIAGNOSTIC_CONFIGURATION,true);
   this.p0Identity=this.p0IdentityProvider?.()??this.p0Identity;
   this.p0Benchmark.start(this.p0Identity);this.sampler.reset();
  } catch(error) {
   this.p0Benchmark.stop();this.runCoordinator.clear();
   console.error("[PERF-P0] Failed to start benchmark",error);
  }
 }
 private runPassB():void{this.runCoordinator.claim("PASS-B");this.p0Benchmark.stop();this.sequence=-1;this.passBSequence=0;this.change(DEFAULT_DIAGNOSTIC_CONFIGURATION,true);this.summary.reset();this.passBIsolation.setPreset(PASS_B_PRESETS[0]);this.session.reset();this.sampler.reset();this.samplingStarted=false;PerformanceInvestigationCounters.reset();console.clear();console.info("[PERF-B] RUN ALL TESTS: 10 presets, 5 reports each");console.info(`[PERF-B] ${PASS_B_PRESETS[0].label}: ${PASS_B_PRESETS[0].warning}`);}
 private runAll():void{this.runCoordinator.claim("PASS-A");this.p0Benchmark.stop();this.passBSequence=-1;this.passBIsolation.restore();this.sequence=0;this.summary.reset();console.clear();console.info('[PERF] RUN ALL TESTS: 8 presets, 5 reports each');this.change(DIAGNOSTIC_PRESETS[0].value,true);}
 public update(_deltaSeconds:number,snapshot:WaterPerformanceSnapshot,extra:DiagnosticWorkload):void{
  if (this.p3a1 || isBrowserMainThreadTraceP3A2() || isGeometryQueryAttributionP3B1() || isWaterSubphaseProfilingP3C1() || isPixiPresentationProfilingP3C2()) return; // P3-A1 owns its own full-frame sampler and reports.
  if(this.allEnabledBaseline && this.session.isComplete()) return;
  if(!this.baselineStarted){
   this.baselineStarted=true;this.baselineStartTime=performance.now();
   this.runCoordinator.claim("PASS-A"); // Existing coordinator owner; B-mode labels are applied to reports.
   this.session.configure(PERFORMANCE_INVESTIGATION.warmupSeconds,PERFORMANCE_INVESTIGATION.sampleSeconds,PERFORMANCE_INVESTIGATION.reportCount);
   this.summary.reset();
   if(this.allEnabledBaseline){PerformanceDiagnosticStatusOverlay.show("BASELINE | ALL SYSTEMS ENABLED — Warm-up: 5s");console.info("[BASELINE] ALL SYSTEMS ENABLED: 5s warm-up + 12 x 5s windows; leave game untouched.");}
   else console.info(this.backgroundIsolationB4 ? "[PERF-B4] BACKGROUND ANIMATION OFF, BACKGROUND VISIBLE: 5s warm-up + 12 x 5s windows; leave game untouched." : this.windVfxIsolationB3 ? "[PERF-B3] WIND VFX OFF, WIND SIMULATION ON: 5s warm-up + 12 x 5s windows; leave game untouched." : this.waterVfxIsolationB1 ? "[PERF-B1] WATER VFX OFF, WATER SIMULATION ON: 5s warm-up + 12 x 5s windows; leave game untouched." : "[PERF] BASELINE START: 5s warm-up + 12 x 5s windows; leave game untouched. Capture [PERF] logs.");
  }
  if(this.allEnabledBaseline){
   const progress=this.session.getProgress();
   if(progress==='WARM-UP'){
    const seconds=Math.max(0,5-Math.floor((performance.now()-this.baselineStartTime)/1000));
    if(seconds!==this.lastOverlaySecond){this.lastOverlaySecond=seconds;PerformanceDiagnosticStatusOverlay.show(`BASELINE | ALL SYSTEMS ENABLED — Warm-up: ${seconds}s`);}
   }else if(progress!=='COMPLETE'){
    const index=this.session.getReportIndex()+1;
    if(index!==this.lastOverlaySecond){this.lastOverlaySecond=index;PerformanceDiagnosticStatusOverlay.show(`BASELINE | ALL SYSTEMS ENABLED — Recording ${index}/12`);}
   }
  }
  this.dashboard?.update(this.config,`${this.p0Benchmark.isActive()?this.p0Benchmark.getProgress()+" | ":""}${this.passBSequence>=0?PASS_B_PRESETS[this.passBSequence].label+" | ":""}${this.session.getProgress()}`);const now=performance.now();
  if(this.runCoordinator.is("P0")){if(this.p0Benchmark.isActive())this.p0Benchmark.update(now,this.sampler,snapshot,extra,{});return;}
  if(!this.runCoordinator.current)return;
  if(!this.session.isSampling(now))return;
  if(!this.samplingStarted){this.sampler.reset();this.samplingStarted=true;PerformanceInvestigationCounters.reset();Geo.reset();}
  this.sampler.record(now);
  const index=this.session.nextReport(now);if(index===null)return;
  const stats=this.sampler.drain();
  const counters={...PerformanceInvestigationCounters.drain(),...Object.fromEntries(Object.entries(Geo.drain()).map(([k,v])=>[`geometry.${k}`,v]))};
  if(!PerformanceDiagnosticFrameSampler.isValidWindow(stats)){console.warn(`[PERF] INVALID WINDOW ${index}/${this.sequence>=0?5:PERFORMANCE_INVESTIGATION.reportCount}: ${stats.frames} frames; discarded`);return;}
  const report=buildDiagnosticReport(diagnosticLabel(this.config),index,stats,snapshot,extra,counters);
  if(this.passBSequence>=0){(report as Record<string,unknown>).tag="PASS-B";(report as Record<string,unknown>).configuration=PASS_B_PRESETS[this.passBSequence].label;(report as Record<string,unknown>).isolationWarning=PASS_B_PRESETS[this.passBSequence].warning;(report as Record<string,unknown>).disabledGates=PASS_B_PRESETS[this.passBSequence].disabled;}
  if(this.backgroundIsolationB4){(report as Record<string,unknown>).tag="PASS-B4";(report as Record<string,unknown>).configuration="BACKGROUND ANIMATION OFF / BACKGROUND VISIBLE";}
  if(this.windVfxIsolationB3){(report as Record<string,unknown>).tag="PASS-B3";(report as Record<string,unknown>).configuration="WIND VFX OFF / SIMULATION ON";}
  if(this.waterVfxIsolationB1){(report as Record<string,unknown>).tag="PASS-B1";(report as Record<string,unknown>).configuration="WATER VFX OFF / SIMULATION ON";}
  if(this.allEnabledBaseline){(report as Record<string,unknown>).tag="BASELINE";(report as Record<string,unknown>).configuration="ALL SYSTEMS ENABLED";}
  this.lastReport=JSON.stringify(report);
  console.info(`[${this.backgroundIsolationB4?"PERF-B4":this.windVfxIsolationB3?"PERF-B3":this.waterVfxIsolationB1?"PERF-B1":this.passBSequence>=0?"PERF-B":this.allEnabledBaseline?"BASELINE":"PERF"} ${index}/${this.sequence>=0||this.passBSequence>=0?5:PERFORMANCE_INVESTIGATION.reportCount}]`,this.lastReport);
  this.dashboard?.setMetrics(report.categoryRanking,stats.fps,stats.p95Ms,stats.maxMs);
  this.summary.add(report as Record<string,unknown>);
  if(index===(this.sequence>=0||this.passBSequence>=0?5:PERFORMANCE_INVESTIGATION.reportCount)){if(this.passBSequence>=0){console.info(`[PERF-B] COMPLETE: ${PASS_B_PRESETS[this.passBSequence].label}`);this.passBSequence++;if(this.passBSequence<PASS_B_PRESETS.length){this.passBIsolation.setPreset(PASS_B_PRESETS[this.passBSequence]);this.session.reset();this.sampler.reset();this.samplingStarted=false;PerformanceInvestigationCounters.reset();console.info(`[PERF-B] ${PASS_B_PRESETS[this.passBSequence].label}: ${PASS_B_PRESETS[this.passBSequence].warning}`);}else{this.passBSequence=-1;this.passBIsolation.restore();this.summary.completePassB();}return;}console.info(`[${this.backgroundIsolationB4?"PERF-B4":this.windVfxIsolationB3?"PERF-B3":this.waterVfxIsolationB1?"PERF-B1":"PERF"}] COMPLETE: ${this.backgroundIsolationB4?"BACKGROUND ANIMATION OFF / BACKGROUND VISIBLE":this.windVfxIsolationB3?"WIND VFX OFF / SIMULATION ON":this.waterVfxIsolationB1?"WATER VFX OFF / SIMULATION ON":diagnosticLabel(this.config)}`);
   if(this.sequence<0){this.summary.complete();if(this.allEnabledBaseline){PerformanceDiagnosticStatusOverlay.baselineComplete();console.info("[BASELINE] COMPLETE | 12/12 — Open DevTools to copy the summary.");}return;}
   if(this.sequence>=0){this.sequence++;if(this.sequence<DIAGNOSTIC_PRESETS.length)this.change(DIAGNOSTIC_PRESETS[this.sequence].value,true);else{this.sequence=-1;this.summary.complete();}}
  }
 }
 public getLastReport():string{return this.lastReport;}
 public destroy():void{this.runCoordinator.clear();this.p0Benchmark.stop();this.passBIsolation.restore();this.dashboard?.destroy();this.root.destroy({children:false});}
}

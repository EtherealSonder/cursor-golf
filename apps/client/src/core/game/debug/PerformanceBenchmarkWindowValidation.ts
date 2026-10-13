import type { PerformanceDiagnosticFrameSampler } from "./PerformanceDiagnosticFrameSampler";
export interface BenchmarkWindowAssessment {readonly accepted:boolean;readonly interrupted:boolean;readonly reasons:readonly string[];}
export function assessBenchmarkWindow(stats:ReturnType<PerformanceDiagnosticFrameSampler["drain"]>,expectedMs:number,drift:readonly string[],minFrames=20):BenchmarkWindowAssessment{
 const reasons:string[]=[];
 if(stats.browserStalls>0)reasons.push(`${stats.browserStalls} browser stalls`);
 if(stats.frames<minFrames)reasons.push(`Insufficient frames: ${stats.frames}`);
 if(Math.abs(stats.wallElapsedMs-expectedMs)>expectedMs*.2)reasons.push(`Abnormal measurement duration: ${stats.wallElapsedMs.toFixed(0)}ms`);
 if(drift.length)reasons.push(`Workload drift: ${drift.join(", ")}`);
 return {accepted:reasons.length===0,interrupted:stats.browserStalls>0||stats.frames<minFrames||Math.abs(stats.wallElapsedMs-expectedMs)>expectedMs*.2,reasons};
}

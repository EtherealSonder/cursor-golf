/** Comparison refuses to claim a speedup for unmatched fixtures or unstable workloads. */
export interface BenchmarkComparableResult {scenario:string;fixture:string;valid:boolean;fps:number;p95Ms:number;p99Ms:number;worldMs:number;pixiMs:number;workload:Readonly<Record<string,number>>;}
export interface BenchmarkMetricDelta {before:number;after:number;delta:number;percent:number|null;}
function delta(before:number,after:number):BenchmarkMetricDelta{return {before,after,delta:after-before,percent:before!==0?100*(after-before)/before:null};}
export function compareBenchmarkResults(before:BenchmarkComparableResult,after:BenchmarkComparableResult){
 const issues:string[]=[];
 if(before.scenario!==after.scenario)issues.push("Scenario mismatch");
 if(before.fixture!==after.fixture)issues.push("Fixture mismatch");
 if(!before.valid||!after.valid)issues.push("Invalid or non-reproducible measurement");
 for(const k of new Set([...Object.keys(before.workload),...Object.keys(after.workload)])){
  const a=before.workload[k],b=after.workload[k];if(a===undefined||b===undefined){issues.push(`Missing workload: ${k}`);continue;}
  if(Math.abs(b-a)>Math.max(5,Math.abs(a)*.25))issues.push(`Workload mismatch: ${k}`);
 }
 return {comparable:issues.length===0,issues,metrics:{fps:delta(before.fps,after.fps),p95Ms:delta(before.p95Ms,after.p95Ms),p99Ms:delta(before.p99Ms,after.p99Ms),worldMs:delta(before.worldMs,after.worldMs),pixiMs:delta(before.pixiMs,after.pixiMs)}};
}

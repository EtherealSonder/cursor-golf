/** P0 scenario definitions. A label is not proof of a reproducible fixture. */
export type BenchmarkScenarioId = "P0-S1" | "P0-S2" | "P0-S3" | "P0-S4" | "P0-S5";
export interface PerformanceBenchmarkScenario { readonly id: BenchmarkScenarioId; readonly label: string; readonly purpose: string; readonly expected: readonly string[]; }
export const P0_SCENARIOS: readonly PerformanceBenchmarkScenario[] = [
 {id:"P0-S1",label:"Dry baseline",purpose:"Course, Ball and core physics",expected:["dry"]},
 {id:"P0-S2",label:"Fire stress",purpose:"Fire cells, spread and VFX",expected:["fire"]},
 {id:"P0-S3",label:"Water stress",purpose:"Standing/airborne Water and ground interaction",expected:["water"]},
 {id:"P0-S4",label:"Wind stress",purpose:"Wind forces, obstacles and VFX",expected:["wind"]},
 {id:"P0-S5",label:"Combined stress",purpose:"Full gameplay scene",expected:["combined"]},
];
export const P0_BENCHMARK_SETTINGS = {warmupSeconds:5, windowSeconds:5, windowsPerRun:5, repetitions:3, stallThresholdMs:1000, elapsedToleranceRatio:0.20, workloadDriftToleranceRatio:0.25} as const;
export interface BenchmarkWorldIdentity { readonly levelId:string; readonly spawnX:number; readonly spawnY:number; readonly fixtureRevision:string; readonly resetVerified:boolean; readonly note?:string; }
export function assessBenchmarkWorkload(start:Readonly<Record<string,number>>,end:Readonly<Record<string,number>>):string[]{
 const issues:string[]=[];
 for(const key of Object.keys(start)) {const a=start[key],b=end[key];if(!Number.isFinite(a)||!Number.isFinite(b))continue;
  if(Math.abs(b-a)>Math.max(5,Math.abs(a)*P0_BENCHMARK_SETTINGS.workloadDriftToleranceRatio))issues.push(`${key}: ${a} -> ${b}`);
 }return issues;
}

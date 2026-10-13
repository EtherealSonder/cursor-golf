/** Keep all eight diagnostic windows in memory and emit a machine-readable summary. */
export class PerformanceDiagnosticSummary {
 private readonly results:Record<string,unknown>[]=[];
 reset():void{this.results.length=0;}
 add(result:Record<string,unknown>):void{this.results.push(result);}
 getResults():readonly Record<string,unknown>[] {return this.results;}
 getAcceptedResults():readonly Record<string,unknown>[] {return this.results.filter(r=>r.valid!==false&&r.windowStatus!=="rejected"&&r.windowStatus!=="interrupted");}
 getCacheTotals():Record<string,number>{const totals={lookups:0,hits:0,misses:0,bypasses:0,invalidations:0};for(const r of this.getAcceptedResults()){const c=r.cacheEffectiveness as Partial<typeof totals>|undefined;if(c)for(const k of Object.keys(totals) as (keyof typeof totals)[])totals[k]+=c[k]??0;}return totals;}
 completeP0():void{console.info("[PERF-P0] SUMMARY",JSON.stringify({windows:this.results.length,reports:this.results}));}
 completePassB():void{console.info("[PERF-B] ALL CONFIGURATIONS COMPLETE",JSON.stringify({windows:this.results.length,reports:this.results}));}
 complete():void {console.info('[PERF] ALL CONFIGURATIONS COMPLETE',JSON.stringify({windows:this.results.length,reports:this.results}));}
}

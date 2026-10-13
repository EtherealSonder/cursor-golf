import {PerformanceInvestigationCounters as C} from "./PerformanceInvestigationCounters";
/** Allocation-free call-site labels. Does not mutate simulation or query results. */
export class PerformanceSpatialQueryProfiler {
 static count(caller:string,operations=1):void{C.add(`passB.query.${caller}`,operations);}
 static timed<T>(caller:string,fn:()=>T):T{if(!C.enabled)return fn();const start=performance.now();try{return fn();}finally{C.add(`passB.queryMs.${caller}`,performance.now()-start);C.add(`passB.queryCalls.${caller}`);}}
}

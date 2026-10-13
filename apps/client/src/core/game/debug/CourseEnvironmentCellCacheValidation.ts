import {CourseEnvironmentCellCache} from "../level/CourseEnvironmentCellCache";
/** Deterministic cache contract checks; runs only when explicitly invoked. */
export function validateCourseEnvironmentCellCache():void{
 const cache=new CourseEnvironmentCellCache(32);let computations=0;let hits=0;let misses=0;let invalidations=0;
 const check=(x:number,y:number,size:number,policy:"full"|"center",value:boolean)=>cache.getOrCompute(x,y,size,policy,()=>{computations++;misses++;return value;},()=>hits++);
 if(!check(0,0,8,"center",true)||!check(0,0,8,"center",false))throw Error("[P1-R2] repeated cache lookup failed");
 if(check(0,0,8,"full",false)||check(0,0,16,"center",false)||check(8,0,8,"center",false))throw Error("[P1-R2] cache key collision");
 if(hits!==1||misses!==4||computations!==4)throw Error("[P1-R2] cache hit/miss accounting failed");
 cache.clear();invalidations++;if(check(0,0,8,"center",false))throw Error("[P1-R2] invalidation failed");
 if(invalidations!==1||Number(computations)!==5)throw Error("[P1-R2] invalidation accounting failed");
 // Coordinate/policy tests do not replace course-specific polygon equivalence validation.
}

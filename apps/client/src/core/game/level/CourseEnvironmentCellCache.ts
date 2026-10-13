import { CourseGeometryAccelerationProfiler as Geo } from "../debug/CourseGeometryAccelerationProfiler";
/** Per-course cache for static environment grid cells. Arbitrary non-grid coordinates bypass cache. */
export class CourseEnvironmentCellCache {
    private readonly results = new Map<string, boolean>();
    private readonly limit: number;
    constructor(limit = 100000) { this.limit = limit; }
    getOrCompute(x: number,y: number,size: number,policy:"full"|"center",compute:()=>boolean,onHit?:()=>void):boolean {
        if (![x,y,size].every(Number.isFinite) || size<=0) {Geo.add("cellCacheBypasses");return compute();}
        // Cache keys include absolute coordinates, size, and policy. Hit/miss counters
        // are emitted by the boundary caller; zero hits can mean the API is not used.
        const key=`${x}|${y}|${size}|${policy}`;
        const cached=this.results.get(key);
        Geo.add("cellCacheLookups");
        if(cached!==undefined) {Geo.add("cellCacheHits");onHit?.();return cached;}
        Geo.add("cellCacheMisses");
        const result=compute();
        if(this.results.size>=this.limit) this.clear();
        this.results.set(key,result);
        return result;
    }
    clear():void {if(this.results.size>0)Geo.add("cellCacheInvalidations");this.results.clear();}
    get size():number {return this.results.size;}
}

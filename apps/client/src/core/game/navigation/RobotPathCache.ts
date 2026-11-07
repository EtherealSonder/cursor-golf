import type { RobotGridCell } from "./RobotAStarPathfinder";
import { ROBOT_DYNAMIC_NAVIGATION_DEFINITION as D } from "../config/RobotDynamicNavigationDefinition";
/** Small LRU cache of immutable grid routes. Dynamic changes invalidate the generation. */
export class RobotPathCache {
    private readonly entries=new Map<string,{cells:readonly RobotGridCell[];version:number;expires:number}>();
    private now=0;private hits=0;private misses=0;
    public tick(dt:number):void{this.now+=Math.max(0,dt);}
    public get(key:string,version:number):RobotGridCell[]|null{
        const item=this.entries.get(key);
        if(!item||item.version!==version||item.expires<this.now){this.misses++;if(item)this.entries.delete(key);return null;}
        this.entries.delete(key);this.entries.set(key,item);this.hits++;return item.cells.map(c=>({...c}));
    }
    public set(key:string,version:number,cells:readonly RobotGridCell[]):void{
        this.entries.delete(key);this.entries.set(key,{cells:cells.map(c=>({...c})),version,expires:this.now+D.cacheTimeToLiveSeconds});
        while(this.entries.size>D.maximumCacheEntries){const first=this.entries.keys().next().value;if(first===undefined)break;this.entries.delete(first);}
    }
    public clear():void{this.entries.clear();}
    public snapshot():{entries:number;hits:number;misses:number}{return {entries:this.entries.size,hits:this.hits,misses:this.misses};}
}

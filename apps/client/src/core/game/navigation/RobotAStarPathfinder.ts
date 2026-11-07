import type { RobotNavigationGrid } from "./RobotNavigationGrid";
import type { RobotDynamicObstacleLayer } from "./RobotDynamicObstacleLayer";
import { ROBOT_PATHFINDING_DEFINITION } from "../config/RobotPathfindingDefinition";
export interface RobotGridCell {readonly x:number;readonly y:number;}
/** Bounded A* with reusable buffers and optional dynamic occupancy. */
export class RobotAStarPathfinder {
    private readonly costs:Float64Array;
    private readonly previous:Int32Array;
    private readonly visited:Uint32Array;
    private readonly closed:Uint32Array;
    private generation=0;
    private lastExpanded=0;
    public constructor(private readonly grid:RobotNavigationGrid,private readonly dynamicLayer?:RobotDynamicObstacleLayer){
        const size=grid.columns*grid.rows;
        this.costs=new Float64Array(size);this.previous=new Int32Array(size);
        this.visited=new Uint32Array(size);this.closed=new Uint32Array(size);
    }
    public getLastExpanded():number{return this.lastExpanded;}
    public findPath(start:RobotGridCell,goal:RobotGridCell,maxExpanded=ROBOT_PATHFINDING_DEFINITION.maxExpandedCells):RobotGridCell[]|null{
        this.lastExpanded=0;
        const {columns:width,rows:height}=this.grid;
        const traversable=(x:number,y:number):boolean=>this.grid.isTraversable(x,y)&&(!this.dynamicLayer||!this.dynamicLayer.isBlocked(x,y));
        if(!this.grid.isTraversable(start.x,start.y)||!traversable(goal.x,goal.y))return null;
        const key=(x:number,y:number):number=>y*width+x;
        const startId=key(start.x,start.y),goalId=key(goal.x,goal.y);
        if(startId===goalId)return [start];
        if(++this.generation===0xffffffff){this.visited.fill(0);this.closed.fill(0);this.generation=1;}
        const gen=this.generation;
        const heap:{id:number;score:number}[]=[];
        const push=(id:number,score:number):void=>{
            let i=heap.length;heap.push({id,score});
            while(i>0){const p=(i-1)>>1;if(heap[p].score<=score)break;heap[i]=heap[p];i=p;}
            heap[i]={id,score};
        };
        const pop=():number=>{
            const first=heap[0].id,last=heap.pop()!;
            if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].score<heap[c].score)c++;if(heap[c].score>=last.score)break;heap[i]=heap[c];i=c;}heap[i]=last;}
            return first;
        };
        const heuristic=(x:number,y:number):number=>{const dx=Math.abs(x-goal.x),dy=Math.abs(y-goal.y);return Math.max(dx,dy)+(Math.SQRT2-1)*Math.min(dx,dy);};
        this.visited[startId]=gen;this.costs[startId]=0;this.previous[startId]=-1;
        push(startId,heuristic(start.x,start.y));
        while(heap.length&&this.lastExpanded<maxExpanded){
            const id=pop();if(this.closed[id]===gen)continue;
            this.lastExpanded++;
            if(id===goalId){const result:RobotGridCell[]=[];let at=id;while(at>=0){result.push({x:at%width,y:Math.floor(at/width)});at=this.previous[at];}return result.reverse();}
            this.closed[id]=gen;
            const x=id%width,y=Math.floor(id/width);
            for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
                if(!dx&&!dy)continue;
                const nx=x+dx,ny=y+dy;
                if(nx<0||ny<0||nx>=width||ny>=height||!traversable(nx,ny))continue;
                if(dx&&dy&&(!traversable(x+dx,y)||!traversable(x,y+dy)))continue;
                const next=key(nx,ny);if(this.closed[next]===gen)continue;
                const candidate=this.costs[id]+(dx&&dy?Math.SQRT2:1);
                if(this.visited[next]===gen&&candidate>=this.costs[next])continue;
                this.visited[next]=gen;this.costs[next]=candidate;this.previous[next]=id;
                push(next,candidate+heuristic(nx,ny));
            }
        }
        return null;
    }
}

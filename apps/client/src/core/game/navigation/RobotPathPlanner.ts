import type { RobotNavigationGrid } from "./RobotNavigationGrid";
import { RobotAStarPathfinder } from "./RobotAStarPathfinder";
import type { RobotDynamicObstacleLayer } from "./RobotDynamicObstacleLayer";
import type { RobotNavigationScheduler } from "./RobotNavigationScheduler";
import type { RobotPathCache } from "./RobotPathCache";
import type { RobotNavigationPoint, RobotNavigationQuery } from "../entities/robots/RobotNavigationQuery";
import { ROBOT_PATH_FOLLOWING_DEFINITION as FOLLOWING } from "../config/RobotPathFollowingDefinition";
import { ROBOT_PATHFINDING_DEFINITION as SETTINGS } from "../config/RobotPathfindingDefinition";

export interface RobotPlannedRoute {
    readonly destination: RobotNavigationPoint;
    readonly waypoints: readonly RobotNavigationPoint[];
    readonly attempts: number;
}
/** RN-2 planner: random candidates are accepted only if connected by a clearance-safe route. */
export class RobotPathPlanner {
    private readonly astar: RobotAStarPathfinder;
    public constructor(private readonly grid: RobotNavigationGrid,
        private readonly dynamicLayer?: RobotDynamicObstacleLayer,
        private readonly scheduler?: RobotNavigationScheduler,
        private readonly cache?: RobotPathCache,
    ) { this.astar = new RobotAStarPathfinder(grid, dynamicLayer); }
    public isUpcomingSegmentBlocked(x:number,y:number,waypoint:RobotNavigationPoint,clearance:number,query:RobotNavigationQuery):boolean {
        const distance=Math.hypot(waypoint.x-x,waypoint.y-y);
        if(distance<1)return false;
        const reach=Math.min(distance,95);
        return !query.isDynamicSegmentClear(x,y,x+(waypoint.x-x)*reach/distance,y+(waypoint.y-y)*reach/distance,clearance);
    }
    public getDiagnostics():{dynamicCells:number;cacheHits:number;cacheEntries:number;searches:number;deferred:number}{
        const cache=this.cache?.snapshot(),scheduler=this.scheduler?.snapshot();
        return {dynamicCells:this.dynamicLayer?.getOccupiedCount()??0,cacheHits:cache?.hits??0,cacheEntries:cache?.entries??0,searches:scheduler?.searches??0,deferred:scheduler?.deferred??0};
    }
    public planRoam(x: number, y: number, radius: number, clearance: number, attempts: number, query: RobotNavigationQuery): RobotPlannedRoute | null {
        const limit = Math.min(SETTINGS.maximumCandidateAttempts, Math.max(1, attempts));
        for (let attempt = 1; attempt <= limit; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const minimum = radius * SETTINGS.minimumRoamDistanceRatio;
            const distance = Math.sqrt(minimum * minimum + Math.random() * (radius * radius - minimum * minimum));
            const destination = { x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance };
            if (!query.isPositionClear(destination.x, destination.y, clearance)) continue;
            const waypoints = this.plan(x, y, destination, clearance, query);
            if (waypoints) return { destination, waypoints, attempts: attempt };
        }
        return null;
    }
    /** RN-3: replan without changing the existing destination. */
    public replan(x: number, y: number, destination: RobotNavigationPoint, clearance: number, query: RobotNavigationQuery): RobotNavigationPoint[] | null {
        return this.plan(x, y, destination, clearance, query);
    }
    public planAlternative(x: number, y: number, radius: number, clearance: number, query: RobotNavigationQuery): RobotPlannedRoute | null {
        return this.planRoam(x, y, radius, clearance, SETTINGS.maximumCandidateAttempts, query);
    }
    public plan(x: number, y: number, destination: RobotNavigationPoint, clearance: number, query: RobotNavigationQuery): RobotNavigationPoint[] | null {
        const start = this.grid.worldToCell(x, y), end = this.grid.worldToCell(destination.x, destination.y);
        // If the current robot position is displaced into blocked geometry, RN-3 handles recovery.
        if (!this.grid.isTraversable(start.x, start.y) || !this.grid.isTraversable(end.x, end.y)) return null;
        const generation=this.dynamicLayer?.getVersion()??0;
        const key=`${start.x},${start.y}:${end.x},${end.y}`;
        let cells=this.cache?.get(key,generation)??null;
        if(!cells){
            const budget=this.scheduler?.tryAcquire(SETTINGS.maxExpandedCells,true)??SETTINGS.maxExpandedCells;
            if(budget<=0)return null;
            cells=this.astar.findPath(start,end,budget);
            if(!cells)return null;
            this.cache?.set(key,generation,cells);
        }
        const raw = [{ x, y }, ...cells.slice(1, -1).map(c => this.grid.cellToWorld(c.x, c.y)), destination];
        const result: RobotNavigationPoint[] = [];
        let anchor = 0;
        while (anchor < raw.length - 1) {
            let next = anchor + 1;
            for (let candidate = raw.length - 1; candidate > anchor + 1; candidate--) {
                if (query.isPlannedSegmentClear(raw[anchor].x, raw[anchor].y, raw[candidate].x, raw[candidate].y, clearance, FOLLOWING.segmentSampleSpacing)
                    && (!this.dynamicLayer || query.isDynamicSegmentClear(raw[anchor].x,raw[anchor].y,raw[candidate].x,raw[candidate].y,clearance,12))) {
                    next = candidate; break;
                }
            }
            if(this.dynamicLayer && !query.isDynamicSegmentClear(raw[anchor].x,raw[anchor].y,raw[next].x,raw[next].y,clearance,12))return null;
            result.push(raw[next]); anchor = next;
        }
        return result;
    }
}

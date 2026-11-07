import { ROBOT_DYNAMIC_NAVIGATION_DEFINITION as D } from "../config/RobotDynamicNavigationDefinition";
/** Shared synchronous budget. Call beginFrame once per World.update. */
export class RobotNavigationScheduler {
    private searches=0; private expansions=0; private rejected=0;
    public beginFrame():void {this.searches=0;this.expansions=0;}
    public tryAcquire(maxNodes:number, urgent=false):number {
        const remaining=D.maximumExpandedNodesPerFrame-this.expansions;
        if(this.searches>=D.maximumSearchesPerFrame||remaining<=0){this.rejected++;return 0;}
        const allowance=Math.min(maxNodes,remaining);
        if(!urgent && allowance<Math.min(maxNodes,1000)){this.rejected++;return 0;}
        this.searches++;this.expansions+=allowance;return allowance;
    }
    public snapshot():{searches:number;reservedNodes:number;deferred:number}{return {searches:this.searches,reservedNodes:this.expansions,deferred:this.rejected};}
}

import type { RobotNavigationGrid } from "./RobotNavigationGrid";
import type { RobotInteractionEntry, RobotInteractionRegistry, RobotInteractionShape } from "../entities/robots/RobotInteractionRegistry";
import { ROBOT_DYNAMIC_NAVIGATION_DEFINITION as D } from "../config/RobotDynamicNavigationDefinition";

/** Independent transient occupancy. Never mutates the static RN-1 grid. */
export class RobotDynamicObstacleLayer {
    private occupancy: Uint16Array;
    private elapsed = Infinity;
    private version = 0;
    private occupied = 0;
    public constructor(private readonly grid: RobotNavigationGrid, private readonly registry: RobotInteractionRegistry, private readonly clearance = 38) {
        this.occupancy = new Uint16Array(grid.columns * grid.rows);
    }
    public update(dt: number): void {
        this.elapsed += Math.max(0, dt);
        if (this.elapsed < D.refreshSeconds) return;
        this.elapsed = 0;
        const next = new Uint16Array(this.occupancy.length);
        for (const entry of this.registry.getDynamicNavigationBlockers()) {
            if (!this.isHard(entry)) continue;
            const shape = entry.getShape?.() ?? entry.shape;
            const radius = this.boundingRadius(shape) + this.clearance + D.dynamicClearancePadding;
            const cx = entry.getX(), cy = entry.getY();
            if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
            const a = this.grid.worldToCell(cx-radius,cy-radius), b=this.grid.worldToCell(cx+radius,cy+radius);
            for (let y=Math.max(0,a.y);y<=Math.min(this.grid.rows-1,b.y);y++) for(let x=Math.max(0,a.x);x<=Math.min(this.grid.columns-1,b.x);x++) {
                const c=this.grid.cellToWorld(x,y);
                if (this.intersects(c.x,c.y,this.clearance+D.dynamicClearancePadding,entry,shape)) next[y*this.grid.columns+x]++;
            }
        }
        let changed=false, occupied=0;
        for(let i=0;i<next.length;i++){if(next[i]!==this.occupancy[i])changed=true;if(next[i])occupied++;}
        this.occupancy=next;this.occupied=occupied;if(changed)this.version++;
    }
    public isBlocked(x:number,y:number):boolean {return !this.grid.containsCell(x,y)||this.occupancy[y*this.grid.columns+x]>0;}
    public isTraversable(x:number,y:number):boolean {return this.grid.isTraversable(x,y)&&!this.isBlocked(x,y);}
    public getVersion():number{return this.version;}
    public getOccupiedCount():number{return this.occupied;}
    private isHard(entry:RobotInteractionEntry):boolean {
        if (entry.label.toLowerCase().includes('robot')) return false;
        const shape=entry.getShape?.()??entry.shape;
        return this.boundingRadius(shape)>=D.hardBlockerMinimumRadius;
    }
    private boundingRadius(shape:RobotInteractionShape):number {
        switch(shape.kind){case 'circle':return shape.radius;case 'capsule':return Math.hypot(shape.x2-shape.x1,shape.y2-shape.y1)/2+shape.radius;default:return Math.hypot(shape.width,shape.height)/2;}
    }
    private intersects(x:number,y:number,r:number,e:RobotInteractionEntry,s:RobotInteractionShape):boolean {
        if(s.kind==='circle')return Math.hypot(x-e.getX(),y-e.getY())<r+s.radius;
        if(s.kind==='capsule'){
            const dx=s.x2-s.x1,dy=s.y2-s.y1,t=Math.max(0,Math.min(1,((x-s.x1)*dx+(y-s.y1)*dy)/Math.max(1e-9,dx*dx+dy*dy)));
            return Math.hypot(x-(s.x1+t*dx),y-(s.y1+t*dy))<r+s.radius;
        }
        const angle=s.kind==='orientedRectangle'?s.rotation:0,c=Math.cos(angle),sn=Math.sin(angle),dx=x-e.getX(),dy=y-e.getY();
        const lx=dx*c+dy*sn,ly=-dx*sn+dy*c,ox=Math.max(Math.abs(lx)-s.width/2,0),oy=Math.max(Math.abs(ly)-s.height/2,0);
        return ox*ox+oy*oy<r*r;
    }
}

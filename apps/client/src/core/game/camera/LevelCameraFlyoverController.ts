import type { LevelCameraPoint } from "../level/LevelDefinition";
import { LEVEL_COMPLETION_TRANSITION as C } from "../config/LevelCompletionTransitionDefinition";
export interface CameraFlyoverPose { readonly x:number; readonly y:number; readonly zoom:number; }
/** Stateless interpolation over an authored route; final point is always the ball. */
export class LevelCameraFlyoverController {
    private route: readonly CameraFlyoverPose[] = [];
    private segmentSeconds: number = C.flyoverSeconds;
    public configure(hole: CameraFlyoverPose, markers: readonly LevelCameraPoint[], ball: CameraFlyoverPose): number {
        const points = [...markers].sort((a,b)=>a.index-b.index);
        this.route = [hole, ...points.map(p=>({x:p.x,y:p.y,zoom:C.newHoleWideZoom})), ball];
        this.segmentSeconds = points.length ? C.flyoverWaypointSeconds : C.flyoverSeconds;
        return (this.route.length-1)*this.segmentSeconds;
    }
    public pose(progress: number): CameraFlyoverPose {
        if (this.route.length<2) throw new Error("Camera flyover route not configured.");
        const n=this.route.length-1;
        const scaled=Math.max(0,Math.min(1,progress))*n;
        const segment=Math.min(n-1,Math.floor(scaled));
        const t=scaled-segment, eased=t*t*(3-2*t);
        const a=this.route[segment],b=this.route[segment+1];
        return {x:a.x+(b.x-a.x)*eased,y:a.y+(b.y-a.y)*eased,
            zoom:a.zoom*Math.pow(b.zoom/a.zoom,eased)};
    }
}

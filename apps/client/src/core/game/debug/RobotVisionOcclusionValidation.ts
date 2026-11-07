import { buildVisibleConePerimeter, visionRayShapeHit, type RobotVisionOccluderSnapshot } from "../entities/robots/RobotVisionOcclusionGeometry";

/** Deterministic presentation geometry checks, executed once in development. */
export function assertRobotVisionOcclusionValidation(): void {
    const circle: RobotVisionOccluderSnapshot = {id:"circle",x:50,y:0,shape:{kind:"circle",radius:10}};
    const rectangle: RobotVisionOccluderSnapshot = {id:"rect",x:50,y:0,shape:{kind:"rectangle",width:20,height:20}};
    const rotated: RobotVisionOccluderSnapshot = {id:"rotated",x:50,y:0,shape:{kind:"orientedRectangle",width:20,height:20,rotation:Math.PI/4}};
    const capsule: RobotVisionOccluderSnapshot = {id:"capsule",x:50,y:0,shape:{kind:"capsule",x1:40,y1:-10,x2:60,y2:10,radius:5}};
    for (const item of [circle,rectangle,rotated,capsule]) {
        const hit=visionRayShapeHit(0,0,1,0,item);
        if(hit===null || hit<0 || hit>=50) throw new Error(`[Vision Occlusion] ${item.id} ray intersection failed`);
    }
    const open=buildVisibleConePerimeter(0,0,0,100,Math.PI/4,[]);
    if(open.length<2 || Math.abs(open[Math.floor(open.length/2)].x-100)>0.01) throw new Error("[Vision Occlusion] unobstructed cone failed");
    const blocked=buildVisibleConePerimeter(0,0,0,100,Math.PI/4,[circle,rectangle]);
    if(blocked[Math.floor(blocked.length/2)].x>41) throw new Error("[Vision Occlusion] nearest blocker failed");
    const moved=buildVisibleConePerimeter(0,0,0,100,Math.PI/4,[{...circle,x:150}]);
    if(moved[Math.floor(moved.length/2)].x<99) throw new Error("[Vision Occlusion] moved blocker not released");
}

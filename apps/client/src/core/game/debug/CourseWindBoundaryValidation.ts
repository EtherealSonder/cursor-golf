import { buildCourseGeometry } from "../level/CourseGeometryBuilder";
import { CourseEnvironmentBoundary } from "../level/CourseEnvironmentBoundary";
import type { LevelCourseDefinition } from "../level/LevelDefinition";

/** Geometry-level assertions for E2-C; gameplay and rendering require in-browser checks. */
export function assertCourseWindBoundaryValidation(): void {
    const rectangle: LevelCourseDefinition = {
        type: "rectangle", width: 200, height: 120, baseSurface: "grass",
        openings: [{side:"top",start:80,end:120}],
    };
    const concave: LevelCourseDefinition = {
        type: "polygon", width: 200, height: 200, baseSurface: "grass",
        vertices: [{x:0,y:0},{x:200,y:0},{x:200,y:200},{x:130,y:200},
            {x:130,y:70},{x:70,y:70},{x:70,y:200},{x:0,y:200}],
        openings: [{edgeIndex:0,start:80,end:120}],
    };
    const rect = new CourseEnvironmentBoundary(buildCourseGeometry(rectangle,{x:0,y:0}));
    const poly = new CourseEnvironmentBoundary(buildCourseGeometry(concave,{x:0,y:0}));
    const check = (ok:boolean,message:string) => {if(!ok) throw new Error(`[E2-C] ${message}`);};
    check(rect.containsPoint(100,50),"rectangle playable interior");
    check(!rect.containsPoint(100,-20),"rectangle outside");
    check(rect.intersectsWall({x:30,y:50},{x:-20,y:50}),"solid wall");
    check(!rect.intersectsWall({x:100,y:20},{x:100,y:-20}),"opening no wall");
    check(rect.crossesCourseBoundary({x:100,y:20},{x:100,y:-20}),"opening void exit");
    check(!poly.containsPoint(100,150),"concave notch invalid");
    check(poly.crossesCourseBoundary({x:40,y:150},{x:160,y:150}),"concave excursion");
    check(!poly.crossesCourseBoundary({x:20,y:30},{x:40,y:30}),"clear internal path");
    check(rect.isFootprintMostlyOutside({kind:"circle",x:100,y:-20,radius:8}),"outside wind source footprint");
    check(!rect.isFootprintMostlyOutside({kind:"circle",x:100,y:5,radius:8}),"near-opening interior footprint");
    check(!rect.isFootprintMostlyOutside({kind:"circle",x:100,y:0,radius:8},0.7),"halfway exit remains safe");
    check(rect.isFootprintMostlyOutside({kind:"circle",x:100,y:-7,radius:8},0.7),"mostly outside exceeds threshold");
    // V3: a corridor must be clear along its entire visual segment, not only at its centre.
    const visualSegmentClear = (boundary: CourseEnvironmentBoundary,
        ax:number, ay:number, bx:number, by:number):boolean =>
        boundary.containsPoint(ax,ay) && boundary.containsPoint(bx,by) &&
        !boundary.blocksSegment(ax,ay,bx,by);
    check(visualSegmentClear(rect,100,35,100,10),"unobstructed interior stream");
    check(!visualSegmentClear(rect,100,20,100,-10),"opening must terminate in void");
    check(!visualSegmentClear(rect,30,20,30,-10),"solid wall blocks streak");
    check(!visualSegmentClear(poly,55,140,145,140),"concave gap blocks swept streak");
    // A fan rotating or being removed must discard its old visual trajectory.
    const sourceChanged = (oldAngle:number,newAngle:number):boolean =>
        Math.abs(Math.atan2(Math.sin(oldAngle-newAngle),Math.cos(oldAngle-newAngle))) > 0.045;
    check(sourceChanged(0,Math.PI/2),"rotated fan invalidates old streaks");
    check(!sourceChanged(0,0),"stationary fan retains valid streaks");

}

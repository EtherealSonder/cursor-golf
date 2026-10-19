import { fractionOutsideFootprint, type CourseFootprint } from "../level/CourseBoundaryFootprintQuery";
import { buildCourseGeometry } from "../level/CourseGeometryBuilder";
import { CourseEnvironmentBoundary } from "../level/CourseEnvironmentBoundary";
import { CourseGeometrySpatialIndex } from "../level/CourseGeometrySpatialIndex";
import { getCourseBoundaryIntersections, getCourseWallIntersections, containsCoursePoint } from "../level/CourseGeometryQueries";
import type { LevelCourseDefinition } from "../level/LevelDefinition";

/** Deterministic exact-reference equivalence, including concave geometry and openings. */
export function assertCourseGeometryAccelerationValidation():void {
    const courses: LevelCourseDefinition[] = [
        {type:"rectangle",width:200,height:120,baseSurface:"grass",openings:[{side:"top",start:80,end:120}]},
        {type:"polygon",width:200,height:200,baseSurface:"grass",vertices:[{x:0,y:0},{x:200,y:0},{x:200,y:200},{x:130,y:200},{x:130,y:70},{x:70,y:70},{x:70,y:200},{x:0,y:200}],openings:[{edgeIndex:0,start:80,end:120},{edgeIndex:2,start:20,end:50}]},
        {type:"polygon",width:200,height:200,baseSurface:"grass",vertices:[{x:100,y:0},{x:200,y:100},{x:100,y:200},{x:0,y:100}],openings:[]},
    ];
    let seed=123456789;
    const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(const course of courses) {
        const geometry=buildCourseGeometry(course,{x:350,y:-120});
        const boundary=new CourseEnvironmentBoundary(geometry);
        const index=new CourseGeometrySpatialIndex(geometry);
        for(let i=0;i<1000;i++) {
            const a={x:330+rand()*240,y:-140+rand()*240};
            const b={x:330+rand()*240,y:-140+rand()*240};
            const exactBoundary=getCourseBoundaryIntersections(geometry,a,b);
            const indexedBoundary=getCourseBoundaryIntersections(geometry,a,b,index);
            const exactWall=getCourseWallIntersections(geometry,a,b);
            const indexedWall=getCourseWallIntersections(geometry,a,b,index);
            if(JSON.stringify(exactBoundary)!==JSON.stringify(indexedBoundary) || JSON.stringify(exactWall)!==JSON.stringify(indexedWall))
                throw new Error(`[P1] segment intersection mismatch for sample ${i}`);
            if(boundary.containsPoint(a.x,a.y)!==containsCoursePoint(geometry,a))
                throw new Error(`[P1] point containment mismatch for sample ${i}`);
            if (i < 150) {
                const footprints: CourseFootprint[] = [
                    {kind:"circle",x:a.x,y:a.y,radius:1+rand()*30},
                    {kind:"rectangle",x:a.x,y:a.y,width:1+rand()*40,height:1+rand()*35,rotationRadians:rand()*Math.PI*2},
                ];
                for (const footprint of footprints) {
                    const expected = fractionOutsideFootprint((x,y)=>containsCoursePoint(geometry,{x,y}),footprint);
                    const actual = boundary.fractionOutside(footprint);
                    if (Math.abs(expected-actual)>1e-12) throw new Error(`[O1-B] footprint equivalence mismatch for sample ${i}: ${actual} vs ${expected}`);
                }
            }
            const size=8;
            const x=Math.floor(a.x/size)*size,y=Math.floor(a.y/size)*size;
            for(const policy of ["center","full"] as const) {
                const result=boundary.isValidCell(x,y,size,policy);
                if(result!==boundary.isValidCell(x,y,size,policy)) throw new Error("[P1] cached cell mismatch");
            }
        }
    }
}

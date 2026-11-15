import assert from "node:assert/strict";
import { identifyFigmaObject } from "./FigmaObjectRegistry";
import { loadLevelDefinition } from "../../src/core/game/level/LevelLoader";
assert.equal(identifyFigmaObject("camera_point_12")?.index,12);
assert.equal(identifyFigmaObject("camera_point_0"),null);
const base={version:1,id:"level-01",name:"Test",course:{type:"rectangle",width:500,height:500,baseSurface:"grass",openings:[]},ball:{x:50,y:50},hole:{x:450,y:450},terrain:[],objects:[]};
for (const points of [[],[{id:"camera-point-1",index:1,x:100,y:120}], [{id:"camera-point-2",index:2,x:200,y:200}]]) {
 const loaded=loadLevelDefinition({...base,cameraPoints:points},{worldOrigin:{x:10,y:20}});
 assert.equal(loaded.ok,points.length===0 || points[0].index===1);
 if(loaded.ok && points.length) assert.deepEqual([loaded.level.cameraPoints?.[0].x,loaded.level.cameraPoints?.[0].y],[110,140]);
}
const duplicate=loadLevelDefinition({...base,cameraPoints:[{id:"camera-point-1",index:1,x:100,y:120},{id:"camera-point-1",index:1,x:120,y:120}]},{worldOrigin:{x:0,y:0}});
assert.equal(duplicate.ok,false);
console.log("Camera point naming, missing/duplicate indices, coordinate conversion and zero-waypoint fallback passed");

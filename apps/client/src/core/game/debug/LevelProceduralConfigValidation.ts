import { generateProceduralRocks } from "../procedural/ProceduralRockPlacementController";
import type { GeneratedCourseGeometry } from "../level/LevelRuntimeDefinition";
import { parseLevelProceduralConfig } from "../level/LevelProceduralConfig";
/** Lightweight DEV regression assertions; no browser or scene dependencies. */
export function assertLevelProceduralConfigValidation(): void {
    const check=(ok:boolean,msg:string)=>{if(!ok)throw new Error(`[ProceduralConfig regression] ${msg}`);};
    const disabled=parseLevelProceduralConfig({sand:{mode:"disabled"},marbles:{mode:"disabled"},rocks:{mode:"disabled"}});
    check(disabled.sand.mode==="disabled" && disabled.marbles.mode==="disabled" && disabled.rocks.mode==="disabled","disabled modes");
    const fixed=parseLevelProceduralConfig({sand:{mode:"fixed",density:"low"},marbles:{mode:"fixed",count:3},rocks:{mode:"fixed",boulderCount:2,smallRockCount:0}});
    check(fixed.marbles.count===3 && fixed.rocks.boulderCount===2 && fixed.sand.density==="low","fixed modes");
    const random=parseLevelProceduralConfig({rocks:{mode:"random",boulderRatio:0.35,areaPerRock:180000}});
    check(random.rocks.boulderRatio===0.35 && random.rocks.areaPerRock===180000,"random density");
    const geometry = { vertices:[{x:0,y:0},{x:500,y:0},{x:500,y:500},{x:0,y:500}],
        bounds:{minimumX:0,maximumX:500,minimumY:0,maximumY:500},edges:[],wallSegments:[] } as GeneratedCourseGeometry;
    const authored = [{x:250,y:250,radius:100}];
    const contains = (x:number,y:number,r:number)=>x-r>=0 && y-r>=0 && x+r<=500 && y+r<=500;
    const none = generateProceduralRocks(geometry,disabled.rocks,authored,contains,()=>0.5);
    check(none.placed===0 && authored.length===1,"disabled rocks preserve authored objects");
    const generated = generateProceduralRocks(geometry,fixed.rocks,authored,contains,()=>Math.random());
    check(generated.placements.every(o=>contains(o.x,o.y,o.radius+18) && Math.hypot(o.x-250,o.y-250)>=o.radius+100+20),"rock placement boundaries and authored clearance");
    for(const bad of [{rocks:{mode:"fixed",boulderRadius:{min:50,max:10}}},{marbles:{mode:"invalid"}},{sand:{mode:"fixed",targetCoverage:{low:2}}}]) {
        let rejected=false;try{parseLevelProceduralConfig(bad);}catch{rejected=true;}
        check(rejected,"invalid configuration rejected");
    }
}

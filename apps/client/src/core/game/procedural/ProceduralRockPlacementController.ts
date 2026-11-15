import type { GeneratedCourseGeometry } from "../level/LevelRuntimeDefinition";
import type { RockGenerationConfig } from "../level/LevelProceduralConfig";
import { polygonArea } from "../marble/ProceduralMarblePlacementController";
import { sampleSmallRockRadius } from "../config/RockSizeDistributionDefinition";
import { RockPresentationType } from "../entities/props/RockPresentationType";

export interface RockPlacement { id: string; x: number; y: number; radius: number; seed: number; type: RockPresentationType }
export interface RockOccupied { x: number; y: number; radius: number }
export interface RockGenerationResult { placements: RockPlacement[]; target: number; placed: number }
/** Geometry containment is supplied by World to preserve its authoritative polygon collision rules. */
export function generateProceduralRocks(geometry: GeneratedCourseGeometry, config: RockGenerationConfig,
    occupiedInput: readonly RockOccupied[], containsCircle: (x:number,y:number,radius:number)=>boolean,
    random:()=>number = Math.random, rollPercent = 100): RockGenerationResult {
    if (config.mode === "disabled") return {placements:[],target:0,placed:0};
    const total = config.mode === "fixed"
        ? config.boulderCount + config.smallRockCount
        : Math.min(config.maximum, Math.round(polygonArea(geometry.vertices)/config.areaPerRock * Math.max(0,Math.min(100,rollPercent))/100));
    const boulders = config.mode === "fixed" ? config.boulderCount : Math.round(total*config.boulderRatio);
    const occupied = [...occupiedInput];
    const placements: RockPlacement[] = [];
    const {minimumX,maximumX,minimumY,maximumY} = geometry.bounds;
    for (let i=0;i<total;i++) {
        const large = i<boulders;
        const radius = large ? config.boulderRadius.min+random()*(config.boulderRadius.max-config.boulderRadius.min)
            : sampleSmallRockRadius(random, config.smallRockRadius);
        for (let attempt=0;attempt<300;attempt++) {
            const x=minimumX+random()*(maximumX-minimumX), y=minimumY+random()*(maximumY-minimumY);
            if (!containsCircle(x,y,radius+18)) continue;
            if (occupied.some(o=>Math.hypot(x-o.x,y-o.y)<radius+o.radius+20)) continue;
            placements.push({id:`procedural-rock-${i}`,x,y,radius,seed:Math.floor(random()*1000000),type:large?RockPresentationType.Boulder:RockPresentationType.SmallRock});
            occupied.push({x,y,radius});
            break;
        }
    }
    if (import.meta.env.DEV && placements.length<total) console.warn(`[ProceduralRocks] Placed ${placements.length}/${total}; course geometry or exclusions prevented the remainder`);
    return {placements,target:total,placed:placements.length};
}

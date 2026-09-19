import { BallWaterDepthSeverity } from "../physics/water/BallWaterDepthSeverity";
import { createBallWaterContactProfile } from "../physics/water/BallWaterContactProfile";
import { BallWaterTraversalVfx } from "../water-vfx/BallWaterTraversalVfx";

export class BallWaterTraversalVfxValidation {
    private static hasRun=false;
    public run():void {
        if(BallWaterTraversalVfxValidation.hasRun)return;
        BallWaterTraversalVfxValidation.hasRun=true;
        console.log("[8I-8E] BALL WATER TRAVERSAL VFX");
        const wet=createBallWaterContactProfile(0.08,0.65,0.8,0.7,BallWaterDepthSeverity.Deep,0.2);
        const dry=createBallWaterContactProfile(0,0,0,0,BallWaterDepthSeverity.Dry,0);
        const make=()=>new BallWaterTraversalVfx(null,{emissionSpacing:7,minimumSpeed:8,minimumCoverage:0.01,minimumExposure:0.01,maximumPulsesPerUpdate:8});
        const r:boolean[]=[]; let e=make();
        e.update({x:0,y:0,velocityX:100,velocityY:0,speed:100,contactProfile:wet});
        r.push(this.check("Sub-spacing movement emits nothing",e.update({x:4,y:0,velocityX:100,velocityY:0,speed:100,contactProfile:wet})===0));
        r.push(this.check("Crossing spacing threshold emits disturbance",e.update({x:8,y:0,velocityX:100,velocityY:0,speed:100,contactProfile:wet})===1));
        e=make(); e.update({x:0,y:0,velocityX:300,velocityY:0,speed:300,contactProfile:wet});
        r.push(this.check("Long movement segment emits multiple disturbances",e.update({x:35,y:0,velocityX:300,velocityY:0,speed:300,contactProfile:wet})===5));
        e=make(); e.update({x:0,y:0,velocityX:100,velocityY:0,speed:100,contactProfile:dry});
        r.push(this.check("Dry contact emits nothing",e.update({x:30,y:0,velocityX:100,velocityY:0,speed:100,contactProfile:dry})===0));
        e=make(); e.update({x:0,y:0,velocityX:0,velocityY:0,speed:0,contactProfile:wet});
        r.push(this.check("Stationary Ball emits nothing",e.update({x:0,y:0,velocityX:0,velocityY:0,speed:0,contactProfile:wet})===0));
        e=make(); e.update({x:0,y:0,velocityX:100,velocityY:0,speed:100,contactProfile:wet});
        e.update({x:5,y:0,velocityX:100,velocityY:0,speed:100,contactProfile:wet});
        e.update({x:5,y:0,velocityX:0,velocityY:0,speed:0,contactProfile:dry});
        r.push(this.check("Leaving Water resets accumulated traversal distance",e.getAccumulatedDistance()===0));
        e.update({x:100,y:0,velocityX:100,velocityY:0,speed:100,contactProfile:wet});
        r.push(this.check("Re-entry starts fresh",e.update({x:105,y:0,velocityX:100,velocityY:0,speed:100,contactProfile:wet})===0));
        e.reset(); r.push(this.check("Reset clears traversal state",e.getAccumulatedDistance()===0&&e.getEmittedPulseCount()===0));
        console.log(`[8I-8E] RESULT: ${r.every(Boolean)?"PASS":"FAIL"}`);
    }
    private check(label:string,passed:boolean):boolean { console.log(`[8I-8E] ${label}: ${passed?"PASS":"FAIL"}`); return passed; }
}

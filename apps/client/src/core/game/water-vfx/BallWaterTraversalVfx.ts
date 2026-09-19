import type { BallWaterContactProfile } from "../physics/water/BallWaterContactProfile";
import type { WaterImpactVfxSystem } from "./WaterImpactVfxSystem";

export interface BallWaterTraversalSample {
    readonly x: number; readonly y: number;
    readonly velocityX: number; readonly velocityY: number;
    readonly speed: number;
    readonly contactProfile: Readonly<BallWaterContactProfile> | null;
}
export interface BallWaterTraversalVfxDefinition {
    readonly emissionSpacing: number;
    readonly minimumSpeed: number;
    readonly minimumCoverage: number;
    readonly minimumExposure: number;
    readonly maximumPulsesPerUpdate: number;
}
export const DEFAULT_BALL_WATER_TRAVERSAL_VFX_DEFINITION: BallWaterTraversalVfxDefinition = {
    emissionSpacing: 9, minimumSpeed: 8, minimumCoverage: 0.01,
    minimumExposure: 0.01, maximumPulsesPerUpdate: 8,
};

/** 8I-8E presentation-only distance-driven Ball Water traversal emitter. */
export class BallWaterTraversalVfx {
    private previousX = 0; private previousY = 0;
    private hasPreviousPosition = false;
    private accumulatedDistance = 0;
    private emittedPulseCount = 0; private seedCounter = 0;

    public constructor(
        private readonly impactVfxSystem: WaterImpactVfxSystem | null,
        private readonly definition: BallWaterTraversalVfxDefinition =
            DEFAULT_BALL_WATER_TRAVERSAL_VFX_DEFINITION,
    ) {}

    public update(sample: Readonly<BallWaterTraversalSample>): number {
        if (!this.isFiniteSample(sample)) { this.resetTracking(); return 0; }
        const wet = this.hasMeaningfulContact(sample.contactProfile);
        if (!wet || sample.speed < this.definition.minimumSpeed) {
            this.previousX = sample.x; this.previousY = sample.y;
            this.hasPreviousPosition = wet; this.accumulatedDistance = 0;
            return 0;
        }
        if (!this.hasPreviousPosition) {
            this.previousX = sample.x; this.previousY = sample.y;
            this.hasPreviousPosition = true; this.accumulatedDistance = 0; return 0;
        }
        const sx=this.previousX, sy=this.previousY;
        const dx=sample.x-sx, dy=sample.y-sy, distance=Math.hypot(dx,dy);
        this.previousX=sample.x; this.previousY=sample.y;
        if (!Number.isFinite(distance) || distance <= 0.0001) return 0;

        const spacing=Math.max(1,this.definition.emissionSpacing);
        let next=spacing-this.accumulatedDistance, count=0;
        while (next <= distance+0.0001 && count < this.definition.maximumPulsesPerUpdate) {
            const t=Math.max(0,Math.min(1,next/distance));
            this.emitPulse(sx+dx*t,sy+dy*t,sample);
            count++; this.emittedPulseCount++; next += spacing;
        }
        const total=this.accumulatedDistance+distance;
        this.accumulatedDistance = count >= this.definition.maximumPulsesPerUpdate && next <= distance+0.0001
            ? total % spacing
            : Math.max(0,Math.min(spacing-0.0001,total-count*spacing));
        return count;
    }

    public reset(): void { this.resetTracking(); this.emittedPulseCount=0; this.seedCounter=0; }
    public getEmittedPulseCount(): number { return this.emittedPulseCount; }
    public getAccumulatedDistance(): number { return this.accumulatedDistance; }

    private emitPulse(x:number,y:number,s:Readonly<BallWaterTraversalSample>):void {
        const p=s.contactProfile; if(!p) return;
        this.impactVfxSystem?.emitTraversalDisturbance({
            x,y,directionX:s.velocityX,directionY:s.velocityY,speed:Math.max(0,s.speed),
            normalizedDepth:this.clamp01(p.normalizedDepth),coverage:this.clamp01(p.coverage),
            exposure:this.clamp01(p.exposure),normalizedSpeed:this.clamp01(s.speed/500),
            seed:this.seed(x,y),
        });
    }
    private hasMeaningfulContact(p:Readonly<BallWaterContactProfile>|null):boolean {
        return !!p && p.coverage >= this.definition.minimumCoverage &&
            (p.exposure >= this.definition.minimumExposure || p.normalizedDepth > 0);
    }
    private isFiniteSample(s:Readonly<BallWaterTraversalSample>):boolean {
        return Number.isFinite(s.x)&&Number.isFinite(s.y)&&Number.isFinite(s.velocityX)&&
            Number.isFinite(s.velocityY)&&Number.isFinite(s.speed);
    }
    private resetTracking():void { this.previousX=0;this.previousY=0;this.hasPreviousPosition=false;this.accumulatedDistance=0; }
    private seed(x:number,y:number):number {
        this.seedCounter=(this.seedCounter+1)>>>0;
        return (Math.imul(Math.round(x*10),73856093)^Math.imul(Math.round(y*10),19349663)^
            Math.imul(this.seedCounter,83492791))>>>0;
    }
    private clamp01(v:number):number { return Number.isFinite(v)?Math.max(0,Math.min(1,v)):0; }
}

import { OVERDRIVE_VFX as C, type OverdriveSourceKind } from "./OverdriveVfxConfig";
import type { OverdriveVfxParticle } from "./OverdriveVfxParticle";
export interface OverdriveVfxSource {
    readonly kind: OverdriveSourceKind;
    readonly getX: () => number;
    readonly getY: () => number;
    readonly isActive?: () => boolean;
    readonly getAngle?: () => number;
    readonly radius: number;
    readonly halfWidth?: number;
    readonly halfHeight?: number;
}
/** Deterministic per-source RNG. No Math.random or temporary vectors. */
export class OverdriveVfxEmitter {
    public accumulator = 0;
    private seed: number;
    constructor(public readonly source: OverdriveVfxSource, seed: number) {this.seed = seed || 1;}
    private random(): number {let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
    public emit(p: OverdriveVfxParticle, sourceIndex: number, x: number, y: number): void {
        const s=this.source;const angle=this.random()*Math.PI*2;
        const dist=Math.sqrt(this.random());
        let dx=Math.cos(angle)*dist*s.radius,dy=Math.sin(angle)*dist*s.radius;
        if (s.kind === "conveyor") {
            const a=s.getAngle?.()??0,localX=(this.random()*2-1)*(s.halfWidth??s.radius),localY=(this.random()*2-1)*(s.halfHeight??s.radius);
            dx=localX*Math.cos(a)-localY*Math.sin(a);dy=localX*Math.sin(a)+localY*Math.cos(a);
        } else if (s.kind === "rotator" || s.kind === "paddle" || s.kind === "directionalBumper") {
            const a=(s.getAngle?.()??0)+(this.random()<0.5?0:Math.PI);
            const along=(0.2+0.8*this.random())*s.radius;
            dx=Math.cos(a)*along+(this.random()-.5)*12;dy=Math.sin(a)*along+(this.random()-.5)*12;
        }
        p.sourceIndex=sourceIndex;p.x=x+dx;p.baseX=p.x;p.y=y+dy;p.age=0;
        p.life=C.minLife+this.random()*(C.maxLife-C.minLife);
        p.rise=C.minRise+this.random()*(C.maxRise-C.minRise);
        p.phase=this.random()*Math.PI*2;p.frequency=5+this.random()*5;p.amplitude=2+this.random()*5;
        const sprite=p.sprite;sprite.tint=this.random()<0.2?C.highlight:C.primary;
        const size=C.minSize+this.random()*(C.maxSize-C.minSize);sprite.width=size;sprite.height=size;sprite.alpha=0;
        sprite.position.set(p.x,p.y);
    }
    public advanceEmission(dt: number): number {this.accumulator=Math.min(2,this.accumulator+dt*C.emissionRate);const count=Math.floor(this.accumulator);this.accumulator-=count;return count;}
}

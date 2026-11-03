import type { Container } from "pixi.js";
import { OVERDRIVE_VFX as C } from "./OverdriveVfxConfig";
import { OverdriveVfxPool } from "./OverdriveVfxPool";
import { OverdriveVfxEmitter, type OverdriveVfxSource } from "./OverdriveVfxEmitter";
export class OverdriveVfxSystem {
    private readonly pool: OverdriveVfxPool;
    private readonly emitters: OverdriveVfxEmitter[]=[];
    private enabled=false;
    private counts = new Uint8Array(0);
    constructor(renderer: { generateTexture: (source: import("pixi.js").Graphics) => import("pixi.js").Texture }, layer: Container) {
        this.pool=new OverdriveVfxPool(renderer);layer.addChild(this.pool.container);
    }
    public register(source: OverdriveVfxSource): void {this.emitters.push(new OverdriveVfxEmitter(source, (0x9e3779b9 ^ (this.emitters.length+1)*2654435761)>>>0));this.counts=new Uint8Array(this.emitters.length);}
    public setEnabled(enabled: boolean): void {this.enabled=enabled;}
    public update(dt: number, left: number, top: number, width: number, height: number): void {
        if (!Number.isFinite(dt)||dt<=0)return;
        const step=Math.min(C.maxDelta,dt);
        const counts=this.counts;counts.fill(0);
        for (const p of this.pool.particles) if(p.active){
            p.age+=step;
            if(p.age>=p.life){p.active=false;p.sprite.visible=false;continue;}
            if(p.sourceIndex>=0&&p.sourceIndex<counts.length)counts[p.sourceIndex]++;
            p.y-=p.rise*step;p.phase+=p.frequency*step;
            p.x=p.baseX+Math.sin(p.phase)*p.amplitude;
            const t=p.age/p.life;
            p.sprite.position.set(p.x,p.y);
            p.sprite.alpha=Math.min(1,t*7)*Math.min(1,(1-t)*3)*0.85;
        }
        if(!this.enabled)return;
        const right=left+width,bottom=top+height;
        for(let i=0;i<this.emitters.length;i++){
            const emitter=this.emitters[i],s=emitter.source;
            if(s.isActive&&!s.isActive()){emitter.accumulator=0;continue;}
            const x=s.getX(),y=s.getY(),radius=s.radius+C.cullMargin;
            if(!Number.isFinite(x)||!Number.isFinite(y)||x+radius<left||x-radius>right||y+radius<top||y-radius>bottom){emitter.accumulator=0;continue;}
            const due=emitter.advanceEmission(step);
            for(let n=0;n<due&&counts[i]<C.perSourceCap;n++){
                const p=this.pool.acquire();if(!p)break;
                emitter.emit(p,i,x,y);counts[i]++;
            }
        }
    }
    public destroy():void{this.pool.destroy();this.emitters.length=0;}
}

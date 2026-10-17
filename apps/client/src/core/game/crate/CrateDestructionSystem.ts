import type { Container, Texture } from "pixi.js";
import { CrateSmokeAnimation } from "./CrateSmokeAnimation";
export class CrateDestructionSystem {
    private readonly active = new Set<CrateSmokeAnimation>();
    private textures: Texture[] | null = null;
    private disposed = false;
    private readonly pending: {x:number;y:number}[] = [];
    public constructor(private readonly parent: Container) {
        void CrateSmokeAnimation.loadTextures().then(textures => {
            if (this.disposed) return;
            this.textures = textures;
            for (const position of this.pending.splice(0)) this.spawn(position.x,position.y);
        }).catch(error => console.error("Crate smoke textures failed to load",error));
    }
    public spawn(x:number,y:number):void {
        if (this.disposed) return;
        if (!this.textures) { this.pending.push({x,y}); return; }
        this.active.add(new CrateSmokeAnimation(this.parent,this.textures,x,y));
    }
    public update():void { for (const effect of this.active) if (effect.isComplete) this.active.delete(effect); }
    public get activeCount():number { return this.active.size + this.pending.length; }
    public destroy():void { this.disposed = true; this.pending.length = 0; for (const effect of this.active) effect.destroy(); this.active.clear(); }
}

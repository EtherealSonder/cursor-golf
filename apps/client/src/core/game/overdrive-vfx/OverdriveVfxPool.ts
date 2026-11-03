import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { OVERDRIVE_VFX as C } from "./OverdriveVfxConfig";
import type { OverdriveVfxParticle } from "./OverdriveVfxParticle";
/** One texture, fixed sprites, no per-emission Pixi allocations. */
export class OverdriveVfxPool {
    public readonly container = new Container();
    public readonly particles: OverdriveVfxParticle[] = [];
    private readonly texture: Texture;
    private next = 0;
    constructor(renderer: { generateTexture: (source: Graphics) => Texture }) {
        const graphic = new Graphics().circle(4, 4, 3.5).fill(0xffffff);
        this.texture = renderer.generateTexture(graphic);
        graphic.destroy();
        this.container.label = "OverdriveVfx";
        for (let i = 0; i < C.capacity; i++) {
            const sprite = new Sprite(this.texture);
            sprite.anchor.set(0.5);
            sprite.visible = false;
            this.container.addChild(sprite);
            this.particles.push({sprite,active:false,sourceIndex:-1,x:0,y:0,baseX:0,age:0,life:1,rise:0,phase:0,frequency:0,amplitude:0});
        }
    }
    public acquire(): OverdriveVfxParticle | null {
        for (let i = 0; i < this.particles.length; i++) {
            const index = (this.next + i) % this.particles.length;
            const p = this.particles[index];
            if (!p.active) { this.next = (index + 1) % this.particles.length; p.active = true; p.sprite.visible = true; return p; }
        }
        return null;
    }
    public clear(): void { for (const p of this.particles) {p.active=false;p.sprite.visible=false;p.sourceIndex=-1;} }
    public destroy(): void { this.clear();this.container.destroy({children:true});this.texture.destroy(true); }
}

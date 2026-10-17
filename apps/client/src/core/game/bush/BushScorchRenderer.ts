import { Assets, Sprite, type Container, type Texture } from "pixi.js";
import bushTextureUrl from "../../../assets/sprites/environment/bush.png";
import type { Bush } from "./Bush";
import { BUSH_FIRE } from "./BushFireDefinition";
/** Exact PNG alpha silhouette, not the simplified collision or navigation circle. */
export class BushScorchRenderer {
    private readonly marks: Sprite[] = [];
    private texture: Texture | null = null;
    public constructor(private readonly ground: Container) {}
    public async stamp(bush: Bush): Promise<void> {
        const texture = this.texture ?? await Assets.load<Texture>(bushTextureUrl);
        this.texture = texture;
        if (this.ground.destroyed) return;
        const sprite = new Sprite(texture);
        sprite.anchor.set(.5);
        sprite.position.set(bush.x,bush.y);
        sprite.width = bush.geometry.size; sprite.height = bush.geometry.size;
        sprite.rotation = bush.geometry.rotation;
        sprite.tint = BUSH_FIRE.scorchColor;
        sprite.eventMode = "none";
        this.ground.addChild(sprite); this.marks.push(sprite);
    }
    public destroy(): void { for (const mark of this.marks) if (!mark.destroyed) mark.destroy(); this.marks.length=0; }
}

import { AnimatedSprite, Assets, type Container, type Texture } from "pixi.js";
import smoke1 from "../../../assets/sprites/smoke/smoke_1.png";
import smoke2 from "../../../assets/sprites/smoke/smoke_2.png";
import smoke3 from "../../../assets/sprites/smoke/smoke_3.png";
import smoke4 from "../../../assets/sprites/smoke/smoke_4.png";
import smoke5 from "../../../assets/sprites/smoke/smoke_5.png";
import smoke6 from "../../../assets/sprites/smoke/smoke_6.png";
import smoke7 from "../../../assets/sprites/smoke/smoke_7.png";
import smoke8 from "../../../assets/sprites/smoke/smoke_8.png";
import smoke9 from "../../../assets/sprites/smoke/smoke_9.png";
import { CRATE_DESTRUCTION } from "./CrateDestructionDefinition";
const URLs = [smoke1,smoke2,smoke3,smoke4,smoke5,smoke6,smoke7,smoke8,smoke9];
export class CrateSmokeAnimation {
    private sprite: AnimatedSprite | null = null;
    private done = false;
    public static async loadTextures(): Promise<Texture[]> { return Promise.all(URLs.map(url => Assets.load<Texture>(url))); }
    public constructor(parent: Container, textures: Texture[], x: number, y: number) {
        if (parent.destroyed || textures.length !== 9) { this.done = true; return; }
        const sprite = new AnimatedSprite(textures);
        sprite.anchor.set(0.5);
        sprite.position.set(x,y);
        sprite.width = CRATE_DESTRUCTION.smokeSize;
        sprite.height = CRATE_DESTRUCTION.smokeSize;
        sprite.animationSpeed = CRATE_DESTRUCTION.smokeFramesPerSecond / 60;
        sprite.loop = false;
        sprite.eventMode = "none";
        sprite.onComplete = () => { this.done = true; this.destroy(); };
        parent.addChild(sprite);
        this.sprite = sprite;
        sprite.play();
    }
    public get isComplete(): boolean { return this.done; }
    public destroy(): void { this.done = true; this.sprite?.destroy(); this.sprite = null; }
}

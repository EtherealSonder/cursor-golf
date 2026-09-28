import { Container, Sprite } from "pixi.js";
import type { ProximityMineExplosionEvent } from "../config/ProximityMineExplosionDefinition";
import { PROXIMITY_MINE_EXPLOSION_VFX as VFX, type ExplosionIllustratedMask } from "../config/ProximityMineExplosionVfxDefinition";
import { ExplosionInstance } from "./ExplosionInstance";
import type { ExplosionTextureSet } from "./ExplosionTextureSet";
/** Static PM-2C gallery and independent, pooled PM-2D animated instances. */
export class ExplosionRenderer {
    private readonly root = new Container();
    private readonly gallery = new Container();
    private readonly sprites = new Map<ExplosionIllustratedMask, Sprite>();
    private readonly active: ExplosionInstance[] = [];
    private readonly pool: ExplosionInstance[] = [];
    private readonly textures: ExplosionTextureSet;
    public constructor(textures: ExplosionTextureSet) {
        this.textures = textures;
        this.root.label = "ExplosionVfx";
        this.root.sortableChildren = true;
        this.gallery.label = "ExplosionVfx:staticPreview";
        this.gallery.zIndex = 100;
        this.root.addChild(this.gallery);
        const entries: readonly [ExplosionIllustratedMask, typeof textures.fireBody][] = [
            ["fireBody", textures.fireBody], ["blastRing", textures.blastRings[0]],
            ["pressureRing", textures.pressureRing], ["ignition", textures.ignition],
            ["flameFragment", textures.flameFragment], ["ember", textures.ember],
        ];
        for (const [name, texture] of entries) {
            const definition = VFX.layers[name];
            const sprite = new Sprite(texture);
            sprite.label = `ExplosionVfx:preview:${name}`;
            sprite.anchor.set(0.5);
            sprite.width = definition.size;
            sprite.height = definition.size;
            sprite.tint = definition.tint;
            sprite.zIndex = definition.order;
            sprite.visible = false;
            this.gallery.addChild(sprite);
            this.sprites.set(name, sprite);
        }
    }
    /** Inspect any approved blast ring without affecting active animations. */
    public setPreviewBlastRingVariation(index: 0 | 1 | 2): void {
        this.getMaskSprite("blastRing").texture = this.textures.blastRings[index];
    }
    public getContainer(): Container { return this.root; }
    public getMaskSprite(name: ExplosionIllustratedMask): Sprite {
        const sprite = this.sprites.get(name);
        if (!sprite) throw new Error(`Missing explosion preview sprite: ${name}`);
        return sprite;
    }
    public hideAll(): void { for (const sprite of this.sprites.values()) sprite.visible = false; }
    /** Physics has already been applied by World before this method is called. */
    public detonate(event: ProximityMineExplosionEvent): void {
        if (this.active.length >= VFX.maxActiveExplosions) {
            // Bounded visual capacity never suppresses or modifies physical detonation.
            const oldest = this.active.shift()!;
            oldest.stop();
            this.pool.push(oldest);
        }
        const instance = this.pool.pop() ?? new ExplosionInstance(this.textures);
        if (!instance.container.parent) {
            instance.container.zIndex = 0;
            this.root.addChild(instance.container);
        }
        instance.start(event);
        this.active.push(instance);
    }
    public update(deltaSeconds: number): void {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const instance = this.active[i];
            instance.update(deltaSeconds);
            if (!instance.isActive()) {
                this.active.splice(i, 1);
                if (this.pool.length < VFX.maxPooledExplosions) this.pool.push(instance);
                else instance.destroy();
            }
        }
    }
    public getActiveCount(): number { return this.active.length; }
    public getPooledCount(): number { return this.pool.length; }
    public destroy(): void {
        for (const instance of [...this.active, ...this.pool]) instance.destroy();
        this.active.length = 0;
        this.pool.length = 0;
        this.root.removeFromParent();
        // AssetLoader owns shared textures; only destroy sprites and containers.
        this.root.destroy({ children: true, texture: false, textureSource: false });
        this.sprites.clear();
    }
}

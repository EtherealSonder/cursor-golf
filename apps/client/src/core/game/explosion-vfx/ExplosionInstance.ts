import { Container, Sprite } from "pixi.js";
import type { ProximityMineExplosionEvent } from "../config/ProximityMineExplosionDefinition";
import { PROXIMITY_MINE_EXPLOSION_VFX as VFX } from "../config/ProximityMineExplosionVfxDefinition";
import { hashUnit, layerState, particleState } from "./ExplosionAnimation";
import type { ExplosionTextureSet } from "./ExplosionTextureSet";

type LayerName = "ignition" | "fireBody" | "blastRing" | "pressureRing";
const LAYERS: readonly LayerName[] = ["ignition", "fireBody", "blastRing", "pressureRing"];
interface Particle { sprite: Sprite; angle: number; speed: number; spin: number; size: number; spawnRadius: number; spawnDelay: number; }
/** A single reusable, presentation-only explosion. All textures are shared. */
export class ExplosionInstance {
    public readonly container = new Container();
    private readonly layers = new Map<LayerName, Sprite>();
    private readonly fragments: Particle[] = [];
    private readonly embers: Particle[] = [];
    private readonly blastRingTextures: ExplosionTextureSet["blastRings"];
    private detonationSequence = 0;
    private elapsed: number = VFX.totalDuration;
    private active = false;
    public constructor(textures: ExplosionTextureSet) {
        this.container.label = "ExplosionVfx:instance";
        this.blastRingTextures = textures.blastRings;
        this.container.sortableChildren = true;
        for (const name of LAYERS) {
            const sprite = new Sprite(name === "blastRing" ? textures.blastRings[0] : textures[name as Exclude<LayerName, "blastRing">]);
            sprite.anchor.set(0.5);
            sprite.tint = VFX.layers[name].tint;
            sprite.zIndex = VFX.layers[name].order;
            sprite.visible = false;
            this.container.addChild(sprite);
            this.layers.set(name, sprite);
        }
        const addParticles = (texture: typeof textures.ember, count: number, type: "flameFragment" | "ember", destination: Particle[]) => {
            for (let i = 0; i < count; i++) {
                const sprite = new Sprite(texture);
                // Correct the source PNG's off-center opaque silhouette. This ensures
                // the visible flame begins at (0, 0), i.e. the mine's detonation point.
                if (type === "flameFragment") {
                    sprite.anchor.set(VFX.flameFragmentAnchor.x, VFX.flameFragmentAnchor.y);
                } else {
                    sprite.anchor.set(0.5);
                }
                sprite.tint = VFX.layers[type].tint;
                sprite.zIndex = VFX.layers[type].order;
                sprite.visible = false;
                this.container.addChild(sprite);
                destination.push({ sprite, angle: 0, speed: 0, spin: 0, size: VFX.layers[type].size, spawnRadius: 0, spawnDelay: 0 });
            }
        };
        addParticles(textures.flameFragment, VFX.fragmentCount, "flameFragment", this.fragments);
        addParticles(textures.ember, VFX.emberCount, "ember", this.embers);
        this.container.visible = false;
    }
    public start(event: ProximityMineExplosionEvent): void {
        this.active = true;
        this.elapsed = 0;
        this.container.position.set(event.x, event.y);
        this.container.visible = true;
        // The event determines location and identity. Blast physics never runs in this class.
        let seed = 0;
        for (const char of event.mineId) seed = (Math.imul(seed, 31) + char.charCodeAt(0)) | 0;
        // Re-select on every detonation, including reuse of a pooled instance.
        // The event ID gives stable variation; the sequence allows repeated IDs to vary.
        const variationSeed = seed + this.detonationSequence++ * 719;
        const ring = this.layers.get("blastRing")!;
        ring.texture = this.blastRingTextures[Math.min(
            this.blastRingTextures.length - 1,
            Math.floor(hashUnit(variationSeed + 911) * this.blastRingTextures.length),
        )];
        ring.rotation = (hashUnit(variationSeed + 929) * 2 - 1) * VFX.blastRingInitialRotationMax;
        const configure = (items: Particle[], min: number, max: number, spinMax: number, offset: number) => {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                // Even angular coverage, but enough jitter to avoid a mechanical star pattern.
                const base = (i + hashUnit(seed + offset + 101)) * Math.PI * 2 / items.length;
                item.angle = base + (hashUnit(seed + offset + i * 11) - 0.5) * (items === this.embers ? 0.58 : 0.48);
                item.speed = min + hashUnit(seed + offset + i * 17) * (max - min);
                item.spin = (hashUnit(seed + offset + i * 29) > 0.5 ? 1 : -1) * (0.45 + hashUnit(seed + offset + i * 31)) * spinMax;
                item.size = VFX.layers[items === this.fragments ? "flameFragment" : "ember"].size * (0.65 + hashUnit(seed + offset + i * 37) * 0.7);
                // Embers originate close to the blast, with slightly staggered departures.
                item.spawnRadius = items === this.embers
                    ? VFX.emberSpawnRadius.min + hashUnit(seed + offset + i * 43) * (VFX.emberSpawnRadius.max - VFX.emberSpawnRadius.min)
                    : 0;
                item.spawnDelay = items === this.embers
                    ? hashUnit(seed + offset + i * 47) * VFX.emberStaggerMax
                    : hashUnit(seed + offset + i * 47) * VFX.fragmentStaggerMax;
            }
        };
        configure(this.fragments, VFX.fragmentSpeed.min, VFX.fragmentSpeed.max, VFX.fragmentSpin, 13);
        configure(this.embers, VFX.emberSpeed.min, VFX.emberSpeed.max, VFX.emberSpin, 79);
        this.update(0);
    }
    public update(deltaSeconds: number): void {
        if (!this.active) return;
        this.elapsed += Math.max(0, deltaSeconds);
        if (this.elapsed >= VFX.totalDuration) { this.stop(); return; }
        for (const name of LAYERS) {
            const sprite = this.layers.get(name)!;
            const state = layerState(this.elapsed, VFX.timings[name]);
            sprite.visible = state.visible;
            sprite.alpha = state.alpha;
            sprite.width = VFX.layers[name].size * state.scale;
            sprite.height = VFX.layers[name].size * state.scale;
        }
        const animate = (items: Particle[], type: "flameFragment" | "ember") => {
            const timing = VFX.timings[type];
            for (const item of items) {
                const state = particleState(this.elapsed, timing.start, timing.end, item.speed, item.angle, item.spin, item.size, item.spawnRadius, item.spawnDelay, type === "flameFragment");
                item.sprite.visible = state.visible;
                item.sprite.position.set(state.x, state.y);
                item.sprite.rotation = state.rotation;
                item.sprite.alpha = state.alpha;
                item.sprite.width = state.size;
                item.sprite.height = state.size;
            }
        };
        animate(this.fragments, "flameFragment");
        animate(this.embers, "ember");
    }
    public isActive(): boolean { return this.active; }
    public stop(): void {
        this.active = false;
        this.container.visible = false;
        for (const sprite of this.layers.values()) sprite.visible = false;
        for (const item of [...this.fragments, ...this.embers]) item.sprite.visible = false;
    }
    public destroy(): void { this.container.destroy({ children: true, texture: false, textureSource: false }); }
}

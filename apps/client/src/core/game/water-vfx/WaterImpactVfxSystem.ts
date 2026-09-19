import { Container, type Texture } from "pixi.js";
import { DEFAULT_WATER_IMPACT_VFX_DEFINITION, type WaterImpactVfxDefinition } from "../config/WaterImpactVfxDefinition";
import { WaterImpactTier, type WaterImpactPresentationProfile } from "./WaterImpactIntensityModel";
import type { WaterImpactTextureSet } from "./WaterImpactTextureSet";
import { WaterImpactPrimitiveType, type WaterImpactParticleActivation } from "./WaterImpactVfxParticle";
import { WaterImpactVfxPool } from "./WaterImpactVfxPool";

export interface WaterImpactVfxRequest extends WaterImpactPresentationProfile {
    readonly x: number;
    readonly y: number;
    readonly seed: number;
    readonly directionalBias?: number;
}

/** Shared presentation-only composer for Fine/Medium/Heavy Water impacts. */
export class WaterImpactVfxSystem {
    private readonly groundContainer = new Container();
    private readonly airborneContainer = new Container();
    private readonly groundPool: WaterImpactVfxPool;
    private readonly airbornePool: WaterImpactVfxPool;
    private destroyed = false;

    public constructor(
        private readonly textures: WaterImpactTextureSet,
        private readonly definition: WaterImpactVfxDefinition = DEFAULT_WATER_IMPACT_VFX_DEFINITION,
    ) {
        this.groundPool = new WaterImpactVfxPool(
            textures.surfaceDisturbances[0],
            definition.impactGroundInitialCapacity,
            definition.impactGroundMaximumCapacity,
        );
        this.airbornePool = new WaterImpactVfxPool(
            textures.roundDroplets[0],
            definition.impactAirborneInitialCapacity,
            definition.impactAirborneMaximumCapacity,
        );
        this.groundContainer.addChild(this.groundPool.getContainer());
        this.airborneContainer.addChild(this.airbornePool.getContainer());
    }

    public getGroundContainer(): Container { return this.groundContainer; }
    public getAirborneContainer(): Container { return this.airborneContainer; }

    public emitImpact(request: WaterImpactVfxRequest): number {
        if (this.destroyed || request.normalizedIntensity <= 0) return 0;
        const random = this.makeRandom(request.seed);
        let emitted = 0;
        const intensity = this.clamp01(request.normalizedIntensity);
        const counts = request.tier === WaterImpactTier.Heavy
            ? { lobes: 5, droplets: 6 }
            : request.tier === WaterImpactTier.Medium
                ? { lobes: 3, droplets: 3 }
                : { lobes: 1, droplets: 1 };

        const baseDirection = Math.atan2(request.directionY, request.directionX);
        const fallbackDirection = -Math.PI / 2;
        const direction = request.speed > 0.001 ? baseDirection : fallbackDirection;
        const opposite = direction + Math.PI;
        const directionalBias = this.clamp01(request.directionalBias ?? 1);

        for (let i = 0; i < counts.lobes; i += 1) {
            const angle = this.biasedAngle(random, opposite, directionalBias, 1.05);
            const speed = this.range(random, 55, 125) * (0.65 + intensity * 0.75);
            emitted += this.emitAirborne({
                type: WaterImpactPrimitiveType.SplashLobe,
                texture: this.pick(this.textures.splashLobes, random),
                x: request.x + this.range(random, -4, 4), y: request.y + this.range(random, -3, 3),
                velocityX: Math.cos(angle) * speed, velocityY: Math.sin(angle) * speed - this.range(random, 18, 55),
                gravityY: this.definition.impactGravityY, dragPerSecond: this.definition.impactDragPerSecond,
                lifetime: this.range(random, 0.28, 0.48),
                startScaleX: this.range(random, 0.28, 0.48) * (0.8 + intensity * 0.55),
                startScaleY: this.range(random, 0.25, 0.44) * (0.8 + intensity * 0.55),
                endScaleX: this.range(random, 0.16, 0.28), endScaleY: this.range(random, 0.12, 0.24),
                maximumAlpha: 0.96, fadeStartFraction: 0.48,
                rotation: this.range(random, -Math.PI, Math.PI), angularVelocity: this.range(random, -3.2, 3.2),
            });
        }

        for (let i = 0; i < counts.droplets; i += 1) {
            const angle = this.biasedAngle(random, opposite, directionalBias, 1.35);
            const speed = this.range(random, 80, 185) * (0.6 + intensity * 0.65);
            const group = random() < 0.55 ? this.textures.roundDroplets : (random() < 0.5 ? this.textures.teardropDroplets : this.textures.elongatedDroplets);
            emitted += this.emitAirborne({
                type: WaterImpactPrimitiveType.SecondaryDroplet,
                texture: this.pick(group, random), x: request.x, y: request.y,
                velocityX: Math.cos(angle) * speed, velocityY: Math.sin(angle) * speed - this.range(random, 25, 75),
                gravityY: this.definition.impactGravityY, dragPerSecond: this.definition.impactDragPerSecond * 0.55,
                lifetime: this.range(random, 0.22, 0.42),
                startScaleX: this.range(random, 0.20, 0.42), startScaleY: this.range(random, 0.20, 0.42),
                endScaleX: 0.10, endScaleY: 0.10, maximumAlpha: 0.95, fadeStartFraction: 0.58,
                rotation: this.range(random, -Math.PI, Math.PI), angularVelocity: this.range(random, -5, 5),
            });
        }

        emitted += this.emitGround({
            type: WaterImpactPrimitiveType.SurfaceDisturbance,
            texture: this.pick(this.textures.surfaceDisturbances, random), x: request.x, y: request.y,
            lifetime: 0.26 + intensity * 0.14,
            startScaleX: 0.32 + intensity * 0.35, startScaleY: 0.28 + intensity * 0.28,
            endScaleX: 0.72 + intensity * 0.55, endScaleY: 0.50 + intensity * 0.42,
            maximumAlpha: 0.78, fadeStartFraction: 0.32,
            rotation: this.range(random, -0.18, 0.18),
        });

        if (request.tier !== WaterImpactTier.Fine || intensity >= 0.24) {
            emitted += this.emitGround({
                type: WaterImpactPrimitiveType.Ripple,
                texture: this.pick(this.textures.ripples, random), x: request.x, y: request.y,
                lifetime: 0.42 + intensity * 0.22,
                startScaleX: 0.26 + intensity * 0.12, startScaleY: 0.24 + intensity * 0.10,
                endScaleX: 0.95 + intensity * 0.70, endScaleY: 0.88 + intensity * 0.55,
                maximumAlpha: 0.70, fadeStartFraction: 0.18,
                rotation: this.range(random, -0.14, 0.14),
            });
        }
        return emitted;
    }

    public update(dt: number): void { if (!this.destroyed) { this.groundPool.update(dt); this.airbornePool.update(dt); } }
    public reset(): void { if (!this.destroyed) { this.groundPool.reset(); this.airbornePool.reset(); } }
    public getActiveCount(): number { return this.destroyed ? 0 : this.groundPool.getActiveCount() + this.airbornePool.getActiveCount(); }
    public getCapacity(): number { return this.destroyed ? 0 : this.groundPool.getCapacity() + this.airbornePool.getCapacity(); }
    public getMaximumCapacity(): number { return this.destroyed ? 0 : this.groundPool.getMaximumCapacity() + this.airbornePool.getMaximumCapacity(); }

    public destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        this.groundPool.destroy(); this.airbornePool.destroy();
        this.groundContainer.destroy({ children: false }); this.airborneContainer.destroy({ children: false });
    }

    private emitGround(a: WaterImpactParticleActivation): number { return this.groundPool.acquire(a) ? 1 : 0; }
    private emitAirborne(a: WaterImpactParticleActivation): number { return this.airbornePool.acquire(a) ? 1 : 0; }
    private pick<T>(values: readonly T[], random: () => number): T { return values[Math.min(values.length - 1, Math.floor(random() * values.length))]; }
    private range(random: () => number, min: number, max: number): number { return min + (max - min) * random(); }
    private biasedAngle(random:()=>number, preferred:number, bias:number, spread:number):number { const radial=this.range(random,-Math.PI,Math.PI); const directed=this.range(random,-spread,spread); return preferred + radial*(1-bias) + directed*bias; }
    private clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }
    private makeRandom(seed: number): () => number {
        let state = (Math.floor(seed) ^ 0x9e3779b9) >>> 0;
        return (): number => { state = (Math.imul(state ^ (state >>> 16), 0x21f0aaad) + 0x735a2d97) >>> 0; state ^= state >>> 15; return (state >>> 0) / 4294967296; };
    }
}

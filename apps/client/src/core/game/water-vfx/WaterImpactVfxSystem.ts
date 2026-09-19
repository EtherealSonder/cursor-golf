import { Container, type Texture } from "pixi.js";
import { DEFAULT_WATER_IMPACT_VFX_DEFINITION, type WaterImpactVfxDefinition } from "../config/WaterImpactVfxDefinition";
import { WaterImpactTier, type WaterImpactPresentationProfile } from "./WaterImpactIntensityModel";
import {
    createBallSplashNeutralTextureSet,
    destroyBallSplashNeutralTextureSet,
    type WaterImpactTextureSet,
} from "./WaterImpactTextureSet";
import { WaterImpactPrimitiveType, type WaterImpactParticleActivation } from "./WaterImpactVfxParticle";
import { WaterImpactVfxPool } from "./WaterImpactVfxPool";
import { WaterImpactEmissionBudget, type WaterImpactEmissionBudgetSnapshot } from "./WaterImpactEmissionBudget";

export interface WaterImpactVfxRequest extends WaterImpactPresentationProfile {
    readonly x: number;
    readonly y: number;
    readonly seed: number;
    readonly directionalBias?: number;

    /**
     * Optional composition controls used by specialized presentation adapters.
     * Defaults preserve the accepted 8I-7 Hose/Sprinkler impact appearance.
     */
    readonly breadth?: number;
    readonly bodyStrength?: number;
    readonly energeticDisplacement?: number;
    readonly overallScale?: number;
}


export interface WaterTraversalVfxRequest {
    readonly x:number; readonly y:number; readonly directionX:number; readonly directionY:number;
    readonly speed:number; readonly normalizedDepth:number; readonly coverage:number;
    readonly exposure:number; readonly normalizedSpeed:number; readonly seed:number;
}


export interface BallCircularSplashVfxRequest {
    readonly x: number;
    readonly y: number;
    readonly speed: number;
    readonly normalizedDepth: number;
    readonly coverage: number;
    readonly intensity: number;
    readonly seed: number;
    readonly isEntry: boolean;
}

/** Shared presentation-only composer for Fine/Medium/Heavy Water impacts. */
export class WaterImpactVfxSystem {
    private readonly groundContainer = new Container();
    private readonly airborneContainer = new Container();
    private readonly groundPool: WaterImpactVfxPool;
    private readonly airbornePool: WaterImpactVfxPool;
    private readonly emissionBudget: WaterImpactEmissionBudget;
    private readonly ballSplashNeutralTextures =
        createBallSplashNeutralTextureSet();

    private ballEmittedSinceRead = 0;
    private ballRejectedSinceRead = 0;
    private destroyed = false;

    public constructor(
        private readonly textures: WaterImpactTextureSet,
        private readonly definition: WaterImpactVfxDefinition = DEFAULT_WATER_IMPACT_VFX_DEFINITION,
    ) {
        this.emissionBudget =
            new WaterImpactEmissionBudget(definition);

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

        if (
            !this.emissionBudget.tryConsumeComposition(
                request.normalizedIntensity,
            )
        ) {
            return 0;
        }

        const random = this.makeRandom(request.seed);
        let emitted = 0;
        const intensity = this.clamp01(request.normalizedIntensity);
        const countBounds = request.tier === WaterImpactTier.Heavy
            ? {
                lobeMin: this.definition.heavyLobeCountMin,
                lobeMax: this.definition.heavyLobeCountMax,
                dropletMin: this.definition.heavyDropletCountMin,
                dropletMax: this.definition.heavyDropletCountMax,
            }
            : request.tier === WaterImpactTier.Medium
                ? {
                    lobeMin: this.definition.mediumLobeCountMin,
                    lobeMax: this.definition.mediumLobeCountMax,
                    dropletMin: this.definition.mediumDropletCountMin,
                    dropletMax: this.definition.mediumDropletCountMax,
                }
                : {
                    lobeMin: this.definition.fineLobeCountMin,
                    lobeMax: this.definition.fineLobeCountMax,
                    dropletMin: this.definition.fineDropletCountMin,
                    dropletMax: this.definition.fineDropletCountMax,
                };

        const counts = {
            lobes: this.integerRange(
                random,
                countBounds.lobeMin,
                countBounds.lobeMax,
            ),
            droplets: this.integerRange(
                random,
                countBounds.dropletMin,
                countBounds.dropletMax,
            ),
        };

        const baseDirection = Math.atan2(request.directionY, request.directionX);
        const fallbackDirection = -Math.PI / 2;
        const direction = request.speed > 0.001 ? baseDirection : fallbackDirection;
        const opposite = direction + Math.PI;
        const directionalBias = this.clamp01(request.directionalBias ?? 1);
        const breadth = this.positiveOrDefault(request.breadth, 1);
        const bodyStrength = this.positiveOrDefault(request.bodyStrength, 1);
        const energeticDisplacement = this.positiveOrDefault(request.energeticDisplacement, 1);
        const overallScale = this.positiveOrDefault(request.overallScale, 1);

        for (let i = 0; i < counts.lobes; i += 1) {
            const angle = this.biasedAngle(random, opposite, directionalBias, 1.05 * breadth);
            const speed = this.range(random, this.definition.lobeSpeedMin, this.definition.lobeSpeedMax) * (0.65 + intensity * 0.75) * energeticDisplacement;
            emitted += this.emitAirborne({
                type: WaterImpactPrimitiveType.SplashLobe,
                texture: this.pick(this.textures.splashLobes, random),
                x: request.x + this.range(random, -this.definition.impactPositionJitterX, this.definition.impactPositionJitterX), y: request.y + this.range(random, -this.definition.impactPositionJitterY, this.definition.impactPositionJitterY),
                velocityX: Math.cos(angle) * speed, velocityY: Math.sin(angle) * speed - this.range(random, 18, 55),
                gravityY: this.definition.impactGravityY, dragPerSecond: this.definition.impactDragPerSecond,
                lifetime: this.range(random, this.definition.lobeLifetimeMin, this.definition.lobeLifetimeMax),
                startScaleX: this.range(random, 0.28, 0.48) * (0.8 + intensity * 0.55) * overallScale * breadth,
                startScaleY: this.range(random, 0.25, 0.44) * (0.8 + intensity * 0.55) * overallScale * bodyStrength,
                endScaleX: this.range(random, 0.16, 0.28), endScaleY: this.range(random, 0.12, 0.24),
                maximumAlpha: 0.96, fadeStartFraction: 0.48,
                rotation: this.range(random, -Math.PI, Math.PI), angularVelocity: this.range(random, -3.2, 3.2),
            });
        }

        for (let i = 0; i < counts.droplets; i += 1) {
            const angle = this.biasedAngle(random, opposite, directionalBias, 1.35 * breadth);
            const speed = this.range(random, this.definition.dropletSpeedMin, this.definition.dropletSpeedMax) * (0.6 + intensity * 0.65) * energeticDisplacement;
            const group = random() < 0.55 ? this.textures.roundDroplets : (random() < 0.5 ? this.textures.teardropDroplets : this.textures.elongatedDroplets);
            emitted += this.emitAirborne({
                type: WaterImpactPrimitiveType.SecondaryDroplet,
                texture: this.pick(group, random), x: request.x, y: request.y,
                velocityX: Math.cos(angle) * speed, velocityY: Math.sin(angle) * speed - this.range(random, 25, 75),
                gravityY: this.definition.impactGravityY, dragPerSecond: this.definition.impactDragPerSecond * 0.55,
                lifetime: this.range(random, this.definition.dropletLifetimeMin, this.definition.dropletLifetimeMax),
                startScaleX: this.range(random, 0.20, 0.42) * overallScale,
                startScaleY: this.range(random, 0.20, 0.42) * overallScale * bodyStrength,
                endScaleX: 0.10, endScaleY: 0.10, maximumAlpha: 0.95, fadeStartFraction: 0.58,
                rotation: this.range(random, -Math.PI, Math.PI), angularVelocity: this.range(random, -5, 5),
            });
        }

        const disturbanceVariation = 1 + this.range(
            random,
            -this.definition.disturbanceScaleVariation,
            this.definition.disturbanceScaleVariation,
        );

        emitted += this.emitGround({
            type: WaterImpactPrimitiveType.SurfaceDisturbance,
            texture: this.pick(this.textures.surfaceDisturbances, random), x: request.x, y: request.y,
            lifetime: 0.26 + intensity * 0.14,
            startScaleX: (0.32 + intensity * 0.35) * disturbanceVariation * overallScale * breadth,
            startScaleY: (0.28 + intensity * 0.28) * disturbanceVariation * overallScale * bodyStrength,
            endScaleX: (0.72 + intensity * 0.55) * disturbanceVariation * overallScale * breadth,
            endScaleY: (0.50 + intensity * 0.42) * disturbanceVariation * overallScale * bodyStrength,
            maximumAlpha: 0.78, fadeStartFraction: 0.32,
            rotation: this.range(random, -0.18, 0.18),
        });

        if (
            (request.tier !== WaterImpactTier.Fine || intensity >= 0.24) &&
            this.emissionBudget.tryConsumeRipple()
        ) {
            const rippleVariation = 1 + this.range(
                random,
                -this.definition.rippleScaleVariation,
                this.definition.rippleScaleVariation,
            );

            emitted += this.emitGround({
                type: WaterImpactPrimitiveType.Ripple,
                texture: this.pick(this.textures.ripples, random), x: request.x, y: request.y,
                lifetime: 0.42 + intensity * 0.22,
                startScaleX: (0.26 + intensity * 0.12) * rippleVariation * overallScale * breadth,
                startScaleY: (0.24 + intensity * 0.10) * rippleVariation * overallScale * bodyStrength,
                endScaleX: (0.95 + intensity * 0.70) * rippleVariation * overallScale * breadth,
                endScaleY: (0.88 + intensity * 0.55) * rippleVariation * overallScale * bodyStrength,
                maximumAlpha: 0.70, fadeStartFraction: 0.18,
                rotation: this.range(random, -0.14, 0.14),
            });
        }
        return emitted;
    }

    /**
     * Reference-matched Ball entry burst.
     *
     * Unlike Hose/Sprinkler impacts this composition is intentionally radial:
     * bright round droplets surround/overlap the Ball and a fast circular
     * ripple expands underneath. Ball velocity never stretches the shape.
     */
    public emitBallCircularSplash(
        request:
            BallCircularSplashVfxRequest,
    ): number {

        return this.emitBallRadialComposition(
            request,
        );
    }

    /**
     * 8I-8E traversal pulse using the same circular vocabulary as entry,
     * at a slightly smaller density. The request still comes exclusively
     * from authoritative Ball Water contact state.
     */
    public emitTraversalDisturbance(
        request:
            WaterTraversalVfxRequest,
    ): number {

        const depth =
            this.clamp01(
                request.normalizedDepth,
            );

        const coverage =
            this.clamp01(
                request.coverage,
            );

        const exposure =
            this.clamp01(
                request.exposure,
            );

        const speed =
            this.clamp01(
                request.normalizedSpeed,
            );

        const intensity =
            this.clamp01(
                0.34 +
                depth * 0.20 +
                coverage * 0.16 +
                exposure * 0.12 +
                speed * 0.18,
            );

        return this.emitBallRadialComposition({
            x:
                request.x,
            y:
                request.y,
            speed:
                Math.max(
                    0,
                    request.speed,
                ),
            normalizedDepth:
                depth,
            coverage,
            intensity,
            seed:
                request.seed,
            isEntry:
                false,
        });
    }

    private emitBallRadialComposition(request: BallCircularSplashVfxRequest): number {
        if(this.destroyed||!Number.isFinite(request.x)||!Number.isFinite(request.y)||request.intensity<=0)return 0;
        const random=this.makeRandom(request.seed), intensity=this.clamp01(request.intensity);
        const depth=this.clamp01(request.normalizedDepth), coverage=this.clamp01(request.coverage);
        const speed=this.clamp01(request.speed/500);
        const airLoad=this.airbornePool.getActiveFraction(), groundLoad=this.groundPool.getActiveFraction();
        const desired=(request.isEntry?7:4)+Math.round(intensity*2);
        let count=desired;
        if(airLoad>=.72)count=Math.min(count,request.isEntry?4:2);
        else if(airLoad>=.52)count=Math.min(count,request.isEntry?6:3);
        count=Math.max(0,Math.min(count,this.airbornePool.getAvailableCapacity()));
        let emitted=0,rejected=Math.max(0,desired-count);
        const aspect=this.definition.rippleWidth/Math.max(1,this.definition.rippleHeight);
        if(groundLoad<.88&&this.emissionBudget.tryConsumeRipple()){
            const ss=request.isEntry?.30+intensity*.07:.22+intensity*.05;
            const es=request.isEntry?.88+intensity*.38:.66+intensity*.30;
            emitted+=this.emitGround({type:WaterImpactPrimitiveType.Ripple,texture:this.pick(this.textures.ripples,random),
                x:request.x,y:request.y,lifetime:request.isEntry?.30:.26,startScaleX:ss,startScaleY:ss*aspect,
                endScaleX:es,endScaleY:es*aspect,maximumAlpha:request.isEntry?.95:.88,fadeStartFraction:.10,
                rotation:this.range(random,-.1,.1),tint:0xe8f1f1});
        }else rejected++;
        const palette=[0xffffff,0xffffff,0xffffff,0xf2f2f0,0xf2f2f0,0xd8dad8] as const;
        for(let i=0;i<count;i++){
            const a=(i/Math.max(1,count))*Math.PI*2+this.range(random,-.22,.22);
            const radius=this.range(random,request.isEntry?2:1,request.isEntry?8:6);
            const ps=(request.isEntry?52:40)+this.range(random,0,request.isEntry?42:30)*(.76+speed*.24);
            const size=this.range(random,request.isEntry?.40:.32,request.isEntry?.76:.62)*(.92+depth*.14+coverage*.08);
            emitted+=this.emitAirborne({type:WaterImpactPrimitiveType.SecondaryDroplet,
                texture:this.pick(this.ballSplashNeutralTextures.roundDroplets,random),x:request.x+Math.cos(a)*radius,y:request.y+Math.sin(a)*radius,
                velocityX:Math.cos(a)*ps,velocityY:Math.sin(a)*ps,gravityY:0,dragPerSecond:3.6,
                lifetime:this.range(random,request.isEntry?.17:.15,request.isEntry?.23:.21),
                startScaleX:size,startScaleY:size,endScaleX:size*.5,endScaleY:size*.5,
                maximumAlpha:this.range(random,.48,.78),fadeStartFraction:.34,rotation:0,angularVelocity:0,
                tint:palette[Math.floor(random()*palette.length)]??0xffffff});
        }
        if(groundLoad<.68){
            const s=(request.isEntry?.31:.23)+intensity*(request.isEntry?.12:.08);
            const da=this.definition.surfaceDisturbanceWidth/Math.max(1,this.definition.surfaceDisturbanceHeight);
            emitted+=this.emitGround({type:WaterImpactPrimitiveType.SurfaceDisturbance,
                texture:this.pick(this.textures.surfaceDisturbances,random),x:request.x,y:request.y,
                lifetime:request.isEntry?.19:.16,startScaleX:s,startScaleY:s*da,endScaleX:s*1.24,endScaleY:s*1.24*da,
                maximumAlpha:request.isEntry?.76:.64,fadeStartFraction:.16,rotation:this.range(random,-.16,.16),tint:0xe5e8e8});
        }
        this.ballEmittedSinceRead+=emitted; this.ballRejectedSinceRead+=rejected; return emitted;
    }

    public consumeBallEmissionMetrics(): { emitted:number; rejected:number } {
        const m={emitted:this.ballEmittedSinceRead,rejected:this.ballRejectedSinceRead};
        this.ballEmittedSinceRead=0;this.ballRejectedSinceRead=0;return m;
    }
    public getActiveAirborneParticleCount():number{return this.airbornePool.getActiveCount();}
    public getActiveGroundParticleCount():number{return this.groundPool.getActiveCount();}
    public getAirbornePoolCapacity():number{return this.airbornePool.getCapacity();}
    public getGroundPoolCapacity():number{return this.groundPool.getCapacity();}
    public getAirbornePoolMaximumCapacity():number{return this.airbornePool.getMaximumCapacity();}
    public getGroundPoolMaximumCapacity():number{return this.groundPool.getMaximumCapacity();}

    public update(dt: number): void {
        if (!this.destroyed) {
            this.emissionBudget.update(dt);
            this.groundPool.update(dt);
            this.airbornePool.update(dt);
        }
    }

    public reset(): void {
        if (!this.destroyed) {
            this.emissionBudget.reset();
        this.ballEmittedSinceRead = 0;
        this.ballRejectedSinceRead = 0;
            this.groundPool.reset();
            this.airbornePool.reset();
        }
    }

    public getEmissionBudgetSnapshot(): WaterImpactEmissionBudgetSnapshot {
        return this.emissionBudget.getSnapshot();
    }
    public getActiveCount(): number { return this.destroyed ? 0 : this.groundPool.getActiveCount() + this.airbornePool.getActiveCount(); }
    public getCapacity(): number { return this.destroyed ? 0 : this.groundPool.getCapacity() + this.airbornePool.getCapacity(); }
    public getMaximumCapacity(): number { return this.destroyed ? 0 : this.groundPool.getMaximumCapacity() + this.airbornePool.getMaximumCapacity(); }

    public destroy(): void {
        destroyBallSplashNeutralTextureSet(
            this.ballSplashNeutralTextures,
        );

        if (this.destroyed) return;
        this.destroyed = true;
        this.groundPool.destroy(); this.airbornePool.destroy();
        this.groundContainer.destroy({ children: false }); this.airborneContainer.destroy({ children: false });
    }

    private emitGround(a: WaterImpactParticleActivation): number { return this.groundPool.acquire(a) ? 1 : 0; }
    private emitAirborne(a: WaterImpactParticleActivation): number { return this.airbornePool.acquire(a) ? 1 : 0; }
    private pick<T>(values: readonly T[], random: () => number): T { return values[Math.min(values.length - 1, Math.floor(random() * values.length))]; }
    private range(random: () => number, min: number, max: number): number { return min + (max - min) * random(); }
    private integerRange(random: () => number, min: number, max: number): number {
        if (max <= min) return min;
        return min + Math.floor(random() * (max - min + 1));
    }
    private biasedAngle(random:()=>number, preferred:number, bias:number, spread:number):number { const radial=this.range(random,-Math.PI,Math.PI); const directed=this.range(random,-spread,spread); return preferred + radial*(1-bias) + directed*bias; }
    private clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }
    private positiveOrDefault(value: number | undefined, fallback: number): number {
        return value !== undefined && Number.isFinite(value) && value > 0
            ? value
            : fallback;
    }
    private makeRandom(seed: number): () => number {
        let state = (Math.floor(seed) ^ 0x9e3779b9) >>> 0;
        return (): number => { state = (Math.imul(state ^ (state >>> 16), 0x21f0aaad) + 0x735a2d97) >>> 0; state ^= state >>> 15; return (state >>> 0) / 4294967296; };
    }
}

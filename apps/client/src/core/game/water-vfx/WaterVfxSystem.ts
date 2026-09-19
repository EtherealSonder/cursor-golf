import {
    Container,
    Texture,
} from "pixi.js";

import {
    DEFAULT_WATER_VFX_DEFINITION,
} from "../config/WaterVfxDefinition";

import type {
    WaterVfxDefinition,
} from "../config/WaterVfxDefinition";

import {
    WaterVfxPool,
} from "./WaterVfxPool";

import type {
    WaterVfxParticleActivation,
} from "./WaterVfxParticle";

import {
    WaterVfxTextureFactory,
} from "./WaterVfxTextureFactory";

import type {
    WaterVfxTextures,
} from "./WaterVfxTextureFactory";

import {
    WaterStreamRenderer,
} from "./WaterStreamRenderer";

import {
    SprinklerDropletRenderer,
} from "./SprinklerDropletRenderer";

import {
    DEFAULT_WATER_IMPACT_VFX_DEFINITION,
} from "../config/WaterImpactVfxDefinition";

import {
    WaterImpactVfxSystem,
} from "./WaterImpactVfxSystem";
import { SprinklerImpactVfx } from "./SprinklerImpactVfx";
import { HoseGroundImpactVfx } from "./HoseGroundImpactVfx";
import { BallSplashVfx } from "./BallSplashVfx";
import { BallWaterTraversalVfx } from "./BallWaterTraversalVfx";
import type { Ball } from "../entities/Ball";
import type { BallWaterSplashEvent } from "../physics/water/BallWaterSplashEvent";
import type { Sprinkler } from "../entities/mechanisms/Sprinkler";
import type { AirborneWaterSystem } from "../environment/AirborneWaterSystem";
import type { HydrantHose } from "../entities/mechanisms/HydrantHose";

/**
 * 8I-4 presentation-only composition root for shared Water VFX.
 *
 * 8I-5 keeps this composition root presentation-only. Sprinkler fluid ribbons,
 * later Hose geometry, Ball splash, ripples and Water/Fire effects consume
 * authoritative state without becoming simulation authority.
 */
export class WaterVfxSystem {
    private readonly groundContainer = new Container();
    private readonly airborneContainer = new Container();

    private readonly textures: WaterVfxTextures;
    private readonly pool: WaterVfxPool;
    private readonly streamRenderer: WaterStreamRenderer;
    private readonly sprinklerDropletRenderer: SprinklerDropletRenderer;
    private readonly impactVfxSystem: WaterImpactVfxSystem;
    private readonly sprinklerImpactVfx: SprinklerImpactVfx;
    private readonly hoseGroundImpactVfx: HoseGroundImpactVfx;
    private readonly ballSplashVfx: BallSplashVfx;
    private readonly ballWaterTraversalVfx: BallWaterTraversalVfx;

    private readonly definition: WaterVfxDefinition;
    private destroyed = false;

    public constructor(
        definition: WaterVfxDefinition =
            DEFAULT_WATER_VFX_DEFINITION,
    ) {
        this.definition = definition;

        this.textures =
            WaterVfxTextureFactory.create();

        this.pool =
            new WaterVfxPool(
                this.textures.droplet,
                definition.pool,
            );

        this.streamRenderer =
            new WaterStreamRenderer(
                definition.stream,
            );

        this.sprinklerDropletRenderer =
            new SprinklerDropletRenderer(
                definition.sprinkler,
            );

        this.impactVfxSystem =
            new WaterImpactVfxSystem(
                WaterVfxTextureFactory.getImpactTextureSet(
                    DEFAULT_WATER_IMPACT_VFX_DEFINITION,
                ),
                DEFAULT_WATER_IMPACT_VFX_DEFINITION,
            );
        this.sprinklerImpactVfx = new SprinklerImpactVfx(DEFAULT_WATER_IMPACT_VFX_DEFINITION);
        this.hoseGroundImpactVfx =
            new HoseGroundImpactVfx(
                DEFAULT_WATER_IMPACT_VFX_DEFINITION,
            );

        this.ballSplashVfx =
            new BallSplashVfx(
                this.impactVfxSystem,
            );

        this.ballWaterTraversalVfx =
            new BallWaterTraversalVfx(
                this.impactVfxSystem,
            );

        /*
         * Continuous airborne Water geometry and secondary Water particles
         * share one presentation composition root, but remain independent.
         */
        this.groundContainer.addChild(
            this.impactVfxSystem.getGroundContainer(),
        );

        this.airborneContainer.addChild(
            this.streamRenderer.getContainer(),
            this.sprinklerDropletRenderer.getContainer(),
            this.pool.getContainer(),
            this.impactVfxSystem.getAirborneContainer(),
        );

        this.groundContainer.visible =
            definition.enabled;

        this.airborneContainer.visible =
            definition.enabled;
    }

    public getGroundContainer(): Container {
        return this.groundContainer;
    }

    public getAirborneContainer(): Container {
        return this.airborneContainer;
    }

    public getStreamRenderer(): WaterStreamRenderer {
        return this.streamRenderer;
    }

    public getSprinklerDropletRenderer(): SprinklerDropletRenderer {
        return this.sprinklerDropletRenderer;
    }

    public getImpactVfxSystem(): WaterImpactVfxSystem {
        return this.impactVfxSystem;
    }

    public updateSprinklerImpacts(dt: number, sprinklers: readonly Sprinkler[], airborne: AirborneWaterSystem): void {
        if (this.destroyed || !this.definition.enabled) return;
        this.sprinklerImpactVfx.update(dt, sprinklers, airborne, this.impactVfxSystem);
    }

    public getSprinklerImpactVfx(): SprinklerImpactVfx { return this.sprinklerImpactVfx; }

    public updateHoseGroundImpact(
        dt: number,
        hose: HydrantHose,
        airborne: AirborneWaterSystem,
    ): void {
        if (
            this.destroyed ||
            !this.definition.enabled
        ) {
            return;
        }

        this.hoseGroundImpactVfx.update(
            dt,
            hose,
            airborne,
            this.impactVfxSystem,
        );
    }

    public handleBallSplash(
        event: Readonly<BallWaterSplashEvent>,
    ): void {
        if (
            this.destroyed ||
            !this.definition.enabled
        ) {
            return;
        }

        this.ballSplashVfx.consume(event);
    }

    public updateBallTraversal(ball: Ball): void {
        if (
            this.destroyed ||
            !this.definition.enabled
        ) {
            return;
        }

        this.ballWaterTraversalVfx.update({
            x: ball.getX(),
            y: ball.getY(),
            velocityX: ball.getVelocityX(),
            velocityY: ball.getVelocityY(),
            speed: ball.getSpeed(),
            contactProfile:
                ball.getWaterContactProfile(),
        });
    }

    public resetBallWaterTraversal(): void {
        if(!this.destroyed)this.ballWaterTraversalVfx.reset();
    }

    public getBallSplashVfx(): BallSplashVfx {
        return this.ballSplashVfx;
    }

    public getDefinition(): WaterVfxDefinition {
        return this.definition;
    }

    public emitDroplet(
        activation: WaterVfxParticleActivation,
    ): boolean {
        return this.emit(
            this.textures.droplet,
            activation,
        );
    }

    public emitElongatedDroplet(
        activation: WaterVfxParticleActivation,
    ): boolean {
        return this.emit(
            this.textures.elongatedDroplet,
            activation,
        );
    }

    public emitSplashFragment(
        activation: WaterVfxParticleActivation,
    ): boolean {
        return this.emit(
            this.textures.splash,
            activation,
        );
    }

    public update(deltaTime: number): void {
        if (
            this.destroyed ||
            !this.definition.enabled ||
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return;
        }

        this.streamRenderer.update(deltaTime);
        this.sprinklerDropletRenderer.update(deltaTime);
        this.pool.update(deltaTime);
        this.impactVfxSystem.update(deltaTime);

    }

    public reset(): void {
        if (this.destroyed) {
            return;
        }

        this.streamRenderer.reset();
        this.sprinklerDropletRenderer.reset();
        this.pool.reset();
        this.impactVfxSystem.reset();
        this.sprinklerImpactVfx.reset();
        this.hoseGroundImpactVfx.reset();
        this.ballSplashVfx.reset();
        this.ballWaterTraversalVfx.reset();
    }

    public getActiveParticleCount(): number {
        if (this.destroyed) {
            return 0;
        }

        return this.pool.getActiveCount();
    }

    public getParticleCapacity(): number {
        if (this.destroyed) {
            return 0;
        }

        return this.pool.getCapacity();
    }

    public destroy(): void {
        if (this.destroyed) {
            return;
        }

        this.destroyed = true;

        this.streamRenderer.destroy();
        this.sprinklerDropletRenderer.destroy();
        this.pool.destroy();
        this.impactVfxSystem.destroy();

        WaterVfxTextureFactory.destroy(
            this.textures,
        );

        this.groundContainer.removeFromParent();
        this.airborneContainer.removeFromParent();

        this.groundContainer.destroy({
            children: false,
        });

        this.airborneContainer.destroy({
            children: false,
        });
    }

    private emit(
        texture: Texture,
        activation: WaterVfxParticleActivation,
    ): boolean {
        if (
            this.destroyed ||
            !this.definition.enabled
        ) {
            return false;
        }

        const resolvedActivation: WaterVfxParticleActivation = {
            ...activation,
            gravityX:
                activation.gravityX ??
                this.definition.particle.gravityX,
            gravityY:
                activation.gravityY ??
                this.definition.particle.gravityY,
            dragPerSecond:
                activation.dragPerSecond ??
                this.definition.particle.dragPerSecond,
            fadeStartFraction:
                activation.fadeStartFraction ??
                this.definition.particle.fadeStartFraction,
            tint:
                activation.tint ??
                this.definition.dropletColor,
        };

        return (
            this.pool.acquire(
                texture,
                resolvedActivation,
            ) !== null
        );
    }
}

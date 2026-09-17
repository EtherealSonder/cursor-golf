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

/**
 * 8I-4 presentation-only composition root for shared Water VFX.
 *
 * 8I-4 intentionally has no gameplay emitter. Sprinkler, Hose, Ball splash,
 * ripple and Water/Fire presentation are connected in later 8I steps.
 */
export class WaterVfxSystem {
    private readonly groundContainer = new Container();
    private readonly airborneContainer = new Container();

    private readonly textures: WaterVfxTextures;
    private readonly pool: WaterVfxPool;
    private readonly streamRenderer: WaterStreamRenderer;

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

        /*
         * Continuous airborne Water geometry and secondary Water particles
         * share one presentation composition root, but remain independent.
         */
        this.airborneContainer.addChild(
            this.streamRenderer.getContainer(),
            this.pool.getContainer(),
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

        this.pool.update(deltaTime);
    }

    public reset(): void {
        if (this.destroyed) {
            return;
        }

        this.streamRenderer.reset();
        this.pool.reset();
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
        this.pool.destroy();

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

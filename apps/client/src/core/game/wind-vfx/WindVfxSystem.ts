import {
    Container,
    Texture,
} from "pixi.js";

import type {
    Camera,
} from "../camera/Camera";

import {
    DEFAULT_WIND_VFX_DEFINITION,
} from "../config/WindVfxDefinition";

import type {
    WindVfxDefinition,
} from "../config/WindVfxDefinition";

import type {
    LocalWindSystem,
} from "../environment/LocalWindSystem";

import type {
    WindManager,
} from "../environment/WindManager";

import {
    AssetLoader,
} from "../../rendering/AssetLoader";

import {
    GlobalWindEmitter,
} from "./GlobalWindEmitter";

import {
    LocalWindEmitter,
} from "./LocalWindEmitter";

import {
    WindVfxPool,
} from "./WindVfxPool";

/**
 * Presentation-only composition root for all Wind VFX.
 *
 * WindManager and LocalWindSystem remain authoritative. This system owns only
 * pooled Sprite presentation and never writes gameplay Wind state.
 */
export class WindVfxSystem {

    private readonly container =
        new Container();

    private readonly pool:
        WindVfxPool;

    private readonly globalEmitter:
        GlobalWindEmitter;

    private readonly localEmitter:
        LocalWindEmitter;

    private destroyed =
        false;

    private performanceDetails = {
        globalEmitterMilliseconds: 0,
        localEmitterMilliseconds: 0,
        poolBookkeepingMilliseconds: 0,
    };

    public getPerformanceDetails() {
        return {
            ...this.performanceDetails,
            ...this.pool.getPerformanceDetails(),
            globalEmitter: this.globalEmitter.getPerformanceDetails(),
            localEmitter: this.localEmitter.getPerformanceDetails(),
        };
    }

    public constructor(
        windManager:
            WindManager,

        localWindSystem:
            LocalWindSystem,

        camera:
            Camera,

        definition:
            WindVfxDefinition =
            DEFAULT_WIND_VFX_DEFINITION,
    ) {

        const textures:
            Texture[] =
            definition.textureKeys.map(
                (key): Texture =>
                    AssetLoader.getTexture(
                        key,
                    ),
            );

        this.pool =
            new WindVfxPool(
                this.container,
                textures,
                definition.poolCapacity,
                definition.tint,
            );

        this.globalEmitter =
            new GlobalWindEmitter(
                windManager,
                camera,
                this.pool,
                textures,
                definition,
            );

        this.localEmitter =
            new LocalWindEmitter(
                localWindSystem,
                this.pool,
                textures,
                definition,
            );

        this.container.visible =
            definition.enabled;
    }

    public getContainer():
        Container {

        return this.container;
    }

    public setEnabled(
        enabled:
            boolean,
    ): void {

        if (
            this.destroyed
        ) {
            return;
        }

        if (
            this.container.visible ===
            enabled
        ) {
            return;
        }

        if (!enabled) {
            this.reset();
        }

        this.container.visible =
            enabled;
    }

    public isEnabled():
        boolean {

        return (
            !this.destroyed &&
            this.container.visible
        );
    }

    public getActiveParticleCount():
        number {

        if (
            this.destroyed
        ) {
            return 0;
        }

        return this.pool
            .getActiveCount();
    }

    public getParticleCapacity():
        number {

        if (
            this.destroyed
        ) {
            return 0;
        }

        return this.pool
            .getCapacity();
    }

    public update(
        deltaTime:
            number,
    ): void {

        if (
            this.destroyed ||
            !this.container.visible
        ) {
            return;
        }

        this.pool.beginPerformanceFrame();
        this.globalEmitter.beginPerformanceFrame();
        this.localEmitter.beginPerformanceFrame();

        const globalStartedAt = performance.now();
        this.globalEmitter.update(
            deltaTime,
        );
        this.performanceDetails.globalEmitterMilliseconds =
            performance.now() - globalStartedAt;

        const localStartedAt = performance.now();
        this.localEmitter.update(
            deltaTime,
        );
        this.performanceDetails.localEmitterMilliseconds =
            performance.now() - localStartedAt;

        /*
         * WindVfxPool has no separate per-frame particle-update pass. Its
         * measurable CPU work is acquire/release bookkeeping performed by the
         * two emitters, so retain this field explicitly as zero for clarity.
         */
        this.performanceDetails.poolBookkeepingMilliseconds = 0;
    }

    public reset(): void {
        if (this.destroyed) {
            return;
        }

        this.globalEmitter.reset();
        this.localEmitter.reset();
        this.pool.reset();
    }

    public destroy(): void {
        if (this.destroyed) {
            return;
        }

        this.destroyed =
            true;

        this.globalEmitter.reset();
        this.localEmitter.reset();
        this.pool.destroy();

        this.container
            .removeFromParent();

        this.container.destroy({
            children:
                false,
        });
    }
}

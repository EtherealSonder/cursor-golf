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

        this.globalEmitter.update(
            deltaTime,
        );

        this.localEmitter.update(
            deltaTime,
        );
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

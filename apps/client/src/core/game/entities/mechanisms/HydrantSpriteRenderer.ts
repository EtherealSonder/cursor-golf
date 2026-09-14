import {
    Sprite,
    Texture,
} from "pixi.js";

import {
    AssetLoader,
} from "../../../rendering/AssetLoader";

import type {
    HydrantHoseDefinition,
} from "../../config/HydrantHoseDefinition";

import {
    HydrantDamageState,
} from "../../config/HydrantDamageState";

/**
 * Presentation-only renderer for the fixed Hydrant body.
 *
 * A single Pixi Sprite is retained for the mechanism lifetime. Damage changes
 * swap only the texture, preserving world position, anchor, scale and z-order.
 */
export class HydrantSpriteRenderer {
    private readonly sprite:
        Sprite;

    private state =
        HydrantDamageState.Normal;

    public constructor(
        private readonly definition:
            HydrantHoseDefinition,
    ) {
        this.sprite =
            new Sprite(
                this.getTextureForState(
                    this.state,
                ),
            );

        this.sprite.anchor.set(
            definition.visual
                .hydrantSpriteAnchorX,
            definition.visual
                .hydrantSpriteAnchorY,
        );

        this.applyVisualDimensions();
    }

    public getSprite():
        Sprite {
        return this.sprite;
    }

    public setPosition(
        anchorX:
            number,

        anchorY:
            number,
    ): void {
        this.sprite.position.set(
            anchorX +
            this.definition
                .visual
                .hydrantSpriteOffsetX,
            anchorY +
            this.definition
                .visual
                .hydrantSpriteOffsetY,
        );
    }

    public setDamageState(
        state:
            HydrantDamageState,
    ): void {
        if (
            state ===
            this.state
        ) {
            return;
        }

        this.state =
            state;

        this.sprite.texture =
            this.getTextureForState(
                state,
            );

        /*
         * Pixi Sprite scale survives a texture swap, but different source
         * canvas dimensions would otherwise change world-space width/height.
         * Reapply the authored dimensions after every state transition.
         */
        this.applyVisualDimensions();
    }

    public getDamageState():
        HydrantDamageState {
        return this.state;
    }

    public reset():
        void {
        this.setDamageState(
            HydrantDamageState.Normal,
        );
    }

    public destroy():
        void {
        this.sprite.destroy();
    }

    private applyVisualDimensions():
        void {
        this.sprite.width =
            this.definition
                .visual
                .hydrantSpriteWidth;

        this.sprite.height =
            this.definition
                .visual
                .hydrantSpriteHeight;
    }

    private getTextureForState(
        state:
            HydrantDamageState,
    ): Texture {
        switch (
        state
        ) {
            case HydrantDamageState.Normal:
                return AssetLoader
                    .getTexture(
                        "fireHydrant",
                    );

            case HydrantDamageState.Damaged:
                return AssetLoader
                    .getTexture(
                        "fireHydrantDamaged",
                    );

            case HydrantDamageState.Broken:
                return AssetLoader
                    .getTexture(
                        "fireHydrantBroken",
                    );
        }
    }
}

import { Sprite } from "pixi.js";

import { AssetLoader } from "../../../rendering/AssetLoader";
import type { SprinklerDefinition } from "../../config/SprinklerDefinition";

/** Presentation-only sprite renderer for the four-way Sprinkler. */
export class SprinklerSpriteRenderer {
    private readonly sprite: Sprite;

    public constructor(
        definition: SprinklerDefinition,
    ) {
        this.sprite = new Sprite(
            AssetLoader.getTexture("waterSprinkler"),
        );

        this.sprite.anchor.set(
            definition.visual.spriteAnchorX,
            definition.visual.spriteAnchorY,
        );

        this.sprite.width =
            definition.visual.spriteWidth;

        this.sprite.height =
            definition.visual.spriteHeight;

        this.sprite.position.set(
            definition.visual.spriteOffsetX,
            definition.visual.spriteOffsetY,
        );
    }

    public getSprite(): Sprite {
        return this.sprite;
    }

    public destroy(): void {
        this.sprite.destroy();
    }
}

import { Container, Graphics, Sprite } from "pixi.js";
import { AssetLoader } from "../../rendering/AssetLoader";
import {
    DEFAULT_DEBUFF_HUD_DEFINITION,
} from "../config/DebuffHudDefinition";
import {
    DEFAULT_FIRE_DEBUFF_DEFINITION,
} from "../config/FireDebuffDefinition";
import type { FireDebuffDefinition } from "../config/FireDebuffDefinition";

/**
 * One complete lethal-Fire status family.
 *
 * The Fire outline is permanent for the lifetime of the debuff. The three
 * authored Fire layers share one 512x512 coordinate space and are revealed
 * sequentially underneath that outline as heat rises.
 */
export class FireDebuffIndicator {
    private readonly root = new Container();
    private readonly masks: Graphics[] = [];
    private readonly meterSize: number;
    private readonly compositionSize: number;

    constructor(
        private readonly definition: FireDebuffDefinition = DEFAULT_FIRE_DEBUFF_DEFINITION,
    ) {
        this.root.label = "FireDebuffIndicator";
        this.meterSize = DEFAULT_DEBUFF_HUD_DEFINITION.entrySize;
        this.compositionSize = this.meterSize * this.definition.compositionScale;
        this.createPresentation();
        this.setHeat(0);
    }

    private createPresentation(): void {
        const holder = new Sprite(AssetLoader.getTexture("debuffHolder"));
        holder.anchor.set(0.5);
        holder.width = this.meterSize;
        holder.height = this.meterSize;
        holder.tint = DEFAULT_DEBUFF_HUD_DEFINITION.holderColor;
        this.root.addChild(holder);

        const fireKeys = ["debuffFire1", "debuffFire2", "debuffFire3"] as const;
        const colors = [
            this.definition.innerColor,
            this.definition.middleColor,
            this.definition.outerColor,
        ];

        // All three sprites retain the exact same authored 512x512 alignment.
        // Only their reveal masks change. The sprites themselves never move,
        // resize independently, or pop between discrete stages.
        for (let index = 0; index < fireKeys.length; index += 1) {
            const sprite = new Sprite(AssetLoader.getTexture(fireKeys[index]));
            sprite.anchor.set(0.5);
            sprite.position.set(
                this.definition.compositionOffsetX,
                this.definition.compositionOffsetY,
            );
            sprite.width = this.compositionSize;
            sprite.height = this.compositionSize;
            sprite.tint = colors[index];

            const mask = new Graphics();
            this.root.addChild(sprite);
            this.root.addChild(mask);
            sprite.mask = mask;
            this.masks.push(mask);
        }

        // Permanent crisp line art is deliberately above every colored layer.
        // At zero heat the player therefore sees the complete empty Fire symbol.
        const outline = new Sprite(AssetLoader.getTexture("debuffFireOutline"));
        outline.anchor.set(0.5);
        outline.position.set(
            this.definition.compositionOffsetX,
            this.definition.compositionOffsetY,
        );
        outline.width = this.compositionSize;
        outline.height = this.compositionSize;
        outline.tint = this.definition.outlineTint;
        this.root.addChild(outline);

        const badgeRadius = DEFAULT_DEBUFF_HUD_DEFINITION.deathBadgeDiameter * 0.5;
        const badgeY = DEFAULT_DEBUFF_HUD_DEFINITION.deathBadgeOffsetY;

        const badge = new Graphics()
            .circle(0, badgeY, badgeRadius)
            .fill({ color: this.definition.deathBadgeColor })
            .stroke({
                color: this.definition.deathBadgeOutlineColor,
                width: this.definition.deathBadgeOutlineWidth,
            });
        this.root.addChild(badge);

        const death = new Sprite(AssetLoader.getTexture("debuffDeath"));
        death.anchor.set(0.5);
        death.position.set(0, badgeY);
        death.width = badgeRadius * 1.35;
        death.height = badgeRadius * 1.35;
        this.root.addChild(death);
    }

    public setHeat(normalizedHeat: number): void {
        const heat = Math.min(1, Math.max(0, normalizedHeat));

        const size = this.compositionSize;
        const left =
            this.definition.compositionOffsetX - size * 0.5;
        const top =
            this.definition.compositionOffsetY - size * 0.5;

        for (let index = 0; index < this.masks.length; index += 1) {
            // One continuous 0..1 meter split into three sequential thirds:
            // fire_1 fills first, then fire_2, then fire_3.
            const segment = Math.min(
                1,
                Math.max(0, heat * 3 - index),
            );

            const visibleHeight = size * segment;
            const mask = this.masks[index];
            mask.clear();

            if (visibleHeight > 0) {
                mask
                    .rect(
                        left,
                        top + size - visibleHeight,
                        size,
                        visibleHeight,
                    )
                    .fill({ color: 0xffffff });
            }
        }
    }

    public getContainer(): Container {
        return this.root;
    }
}

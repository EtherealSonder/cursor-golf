import { Container, Sprite } from "pixi.js";
import { AssetLoader } from "../../rendering/AssetLoader";
import { HEAVY_BALL_HUD } from "../config/HeavyBallHudDefinition";

/** Heavy Ball status entry. DebuffHud owns its entrance/exit animations. */
export class HeavyBallIndicator {
    private readonly root = new Container();

    constructor() {
        const config = HEAVY_BALL_HUD;
        this.root.label = "HeavyBallIndicator";

        const holder = new Sprite(AssetLoader.getTexture("debuffHolder"));
        holder.anchor.set(0.5);
        holder.width = config.size;
        holder.height = config.size;
        holder.tint = config.holderTint;
        this.root.addChild(holder);

        const icon = new Sprite(AssetLoader.getTexture("heavyUi"));
        icon.anchor.set(0.5);
        icon.position.set(config.iconOffsetX, config.iconOffsetY);
        const iconBounds = config.size * config.iconScale;
        icon.scale.set(Math.min(iconBounds / icon.texture.width, iconBounds / icon.texture.height));
        this.root.addChild(icon);

        const arrow = new Sprite(AssetLoader.getTexture("debuffNegative"));
        arrow.anchor.set(0.5);
        arrow.position.set(config.negativeArrowOffsetX, config.negativeArrowOffsetY);
        const arrowBounds = config.size * config.negativeArrowScale;
        arrow.scale.set(Math.min(arrowBounds / arrow.texture.width, arrowBounds / arrow.texture.height));
        this.root.addChild(arrow);
    }

    public getContainer(): Container { return this.root; }
}

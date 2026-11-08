import { Container, Sprite } from "pixi.js";
import { AssetLoader } from "../../rendering/AssetLoader";
import { INVINCIBLE_BALL_HUD } from "../config/InvincibleBallHudDefinition";

/** Invincible Ball positive-effect entry. DebuffHud animates its lifecycle. */
export class InvincibleBallIndicator {
    private readonly root = new Container();

    constructor() {
        const config = INVINCIBLE_BALL_HUD;
        this.root.label = "InvincibleBallIndicator";

        const holder = new Sprite(AssetLoader.getTexture("debuffHolderPositive"));
        holder.anchor.set(0.5);
        holder.width = config.size;
        holder.height = config.size;

        this.root.addChild(holder);

        const icon = new Sprite(AssetLoader.getTexture("invincibleUi"));
        icon.anchor.set(0.5);
        icon.position.set(config.iconOffsetX, config.iconOffsetY);
        const iconBounds = config.size * config.iconScale;
        icon.scale.set(Math.min(iconBounds / icon.texture.width, iconBounds / icon.texture.height));
        this.root.addChild(icon);

        const arrow = new Sprite(AssetLoader.getTexture("debuffPositive"));
        arrow.anchor.set(0.5);
        arrow.position.set(config.positiveArrowOffsetX, config.positiveArrowOffsetY);
        const arrowBounds = config.size * config.positiveArrowScale;
        arrow.scale.set(Math.min(arrowBounds / arrow.texture.width, arrowBounds / arrow.texture.height));
        this.root.addChild(arrow);
    }

    public getContainer(): Container { return this.root; }
}

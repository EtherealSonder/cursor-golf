import { Container, Sprite } from "pixi.js";
import { AssetLoader } from "../../rendering/AssetLoader";
import { HIGH_POWER_BALL_HUD } from "../config/HighPowerBallHudDefinition";

/** One status queue entry. The queue owns its pop-in/out animations and disposal. */
export class HighPowerBallIndicator {
    private readonly root = new Container();

    constructor() {
        const config = HIGH_POWER_BALL_HUD;
        this.root.label = "HighPowerBallIndicator";

        const holder = new Sprite(AssetLoader.getTexture("debuffHolder"));
        holder.anchor.set(0.5);
        holder.width = config.size;
        holder.height = config.size;
        holder.tint = config.holderTint;
        this.root.addChild(holder);

        const icon = new Sprite(AssetLoader.getTexture("highPowerUi"));
        icon.anchor.set(0.5);
        // Center the lightning artwork in the holder using its texture midpoint.
        icon.position.set(config.iconOffsetX, config.iconOffsetY);
        // Fit within a square without distorting the source artwork.
        const iconBounds = config.size * config.iconScale;
        const iconRatio = Math.min(iconBounds / icon.texture.width, iconBounds / icon.texture.height);
        icon.scale.set(iconRatio);
        this.root.addChild(icon);

        const arrow = new Sprite(AssetLoader.getTexture("debuffPositive"));
        arrow.anchor.set(0.5);
        // Align the arrow bottom with the neighbouring skull badge while retaining uniform scale.
        arrow.position.set(config.positiveArrowOffsetX, config.positiveArrowOffsetY);
        // Preserve the arrow artwork aspect ratio and overlap the holder bottom.
        const arrowBounds = config.size * config.positiveArrowScale;
        const arrowRatio = Math.min(arrowBounds / arrow.texture.width, arrowBounds / arrow.texture.height);
        arrow.scale.set(arrowRatio);
        this.root.addChild(arrow);
    }

    public getContainer(): Container { return this.root; }
}

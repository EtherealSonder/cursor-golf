import { Container, Sprite } from "pixi.js";
import { AssetLoader } from "../../rendering/AssetLoader";
import { GHOST_BALL_HUD } from "../config/GhostBallHudDefinition";

/** Ghost Ball HUD entry. DebuffHud animates its lifecycle. */
export class GhostBallIndicator {
    private readonly root = new Container();

    constructor() {
        const config = GHOST_BALL_HUD;
        this.root.label = "GhostBallIndicator";

        const holder = new Sprite(AssetLoader.getTexture("debuffHolder"));
        holder.anchor.set(0.5);
        holder.width = config.size;
        holder.height = config.size;
        holder.tint = config.holderTint;
        this.root.addChild(holder);

        const icon = new Sprite(AssetLoader.getTexture("ghostUi"));
        icon.anchor.set(0.5);
        icon.position.set(config.iconOffsetX, config.iconOffsetY);
        const iconBounds = config.size * config.iconScale;
        icon.scale.set(Math.min(iconBounds / icon.texture.width, iconBounds / icon.texture.height));
        this.root.addChild(icon);


    }

    public getContainer(): Container { return this.root; }
}

import { Container, Graphics, Sprite } from "pixi.js";
import { AssetLoader } from "../../../rendering/AssetLoader";
import { CONVEYOR_BELT_DEFINITION, normalizeConveyorRotation } from "../../config/ConveyorBeltDefinition";
import { CONVEYOR_BELT_ANIMATION, conveyorPlatformX } from "../../conveyor/ConveyorBeltAnimationDefinition";
import { Entity } from "../Entity";

/** CB2: masked, pooled, visual-only conveyor surface. No collision or transport forces. */
export class ConveyorBelt extends Entity {
    private readonly base: Sprite;
    private readonly platformLayer = new Container();
    private readonly platformMask = new Graphics();
    private readonly platforms: Sprite[] = [];
    private readonly rotationRadians: number;
    private elapsedSeconds = 0;

    constructor(private readonly mechanismId: string, x: number, y: number, rotation: number) {
        super();
        const cardinal = normalizeConveyorRotation(rotation);
        if (cardinal === null) throw new Error(`Invalid conveyor rotation: ${rotation}`);
        this.rotationRadians = cardinal;
        this.base = new Sprite(AssetLoader.getTexture(CONVEYOR_BELT_DEFINITION.baseTextureKey));
        this.base.anchor.set(0.5);
        this.base.width = CONVEYOR_BELT_DEFINITION.width;
        this.base.height = CONVEYOR_BELT_DEFINITION.height;
        const config = CONVEYOR_BELT_ANIMATION;
        this.platformMask.rect(-config.maskWidth / 2, -config.maskHeight / 2, config.maskWidth, config.maskHeight).fill(0xffffff);
        this.platformLayer.mask = this.platformMask;
        const texture = AssetLoader.getTexture(CONVEYOR_BELT_DEFINITION.platformTextureKey);
        for (let index = 0; index < config.poolSize; index++) {
            const sprite = new Sprite(texture);
            sprite.anchor.set(0.5);
            sprite.width = config.platformWidth;
            sprite.height = config.platformHeight;
            this.platforms.push(sprite);
            this.platformLayer.addChild(sprite);
        }
        // The opaque base sits below the clipped moving surface. Its housing remains
        // visible around the mask inset; no additional foreground rail sprite is needed.
        this.container.addChild(this.base, this.platformLayer, this.platformMask);
        this.container.rotation = cardinal;
        this.setPosition(x, y);
        this.positionPlatforms();
    }
    public getFootprintWidth(): number { return CONVEYOR_BELT_DEFINITION.width; }
    public getFootprintHeight(): number { return CONVEYOR_BELT_DEFINITION.height; }
    public getId(): string { return this.mechanismId; }
    public getRotationRadians(): number { return this.rotationRadians; }
    protected onInitialize(): void {}
    protected onUpdate(deltaTime: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;
        this.elapsedSeconds += deltaTime;
        this.positionPlatforms();
    }
    private positionPlatforms(): void {
        for (let index = 0; index < this.platforms.length; index++) {
            this.platforms[index].position.set(conveyorPlatformX(index, this.elapsedSeconds), 0);
        }
    }
    protected onDestroy(): void { this.container.destroy({ children: true }); }
}

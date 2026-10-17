import { Container, Graphics, Sprite } from "pixi.js";
import { AssetLoader } from "../../../rendering/AssetLoader";
import { CONVEYOR_BELT_DEFINITION, normalizeConveyorRotation } from "../../config/ConveyorBeltDefinition";
import { CONVEYOR_BELT_ANIMATION, conveyorPlatformX } from "../../conveyor/ConveyorBeltAnimationDefinition";
import { Entity } from "../Entity";
import { CONVEYOR_BELT_RENDERING } from "../../conveyor/ConveyorBeltRenderingDefinition";

/** CB2: masked, pooled, visual-only conveyor surface. No collision or transport forces. */
export class ConveyorBelt extends Entity {
    private readonly base: Sprite;
    private readonly platformLayer = new Container();
    private readonly opaqueBed = new Graphics();
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
        // Fill the transparent space between tiles so ground scorching cannot leak through.
        this.opaqueBed.rect(-config.maskWidth / 2, -config.maskHeight / 2, config.maskWidth, config.maskHeight)
            .fill(CONVEYOR_BELT_RENDERING.bedColor);
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
        this.container.addChild(this.base, this.opaqueBed, this.platformLayer, this.platformMask);
        this.container.rotation = cardinal;
        this.setPosition(x, y);
        this.positionPlatforms();
    }
    public getFootprintWidth(): number { return CONVEYOR_BELT_DEFINITION.width; }
    public getFootprintHeight(): number { return CONVEYOR_BELT_DEFINITION.height; }
    public getId(): string { return this.mechanismId; }
    /** Local +X is the belt travel direction; rotation handles all four orientations. */
    public getTransportDirection(): { x: number; y: number } {
        return { x: Math.cos(this.rotationRadians), y: Math.sin(this.rotationRadians) };
    }
    public getRotationRadians(): number { return this.rotationRadians; }
    /** Fractional influence near the conveyor edge, in conveyor-local coordinates. */
    public getSurfaceContactWeight(worldX: number, worldY: number): number {
        const dx = worldX - this.getX(), dy = worldY - this.getY();
        const c = Math.cos(this.rotationRadians), s = Math.sin(this.rotationRadians);
        const localX = c * dx + s * dy, localY = -s * dx + c * dy;
        const halfX = this.getFootprintWidth() / 2, halfY = this.getFootprintHeight() / 2;
        if (Math.abs(localX) >= halfX || Math.abs(localY) >= halfY) return 0;
        const edge = Math.min(halfX - Math.abs(localX), halfY - Math.abs(localY));
        return Math.min(1, edge / 12);
    }

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

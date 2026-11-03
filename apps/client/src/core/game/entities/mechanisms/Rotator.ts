import { Sprite } from "pixi.js";
import { shouldRenderRotators } from "../../rotator/RotatorPerformanceDebug";
import { AssetLoader } from "../../../rendering/AssetLoader";
import { ROTATOR_DEFINITION, type RotatorDirection } from "../../config/RotatorDefinition";
import { Entity } from "../Entity";
import type { OverdriveProfiles } from "../../world-modifiers/OverdriveDefinition";
import { advanceRotatorAngle, rotatorAngularVelocity } from "../../rotator/RotatorAnimationDefinition";

/** R2: fixed motorized visual entity; collision behavior arrives in R3. */
export class Rotator extends Entity {
    private readonly arms: Sprite;
    private readonly hub: Sprite;
    private angularVelocity: number;
    private overdriveEnabled = false;
    private armAngle = 0;
    constructor(private readonly mechanismId: string, x: number, y: number, private readonly direction: RotatorDirection) {
        super();
        this.angularVelocity = rotatorAngularVelocity(direction);
        this.arms = new Sprite(AssetLoader.getTexture(ROTATOR_DEFINITION.armsTextureKey));
        this.hub = new Sprite(AssetLoader.getTexture(ROTATOR_DEFINITION.hubTextureKey));
        for (const sprite of [this.arms, this.hub]) {
            sprite.anchor.set(0.5);
            sprite.width = ROTATOR_DEFINITION.diameter;
            sprite.height = ROTATOR_DEFINITION.diameter;
        }
        this.hub.width = ROTATOR_DEFINITION.hubDiameter;
        this.hub.height = ROTATOR_DEFINITION.hubDiameter;
        this.container.addChild(this.arms, this.hub);
        this.container.visible = shouldRenderRotators();
        this.setPosition(x, y);
    }
    /** WM-7C: change motor speed in place without resetting arm angle or collision state. */
    public setOverdriveProfile(profile: OverdriveProfiles["rotator"], enabled: boolean): void {
        if (this.overdriveEnabled === enabled) return;
        this.overdriveEnabled = enabled;
        this.angularVelocity = rotatorAngularVelocity(this.direction, enabled ? profile.angularSpeedDegreesPerSecond : undefined);
    }
    public getId(): string { return this.mechanismId; }
    public getDirection(): RotatorDirection { return this.direction; }
    public getDiameter(): number { return ROTATOR_DEFINITION.diameter; }
    public getArmsSprite(): Sprite { return this.arms; }
    public getArmAngle(): number { return this.armAngle; }
    /** The rendered angle is authoritative for final position-only contact projection. */
    public getRenderedArmAngle(): number { return this.arms.rotation; }
    public getAngularVelocity(): number { return this.angularVelocity; }
    public getCenter(): { x: number; y: number } { return { x: this.getX(), y: this.getY() }; }
    protected onInitialize(): void {}
    protected onUpdate(deltaTime: number): void {
        this.armAngle = advanceRotatorAngle(this.armAngle, this.angularVelocity, deltaTime);
        this.arms.rotation = this.armAngle;
        // The hub stays stationary and above the rotating arms.
    }
    protected onDestroy(): void { this.container.destroy({ children: true }); }
}

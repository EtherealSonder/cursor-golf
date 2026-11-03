import { Sprite } from "pixi.js";
import { AssetLoader } from "../../../rendering/AssetLoader";
import type { RotatingPaddleDefinition, RotatingPaddleDirection } from "../../config/RotatingPaddleDefinition";
import { createRotatingPaddleDefinition } from "../../config/RotatingPaddleDefinition";
import { Entity } from "../Entity";
import type { OverdriveProfiles } from "../../world-modifiers/OverdriveDefinition";
import type { FixedCircleCollisionShape } from "../../physics/DynamicCollidableCollision";

export class RotatingPaddle extends Entity {
    private readonly sprite: Sprite;
    private definition: RotatingPaddleDefinition;
    private readonly normalDefinition: RotatingPaddleDefinition;
    private overdriveEnabled = false;

    public constructor(
        private readonly mechanismId: string,
        x: number,
        y: number,
        private readonly direction: RotatingPaddleDirection,
    ) {
        super();
        this.normalDefinition = createRotatingPaddleDefinition(direction);
        this.definition = this.normalDefinition;
        this.sprite = new Sprite(AssetLoader.getTexture(this.definition.textureKey));
        this.sprite.anchor.set(0.5);
        this.sprite.width = this.definition.displayDiameter;
        this.sprite.height = this.definition.displayDiameter;
        this.container.addChild(this.sprite);
        this.setPosition(x, y);
    }

    /** WM-7C: replace only powered motion settings; preserve geometry, materials and water behavior. */
    public setOverdriveProfile(profile: OverdriveProfiles["paddle"], enabled: boolean): void {
        if (this.overdriveEnabled === enabled) return;
        this.overdriveEnabled = enabled;
        this.definition = enabled ? {
            ...this.normalDefinition,
            angularSpeedRadiansPerSecond: profile.angularSpeedRadiansPerSecond,
            targetTangentialSpeedAtOuterRadius: profile.ballTangentialTargetSpeed,
            ballOutwardEscapeSpeed: profile.ballOutwardEscapeSpeed,
            maximumBallSpeed: profile.ballMaximumSpeed,
            dynamicTargetTangentialSpeedAtOuterRadius: profile.bodyTangentialTargetSpeed,
            dynamicOutwardEscapeSpeed: profile.bodyOutwardEscapeSpeed,
            dynamicMaximumImpulsePerSecond: profile.maximumDynamicImpulsePerSecond,
        } : this.normalDefinition;
    }

    public getId(): string { return this.mechanismId; }
    public getDirection(): RotatingPaddleDirection { return this.direction; }
    public getDefinition(): RotatingPaddleDefinition { return this.definition; }
    public getCurrentRotationRadians(): number { return this.sprite.rotation; }
    public getSurfaceRadius(): number { return this.definition.poweredRadius; }
    public getCenterStopperRadius(): number { return this.definition.centerStopperRadius; }
    public getCenterColliderId(): string { return `${this.mechanismId}:center-stopper`; }
    public getCenterCollisionShape(): FixedCircleCollisionShape {
        return {
            id: this.getCenterColliderId(),
            shape: "circle",
            positionX: this.getX(),
            positionY: this.getY(),
            radius: this.definition.centerStopperRadius,
            material: {
                restitution: this.definition.centerRestitution,
                friction: this.definition.centerFriction,
            },
        };
    }
    public getSignedAngularVelocityRadiansPerSecond(): number {
        return (this.direction === "clockwise" ? 1 : -1)
            * this.definition.angularSpeedRadiansPerSecond;
    }
    public getTangentialDirectionAt(worldX: number, worldY: number): { x: number; y: number } | null {
        const dx = worldX - this.getX();
        const dy = worldY - this.getY();
        const distance = Math.hypot(dx, dy);
        if (distance <= 0.0001) return null;
        const radialX = dx / distance;
        const radialY = dy / distance;
        return this.direction === "clockwise"
            ? { x: -radialY, y: radialX }
            : { x: radialY, y: -radialX };
    }

    protected onInitialize(): void {
        // Sprite construction is intentionally eager because AssetLoader has already
        // completed before World creates gameplay entities.
    }

    protected onUpdate(deltaTime: number): void {
        const sign = this.direction === "clockwise" ? 1 : -1;
        this.sprite.rotation += sign * this.definition.angularSpeedRadiansPerSecond * deltaTime;
    }

    protected onDestroy(): void {
        this.sprite.destroy();
        this.container.destroy({ children: false });
    }
}

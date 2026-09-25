import { Container, Sprite } from "pixi.js";
import { AssetLoader } from "../../../rendering/AssetLoader";
import { DEFAULT_DIRECTIONAL_BUMPER_DEFINITION } from "../../config/DirectionalBumperDefinition";
import type { DirectionalBumperDefinition } from "../../config/DirectionalBumperDefinition";
import type { FixedRectangleCollisionShape } from "../../physics/DynamicCollidableCollision";
import { Entity } from "../Entity";

export type DirectionalBumperState = "idle" | "strike" | "hold" | "return" | "cooldown";

export class DirectionalBumper extends Entity {
    private readonly bodyContainer = new Container();
    private sprite: Sprite | null = null;
    private innerSprite: Sprite | null = null;
    private readonly definition: DirectionalBumperDefinition;
    private readonly colliderId: string;
    private readonly idleAngleRadians: number;
    private currentAngleRadians: number;
    private previousAngleRadians: number;
    private angularVelocityRadiansPerSecond = 0;
    private strikeStartAngleRadians: number;
    private targetStrikeAngleRadians: number;
    private returnStartAngleRadians: number;
    private state: DirectionalBumperState = "idle";
    private stateElapsedSeconds = 0;
    private impactAnimationElapsedSeconds = Number.POSITIVE_INFINITY;
    private innerBaseScaleX = 1;
    private innerBaseScaleY = 1;

    public constructor(
        id: string,
        pivotX: number,
        pivotY: number,
        idleAngleRadians = 0,
        definition: DirectionalBumperDefinition = DEFAULT_DIRECTIONAL_BUMPER_DEFINITION,
    ) {
        super();
        this.colliderId = id;
        this.definition = definition;
        this.idleAngleRadians = idleAngleRadians;
        this.currentAngleRadians = idleAngleRadians;
        this.previousAngleRadians = idleAngleRadians;
        this.strikeStartAngleRadians = idleAngleRadians;
        this.targetStrikeAngleRadians = idleAngleRadians;
        this.returnStartAngleRadians = idleAngleRadians;
        this.setPosition(pivotX, pivotY);
    }

    public getDefinition(): DirectionalBumperDefinition { return this.definition; }
    public getColliderId(): string { return this.colliderId; }
    public getIdleAngleRadians(): number { return this.idleAngleRadians; }
    public getCurrentAngleRadians(): number { return this.currentAngleRadians; }
    public getAngularVelocityRadiansPerSecond(): number { return this.angularVelocityRadiansPerSecond; }
    public getState(): DirectionalBumperState { return this.state; }
    public isIdle(): boolean { return this.state === "idle"; }

    /** DB-4 authoritative surface velocity at a world-space contact point. */
    /** DB-6 Water uses the same live oriented arm shape as rigid-body collision. */
    public getWaterCollisionShape(): FixedRectangleCollisionShape {
        return this.getCollisionShape();
    }

    public getSurfaceVelocityAtWorldPoint(worldX: number, worldY: number): { readonly x: number; readonly y: number } {
        const offsetX = worldX - this.getX();
        const offsetY = worldY - this.getY();
        const omega = this.angularVelocityRadiansPerSecond;
        return { x: -omega * offsetY, y: omega * offsetX };
    }

    /** DB-3 presentation-only pulse. Physics/collider dimensions remain unchanged. */
    public playImpactAnimation(): void {
        this.impactAnimationElapsedSeconds = 0;
    }

    public beginStrike(targetAngleRadians: number): boolean {
        if (this.state !== "idle") return false;
        this.strikeStartAngleRadians = this.currentAngleRadians;
        this.targetStrikeAngleRadians = targetAngleRadians;
        this.state = "strike";
        this.stateElapsedSeconds = 0;
        return true;
    }

    public getCollisionShape(): FixedRectangleCollisionShape {
        const directionX = Math.cos(this.currentAngleRadians);
        const directionY = Math.sin(this.currentAngleRadians);
        return {
            id: this.colliderId,
            shape: "rectangle",
            positionX: this.getX() + directionX * this.definition.armCenterDistanceFromPivot,
            positionY: this.getY() + directionY * this.definition.armCenterDistanceFromPivot,
            rotationRadians: this.currentAngleRadians,
            width: this.definition.armLength,
            height: this.definition.armThickness,
            material: this.definition.material,
        };
    }

    protected onInitialize(): void {
        this.sprite = new Sprite(AssetLoader.getTexture(this.definition.textureKey));
        this.sprite.anchor.set(this.definition.texturePivotNormalizedX, this.definition.texturePivotNormalizedY);
        this.sprite.width = this.definition.textureDisplayWidth;
        this.sprite.height = this.definition.textureDisplayHeight;
        this.bodyContainer.addChild(this.sprite);

        this.innerSprite = new Sprite(AssetLoader.getTexture(this.definition.innerTextureKey));
        this.innerSprite.anchor.set(this.definition.texturePivotNormalizedX, this.definition.texturePivotNormalizedY);
        // DB-3.1.1: register the inner pad independently from the outer body.
        // The overlay shares the authored pivot, but it must fit inside the rim
        // instead of inheriting the body's display dimensions.
        // Establish the authored display size once, then preserve the resulting
        // Pixi scale as the baseline for every impact flash. Setting Sprite.width
        // and Sprite.height changes Sprite.scale internally, so later resetting
        // scale to (1, 1) would restore the full native texture size.
        this.innerSprite.width = this.definition.innerDisplayWidth;
        this.innerSprite.height = this.definition.innerDisplayHeight;
        this.innerBaseScaleX = this.innerSprite.scale.x;
        this.innerBaseScaleY = this.innerSprite.scale.y;
        this.innerSprite.position.set(
            this.definition.innerLocalOffsetX,
            this.definition.innerLocalOffsetY,
        );
        this.innerSprite.alpha = 0;
        this.bodyContainer.addChild(this.innerSprite);
        this.bodyContainer.rotation = this.currentAngleRadians;
        this.container.addChild(this.bodyContainer);
    }

    protected onUpdate(deltaTime: number): void {
        const dt = Math.max(0, deltaTime);
        this.previousAngleRadians = this.currentAngleRadians;
        this.stateElapsedSeconds += dt;

        if (this.state === "strike") {
            const t = normalizedTime(this.stateElapsedSeconds, this.definition.strikeDurationSeconds);
            this.currentAngleRadians = lerpAngle(this.strikeStartAngleRadians, this.targetStrikeAngleRadians, easeOutCubic(t));
            if (t >= 1) {
                this.currentAngleRadians = this.targetStrikeAngleRadians;
                this.enterState("hold");
            }
        } else if (this.state === "hold") {
            if (this.stateElapsedSeconds >= this.definition.strikeHoldDurationSeconds) {
                this.returnStartAngleRadians = this.currentAngleRadians;
                this.enterState("return");
            }
        } else if (this.state === "return") {
            const t = normalizedTime(this.stateElapsedSeconds, this.definition.returnDurationSeconds);
            this.currentAngleRadians = lerpAngle(this.returnStartAngleRadians, this.idleAngleRadians, smoothStep(t));
            if (t >= 1) {
                this.currentAngleRadians = this.idleAngleRadians;
                this.enterState("cooldown");
            }
        } else if (this.state === "cooldown") {
            if (this.stateElapsedSeconds >= this.definition.cooldownDurationSeconds) this.enterState("idle");
        }

        this.angularVelocityRadiansPerSecond = dt > 0
            ? normalizeAngle(this.currentAngleRadians - this.previousAngleRadians) / dt
            : 0;
        this.bodyContainer.rotation = this.currentAngleRadians;
        this.updateImpactPresentation(dt);
    }

    protected onDestroy(): void {
        this.sprite?.destroy();
        this.innerSprite?.destroy();
        this.sprite = null;
        this.innerSprite = null;
        this.container.destroy({ children: true });
    }

    private updateImpactPresentation(deltaTime: number): void {
        if (!Number.isFinite(this.impactAnimationElapsedSeconds)) {
            this.resetImpactPresentation();
            return;
        }
        this.impactAnimationElapsedSeconds += deltaTime;
        const elapsed = this.impactAnimationElapsedSeconds;
        const expandEnd = this.definition.impactExpansionDurationSeconds;
        const holdEnd = expandEnd + this.definition.impactPeakHoldDurationSeconds;
        const contractEnd = holdEnd + this.definition.impactContractionDurationSeconds;
        const total = contractEnd + this.definition.impactRecoveryDurationSeconds;
        let scaleX = 1;
        let scaleY = 1;
        if (elapsed <= expandEnd) {
            const t = easeOutCubic(normalizedTime(elapsed, this.definition.impactExpansionDurationSeconds));
            scaleX = lerp(1, this.definition.impactStretchX, t);
            scaleY = lerp(1, this.definition.impactStretchY, t);
        } else if (elapsed <= holdEnd) {
            scaleX = this.definition.impactStretchX;
            scaleY = this.definition.impactStretchY;
        } else if (elapsed <= contractEnd) {
            const t = smoothStep(normalizedTime(elapsed - holdEnd, this.definition.impactContractionDurationSeconds));
            scaleX = lerp(this.definition.impactStretchX, this.definition.impactContractionScaleX, t);
            scaleY = lerp(this.definition.impactStretchY, this.definition.impactContractionScaleY, t);
        } else if (elapsed < total) {
            const t = smoothStep(normalizedTime(elapsed - contractEnd, this.definition.impactRecoveryDurationSeconds));
            scaleX = lerp(this.definition.impactContractionScaleX, 1, t);
            scaleY = lerp(this.definition.impactContractionScaleY, 1, t);
        } else {
            this.impactAnimationElapsedSeconds = Number.POSITIVE_INFINITY;
            this.resetImpactPresentation();
            return;
        }
        this.bodyContainer.scale.set(scaleX, scaleY);
        this.updateInnerFlash(elapsed);
    }

    private updateInnerFlash(elapsed: number): void {
        if (!this.innerSprite) return;
        const hold = this.definition.innerFlashHoldDurationSeconds;
        const recovery = this.definition.innerFlashRecoveryDurationSeconds;
        if (elapsed >= hold + recovery) {
            this.innerSprite.alpha = 0;
            this.innerSprite.scale.set(this.innerBaseScaleX, this.innerBaseScaleY);
            return;
        }
        const fade = elapsed <= hold ? 1 : 1 - smoothStep(normalizedTime(elapsed - hold, recovery));
        this.innerSprite.alpha = this.definition.innerFlashPeakAlpha * fade;
        const flashScaleX = 1 + (this.definition.innerFlashScaleX - 1) * fade;
        const flashScaleY = 1 + (this.definition.innerFlashScaleY - 1) * fade;
        this.innerSprite.scale.set(
            this.innerBaseScaleX * flashScaleX,
            this.innerBaseScaleY * flashScaleY,
        );
    }

    private resetImpactPresentation(): void {
        this.bodyContainer.scale.set(1, 1);
        if (this.innerSprite) {
            this.innerSprite.alpha = 0;
            this.innerSprite.scale.set(this.innerBaseScaleX, this.innerBaseScaleY);
        }
    }

    private enterState(state: DirectionalBumperState): void {
        this.state = state;
        this.stateElapsedSeconds = 0;
    }
}

function normalizedTime(elapsed: number, duration: number): number { return duration <= 0 ? 1 : Math.min(1, elapsed / duration); }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3); }
function smoothStep(t: number): number { return t * t * (3 - 2 * t); }
function normalizeAngle(angle: number): number {
    let result = angle;
    while (result > Math.PI) result -= Math.PI * 2;
    while (result < -Math.PI) result += Math.PI * 2;
    return result;
}
function lerpAngle(from: number, to: number, t: number): number { return from + normalizeAngle(to - from) * t; }

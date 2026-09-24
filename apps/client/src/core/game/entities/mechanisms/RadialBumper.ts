import { Container, Graphics, Sprite } from "pixi.js";

import {
    DEFAULT_RADIAL_BUMPER_DEFINITION,
} from "../../config/RadialBumperDefinition";
import type { RadialBumperDefinition } from "../../config/RadialBumperDefinition";
import type { StaticObstacleDefinition } from "../../config/ObstacleDefinition";
import type { StaticCollisionResponder } from "../../physics/StaticCollisionResponder";
import { AssetLoader } from "../../../rendering/AssetLoader";
import { Entity } from "../Entity";
import { RadialBumperImpactVfx } from "./RadialBumperImpactVfx";

/** Fixed circular kinetic bumper with RB-2 impact presentation. */
export class RadialBumper extends Entity {
    private readonly definition: RadialBumperDefinition;
    private readonly collisionDefinition: StaticObstacleDefinition;
    private readonly bodyContainer = new Container();
    private sprite: Sprite | null = null;
    private centerOverlay: Graphics | null = null;
    private impactVfx: RadialBumperImpactVfx | null = null;
    private impactElapsedSeconds = Number.POSITIVE_INFINITY;

    constructor(
        id: string,
        positionX: number,
        positionY: number,
        definition: RadialBumperDefinition = DEFAULT_RADIAL_BUMPER_DEFINITION,
    ) {
        super();
        if (id.trim().length === 0) throw new Error("Radial Bumper id cannot be empty.");
        if (!Number.isFinite(positionX) || !Number.isFinite(positionY)) {
            throw new Error("Radial Bumper position must contain finite values.");
        }
        if (definition.renderSize <= 0 || definition.colliderRadius <= 0) {
            throw new Error("Radial Bumper dimensions must be greater than zero.");
        }
        if (!Number.isFinite(definition.bounceSpeedMultiplier) || definition.bounceSpeedMultiplier <= 0) {
            throw new Error("Radial Bumper bounce multiplier must be greater than zero.");
        }

        this.definition = definition;
        this.collisionDefinition = {
            id,
            shape: "circle",
            positionX,
            positionY,
            radius: definition.colliderRadius,
            fillColor: 0xffffff,
            outlineColor: 0x000000,
            outlineWidth: 0,
            material: definition.material,
        };
        this.setPosition(positionX, positionY);
    }

    public getCollisionDefinition(): StaticObstacleDefinition {
        return this.collisionDefinition;
    }

    public getCollisionResponder(): StaticCollisionResponder {
        return ({ manifold, incomingSpeed }) => {
            // This responder is invoked only after Ball has confirmed an inward,
            // authoritative contact, so it is also the impact presentation trigger.
            this.triggerImpact();
            return {
                velocityX: manifold.normalX * incomingSpeed * this.definition.bounceSpeedMultiplier,
                velocityY: manifold.normalY * incomingSpeed * this.definition.bounceSpeedMultiplier,
            };
        };
    }

    public triggerImpact(): void {
        this.impactElapsedSeconds = 0;
        this.impactVfx?.trigger();
    }

    protected onInitialize(): void {
        this.sprite = new Sprite(AssetLoader.getTexture(this.definition.textureKey));
        this.sprite.anchor.set(0.5);
        this.sprite.width = this.definition.renderSize;
        this.sprite.height = this.definition.renderSize;
        this.bodyContainer.addChild(this.sprite);

        // The authored PNG remains the complete idle appearance. The reaction
        // overlay is invisible at rest and only contributes a short brightening
        // during impact, so it never reads as an extra permanent centre disc.
        this.centerOverlay = new Graphics();
        this.centerOverlay.circle(0, 0, this.definition.centerRadius).fill({
            color: this.definition.centerBrightColor,
        });
        this.centerOverlay.alpha = 0;
        this.bodyContainer.addChild(this.centerOverlay);

        this.impactVfx = new RadialBumperImpactVfx({
            startRadius: this.definition.shockwaveStartRadius,
            endRadius: this.definition.shockwaveEndRadius,
            durationSeconds: this.definition.shockwaveDurationSeconds,
            lineWidth: this.definition.shockwaveLineWidth,
            color: this.definition.shockwaveColor,
            startAlpha: this.definition.shockwaveStartAlpha,
        });

        // Ring is deliberately outside bodyContainer so visual body scaling never
        // changes the authored shockwave radius or the authoritative collider.
        this.container.addChild(this.impactVfx.getGraphics());
        this.container.addChild(this.bodyContainer);
    }

    protected onUpdate(deltaTime: number): void {
        this.impactVfx?.update(deltaTime);

        const expand = this.definition.impactExpandDurationSeconds;
        const contract = this.definition.impactContractDurationSeconds;
        const total = expand + contract;
        if (this.impactElapsedSeconds >= total) {
            this.bodyContainer.scale.set(1);
            if (this.centerOverlay) this.centerOverlay.alpha = 0;
            return;
        }

        this.impactElapsedSeconds += Math.max(0, deltaTime);
        const elapsed = Math.min(this.impactElapsedSeconds, total);
        let scale: number;
        let brightnessT: number;

        if (elapsed <= expand) {
            const t = expand > 0 ? elapsed / expand : 1;
            const eased = 1 - Math.pow(1 - t, 3);
            scale = 1 + (this.definition.impactExpandScale - 1) * eased;
            brightnessT = eased;
        } else {
            const t = contract > 0 ? (elapsed - expand) / contract : 1;
            const eased = 1 - Math.pow(1 - t, 3);
            scale = this.definition.impactExpandScale
                + (1 - this.definition.impactExpandScale) * eased;
            brightnessT = 1 - eased;
        }

        this.bodyContainer.scale.set(scale);
        if (this.centerOverlay) {
            // Alpha interpolation blends the bright reaction colour over the
            // original painted centre. At alpha 0 the source PNG is untouched.
            this.centerOverlay.alpha = brightnessT * this.definition.centerBrightOverlayMaxAlpha;
        }
    }

    protected onDestroy(): void {
        this.impactVfx?.destroy();
        this.impactVfx = null;
        this.centerOverlay?.destroy();
        this.centerOverlay = null;
        this.sprite?.destroy();
        this.sprite = null;
        this.container.destroy({ children: true });
    }

}

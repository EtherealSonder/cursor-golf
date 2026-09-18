import {
    Container,
    Graphics,
} from "pixi.js";

import type {
    SprinklerWaterVfxDefinition,
} from "../config/WaterVfxDefinition";

export interface SprinklerDropletPresentation {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly velocityX: number;
    readonly velocityY: number;
    readonly ageSeconds: number;
    readonly seed: number;
}

interface DropletSlot {
    readonly container: Container;
    readonly body: Graphics;
    readonly highlight: Graphics;
    seenThisFrame: boolean;
    seed: number;
}

/**
 * 8I-5 production Sprinkler spray renderer.
 *
 * Every visible mark corresponds to one CURRENT authoritative airborne packet.
 * Marks are never connected to one another, so sprinkler movement naturally
 * produces dotted curved trails without ribbon elbows, hooks or spider legs.
 */
export class SprinklerDropletRenderer {
    private readonly container = new Container();
    private readonly slots = new Map<string, DropletSlot>();
    private animationTime = 0;

    public constructor(
        private readonly definition: SprinklerWaterVfxDefinition,
    ) { }

    public getContainer(): Container {
        return this.container;
    }

    public beginFrame(): void {
        this.slots.forEach((slot): void => {
            slot.seenThisFrame = false;
        });
    }

    public setDroplet(
        presentation: SprinklerDropletPresentation,
    ): void {
        const slot =
            this.getOrCreateSlot(
                presentation.id,
                presentation.seed,
            );

        slot.seenThisFrame = true;
        slot.container.visible = true;
        slot.container.position.set(
            presentation.x,
            presentation.y,
        );

        const speed = Math.hypot(
            presentation.velocityX,
            presentation.velocityY,
        );

        if (speed > 1e-4) {
            slot.container.rotation =
                Math.atan2(
                    presentation.velocityY,
                    presentation.velocityX,
                ) +
                this.signedVariation(
                    presentation.seed + 31,
                    this.definition.rotationVariationRadians,
                );
        }

        const fadeAlpha =
            this.getAgeAlpha(
                presentation.ageSeconds,
            );

        const pulse =
            1 +
            Math.sin(
                this.animationTime *
                    this.definition.pulseSpeed +
                presentation.seed * 0.731,
            ) *
                this.definition.pulseAmplitude;

        slot.container.alpha =
            this.clamp01(
                fadeAlpha *
                    this.definition.bodyAlpha,
            );

        slot.container.scale.set(
            pulse,
            pulse,
        );
    }

    public endFrame(): void {
        this.slots.forEach((slot): void => {
            if (!slot.seenThisFrame) {
                slot.container.visible = false;
            }
        });
    }

    public update(deltaTime: number): void {
        if (
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return;
        }

        this.animationTime += deltaTime;
    }

    public reset(): void {
        this.animationTime = 0;

        this.slots.forEach((slot): void => {
            slot.seenThisFrame = false;
            slot.container.visible = false;
        });
    }

    public destroy(): void {
        this.slots.forEach((slot): void => {
            slot.body.destroy();
            slot.highlight.destroy();
            slot.container.destroy({
                children: false,
            });
        });

        this.slots.clear();
        this.container.removeFromParent();
        this.container.destroy({
            children: false,
        });
    }

    private getOrCreateSlot(
        id: string,
        seed: number,
    ): DropletSlot {
        const existing =
            this.slots.get(id);

        if (existing) {
            return existing;
        }

        const container = new Container();
        const body = new Graphics();
        const highlight = new Graphics();

        container.addChild(
            body,
            highlight,
        );

        this.container.addChild(container);

        const slot: DropletSlot = {
            container,
            body,
            highlight,
            seenThisFrame: true,
            seed,
        };

        this.drawSlot(slot);
        this.slots.set(id, slot);

        return slot;
    }

    private drawSlot(
        slot: DropletSlot,
    ): void {
        const lengthScale =
            1 +
            this.signedVariation(
                slot.seed + 11,
                this.definition.lengthVariation,
            );

        const widthScale =
            1 +
            this.signedVariation(
                slot.seed + 19,
                this.definition.widthVariation,
            );

        const length =
            Math.max(
                3,
                this.definition.dropletLength *
                    lengthScale,
            );

        const width =
            Math.max(
                2,
                this.definition.dropletWidth *
                    widthScale,
            );

        /*
         * The mark points along +X. Container rotation aligns it to the
         * authoritative packet velocity. A rounded capsule reads as a small
         * pressurised Water segment rather than the old debug circle.
         */
        slot.body
            .clear()
            .roundRect(
                -length * 0.5,
                -width * 0.5,
                length,
                width,
                width * 0.5,
            )
            .fill({
                color:
                    this.definition.bodyColor,
                alpha: 1,
            });

        const highlightLength =
            Math.max(
                2,
                length *
                    this.definition
                        .highlightLengthFraction,
            );

        const highlightWidth =
            Math.max(
                1,
                width *
                    this.definition
                        .highlightWidthFraction,
            );

        /*
         * Highlight sits toward the leading half of the moving mark. Because
         * the whole droplet travels outward, flow direction remains obvious
         * without needing a continuous animated stripe.
         */
        slot.highlight
            .clear()
            .roundRect(
                length * 0.05,
                -highlightWidth * 0.5,
                highlightLength,
                highlightWidth,
                highlightWidth * 0.5,
            )
            .fill({
                color:
                    this.definition.highlightColor,
                alpha:
                    this.definition.highlightAlpha,
            });
    }

    private getAgeAlpha(
        ageSeconds: number,
    ): number {
        if (
            ageSeconds <=
            this.definition.fadeStartAgeSeconds
        ) {
            return 1;
        }

        const duration =
            Math.max(
                1e-4,
                this.definition.fadeDurationSeconds,
            );

        return this.clamp01(
            1 -
                (
                    ageSeconds -
                    this.definition.fadeStartAgeSeconds
                ) /
                    duration,
        );
    }

    private signedVariation(
        seed: number,
        magnitude: number,
    ): number {
        const value =
            Math.sin(
                seed * 12.9898 + 78.233,
            ) *
            43758.5453;

        const normalized =
            value - Math.floor(value);

        return (
            (normalized * 2 - 1) *
            Math.max(0, magnitude)
        );
    }

    private clamp01(
        value: number,
    ): number {
        return Math.max(
            0,
            Math.min(1, value),
        );
    }
}

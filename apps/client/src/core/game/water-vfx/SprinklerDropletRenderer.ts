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
    readonly flightProgress: number;
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

        this.drawSlot(
            slot,
            presentation,
        );

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

        this.slots.set(id, slot);

        return slot;
    }

    private drawSlot(
        slot: DropletSlot,
        presentation: SprinklerDropletPresentation,
    ): void {
        const age =
            Math.max(
                0,
                presentation.ageSeconds,
            );

        const nearEnd =
            Math.max(
                0.001,
                this.definition.nearStageEndAgeSeconds,
            );
        const middleEnd =
            Math.max(
                nearEnd + 0.001,
                this.definition.middleStageEndAgeSeconds,
            );
        const terminalStart =
            Math.max(
                middleEnd + 0.001,
                this.definition.terminalDropletStartAgeSeconds,
            );

        let baseLength: number;
        let baseWidth: number;
        let downstreamProgress: number;

        if (age <= nearEnd) {
            const t =
                this.clamp01(age / nearEnd);

            baseLength =
                this.lerp(
                    this.definition.nearDropletLength,
                    this.definition.middleDropletLength,
                    t,
                );
            baseWidth =
                this.lerp(
                    this.definition.nearDropletWidth,
                    this.definition.middleDropletWidth,
                    t,
                );
            downstreamProgress = t * 0.33;
        } else if (age <= middleEnd) {
            const t =
                this.clamp01(
                    (age - nearEnd) /
                    (middleEnd - nearEnd),
                );

            baseLength =
                this.lerp(
                    this.definition.middleDropletLength,
                    this.definition.farDropletLength,
                    t,
                );
            baseWidth =
                this.lerp(
                    this.definition.middleDropletWidth,
                    this.definition.farDropletWidth,
                    t,
                );
            downstreamProgress =
                0.33 + t * 0.42;
        } else {
            const t =
                this.clamp01(
                    (age - middleEnd) /
                    (terminalStart - middleEnd),
                );

            /*
             * Far packets collapse toward compact droplets. They remain
             * velocity-aligned until the final stage, preserving the sense
             * of a fragmented pressurised jet rather than floating dots.
             */
            baseLength =
                this.lerp(
                    this.definition.farDropletLength,
                    this.definition.farDropletWidth,
                    t,
                );
            baseWidth =
                this.lerp(
                    this.definition.farDropletWidth,
                    this.definition.farDropletWidth * 0.88,
                    t,
                );
            downstreamProgress =
                0.75 + t * 0.25;
        }

        const variationMultiplier =
            this.lerp(
                1,
                this.definition.downstreamVariationMultiplier,
                this.clamp01(downstreamProgress),
            );

        /*
         * 8I-7A.1 gives each packet restrained deterministic individuality.
         * The downstream stage progression remains authoritative and there
         * is no positional or angular jitter in this renderer.
         */
        const lengthScale =
            1 +
            this.signedVariation(
                slot.seed + 11,
                this.definition.packetLengthVariation *
                this.lerp(
                    0.85,
                    1,
                    downstreamProgress,
                ),
            );

        const widthScale =
            1 +
            this.signedVariation(
                slot.seed + 19,
                this.definition.packetWidthVariation *
                this.lerp(
                    0.85,
                    1,
                    downstreamProgress,
                ),
            );

        const length =
            Math.max(
                3,
                baseLength * lengthScale,
            );
        const width =
            Math.max(
                2,
                baseWidth * widthScale,
            );

        const halfLength =
            length * 0.5;
        const tailHalfWidth =
            width *
            0.5 *
            Math.max(
                0.15,
                this.definition.tailWidthFraction,
            );
        const shoulderHalfWidth =
            width * 0.5;
        const noseHalfWidth =
            width *
            0.5 *
            Math.max(
                0.05,
                this.definition.noseWidthFraction,
            );

        /*
         * A tapered five-point silhouette replaces the old rounded capsule.
         * The leading point faces +X and the Container rotates +X onto the
         * authoritative packet velocity.
         */
        slot.body
            .clear()
            .moveTo(
                -halfLength,
                -tailHalfWidth,
            )
            .lineTo(
                halfLength * 0.42,
                -shoulderHalfWidth,
            )
            .lineTo(
                halfLength,
                -noseHalfWidth,
            )
            .lineTo(
                halfLength,
                noseHalfWidth,
            )
            .lineTo(
                halfLength * 0.42,
                shoulderHalfWidth,
            )
            .lineTo(
                -halfLength,
                tailHalfWidth,
            )
            .closePath()
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

        slot.highlight
            .clear()
            .roundRect(
                length * 0.02,
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

    private lerp(
        a: number,
        b: number,
        t: number,
    ): number {
        return a + (b - a) * t;
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

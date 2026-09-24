import {
    Container,
    Graphics,
} from "pixi.js";

import type {
    SprinklerWaterVfxDefinition,
} from "../config/WaterVfxDefinition";

export interface SprinklerDropletRendererPerformanceDetails {
    readonly beginFrameMilliseconds: number;
    readonly slotLookupCreateMilliseconds: number;
    readonly transformMilliseconds: number;
    readonly geometryMilliseconds: number;
    readonly styleMilliseconds: number;
    readonly endFrameMilliseconds: number;
    readonly createdSlots: number;
    readonly reusedSlots: number;
    readonly hiddenSlots: number;
    readonly totalSlots: number;
    readonly activeSlots: number;
    readonly updatedSlots: number;
    readonly renderedSlots: number;
}

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
    private frameBeginMilliseconds = 0;
    private frameSlotLookupCreateMilliseconds = 0;
    private frameTransformMilliseconds = 0;
    private frameGeometryMilliseconds = 0;
    private frameStyleMilliseconds = 0;
    private frameEndMilliseconds = 0;
    private frameCreatedSlots = 0;
    private frameReusedSlots = 0;
    private frameHiddenSlots = 0;
    private frameActiveSlots = 0;
    private frameUpdatedSlots = 0;
    private frameRenderedSlots = 0;

    public constructor(
        private readonly definition: SprinklerWaterVfxDefinition,
    ) { }

    public getContainer(): Container {
        return this.container;
    }

    public beginFrame(): void {
        this.frameSlotLookupCreateMilliseconds = 0;
        this.frameTransformMilliseconds = 0;
        this.frameGeometryMilliseconds = 0;
        this.frameStyleMilliseconds = 0;
        this.frameCreatedSlots = 0;
        this.frameReusedSlots = 0;
        this.frameHiddenSlots = 0;
        this.frameActiveSlots = 0;
        this.frameUpdatedSlots = 0;
        this.frameRenderedSlots = 0;

        // O3.2: do not sweep the historical pool at frame start. Slots that are
        // not seen are retired in endFrame, so the map contains only live visual work.
        this.frameBeginMilliseconds = 0;
    }

    /**
     * 8I-9B.3 batched hot path. Each profiling clock surrounds a complete
     * pass instead of every droplet, removing profiler overhead from the
     * workload being measured while preserving the same presentation math.
     */
    public renderFrame(
        presentations: readonly SprinklerDropletPresentation[],
    ): void {
        this.beginFrame();

        const resolvedSlots: DropletSlot[] = [];
        let startedAt = performance.now();
        for (let index = 0; index < presentations.length; index += 1) {
            const presentation = presentations[index];
            const existing = this.slots.get(presentation.id);
            const slot = existing ?? this.getOrCreateSlot(
                presentation.id,
                presentation.seed,
            );
            resolvedSlots.push(slot);
            if (existing) {
                this.frameReusedSlots += 1;
            } else {
                this.frameCreatedSlots += 1;
            }
            slot.seenThisFrame = true;
            slot.container.visible = true;
        }
        this.frameSlotLookupCreateMilliseconds = performance.now() - startedAt;

        startedAt = performance.now();
        for (let index = 0; index < presentations.length; index += 1) {
            const presentation = presentations[index];
            const slot = resolvedSlots[index];
            slot.container.position.set(presentation.x, presentation.y);

            const speedSquared =
                presentation.velocityX * presentation.velocityX +
                presentation.velocityY * presentation.velocityY;
            if (speedSquared > 1e-8) {
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
        }
        this.frameTransformMilliseconds = performance.now() - startedAt;

        startedAt = performance.now();
        for (let index = 0; index < presentations.length; index += 1) {
            this.drawSlot(
                resolvedSlots[index],
                presentations[index],
            );
        }
        this.frameGeometryMilliseconds = performance.now() - startedAt;

        startedAt = performance.now();
        for (let index = 0; index < presentations.length; index += 1) {
            const presentation = presentations[index];
            const slot = resolvedSlots[index];
            const fadeAlpha = this.getAgeAlpha(presentation.ageSeconds);
            const pulse =
                1 +
                Math.sin(
                    this.animationTime * this.definition.pulseSpeed +
                    presentation.seed * 0.731,
                ) * this.definition.pulseAmplitude;

            slot.container.alpha = this.clamp01(
                fadeAlpha * this.definition.bodyAlpha,
            );
            slot.container.scale.set(pulse, pulse);
        }
        this.frameStyleMilliseconds = performance.now() - startedAt;
        this.frameActiveSlots = presentations.length;
        this.frameUpdatedSlots = presentations.length;
        this.frameRenderedSlots = presentations.length;

        this.endFrame();
    }

    public setDroplet(
        presentation: SprinklerDropletPresentation,
    ): void {
        let startedAt = performance.now();
        const existing = this.slots.get(presentation.id);
        const slot = existing ?? this.getOrCreateSlot(
            presentation.id,
            presentation.seed,
        );
        this.frameSlotLookupCreateMilliseconds += performance.now() - startedAt;
        if (existing) {
            this.frameReusedSlots += 1;
        } else {
            this.frameCreatedSlots += 1;
        }

        startedAt = performance.now();
        slot.seenThisFrame = true;
        slot.container.visible = true;
        slot.container.position.set(presentation.x, presentation.y);

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
        this.frameTransformMilliseconds += performance.now() - startedAt;

        startedAt = performance.now();
        this.drawSlot(slot, presentation);
        this.frameGeometryMilliseconds += performance.now() - startedAt;

        startedAt = performance.now();
        const fadeAlpha = this.getAgeAlpha(presentation.ageSeconds);
        const pulse =
            1 +
            Math.sin(
                this.animationTime * this.definition.pulseSpeed +
                presentation.seed * 0.731,
            ) * this.definition.pulseAmplitude;

        slot.container.alpha = this.clamp01(
            fadeAlpha * this.definition.bodyAlpha,
        );
        slot.container.scale.set(pulse, pulse);
        this.frameStyleMilliseconds += performance.now() - startedAt;
    }

    public endFrame(): void {
        const startedAt = performance.now();
        // O3.2: packet ids are transient. Keeping one Graphics pair for every packet
        // ever seen made the slot map grow forever and forced O(N-history) sweeps.
        // Retire unseen presentation slots immediately. Authoritative packets live
        // in AirborneWaterSystem and can recreate a slot if they become visible again.
        for (const [id, slot] of this.slots) {
            if (slot.seenThisFrame) {
                slot.seenThisFrame = false;
                continue;
            }
            this.frameHiddenSlots += 1;
            slot.body.destroy();
            slot.highlight.destroy();
            slot.container.removeFromParent();
            slot.container.destroy({ children: false });
            this.slots.delete(id);
        }
        this.frameEndMilliseconds = performance.now() - startedAt;
    }

    public getPerformanceDetails(): SprinklerDropletRendererPerformanceDetails {
        return {
            beginFrameMilliseconds: this.frameBeginMilliseconds,
            slotLookupCreateMilliseconds: this.frameSlotLookupCreateMilliseconds,
            transformMilliseconds: this.frameTransformMilliseconds,
            geometryMilliseconds: this.frameGeometryMilliseconds,
            styleMilliseconds: this.frameStyleMilliseconds,
            endFrameMilliseconds: this.frameEndMilliseconds,
            createdSlots: this.frameCreatedSlots,
            reusedSlots: this.frameReusedSlots,
            hiddenSlots: this.frameHiddenSlots,
            totalSlots: this.slots.size,
            activeSlots: this.frameActiveSlots,
            updatedSlots: this.frameUpdatedSlots,
            renderedSlots: this.frameRenderedSlots,
        };
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

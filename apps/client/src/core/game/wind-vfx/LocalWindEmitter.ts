import { PerformanceInvestigationCounters as P2 } from "../debug/PerformanceInvestigationCounters";
import type {
    Texture,
} from "pixi.js";

import type {
    WindVfxDefinition,
} from "../config/WindVfxDefinition";

import type {
    LocalWindSourceDefinition,
} from "../config/LocalWindDefinition";

import type {
    LocalWindSystem,
} from "../environment/LocalWindSystem";

import type {
    WindVfxParticle,
} from "./WindVfxParticle";

import type {
    WindVfxPool,
} from "./WindVfxPool";

/**
 * Presentation-only emitter for Local Wind sources such as Fans.
 *
 * LocalWindSystem remains authoritative. This class only reads the current
 * source transform and simulation dimensions, then positions pooled Sprite
 * particles inside that exact stream.
 */
export class LocalWindEmitter {
    private performanceSpawnAttempts = 0;
    private performanceSpawned = 0;
    private performanceActiveSources = 0;

    public beginPerformanceFrame(): void {
        this.performanceSpawnAttempts = 0;
        this.performanceSpawned = 0;
        this.performanceActiveSources = 0;
    }

    public getPerformanceDetails() {
        return {
            spawnAttempts: this.performanceSpawnAttempts,
            spawned: this.performanceSpawned,
            activeSources: this.performanceActiveSources,
        };
    }


    private readonly particlesBySource =
        new Map<string, WindVfxParticle[]>();

    public constructor(
        private readonly localWindSystem:
            LocalWindSystem,

        private readonly pool:
            WindVfxPool,

        private readonly textures:
            readonly Texture[],

        private readonly definition:
            WindVfxDefinition,
    ) { }

    public update(
        deltaTime:
            number,
    ): void {

        const safeDeltaTime =
            Number.isFinite(
                deltaTime,
            )
                ? Math.max(
                    0,
                    deltaTime,
                )
                : 0;

        const sources = this.localWindSystem.getSources().filter(source =>
            !source.id.startsWith("fire-validation-field-") &&
            source.enabled &&
            Number.isFinite(source.positionX) && Number.isFinite(source.positionY) &&
            Number.isFinite(source.directionRadians) &&
            Number.isFinite(source.range) && source.range > 0,
        );

        const liveIds =
            new Set(
                sources.map(
                    (source): string =>
                        source.id,
                ),
            );

        for (
            const [
                sourceId,
                particles,
            ]
            of this.particlesBySource
        ) {
            if (
                liveIds.has(
                    sourceId,
                )
            ) {
                continue;
            }

            for (
                const particle
                of particles
            ) {
                this.pool.release(
                    particle,
                );
            }

            this.particlesBySource.delete(
                sourceId,
            );
        }

        for (
            const source
            of sources
        ) {
            this.updateSource(
                source,
                safeDeltaTime,
            );
        }
    }

    public reset(): void {
        for (
            const particles
            of this.particlesBySource.values()
        ) {
            for (
                const particle
                of particles
            ) {
                this.pool.release(
                    particle,
                );
            }
        }

        this.particlesBySource.clear();
    }

    private updateSource(
        source:
            LocalWindSourceDefinition,

        deltaTime:
            number,
    ): void {

        let particles =
            this.particlesBySource.get(
                source.id,
            );

        if (!particles) {
            particles =
                [];

            this.particlesBySource.set(
                source.id,
                particles,
            );
        }

        const pullFlow = source.flowMode === "pull";
        const target =
            source.enabled
                ? pullFlow
                    ? this.definition.local.pullParticlesPerSource
                    : this.definition.local.particlesPerSource
                : 0;

        while (
            particles.length <
            target
        ) {
            this.performanceSpawnAttempts += 1;
            const particle =
                this.pool.acquire();

            if (!particle) {
                break;
            }

            particles.push(
                particle,
            );

            this.recycle(
                particle,
                source,
                true,
            );
        }

        while (
            particles.length >
            target
        ) {
            const particle =
                particles.pop();

            if (particle) {
                this.pool.release(
                    particle,
                );
            }
        }

        const directionX =
            Math.cos(
                source.directionRadians,
            );

        const directionY =
            Math.sin(
                source.directionRadians,
            );

        const perpendicularX =
            -directionY;

        const perpendicularY =
            directionX;

        const forwardOffset = this.definition.local.frontOffset;
        const flowSign = pullFlow ? -1 : 1;
        const travelX = directionX * flowSign;
        const travelY = directionY * flowSign;
        const isClear = (x0: number, y0: number, x1: number, y1: number): boolean =>
            this.localWindSystem.isVfxSegmentClear(x0, y0, x1, y1);
        const outletX = source.positionX + directionX * forwardOffset;
        const outletY = source.positionY + directionY * forwardOffset;

        for (const particle of particles) {
            // Fan motion or rotation must not leave a particle detached from its source.
            const moved = Math.hypot(
                particle.sourcePositionX - source.positionX,
                particle.sourcePositionY - source.positionY,
            );
            const angleDelta = Math.atan2(
                Math.sin(particle.sourceDirectionRadians - source.directionRadians),
                Math.cos(particle.sourceDirectionRadians - source.directionRadians),
            );
            if (particle.terminated || moved > 3 || Math.abs(angleDelta) > 0.045) {
                this.recycle(particle, source, false);
            }

            const previousX = particle.positionX;
            const previousY = particle.positionY;
            particle.previousPositionX = previousX;
            particle.previousPositionY = previousY;
            particle.age += deltaTime;
            particle.distance += flowSign * particle.speed * deltaTime;
            const minimum = this.getMinimumCenterDistance(particle, pullFlow);
            const maximum = this.getMaximumCenterDistance(particle, source);
            if (particle.distance < minimum || particle.distance > maximum) {
                this.recycle(particle, source, false);
            }

            const progress = Math.max(0, Math.min(1, particle.distance / source.range));
            const halfWidth = this.lerp(source.startHalfWidth, source.endHalfWidth, progress);
            const baseLateral = particle.lateralRatio * halfWidth * this.definition.local.lateralFillRatio;
            const wave = Math.sin(particle.sinePhase + particle.age * particle.sineFrequency * Math.PI * 2)
                * particle.sineAmplitude;
            const lateral = Math.max(-halfWidth * 0.94, Math.min(halfWidth * 0.94, baseLateral + wave));
            const proposedX = outletX + directionX * particle.distance + perpendicularX * lateral;
            const proposedY = outletY + directionY * particle.distance + perpendicularY * lateral;
            const halfLength = particle.length * this.definition.local.spriteLengthMultiplier * 0.5;
            const rearX = proposedX - travelX * halfLength;
            const rearY = proposedY - travelY * halfLength;
            const tipX = proposedX + travelX * halfLength;
            const tipY = proposedY + travelY * halfLength;

            // One complete visual segment, not separate centre and clipped-tip sprites.
            // Swept movement prevents high-speed wisps from teleporting through a wall.
            P2.add("windParticleCenterTests");
            const obstructed =
                !isClear(outletX, outletY, proposedX, proposedY) ||
                !isClear(rearX, rearY, tipX, tipY) ||
                (!particle.terminated && particle.sprite.visible &&
                    !isClear(previousX, previousY, proposedX, proposedY));
            P2.add("windStreakTests");
            if (obstructed) {
                // Do not immediately respawn at the same wall contact: hold the
                // record hidden until the next update, then retry at the inlet.
                particle.terminate();
                continue;
            }

            particle.positionX = proposedX;
            particle.positionY = proposedY;
            particle.previousPositionX = proposedX;
            particle.previousPositionY = proposedY;
            particle.sourcePositionX = source.positionX;
            particle.sourcePositionY = source.positionY;
            particle.sourceDirectionRadians = source.directionRadians;
            particle.terminated = false;
            particle.sprite.visible = true;
            particle.sprite.position.set(proposedX, proposedY);
            particle.sprite.rotation = source.directionRadians + (pullFlow ? Math.PI : 0);
            particle.setRenderedSize(
                this.definition.local.spriteLengthMultiplier,
                this.definition.local.spriteWidthMultiplier,
            );
            const endFadeStart = this.definition.local.endFadeStart;
            const endFade = progress <= endFadeStart ? 1 : Math.max(0,
                1 - (progress - endFadeStart) / Math.max(0.001, 1 - endFadeStart));
            const inletFade = Math.max(0, Math.min(1,
                (particle.distance - minimum) / Math.max(18, particle.length * 0.24)));
            particle.sprite.alpha = particle.opacity * particle.softnessMultiplier *
                (pullFlow ? 1 : inletFade) * endFade;
        }
    }

    private recycle(
        particle:
            WindVfxParticle,

        source:
            LocalWindSourceDefinition,

        distribute:
            boolean,
    ): void {

        particle.sourceId =
            source.id;
        particle.terminated = false;
        particle.boundaryCulled = false;
        particle.sourcePositionX = source.positionX;
        particle.sourcePositionY = source.positionY;
        particle.sourceDirectionRadians = source.directionRadians;
        particle.sprite.visible = false;
        particle.sprite.alpha = 0;

        const pullFlow =
            source.flowMode === "pull";

        particle.speed =
            this.random(
                pullFlow
                    ? this.definition.local.pullMinimumSpeed
                    : this.definition.local.minimumSpeed,
                pullFlow
                    ? this.definition.local.pullMaximumSpeed
                    : this.definition.local.maximumSpeed,
            );

        particle.length =
            this.random(
                this.definition.local
                    .minimumLength,
                this.definition.local
                    .maximumLength,
            );

        particle.width =
            this.random(
                this.definition.local
                    .minimumWidth,
                this.definition.local
                    .maximumWidth,
            );

        particle.opacity =
            this.random(
                this.definition.local
                    .minimumOpacity,
                this.definition.local
                    .maximumOpacity,
            );

        particle.softnessMultiplier =
            Math.random() <
                this.definition.local
                    .softParticleChance
                ? this.random(
                    this.definition.local
                        .minimumSoftOpacityMultiplier,
                    this.definition.local
                        .maximumSoftOpacityMultiplier,
                )
                : 1;

        particle.lateralRatio =
            this.random(
                -1,
                1,
            );

        particle.age =
            0;

        particle.sinePhase =
            this.random(
                0,
                Math.PI *
                2,
            );

        particle.sineAmplitude =
            this.random(
                this.definition.local
                    .minimumSineAmplitude,
                this.definition.local
                    .maximumSineAmplitude,
            );

        particle.sineFrequency =
            this.random(
                this.definition.local
                    .minimumSineFrequency,
                this.definition.local
                    .maximumSineFrequency,
            );

        const minimumCenterDistance =
            this.getMinimumCenterDistance(
                particle,
                pullFlow,
            );

        const maximumCenterDistance =
            this.getMaximumCenterDistance(
                particle,
                source,
            );

        if (distribute) {
            const bias =
                Math.max(
                    1,
                    this.definition.local
                        .sourceDensityBias,
                );

            const biasedProgress =
                Math.pow(
                    Math.random(),
                    bias,
                );

            particle.distance =
                this.lerp(
                    minimumCenterDistance,
                    maximumCenterDistance,
                    source.flowMode === "pull" ? 1 - biasedProgress : biasedProgress,
                );
        } else {
            particle.distance = source.flowMode === "pull"
                ? maximumCenterDistance
                : minimumCenterDistance;
        }

        const texture =
            this.textures[
            Math.floor(
                Math.random() *
                this.textures.length,
            )
            ];

        if (texture) {
            particle.applyTexture(
                texture,
            );
        }

        particle.setRenderedSize(
            this.definition.local
                .spriteLengthMultiplier,
            this.definition.local
                .spriteWidthMultiplier,
        );

        // Only show a particle after its complete segment passes obstruction checks.
        particle.positionX = source.positionX +
            Math.cos(source.directionRadians) * (this.definition.local.frontOffset + particle.distance);
        particle.positionY = source.positionY +
            Math.sin(source.directionRadians) * (this.definition.local.frontOffset + particle.distance);
        particle.previousPositionX = particle.positionX;
        particle.previousPositionY = particle.positionY;
    }

    /**
     * Keep the centre far enough forward that the left edge of the Sprite does
     * not visibly extend behind the authoritative Fan outlet.
     */
    private getMinimumCenterDistance(
        particle:
            WindVfxParticle,

        pullFlow = false,
    ): number {

        /*
         * The Sprite is centre-anchored. Push streams keep their visible rear
         * edge at the Fan outlet. Pull streams deliberately travel a little
         * farther so the visible mask terminates inside the suction nozzle.
         */
        const halfRenderedLength =
            particle.length *
            this.definition.local.spriteLengthMultiplier *
            0.50;

        return Math.max(
            0,
            halfRenderedLength -
            (pullFlow
                ? this.definition.local.pullNozzleOverlap
                : 0),
        );
    }

    /**
     * Keep the particle centre far enough from the range end that its visible
     * forward half remains inside the Local Wind debug volume.
     */
    private getMaximumCenterDistance(
        particle:
            WindVfxParticle,

        source:
            LocalWindSourceDefinition,
    ): number {

        const minimumCenterDistance =
            this.getMinimumCenterDistance(
                particle,
                source.flowMode === "pull",
            );

        return Math.max(
            minimumCenterDistance,
            source.range -
            particle.length *
            this.definition.local
                .spriteLengthMultiplier *
            0.50 -
            this.definition.local
                .frontOffset,
        );
    }

    private lerp(
        start:
            number,

        end:
            number,

        amount:
            number,
    ): number {

        const clampedAmount =
            Math.max(
                0,
                Math.min(
                    1,
                    amount,
                ),
            );

        return (
            start +
            (
                end -
                start
            ) *
            clampedAmount
        );
    }

    private random(
        minimum:
            number,

        maximum:
            number,
    ): number {

        return (
            minimum +
            Math.random() *
            (
                maximum -
                minimum
            )
        );
    }
}

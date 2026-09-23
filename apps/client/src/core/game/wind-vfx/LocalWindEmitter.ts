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

        const sources =
            this.localWindSystem
                .getSources()
                .filter(
                    (source): boolean =>
                        !source.id.startsWith(
                            "fire-validation-field-",
                        ),
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

        for (
            const particle
            of particles
        ) {
            particle.age +=
                deltaTime;

            particle.distance +=
                (pullFlow ? -1 : 1) *
                particle.speed *
                deltaTime;

            const maximumCenterDistance =
                this.getMaximumCenterDistance(
                    particle,
                    source,
                );

            const minimumTravelDistance = this.getMinimumCenterDistance(
                particle,
                pullFlow,
            );
            if (
                (!pullFlow && particle.distance > maximumCenterDistance) ||
                (pullFlow && particle.distance < minimumTravelDistance)
            ) {
                this.recycle(particle, source, false);
            }

            const progress =
                source.range > 0
                    ? Math.max(
                        0,
                        Math.min(
                            1,
                            particle.distance /
                            source.range,
                        ),
                    )
                    : 0;

            /*
             * The Local Wind simulation currently uses equal start/end
             * half-widths, producing a rectangular tube. Keep this interpolation
             * so presentation remains compatible if the simulation definition
             * is intentionally changed later.
             */
            const halfWidth =
                this.lerp(
                    source.startHalfWidth,
                    source.endHalfWidth,
                    progress,
                );

            const baseLateral =
                particle.lateralRatio *
                halfWidth *
                this.definition.local
                    .lateralFillRatio;

            const sineOffset =
                Math.sin(
                    particle.sinePhase +
                    particle.age *
                    particle.sineFrequency *
                    Math.PI *
                    2,
                ) *
                particle.sineAmplitude;

            /*
             * Keep the visual wave inside the authoritative rectangular Wind
             * tube. This changes Sprite placement only, never Wind physics.
             */
            const lateralLimit =
                halfWidth *
                0.94;

            const lateral =
                Math.max(
                    -lateralLimit,
                    Math.min(
                        lateralLimit,
                        baseLateral +
                        sineOffset,
                    ),
                );

            const forward =
                this.definition.local
                    .frontOffset +
                particle.distance;

            const proposedX =
                source.positionX + directionX * forward + perpendicularX * lateral;
            const proposedY =
                source.positionY + directionY * forward + perpendicularY * lateral;
            const obstacleQuery = this.localWindSystem.getObstacleQuery();

            /*
             * The authoritative Wind query treats particles as points, while
             * the rendered masks are long centre-anchored streaks. A particle
             * centre can therefore still be clear while its visible leading
             * edge overlaps a blocker. First reject centres that have crossed
             * the hard cutoff, then clip the rendered streak against the same
             * obstacle boundary.
             */
            if (obstacleQuery?.segmentBlocked(
                source.positionX,
                source.positionY,
                proposedX,
                proposedY,
            )) {
                this.recycle(particle, source, false);
                continue;
            }

            const travelDirectionX =
                pullFlow
                    ? -directionX
                    : directionX;

            const travelDirectionY =
                pullFlow
                    ? -directionY
                    : directionY;

            const renderedLength =
                particle.length *
                this.definition.local
                    .spriteLengthMultiplier;

            const halfRenderedLength =
                renderedLength *
                0.5;

            const clearForwardLength =
                obstacleQuery
                    ? this.getClearForwardLength(
                        obstacleQuery,
                        proposedX,
                        proposedY,
                        travelDirectionX,
                        travelDirectionY,
                        halfRenderedLength,
                    )
                    : halfRenderedLength;

            /*
             * Leave a tiny visual clearance so antialiased mask pixels do not
             * bleed over the static collider edge.
             */
            const collisionClearance =
                1.5;

            const clippedForwardLength =
                Math.max(
                    0,
                    clearForwardLength -
                    collisionClearance,
                );

            const visibleRenderedLength =
                Math.min(
                    renderedLength,
                    halfRenderedLength +
                    clippedForwardLength,
                );

            if (
                visibleRenderedLength <=
                1
            ) {
                this.recycle(
                    particle,
                    source,
                    false,
                );
                continue;
            }

            /*
             * Sprite width scales around its centre. Shift the clipped Sprite
             * backwards by half of the removed leading length so its rear edge
             * stays fixed and its leading edge terminates at the blocker.
             */
            const removedLeadingLength =
                renderedLength -
                visibleRenderedLength;

            particle.positionX =
                proposedX -
                travelDirectionX *
                removedLeadingLength *
                0.5;

            particle.positionY =
                proposedY -
                travelDirectionY *
                removedLeadingLength *
                0.5;

            particle.sprite.position.set(
                particle.positionX,
                particle.positionY,
            );

            particle.sprite.rotation =
                source.directionRadians + (pullFlow ? Math.PI : 0);

            particle.setRenderedSize(
                this.definition.local
                    .spriteLengthMultiplier,
                this.definition.local
                    .spriteWidthMultiplier,
                renderedLength > 0
                    ? visibleRenderedLength /
                        renderedLength
                    : 0,
            );

            const endFadeStart =
                this.definition.local
                    .endFadeStart;

            const endFade =
                progress <=
                    endFadeStart
                    ? 1
                    : Math.max(
                        0,
                        1 -
                        (
                            progress -
                            endFadeStart
                        ) /
                        Math.max(
                            0.001,
                            1 -
                            endFadeStart,
                        ),
                    );

            /*
             * Fade in over a short fixed distance instead of a fraction of the
             * complete source range. This keeps the stream visibly connected to
             * the Fan outlet without creating a hard pop.
             */
            const inletFadeDistance =
                Math.max(
                    18,
                    particle.length *
                    0.24,
                );

            const minimumCenterDistance =
                this.getMinimumCenterDistance(
                    particle,
                    pullFlow,
                );

            const inletFade =
                Math.min(
                    1,
                    Math.max(
                        0,
                        (
                            particle.distance -
                            minimumCenterDistance
                        ) /
                        inletFadeDistance,
                    ),
                );

            /*
             * Retain a non-zero initial visibility so the first wisps visually
             * connect to the Fan mouth while still fading in smoothly.
             */
            const inletVisibility = pullFlow
                ? 1
                : 0.38 +
                    0.62 *
                    inletFade;

            particle.sprite.alpha =
                particle.opacity *
                particle.softnessMultiplier *
                inletVisibility *
                endFade;
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

        particle.sprite.visible =
            true;
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

    /**
     * Return the clear distance from a particle centre toward its visible
     * leading edge. Binary search is used only when the full leading half is
     * obstructed, keeping the common unobstructed path inexpensive.
     */
    private getClearForwardLength(
        obstacleQuery:
            NonNullable<ReturnType<LocalWindSystem["getObstacleQuery"]>>,

        centerX:
            number,

        centerY:
            number,

        directionX:
            number,

        directionY:
            number,

        maximumLength:
            number,
    ): number {

        if (
            maximumLength <=
            0
        ) {
            return 0;
        }

        const endX =
            centerX +
            directionX *
            maximumLength;

        const endY =
            centerY +
            directionY *
            maximumLength;

        if (!obstacleQuery.segmentBlocked(
            centerX,
            centerY,
            endX,
            endY,
        )) {
            return maximumLength;
        }

        let clearLength =
            0;

        let blockedLength =
            maximumLength;

        /*
         * Eight iterations resolve a typical 40-100 px Wind mask to well
         * below one pixel without adding per-frame collider allocations.
         */
        for (
            let iteration = 0;
            iteration < 8;
            iteration += 1
        ) {
            const candidateLength =
                (
                    clearLength +
                    blockedLength
                ) *
                0.5;

            const candidateX =
                centerX +
                directionX *
                candidateLength;

            const candidateY =
                centerY +
                directionY *
                candidateLength;

            if (obstacleQuery.segmentBlocked(
                centerX,
                centerY,
                candidateX,
                candidateY,
            )) {
                blockedLength =
                    candidateLength;
            } else {
                clearLength =
                    candidateLength;
            }
        }

        return clearLength;
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

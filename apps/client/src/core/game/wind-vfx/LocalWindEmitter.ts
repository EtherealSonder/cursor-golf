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

        const target =
            source.enabled
                ? this.definition.local
                    .particlesPerSource
                : 0;

        while (
            particles.length <
            target
        ) {
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
                particle.speed *
                deltaTime;

            const maximumCenterDistance =
                this.getMaximumCenterDistance(
                    particle,
                    source,
                );

            if (
                particle.distance >
                maximumCenterDistance
            ) {
                this.recycle(
                    particle,
                    source,
                    false,
                );
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

            particle.positionX =
                source.positionX +
                directionX *
                forward +
                perpendicularX *
                lateral;

            particle.positionY =
                source.positionY +
                directionY *
                forward +
                perpendicularY *
                lateral;

            particle.sprite.position.set(
                particle.positionX,
                particle.positionY,
            );

            particle.sprite.rotation =
                source.directionRadians;

            particle.setRenderedSize(
                this.definition.local
                    .spriteLengthMultiplier,
                this.definition.local
                    .spriteWidthMultiplier,
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
            const inletVisibility =
                0.38 +
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

        particle.speed =
            this.random(
                this.definition.local
                    .minimumSpeed,
                this.definition.local
                    .maximumSpeed,
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
                    biasedProgress,
                );
        } else {
            particle.distance =
                minimumCenterDistance;
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
    ): number {

        /*
         * The Sprite is centre-anchored. Position its centre by half of the
         * compensated rendered length so the visible mask begins at the exact
         * authoritative Local Wind tube origin rather than leaving a gap.
         */
        return Math.max(
            0,
            particle.length *
            this.definition.local
                .spriteLengthMultiplier *
            0.50,
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

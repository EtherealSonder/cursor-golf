import {
    Graphics,
} from "pixi.js";

import {
    DEFAULT_LOCAL_WIND_VISUAL_DEFINITION,
} from "../config/LocalWindDefinition";

import type {
    LocalWindSourceDefinition,
    LocalWindVisualDefinition,
} from "../config/LocalWindDefinition";

import type {
    LocalWindSystem,
} from "./LocalWindSystem";

interface LocalWindParticle {
    sourceIndex: number;
    distance: number;
    lateralRatio: number;
    speed: number;
    length: number;
    width: number;
    opacity: number;
}

/**
 * Development/local-Wind presentation.
 *
 * The simulation authority remains LocalWindSystem. This visualizer
 * deliberately uses a simple, readable stream:
 *
 * Fan/source -> straight forward streaks -> end of source range.
 *
 * Streaks never extend behind the source and the stream starts narrow
 * at the source opening before widening with the LocalWind field.
 */
export class LocalWindVisualizer {

    private readonly localWindSystem:
        LocalWindSystem;

    private readonly definition:
        LocalWindVisualDefinition;

    private readonly graphics:
        Graphics;

    private readonly particles:
        LocalWindParticle[] = [];

    private sourceSignature =
        "";

    private destroyed =
        false;

    /**
     * Keeps the first visible streak just in front of the Fan opening.
     * LocalWindSourceDefinition.position is also the airflow origin, so
     * this is presentation-only and does not change physics.
     */
    private readonly frontOffset =
        34;

    constructor(
        localWindSystem:
            LocalWindSystem,

        definition:
            LocalWindVisualDefinition =
            DEFAULT_LOCAL_WIND_VISUAL_DEFINITION,
    ) {
        this.localWindSystem =
            localWindSystem;

        this.validateDefinition(
            definition,
        );

        this.definition =
            definition;

        this.graphics =
            new Graphics();

        this.synchronizeParticlePool();
    }

    public getGraphics():
        Graphics {

        return this.graphics;
    }

    public update(
        deltaTime: number,
    ): void {

        if (
            this.destroyed ||
            !this.definition.enabled ||
            !Number.isFinite(deltaTime)
        ) {
            return;
        }

        this.synchronizeParticlePool();

        const safeDeltaTime =
            Math.max(
                0,
                deltaTime,
            );

        const sources =
            this.localWindSystem
                .getSources();

        for (
            const particle
            of this.particles
        ) {
            const source =
                sources[
                particle.sourceIndex
                ];

            if (
                !source ||
                !source.enabled
            ) {
                continue;
            }

            particle.distance +=
                particle.speed *
                safeDeltaTime;

            if (
                particle.distance >
                source.range
            ) {
                this.recycleParticle(
                    particle,
                    source,
                );
            }
        }

        this.drawParticles();
    }

    public destroy():
        void {

        if (this.destroyed) {
            return;
        }

        this.destroyed =
            true;

        this.particles.length =
            0;

        this.graphics
            .removeFromParent();

        this.graphics
            .destroy();
    }

    private synchronizeParticlePool():
        void {

        const sources =
            this.localWindSystem
                .getSources();

        /*
         * Runtime Fan translation/rotation is intentionally excluded from
         * the pool signature. Existing particles read the current source
         * transform every draw, so rebuilding the pool while a Fan moves
         * would create needless allocations and visible particle resets.
         */
        const nextSignature =
            sources
                .filter(
                    (source): boolean =>
                        !source.id.startsWith(
                            "fire-validation-field-",
                        ),
                )
                .map(
                    (source): string =>
                        [
                            source.id,
                            source.enabled ? "1" : "0",
                            source.range,
                            source.startHalfWidth,
                            source.endHalfWidth,
                        ].join(":"),
                )
                .join("|");

        if (
            nextSignature ===
            this.sourceSignature
        ) {
            return;
        }

        this.sourceSignature =
            nextSignature;

        this.particles.length =
            0;

        this.createParticlePool();

        this.graphics.clear();
    }

    private createParticlePool():
        void {

        if (!this.definition.enabled) {
            return;
        }

        const sources =
            this.localWindSystem
                .getSources();

        for (
            let sourceIndex = 0;
            sourceIndex < sources.length;
            sourceIndex += 1
        ) {
            const source =
                sources[sourceIndex];

            if (
                !source ||
                !source.enabled ||
                source.id.startsWith(
                    "fire-validation-field-",
                )
            ) {
                continue;
            }

            for (
                let particleIndex = 0;
                particleIndex <
                this.definition.particlesPerSource;
                particleIndex += 1
            ) {
                this.particles.push(
                    this.createParticle(
                        sourceIndex,
                        source,
                        false,
                    ),
                );
            }
        }
    }

    private createParticle(
        sourceIndex: number,
        source: LocalWindSourceDefinition,
        nearSource: boolean,
    ): LocalWindParticle {

        const length =
            this.randomBetween(
                this.definition.minimumParticleLength,
                this.definition.maximumParticleLength,
            );

        const minimumDistance =
            this.getMinimumHeadDistance(
                length,
                source,
            );

        return {
            sourceIndex,

            distance:
                nearSource
                    ? minimumDistance
                    : this.randomBetween(
                        minimumDistance,
                        Math.max(
                            minimumDistance,
                            source.range,
                        ),
                    ),

            /*
             * Keep the source mouth visually narrow. The actual world
             * stream widens later through interpolation in drawParticle.
             */
            lateralRatio:
                this.randomBetween(
                    -0.72,
                    0.72,
                ),

            speed:
                this.randomBetween(
                    this.definition.minimumParticleSpeed,
                    this.definition.maximumParticleSpeed,
                ),

            length,

            width:
                this.randomBetween(
                    this.definition.minimumParticleWidth,
                    this.definition.maximumParticleWidth,
                ),

            opacity:
                this.randomBetween(
                    this.definition.minimumOpacity,
                    this.definition.maximumOpacity,
                ),
        };
    }

    private recycleParticle(
        particle: LocalWindParticle,
        source: LocalWindSourceDefinition,
    ): void {

        const replacement =
            this.createParticle(
                particle.sourceIndex,
                source,
                true,
            );

        particle.distance =
            replacement.distance;

        particle.lateralRatio =
            replacement.lateralRatio;

        particle.speed =
            replacement.speed;

        particle.length =
            replacement.length;

        particle.width =
            replacement.width;

        particle.opacity =
            replacement.opacity;
    }

    private drawParticles():
        void {

        this.graphics.clear();

        const sources =
            this.localWindSystem
                .getSources();

        for (
            const particle
            of this.particles
        ) {
            const source =
                sources[
                particle.sourceIndex
                ];

            if (
                !source ||
                !source.enabled ||
                source.id.startsWith(
                    "fire-validation-field-",
                )
            ) {
                continue;
            }

            this.drawParticle(
                particle,
                source,
            );
        }
    }

    private drawParticle(
        particle: LocalWindParticle,
        source: LocalWindSourceDefinition,
    ): void {

        const minimumHeadDistance =
            this.getMinimumHeadDistance(
                particle.length,
                source,
            );

        const distance =
            Math.min(
                Math.max(
                    particle.distance,
                    minimumHeadDistance,
                ),
                source.range,
            );

        const progress =
            source.range > 0
                ? Math.min(
                    1,
                    Math.max(
                        0,
                        distance /
                        source.range,
                    ),
                )
                : 0;

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

        /*
         * The visible stream remains slightly narrower than the
         * simulation field for readability, but now occupies most of
         * the authored physical width so players can better judge when
         * the Ball is inside or outside the airflow.
         */
        const visualHalfWidth =
            this.lerp(
                Math.max(
                    8,
                    source.startHalfWidth *
                    0.60,
                ),
                Math.max(
                    12,
                    source.endHalfWidth *
                    0.80,
                ),
                progress,
            );

        const lateral =
            particle.lateralRatio *
            visualHalfWidth;

        const headX =
            source.positionX +
            directionX *
            distance +
            perpendicularX *
            lateral;

        const headY =
            source.positionY +
            directionY *
            distance +
            perpendicularY *
            lateral;

        /*
         * Because distance is always >= frontOffset + length, the tail
         * can never cross behind the source/Fan.
         */
        const tailDistance =
            Math.max(
                this.frontOffset,
                distance -
                particle.length,
            );

        const tailX =
            source.positionX +
            directionX *
            tailDistance +
            perpendicularX *
            lateral;

        const tailY =
            source.positionY +
            directionY *
            tailDistance +
            perpendicularY *
            lateral;

        const sourceFade =
            Math.min(
                1,
                Math.max(
                    0,
                    (
                        distance -
                        minimumHeadDistance
                    ) /
                    34,
                ),
            );

        const endFade =
            progress > 0.92
                ? Math.max(
                    0,
                    (1 - progress) /
                    0.08,
                )
                : 1;

        const alpha =
            particle.opacity *
            Math.max(
                0.22,
                sourceFade,
            ) *
            endFade;

        if (alpha <= 0.01) {
            return;
        }

        this.graphics
            .moveTo(
                tailX,
                tailY,
            )
            .lineTo(
                headX,
                headY,
            )
            .stroke({
                width:
                    particle.width,
                color:
                    this.definition.lineColor,
                alpha,
                cap:
                    "round",
            });
    }

    private getMinimumHeadDistance(
        particleLength: number,
        source: LocalWindSourceDefinition,
    ): number {

        return Math.min(
            source.range,
            this.frontOffset +
            particleLength,
        );
    }

    private lerp(
        start: number,
        end: number,
        amount: number,
    ): number {

        return (
            start +
            (end - start) *
            Math.min(
                1,
                Math.max(
                    0,
                    amount,
                ),
            )
        );
    }

    private randomBetween(
        minimum: number,
        maximum: number,
    ): number {

        return (
            minimum +
            Math.random() *
            (maximum - minimum)
        );
    }

    private validateDefinition(
        definition:
            LocalWindVisualDefinition,
    ): void {

        if (
            !Number.isInteger(
                definition.particlesPerSource,
            ) ||
            definition.particlesPerSource < 0
        ) {
            throw new Error(
                "Local wind particlesPerSource must be a non-negative integer.",
            );
        }

        const positiveValues = [
            definition.minimumParticleSpeed,
            definition.maximumParticleSpeed,
            definition.minimumParticleLength,
            definition.maximumParticleLength,
            definition.minimumParticleWidth,
            definition.maximumParticleWidth,
            definition.sourceDensityBias,
        ];

        if (
            !positiveValues.every(
                (value) =>
                    Number.isFinite(value) &&
                    value > 0,
            )
        ) {
            throw new Error(
                "Local wind visual speed, length, width, and density values must be finite and positive.",
            );
        }

        if (
            definition.maximumParticleSpeed <
            definition.minimumParticleSpeed ||
            definition.maximumParticleLength <
            definition.minimumParticleLength ||
            definition.maximumParticleWidth <
            definition.minimumParticleWidth
        ) {
            throw new Error(
                "Local wind visual maximum values cannot be below their minimum values.",
            );
        }

        if (
            definition.minimumOpacity < 0 ||
            definition.maximumOpacity > 1 ||
            definition.maximumOpacity <
            definition.minimumOpacity
        ) {
            throw new Error(
                "Local wind opacity range must remain between zero and one.",
            );
        }
    }
}

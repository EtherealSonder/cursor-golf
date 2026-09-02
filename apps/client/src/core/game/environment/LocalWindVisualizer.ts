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
 * Presentation-only visualization for local airflow.
 *
 * One reusable PixiJS Graphics object renders all
 * local streams. Particles are stored as lightweight
 * plain records and recycle inside their owning
 * source.
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

    private destroyed =
        false;

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

        this.createParticlePool();
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
            !this.definition
                .enabled
        ) {
            return;
        }

        if (
            !Number.isFinite(
                deltaTime,
            )
        ) {
            return;
        }

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
                source.range +
                this.definition
                    .recyclePadding
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

        if (
            this.destroyed
        ) {
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

    private createParticlePool():
        void {

        if (
            !this.definition
                .enabled
        ) {
            return;
        }

        const sources =
            this.localWindSystem
                .getSources();

        for (
            let sourceIndex = 0;
            sourceIndex <
            sources.length;
            sourceIndex += 1
        ) {
            const source =
                sources[
                sourceIndex
                ];

            if (
                !source ||
                !source.enabled
            ) {
                continue;
            }

            for (
                let particleIndex = 0;
                particleIndex <
                this.definition
                    .particlesPerSource;
                particleIndex += 1
            ) {
                const particle:
                    LocalWindParticle = {

                    sourceIndex,

                    distance:
                        Math.random() *
                        source.range,

                    lateralRatio:
                        this.randomBetween(
                            -0.92,
                            0.92,
                        ),

                    speed:
                        this.randomBetween(
                            this.definition
                                .minimumParticleSpeed,
                            this.definition
                                .maximumParticleSpeed,
                        ),

                    length:
                        this.randomBetween(
                            this.definition
                                .minimumParticleLength,
                            this.definition
                                .maximumParticleLength,
                        ),

                    width:
                        this.randomBetween(
                            this.definition
                                .minimumParticleWidth,
                            this.definition
                                .maximumParticleWidth,
                        ),

                    opacity:
                        this.randomBetween(
                            this.definition
                                .minimumOpacity,
                            this.definition
                                .maximumOpacity,
                        ),
                };

                this.particles.push(
                    particle,
                );
            }
        }
    }

    private recycleParticle(
        particle:
            LocalWindParticle,

        source:
            LocalWindSourceDefinition,
    ): void {

        particle.distance =
            this.randomBetween(
                0,
                Math.min(
                    28,
                    source.range *
                    0.08,
                ),
            );

        particle.lateralRatio =
            this.randomBetween(
                -0.92,
                0.92,
            );

        particle.speed =
            this.randomBetween(
                this.definition
                    .minimumParticleSpeed,
                this.definition
                    .maximumParticleSpeed,
            );

        particle.length =
            this.randomBetween(
                this.definition
                    .minimumParticleLength,
                this.definition
                    .maximumParticleLength,
            );

        particle.width =
            this.randomBetween(
                this.definition
                    .minimumParticleWidth,
                this.definition
                    .maximumParticleWidth,
            );

        particle.opacity =
            this.randomBetween(
                this.definition
                    .minimumOpacity,
                this.definition
                    .maximumOpacity,
            );
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
                !source.enabled
            ) {
                continue;
            }

            const clampedDistance =
                Math.min(
                    Math.max(
                        particle.distance,
                        0,
                    ),
                    source.range,
                );

            const progress =
                source.range >
                    0
                    ? clampedDistance /
                    source.range
                    : 0;

            const currentHalfWidth =
                this.lerp(
                    source.startHalfWidth,
                    source.endHalfWidth,
                    progress,
                );

            const lateralOffset =
                particle.lateralRatio *
                currentHalfWidth;

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

            const headX =
                source.positionX +
                directionX *
                clampedDistance +
                perpendicularX *
                lateralOffset;

            const headY =
                source.positionY +
                directionY *
                clampedDistance +
                perpendicularY *
                lateralOffset;

            const tailX =
                headX -
                directionX *
                particle.length;

            const tailY =
                headY -
                directionY *
                particle.length;

            const edgeFade =
                1 -
                Math.pow(
                    Math.abs(
                        particle.lateralRatio,
                    ),
                    4,
                );

            const endFade =
                progress >
                    0.88
                    ? Math.max(
                        0,
                        (
                            1 -
                            progress
                        ) /
                        0.12,
                    )
                    : 1;

            const renderedOpacity =
                particle.opacity *
                edgeFade *
                endFade;

            if (
                renderedOpacity <=
                0
            ) {
                continue;
            }

            this.graphics
                .moveTo(
                    tailX,
                    tailY,
                );

            this.graphics
                .lineTo(
                    headX,
                    headY,
                );

            this.graphics
                .stroke({
                    width:
                        particle.width,

                    color:
                        this.definition
                            .lineColor,

                    alpha:
                        renderedOpacity,
                });
        }
    }

    private lerp(
        start: number,
        end: number,
        amount: number,
    ): number {

        return (
            start +
            (
                end -
                start
            ) *
            Math.min(
                Math.max(
                    amount,
                    0,
                ),
                1,
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
            (
                maximum -
                minimum
            )
        );
    }

    private validateDefinition(
        definition:
            LocalWindVisualDefinition,
    ): void {

        if (
            !Number.isInteger(
                definition
                    .particlesPerSource,
            ) ||
            definition
                .particlesPerSource <
            0
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
        ];

        if (
            !positiveValues.every(
                (
                    value,
                ) =>
                    Number.isFinite(
                        value,
                    ) &&
                    value >
                    0,
            )
        ) {
            throw new Error(
                "Local wind particle speed, length, and width values must be finite and positive.",
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
            definition.minimumOpacity <
            0 ||
            definition.maximumOpacity >
            1 ||
            definition.maximumOpacity <
            definition.minimumOpacity
        ) {
            throw new Error(
                "Local wind opacity range must remain between zero and one.",
            );
        }

        if (
            !Number.isFinite(
                definition
                    .recyclePadding,
            ) ||
            definition
                .recyclePadding <
            0
        ) {
            throw new Error(
                "Local wind recyclePadding must be finite and non-negative.",
            );
        }
    }
}

import {
    Graphics,
} from "pixi.js";

import type {
    Camera,
} from "../camera/Camera";

import {
    DEFAULT_COURSE_BOUNDARY_DEFINITION,
} from "../config/CourseBoundaryDefinition";

import {
    DEFAULT_WIND_VISUAL_DEFINITION,
} from "../config/WindVisualDefinition";

import type {
    CourseBoundaryDefinition,
} from "../config/CourseBoundaryDefinition";

import type {
    WindVisualDefinition,
} from "../config/WindVisualDefinition";

import type {
    WindManager,
    WindState,
} from "./WindManager";

interface WindParticle {

    positionX: number;

    positionY: number;

    length: number;

    baseWidth: number;

    opacity: number;

    speedMultiplier: number;

    age: number;

    lifetime: number;
}

interface WindVisualBounds {

    readonly minimumX: number;

    readonly maximumX: number;

    readonly minimumY: number;

    readonly maximumY: number;
}

/**
 * Lightweight world-space visualization of the
 * authoritative environmental wind.
 *
 * The visualizer uses one PixiJS Graphics object and
 * one fixed pool of reusable particle records.
 *
 * Every particle travels directly along the global
 * WindManager direction.
 *
 * The visual shape is intentionally simple:
 *
 * thin tail
 * full middle
 * thin head
 *
 * This creates a small rice-like wind streak without
 * wiggles, curves, swirls, or independent motion.
 */
export class WindVisualizer {

    private readonly windManager:
        WindManager;

    private readonly camera:
        Camera;

    private readonly courseBoundaryDefinition:
        CourseBoundaryDefinition;

    private readonly definition:
        WindVisualDefinition;

    private readonly graphics:
        Graphics;

    private readonly particles:
        WindParticle[] = [];

    private unsubscribeFromWind:
        (() => void) | null =
        null;

    private directionX = 1;

    private directionY = 0;

    private strength = 0;

    private normalizedStrength = 0;

    private activeParticleCount = 0;

    private destroyed = false;

    constructor(
        windManager:
            WindManager,

        camera:
            Camera,

        definition:
            WindVisualDefinition =
            DEFAULT_WIND_VISUAL_DEFINITION,

        courseBoundaryDefinition:
            CourseBoundaryDefinition =
            DEFAULT_COURSE_BOUNDARY_DEFINITION,
    ) {

        this.windManager =
            windManager;

        this.camera =
            camera;

        this.validateDefinition(
            definition,
        );

        this.definition =
            definition;

        this.validateCourseBoundaryDefinition(
            courseBoundaryDefinition,
        );

        this.courseBoundaryDefinition =
            courseBoundaryDefinition;

        this.graphics =
            new Graphics();

        this.createParticlePool();

        this.unsubscribeFromWind =
            this.windManager
                .subscribe(
                    (
                        windState:
                            WindState,
                    ): void => {

                        this.applyWindState(
                            windState,
                        );
                    },
                );
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    public update(
        deltaTime:
            number,
    ): void {

        if (
            this.destroyed ||
            !this.definition
                .enabled
        ) {
            return;
        }

        /*
         * Presentation code should never halt the game
         * because of an irregular animation-frame
         * timestep.
         */
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

        if (
            this.strength <= 0 ||
            this.activeParticleCount <= 0
        ) {
            this.graphics
                .clear();

            return;
        }

        const bounds =
            this.calculateVisualBounds();

        const particleSpeed =
            this.calculateBaseParticleSpeed();

        for (
            let particleIndex = 0;
            particleIndex <
            this.activeParticleCount;
            particleIndex += 1
        ) {

            const particle =
                this.particles[
                particleIndex
                ];

            if (!particle) {
                continue;
            }

            particle.age +=
                safeDeltaTime;

            /*
             * The actual particle movement always
             * follows the authoritative WindManager
             * direction.
             */
            particle.positionX +=
                this.directionX *
                particleSpeed *
                particle
                    .speedMultiplier *
                safeDeltaTime;

            particle.positionY +=
                this.directionY *
                particleSpeed *
                particle
                    .speedMultiplier *
                safeDeltaTime;

            if (
                particle.age >=
                particle
                    .lifetime ||
                this.isOutsideBounds(
                    particle,
                    bounds,
                )
            ) {
                this.recycleParticleAtEntryEdge(
                    particle,
                    bounds,
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

        this.unsubscribeFromWind
            ?.();

        this.unsubscribeFromWind =
            null;

        this.particles
            .length =
            0;

        this.graphics
            .removeFromParent();

        this.graphics
            .destroy();
    }

    // -------------------------------------------------------------------------
    // Rendering Access
    // -------------------------------------------------------------------------

    public getGraphics():
        Graphics {

        return this.graphics;
    }

    // -------------------------------------------------------------------------
    // Wind State
    // -------------------------------------------------------------------------

    private applyWindState(
        windState:
            WindState,
    ): void {

        const previousActiveCount =
            this.activeParticleCount;

        this.directionX =
            windState
                .normalizedDirection
                .x;

        this.directionY =
            windState
                .normalizedDirection
                .y;

        this.strength =
            windState
                .strength;

        this.normalizedStrength =
            Math.min(
                Math.max(
                    windState
                        .normalizedStrength,
                    0,
                ),
                1,
            );

        this.activeParticleCount =
            this.calculateActiveParticleCount();

        if (
            !this.definition
                .enabled ||
            this.activeParticleCount <= 0
        ) {
            this.graphics
                .clear();

            return;
        }

        /*
         * If stronger wind activates additional
         * particles, scatter those newly active
         * particles throughout the current region.
         *
         * This avoids waiting for them to enter from
         * the edge.
         */
        if (
            this.activeParticleCount >
            previousActiveCount
        ) {

            const bounds =
                this.calculateVisualBounds();

            for (
                let particleIndex =
                    previousActiveCount;
                particleIndex <
                this.activeParticleCount;
                particleIndex += 1
            ) {

                const particle =
                    this.particles[
                    particleIndex
                    ];

                if (!particle) {
                    continue;
                }

                this.scatterParticle(
                    particle,
                    bounds,
                );
            }
        }
    }

    // -------------------------------------------------------------------------
    // Particle Pool
    // -------------------------------------------------------------------------

    private createParticlePool():
        void {

        for (
            let particleIndex = 0;
            particleIndex <
            this.definition
                .maximumParticleCount;
            particleIndex += 1
        ) {

            this.particles
                .push({
                    positionX:
                        0,

                    positionY:
                        0,

                    length:
                        this.definition
                            .minimumParticleLength,

                    baseWidth:
                        this.definition
                            .minimumParticleWidth,

                    opacity:
                        this.definition
                            .minimumParticleOpacity,

                    speedMultiplier:
                        1,

                    age:
                        0,

                    lifetime:
                        this.definition
                            .maximumLifetime,
                });
        }
    }

    private scatterParticle(
        particle:
            WindParticle,

        bounds:
            WindVisualBounds,
    ): void {

        particle.positionX =
            this.randomBetween(
                bounds.minimumX,
                bounds.maximumX,
            );

        particle.positionY =
            this.randomBetween(
                bounds.minimumY,
                bounds.maximumY,
            );

        this.randomizeParticleAppearance(
            particle,
        );

        /*
         * Randomized initial age prevents the whole
         * particle pool from sharing the same
         * lifecycle phase.
         */
        particle.age =
            Math.random() *
            particle.lifetime;
    }

    private recycleParticleAtEntryEdge(
        particle:
            WindParticle,

        bounds:
            WindVisualBounds,
    ): void {

        const absoluteDirectionX =
            Math.abs(
                this.directionX,
            );

        const absoluteDirectionY =
            Math.abs(
                this.directionY,
            );

        const componentTotal =
            absoluteDirectionX +
            absoluteDirectionY;

        /*
         * Select the correct upwind entry edge.
         *
         * Examples:
         *
         * rightward wind
         * -> left edge
         *
         * downward wind
         * -> top edge
         *
         * diagonal wind
         * -> one of the two relevant edges
         */
        const useVerticalEntryEdge =
            componentTotal <= 0
                ? true
                : (
                    Math.random() *
                    componentTotal <
                    absoluteDirectionX
                );

        if (
            useVerticalEntryEdge
        ) {

            particle.positionX =
                this.directionX >= 0
                    ? bounds.minimumX
                    : bounds.maximumX;

            particle.positionY =
                this.randomBetween(
                    bounds.minimumY,
                    bounds.maximumY,
                );

        } else {

            particle.positionX =
                this.randomBetween(
                    bounds.minimumX,
                    bounds.maximumX,
                );

            particle.positionY =
                this.directionY >= 0
                    ? bounds.minimumY
                    : bounds.maximumY;
        }

        this.randomizeParticleAppearance(
            particle,
        );

        particle.age =
            0;
    }

    private randomizeParticleAppearance(
        particle:
            WindParticle,
    ): void {

        /*
         * Strong wind increases the available maximum
         * length, but individual particles still
         * receive different lengths.
         */
        const strengthAdjustedMaximumLength =
            this.lerp(
                this.definition
                    .minimumParticleLength,

                this.definition
                    .maximumParticleLength,

                this.normalizedStrength,
            );

        /*
         * Stronger wind also allows slightly higher
         * opacity, while every particle remains
         * individually randomized.
         */
        const strengthAdjustedMaximumOpacity =
            this.lerp(
                this.definition
                    .minimumParticleOpacity,

                this.definition
                    .maximumParticleOpacity,

                this.normalizedStrength,
            );

        particle.length =
            this.randomBetween(
                this.definition
                    .minimumParticleLength,

                strengthAdjustedMaximumLength,
            );

        particle.baseWidth =
            this.randomBetween(
                this.definition
                    .minimumParticleWidth,

                this.definition
                    .maximumParticleWidth,
            );

        particle.opacity =
            this.randomBetween(
                this.definition
                    .minimumParticleOpacity,

                strengthAdjustedMaximumOpacity,
            );

        particle.speedMultiplier =
            this.randomBetween(
                this.definition
                    .minimumSpeedMultiplier,

                this.definition
                    .maximumSpeedMultiplier,
            );

        particle.lifetime =
            this.randomBetween(
                this.definition
                    .minimumLifetime,

                this.definition
                    .maximumLifetime,
            );
    }

    // -------------------------------------------------------------------------
    // Particle Update Helpers
    // -------------------------------------------------------------------------

    private calculateActiveParticleCount():
        number {

        if (
            !this.definition
                .enabled ||
            this.strength <= 0
        ) {
            return 0;
        }

        const countRange =
            this.definition
                .maximumParticleCount -
            this.definition
                .minimumVisibleParticleCount;

        const requestedCount =
            Math.round(
                this.definition
                    .minimumVisibleParticleCount +
                countRange *
                this.normalizedStrength,
            );

        return Math.max(
            0,
            Math.min(
                requestedCount,
                this.definition
                    .maximumParticleCount,
            ),
        );
    }

    private calculateBaseParticleSpeed():
        number {

        return this.lerp(
            this.definition
                .minimumParticleSpeed,

            this.definition
                .maximumParticleSpeed,

            this.normalizedStrength,
        );
    }

    /**
     * Calculates the overall lifecycle opacity.
     *
     * This produces:
     *
     * fade in
     * stable visibility
     * fade out
     */
    private calculateLifecycleOpacity(
        particle:
            WindParticle,
    ): number {

        if (
            particle.lifetime <= 0
        ) {
            return 0;
        }

        const lifetimeProgress =
            Math.min(
                Math.max(
                    particle.age /
                    particle.lifetime,
                    0,
                ),
                1,
            );

        let fadeInMultiplier =
            1;

        if (
            this.definition
                .fadeInLifetimeFraction >
            0
        ) {

            fadeInMultiplier =
                Math.min(
                    1,

                    lifetimeProgress /
                    this.definition
                        .fadeInLifetimeFraction,
                );
        }

        let fadeOutMultiplier =
            1;

        if (
            this.definition
                .fadeOutLifetimeFraction >
            0
        ) {

            fadeOutMultiplier =
                Math.min(
                    1,

                    (
                        1 -
                        lifetimeProgress
                    ) /
                    this.definition
                        .fadeOutLifetimeFraction,
                );
        }

        return Math.max(
            0,
            Math.min(
                fadeInMultiplier,
                fadeOutMultiplier,
            ),
        );
    }

    private isOutsideBounds(
        particle:
            WindParticle,

        bounds:
            WindVisualBounds,
    ): boolean {

        const visualMargin =
            particle.length;

        return (
            particle.positionX <
            bounds.minimumX -
            visualMargin ||

            particle.positionX >
            bounds.maximumX +
            visualMargin ||

            particle.positionY <
            bounds.minimumY -
            visualMargin ||

            particle.positionY >
            bounds.maximumY +
            visualMargin
        );
    }

    // -------------------------------------------------------------------------
    // Drawing
    // -------------------------------------------------------------------------

    private drawParticles():
        void {

        this.graphics
            .clear();

        for (
            let particleIndex = 0;
            particleIndex <
            this.activeParticleCount;
            particleIndex += 1
        ) {

            const particle =
                this.particles[
                particleIndex
                ];

            if (!particle) {
                continue;
            }

            this.drawParticle(
                particle,
            );
        }
    }

    /**
     * Draws one straight tapered streak using three
     * short segments:
     *
     * thin tail
     * full middle
     * thin head
     *
     * No curve, wiggle, swirl, or secondary movement
     * is applied.
     */
    private drawParticle(
        particle:
            WindParticle,
    ): void {

        const lifecycleOpacity =
            this.calculateLifecycleOpacity(
                particle,
            );

        if (
            lifecycleOpacity <= 0
        ) {
            return;
        }

        const segmentCount =
            this.definition
                .particleSegmentCount;

        for (
            let segmentIndex = 0;
            segmentIndex <
            segmentCount;
            segmentIndex += 1
        ) {

            const startProgress =
                segmentIndex /
                segmentCount;

            const endProgress =
                (
                    segmentIndex +
                    1
                ) /
                segmentCount;

            const startDistanceFromHead =
                particle.length *
                (
                    1 -
                    startProgress
                );

            const endDistanceFromHead =
                particle.length *
                (
                    1 -
                    endProgress
                );

            const startX =
                particle.positionX -
                this.directionX *
                startDistanceFromHead;

            const startY =
                particle.positionY -
                this.directionY *
                startDistanceFromHead;

            const endX =
                particle.positionX -
                this.directionX *
                endDistanceFromHead;

            const endY =
                particle.positionY -
                this.directionY *
                endDistanceFromHead;

            const widthMultiplier =
                this.getSegmentWidthMultiplier(
                    segmentIndex,
                );

            const opacityMultiplier =
                this.getSegmentOpacityMultiplier(
                    segmentIndex,
                );

            const renderedWidth =
                particle.baseWidth *
                widthMultiplier;

            const renderedOpacity =
                Math.min(
                    1,
                    Math.max(
                        0,

                        particle.opacity *
                        lifecycleOpacity *
                        opacityMultiplier,
                    ),
                );

            this.graphics
                .moveTo(
                    startX,
                    startY,
                );

            this.graphics
                .lineTo(
                    endX,
                    endY,
                );

            this.graphics
                .stroke({
                    width:
                        renderedWidth,

                    color:
                        this.definition
                            .lineColor,

                    alpha:
                        renderedOpacity,
                });
        }
    }

    private getSegmentWidthMultiplier(
        segmentIndex:
            number,
    ): number {

        if (
            segmentIndex ===
            0
        ) {
            return this.definition
                .tailWidthMultiplier;
        }

        if (
            segmentIndex ===
            this.definition
                .particleSegmentCount -
            1
        ) {
            return this.definition
                .headWidthMultiplier;
        }

        return this.definition
            .middleWidthMultiplier;
    }

    private getSegmentOpacityMultiplier(
        segmentIndex:
            number,
    ): number {

        if (
            segmentIndex ===
            0
        ) {
            return this.definition
                .tailOpacityMultiplier;
        }

        if (
            segmentIndex ===
            this.definition
                .particleSegmentCount -
            1
        ) {
            return this.definition
                .headOpacityMultiplier;
        }

        return this.definition
            .middleOpacityMultiplier;
    }

    // -------------------------------------------------------------------------
    // Camera-Relative Bounds
    // -------------------------------------------------------------------------

    private calculateVisualBounds():
        WindVisualBounds {

        const requestedMinimumX =
            this.camera
                .getPositionX() -
            this.definition
                .spawnPadding;

        const requestedMaximumX =
            this.camera
                .getPositionX() +
            this.camera
                .getViewportWidth() +
            this.definition
                .spawnPadding;

        const requestedMinimumY =
            this.camera
                .getPositionY() -
            this.definition
                .spawnPadding;

        const requestedMaximumY =
            this.camera
                .getPositionY() +
            this.camera
                .getViewportHeight() +
            this.definition
                .spawnPadding;

        const minimumX =
            Math.max(
                requestedMinimumX,

                this.courseBoundaryDefinition
                    .minimumX,
            );

        const maximumX =
            Math.min(
                requestedMaximumX,

                this.courseBoundaryDefinition
                    .maximumX,
            );

        const minimumY =
            Math.max(
                requestedMinimumY,

                this.courseBoundaryDefinition
                    .minimumY,
            );

        const maximumY =
            Math.min(
                requestedMaximumY,

                this.courseBoundaryDefinition
                    .maximumY,
            );

        /*
         * Normal camera/course configuration should
         * always produce a valid region.
         *
         * The fallback keeps development builds safe
         * if temporary configuration changes violate
         * that assumption.
         */
        if (
            maximumX <=
            minimumX ||
            maximumY <=
            minimumY
        ) {

            return {
                minimumX:
                    this.courseBoundaryDefinition
                        .minimumX,

                maximumX:
                    this.courseBoundaryDefinition
                        .maximumX,

                minimumY:
                    this.courseBoundaryDefinition
                        .minimumY,

                maximumY:
                    this.courseBoundaryDefinition
                        .maximumY,
            };
        }

        return {
            minimumX,
            maximumX,
            minimumY,
            maximumY,
        };
    }

    // -------------------------------------------------------------------------
    // Math Utilities
    // -------------------------------------------------------------------------

    private lerp(
        minimumValue:
            number,

        maximumValue:
            number,

        interpolationAmount:
            number,
    ): number {

        const clampedAmount =
            Math.min(
                Math.max(
                    interpolationAmount,
                    0,
                ),
                1,
            );

        return (
            minimumValue +
            (
                maximumValue -
                minimumValue
            ) *
            clampedAmount
        );
    }

    private randomBetween(
        minimumValue:
            number,

        maximumValue:
            number,
    ): number {

        if (
            maximumValue <=
            minimumValue
        ) {
            return minimumValue;
        }

        return (
            minimumValue +
            Math.random() *
            (
                maximumValue -
                minimumValue
            )
        );
    }

    // -------------------------------------------------------------------------
    // Validation
    // -------------------------------------------------------------------------

    private validateDefinition(
        definition:
            WindVisualDefinition,
    ): void {

        if (
            !Number.isInteger(
                definition
                    .maximumParticleCount,
            ) ||
            definition
                .maximumParticleCount <=
            0
        ) {
            throw new Error(
                "Wind visual maximumParticleCount must be a positive integer.",
            );
        }

        if (
            !Number.isInteger(
                definition
                    .minimumVisibleParticleCount,
            ) ||
            definition
                .minimumVisibleParticleCount <
            0 ||
            definition
                .minimumVisibleParticleCount >
            definition
                .maximumParticleCount
        ) {
            throw new Error(
                "Wind visual minimumVisibleParticleCount must be an integer between zero and maximumParticleCount.",
            );
        }

        this.validatePositiveRange(
            definition
                .minimumParticleSpeed,

            definition
                .maximumParticleSpeed,

            "particle speed",
        );

        this.validatePositiveRange(
            definition
                .minimumParticleLength,

            definition
                .maximumParticleLength,

            "particle length",
        );

        this.validatePositiveRange(
            definition
                .minimumParticleWidth,

            definition
                .maximumParticleWidth,

            "particle width",
        );

        this.validatePositiveRange(
            definition
                .minimumSpeedMultiplier,

            definition
                .maximumSpeedMultiplier,

            "speed multiplier",
        );

        this.validatePositiveRange(
            definition
                .minimumLifetime,

            definition
                .maximumLifetime,

            "particle lifetime",
        );

        this.validateUnitRange(
            definition
                .minimumParticleOpacity,

            definition
                .maximumParticleOpacity,

            "particle opacity",
        );

        this.validateNonNegativeValue(
            definition
                .tailWidthMultiplier,

            "tailWidthMultiplier",
        );

        this.validateNonNegativeValue(
            definition
                .middleWidthMultiplier,

            "middleWidthMultiplier",
        );

        this.validateNonNegativeValue(
            definition
                .headWidthMultiplier,

            "headWidthMultiplier",
        );

        this.validateUnitValue(
            definition
                .tailOpacityMultiplier,

            "tailOpacityMultiplier",
        );

        this.validateUnitValue(
            definition
                .middleOpacityMultiplier,

            "middleOpacityMultiplier",
        );

        this.validateUnitValue(
            definition
                .headOpacityMultiplier,

            "headOpacityMultiplier",
        );

        this.validateUnitValue(
            definition
                .fadeInLifetimeFraction,

            "fadeInLifetimeFraction",
        );

        this.validateUnitValue(
            definition
                .fadeOutLifetimeFraction,

            "fadeOutLifetimeFraction",
        );

        if (
            definition
                .fadeInLifetimeFraction +
            definition
                .fadeOutLifetimeFraction >
            1
        ) {
            throw new Error(
                "Wind visual fade-in and fade-out lifetime fractions cannot total more than 1.",
            );
        }

        if (
            !Number.isInteger(
                definition
                    .particleSegmentCount,
            ) ||
            definition
                .particleSegmentCount !==
            3
        ) {
            throw new Error(
                "Wind visual particleSegmentCount must currently be exactly 3.",
            );
        }

        if (
            !Number.isFinite(
                definition
                    .spawnPadding,
            ) ||
            definition
                .spawnPadding <
            0
        ) {
            throw new Error(
                "Wind visual spawnPadding must be a finite non-negative number.",
            );
        }

        if (
            !Number.isFinite(
                definition
                    .lineColor,
            ) ||
            definition
                .lineColor <
            0
        ) {
            throw new Error(
                "Wind visual lineColor must be a finite non-negative number.",
            );
        }
    }

    private validatePositiveRange(
        minimumValue:
            number,

        maximumValue:
            number,

        rangeName:
            string,
    ): void {

        if (
            !Number.isFinite(
                minimumValue,
            ) ||
            !Number.isFinite(
                maximumValue,
            ) ||
            minimumValue <= 0 ||
            maximumValue <
            minimumValue
        ) {
            throw new Error(
                `Wind visual ${rangeName} range is invalid.`,
            );
        }
    }

    private validateUnitRange(
        minimumValue:
            number,

        maximumValue:
            number,

        rangeName:
            string,
    ): void {

        if (
            !Number.isFinite(
                minimumValue,
            ) ||
            !Number.isFinite(
                maximumValue,
            ) ||
            minimumValue < 0 ||
            maximumValue > 1 ||
            maximumValue <
            minimumValue
        ) {
            throw new Error(
                `Wind visual ${rangeName} range must remain between zero and one.`,
            );
        }
    }

    private validateNonNegativeValue(
        value:
            number,

        propertyName:
            string,
    ): void {

        if (
            !Number.isFinite(
                value,
            ) ||
            value <
            0
        ) {
            throw new Error(
                `Wind visual ${propertyName} must be a finite non-negative number.`,
            );
        }
    }

    private validateUnitValue(
        value:
            number,

        propertyName:
            string,
    ): void {

        if (
            !Number.isFinite(
                value,
            ) ||
            value <
            0 ||
            value >
            1
        ) {
            throw new Error(
                `Wind visual ${propertyName} must remain between zero and one.`,
            );
        }
    }

    private validateCourseBoundaryDefinition(
        definition:
            CourseBoundaryDefinition,
    ): void {

        if (
            !Number.isFinite(
                definition
                    .minimumX,
            ) ||
            !Number.isFinite(
                definition
                    .maximumX,
            ) ||
            !Number.isFinite(
                definition
                    .minimumY,
            ) ||
            !Number.isFinite(
                definition
                    .maximumY,
            ) ||
            definition
                .maximumX <=
            definition
                .minimumX ||
            definition
                .maximumY <=
            definition
                .minimumY
        ) {
            throw new Error(
                "WindVisualizer requires valid finite course boundaries.",
            );
        }
    }
}
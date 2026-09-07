import {
    Container,
    Graphics,
} from "pixi.js";

import type {
    BallTrailDefinition,
} from "../config/BallTrailDefinition";

import {
    DEFAULT_BALL_TRAIL_DEFINITION,
} from "../config/BallTrailDefinition";

import type {
    Ball,
} from "../entities/Ball";

interface BallTrailPoint {
    x: number;
    y: number;
}

/**
 * Presentation-only trajectory ribbon for the golf Ball.
 *
 * The Ball remains authoritative for position, velocity and motion state.
 * This class only samples that state and renders a bounded Graphics ribbon.
 */
export class BallTrail {

    private readonly ball:
        Ball;

    private readonly definition:
        BallTrailDefinition;

    private readonly container:
        Container;

    private readonly graphics:
        Graphics;

    private readonly points:
        BallTrailPoint[] = [];

    private retainedLength =
        0;

    private destroyed =
        false;

    constructor(
        ball:
            Ball,

        definition:
            BallTrailDefinition =
            DEFAULT_BALL_TRAIL_DEFINITION,
    ) {

        this.ball =
            ball;

        this.definition =
            definition;

        this.validateDefinition();

        this.container =
            new Container();

        this.graphics =
            new Graphics();

        this.container.addChild(
            this.graphics,
        );
    }

    public update(
        deltaTime:
            number,
    ): void {

        if (
            this.destroyed
        ) {
            return;
        }

        const safeDeltaTime =
            Number.isFinite(
                deltaTime,
            )
                ? Math.max(
                    0,
                    deltaTime,
                )
                : 0;

        const ballX =
            this.ball
                .getX();

        const ballY =
            this.ball
                .getY();

        const speed =
            this.ball
                .getSpeed();

        if (
            !Number.isFinite(
                ballX,
            ) ||
            !Number.isFinite(
                ballY,
            ) ||
            !Number.isFinite(
                speed,
            )
        ) {
            this.reset();

            return;
        }

        this.updateTrajectoryHistory(
            ballX,
            ballY,
        );

        const targetLength =
            this.calculateTargetLength(
                speed,
            );

        this.updateRetainedLength(
            targetLength,
            safeDeltaTime,
        );

        this.trimHistoryToRetainedLength(
            ballX,
            ballY,
        );

        this.render(
            speed,
            ballX,
            ballY,
        );
    }

    public reset():
        void {

        this.points.length =
            0;

        this.retainedLength =
            0;

        this.graphics.clear();
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

        this.points.length =
            0;

        this.graphics.destroy();

        this.container
            .removeFromParent();

        this.container.destroy({
            children:
                false,
        });
    }

    public getContainer():
        Container {

        return this.container;
    }

    // -------------------------------------------------------------------------
    // History
    // -------------------------------------------------------------------------

    private updateTrajectoryHistory(
        ballX:
            number,

        ballY:
            number,
    ): void {

        const latestPoint =
            this.points[
            this.points.length -
            1
            ];

        if (
            !latestPoint
        ) {
            this.points.push({
                x:
                    ballX,

                y:
                    ballY,
            });

            return;
        }

        const distanceFromLatest =
            Math.hypot(
                ballX -
                latestPoint.x,

                ballY -
                latestPoint.y,
            );

        if (
            distanceFromLatest >=
            this.definition
                .sampleSpacing
        ) {
            this.points.push({
                x:
                    ballX,

                y:
                    ballY,
            });
        }

        /*
         * Do not move the latest stored sample when the Ball has travelled
         * less than sampleSpacing. It must remain a genuine historical point.
         *
         * render() adds the live Ball position as the temporary newest point,
         * which means even a weak/slow shot can form a drawable segment before
         * another full sampleSpacing interval has elapsed.
         */

        while (
            this.points.length >
            this.definition
                .maximumSamples
        ) {
            this.points.shift();
        }
    }

    private trimHistoryToRetainedLength(
        ballX:
            number,

        ballY:
            number,
    ): void {

        if (
            this.retainedLength <=
            0
        ) {
            this.points.length =
                0;

            return;
        }

        if (
            this.points.length ===
            0
        ) {
            this.points.push({
                x:
                    ballX,

                y:
                    ballY,
            });

            return;
        }

        let accumulatedLength =
            Math.hypot(
                ballX -
                this.points[
                    this.points.length -
                    1
                ].x,

                ballY -
                this.points[
                    this.points.length -
                    1
                ].y,
            );

        for (
            let index =
                this.points.length -
                1;

            index >
            0;

            index -=
            1
        ) {
            const newerPoint =
                this.points[
                index
                ];

            const olderPoint =
                this.points[
                index -
                1
                ];

            const segmentLength =
                Math.hypot(
                    newerPoint.x -
                    olderPoint.x,

                    newerPoint.y -
                    olderPoint.y,
                );

            if (
                accumulatedLength +
                segmentLength <=
                this.retainedLength
            ) {
                accumulatedLength +=
                    segmentLength;

                continue;
            }

            const remainingLength =
                Math.max(
                    0,
                    this.retainedLength -
                    accumulatedLength,
                );

            if (
                segmentLength >
                0 &&
                remainingLength >
                0
            ) {
                const interpolation =
                    remainingLength /
                    segmentLength;

                olderPoint.x =
                    newerPoint.x +
                    (
                        olderPoint.x -
                        newerPoint.x
                    ) *
                    interpolation;

                olderPoint.y =
                    newerPoint.y +
                    (
                        olderPoint.y -
                        newerPoint.y
                    ) *
                    interpolation;

                this.points.splice(
                    0,
                    index -
                    1,
                );
            } else {
                this.points.splice(
                    0,
                    index,
                );
            }

            break;
        }
    }

    // -------------------------------------------------------------------------
    // Speed Response
    // -------------------------------------------------------------------------

    private calculateNormalizedEffect(
        speed:
            number,
    ): number {

        const speedRange =
            this.definition
                .fullEffectSpeed -
            this.definition
                .minimumVisibleSpeed;

        if (
            speedRange <=
            0
        ) {
            return 0;
        }

        return Math.max(
            0,
            Math.min(
                (
                    speed -
                    this.definition
                        .minimumVisibleSpeed
                ) /
                speedRange,
                1,
            ),
        );
    }

    private calculateTargetLength(
        speed:
            number,
    ): number {

        if (
            speed <=
            this.definition
                .minimumVisibleSpeed
        ) {
            return 0;
        }

        const normalizedEffect =
            this.calculateNormalizedEffect(
                speed,
            );

        return (
            this.definition
                .minimumTrailLength +
            (
                this.definition
                    .maximumTrailLength -
                this.definition
                    .minimumTrailLength
            ) *
            normalizedEffect
        );
    }

    private updateRetainedLength(
        targetLength:
            number,

        deltaTime:
            number,
    ): void {

        const difference =
            targetLength -
            this.retainedLength;

        if (
            Math.abs(
                difference,
            ) <
            0.001
        ) {
            this.retainedLength =
                targetLength;

            return;
        }

        const responseSpeed =
            difference >
                0
                ? this.definition
                    .extensionSpeed
                : this.definition
                    .contractionSpeed;

        const maximumChange =
            responseSpeed *
            deltaTime;

        if (
            Math.abs(
                difference,
            ) <=
            maximumChange
        ) {
            this.retainedLength =
                targetLength;

            return;
        }

        this.retainedLength +=
            Math.sign(
                difference,
            ) *
            maximumChange;

        this.retainedLength =
            Math.max(
                0,
                this.retainedLength,
            );
    }

    // -------------------------------------------------------------------------
    // Rendering
    // -------------------------------------------------------------------------

    private render(
        speed:
            number,

        ballX:
            number,

        ballY:
            number,
    ): void {

        this.graphics.clear();

        if (
            this.retainedLength <=
            0 ||
            this.points.length <
            1
        ) {
            return;
        }

        const renderPoints:
            BallTrailPoint[] =
            this.points.map(
                (
                    point:
                        BallTrailPoint,
                ): BallTrailPoint => ({
                    x:
                        point.x,

                    y:
                        point.y,
                }),
            );

        const newestPoint =
            renderPoints[
            renderPoints.length -
            1
            ];

        if (
            Math.hypot(
                ballX -
                newestPoint.x,

                ballY -
                newestPoint.y,
            ) >
            0.001
        ) {
            renderPoints.push({
                x:
                    ballX,

                y:
                    ballY,
            });
        }

        if (
            renderPoints.length <
            2
        ) {
            return;
        }

        const normalizedEffect =
            this.calculateNormalizedEffect(
                speed,
            );

        /*
         * When the Ball has already slowed below the visibility threshold,
         * retainedLength still contracts over time. Use the retained-length
         * ratio to keep that residual trail visible while it disappears.
         */
        const residualEffect =
            this.definition
                .maximumTrailLength >
                0
                ? Math.min(
                    this.retainedLength /
                    this.definition
                        .maximumTrailLength,
                    1,
                )
                : 0;

        const visualStrength =
            Math.max(
                normalizedEffect,
                residualEffect,
            );

        const bodyAlpha =
            this.definition
                .bodyMinimumAlpha +
            (
                this.definition
                    .bodyMaximumAlpha -
                this.definition
                    .bodyMinimumAlpha
            ) *
            visualStrength;

        const vertices =
            this.createRibbonVertices(
                renderPoints,
                visualStrength,
            );

        if (
            vertices.length <
            6
        ) {
            return;
        }

        this.graphics
            .poly(
                vertices,
            )
            .fill({
                color:
                    this.definition
                        .bodyColor,

                alpha:
                    bodyAlpha,
            })
            .stroke({
                width:
                    this.definition
                        .edgeWidth,

                color:
                    this.definition
                        .edgeColor,

                alpha:
                    this.definition
                        .edgeAlpha *
                    visualStrength,
            });
    }

    private createRibbonVertices(
        points:
            readonly BallTrailPoint[],

        visualStrength:
            number,
    ): number[] {

        const leftSide:
            BallTrailPoint[] = [];

        const rightSide:
            BallTrailPoint[] = [];

        const finalIndex =
            points.length -
            1;

        for (
            let index = 0;
            index <
            points.length;
            index += 1
        ) {
            const point =
                points[
                index
                ];

            const previousPoint =
                points[
                Math.max(
                    0,
                    index -
                    1,
                )
                ];

            const nextPoint =
                points[
                Math.min(
                    finalIndex,
                    index +
                    1,
                )
                ];

            let tangentX =
                nextPoint.x -
                previousPoint.x;

            let tangentY =
                nextPoint.y -
                previousPoint.y;

            const tangentLength =
                Math.hypot(
                    tangentX,
                    tangentY,
                );

            if (
                tangentLength <=
                0.0001
            ) {
                continue;
            }

            tangentX /=
                tangentLength;

            tangentY /=
                tangentLength;

            const normalX =
                -tangentY;

            const normalY =
                tangentX;

            const pathRatio =
                finalIndex >
                    0
                    ? index /
                    finalIndex
                    : 1;

            /*
             * Preserve the thin-to-thick storybook ribbon, but never allow
             * either low speed or the oldest end to collapse to zero width.
             * This keeps weak valid shots readable without making them as
             * prominent as strong shots.
             */
            const smoothTaper =
                Math.sin(
                    pathRatio *
                    Math.PI *
                    0.5,
                );

            const taper =
                this.definition
                    .minimumWidthRatio +
                (
                    1 -
                    this.definition
                        .minimumWidthRatio
                ) *
                smoothTaper;

            const widthStrength =
                this.definition
                    .minimumWidthRatio +
                (
                    1 -
                    this.definition
                        .minimumWidthRatio
                ) *
                visualStrength;

            const halfWidth =
                this.definition
                    .maximumWidth *
                widthStrength *
                taper *
                0.5;

            leftSide.push({
                x:
                    point.x +
                    normalX *
                    halfWidth,

                y:
                    point.y +
                    normalY *
                    halfWidth,
            });

            rightSide.push({
                x:
                    point.x -
                    normalX *
                    halfWidth,

                y:
                    point.y -
                    normalY *
                    halfWidth,
            });
        }

        if (
            leftSide.length <
            2 ||
            rightSide.length <
            2
        ) {
            return [];
        }

        const vertices:
            number[] = [];

        for (
            const point
            of leftSide
        ) {
            vertices.push(
                point.x,
                point.y,
            );
        }

        for (
            let index =
                rightSide.length -
                1;

            index >=
            0;

            index -=
            1
        ) {
            vertices.push(
                rightSide[
                    index
                ].x,

                rightSide[
                    index
                ].y,
            );
        }

        return vertices;
    }

    // -------------------------------------------------------------------------
    // Validation
    // -------------------------------------------------------------------------

    private validateDefinition():
        void {

        const definition =
            this.definition;

        if (
            definition.bodyMinimumAlpha <
            0 ||
            definition.bodyMaximumAlpha >
            1 ||
            definition.bodyMaximumAlpha <
            definition.bodyMinimumAlpha ||
            definition.edgeAlpha <
            0 ||
            definition.edgeAlpha >
            1
        ) {
            throw new Error(
                "Ball trail alpha values are invalid.",
            );
        }

        if (
            definition.edgeWidth <
            0 ||
            definition.maximumWidth <=
            0 ||
            definition.minimumWidthRatio <=
            0 ||
            definition.minimumWidthRatio >
            1 ||
            definition.minimumVisibleSpeed <
            0 ||
            definition.fullEffectSpeed <=
            definition.minimumVisibleSpeed ||
            definition.minimumTrailLength <
            0 ||
            definition.maximumTrailLength <=
            definition.minimumTrailLength ||
            definition.sampleSpacing <=
            0 ||
            !Number.isInteger(
                definition.maximumSamples,
            ) ||
            definition.maximumSamples <
            2 ||
            definition.extensionSpeed <=
            0 ||
            definition.contractionSpeed <=
            0
        ) {
            throw new Error(
                "Ball trail definition contains invalid geometry or response values.",
            );
        }
    }
}

import { Graphics } from "pixi.js";
import type { HydrantHoseDefinition } from "../../config/HydrantHoseDefinition";
import type { HoseRope } from "../../physics/rope/HoseRope";

/**
 * Presentation-only Hose adapter.
 *
 * Physics owns the authoritative rope points. This renderer only reads those
 * points and can later be replaced by Sprite/texture-based art without
 * changing Hose simulation, collision, or Water-source logic.
 */
export class HoseGraphicsRenderer {
    private readonly graphics =
        new Graphics();

    constructor(
        private readonly definition:
            HydrantHoseDefinition,
    ) { }

    public getGraphics():
        Graphics {
        return this.graphics;
    }

    public redraw(
        rope: HoseRope,
    ): void {
        const points =
            rope.getPoints();

        this.graphics.clear();

        if (
            points.length <
            2
        ) {
            return;
        }

        this.drawSmoothHose(
            rope,
        );

        this.drawHydrant(
            rope,
        );

        this.drawNozzle(
            rope,
        );

        if (
            this.definition
                .visual
                .debugPointsVisible
        ) {
            this.drawDebugPoints(
                rope,
            );
        }
    }

    private drawSmoothHose(
        rope: HoseRope,
    ): void {
        const points =
            rope.getPoints();

        this.graphics.moveTo(
            points[0]!.x,
            points[0]!.y,
        );

        /*
         * The physical Hose remains 24 straight constrained segments.
         *
         * Presentation uses midpoint quadratic interpolation so those control
         * points read as one continuous rubber tube rather than a chain.
         */
        for (
            let index = 1;
            index <
            points.length - 1;
            index += 1
        ) {
            const current =
                points[index]!;

            const next =
                points[index + 1]!;

            const midpointX =
                (
                    current.x +
                    next.x
                ) *
                0.5;

            const midpointY =
                (
                    current.y +
                    next.y
                ) *
                0.5;

            this.graphics
                .quadraticCurveTo(
                    current.x,
                    current.y,
                    midpointX,
                    midpointY,
                );
        }

        const finalPoint =
            points[
            points.length - 1
            ]!;

        this.graphics.lineTo(
            finalPoint.x,
            finalPoint.y,
        );

        this.graphics.stroke({
            width:
                this.definition
                    .visual
                    .hoseWidth,
            color:
                this.definition
                    .visual
                    .hoseColor,
            alpha:
                this.definition
                    .visual
                    .hoseAlpha,
            cap:
                "round",
            join:
                "round",
        });
    }

    private drawHydrant(
        rope: HoseRope,
    ): void {
        const anchor =
            rope.getPoints()[0]!;

        this.graphics
            .circle(
                anchor.x,
                anchor.y,
                this.definition
                    .visual
                    .hydrantRadius,
            )
            .fill({
                color:
                    this.definition
                        .visual
                        .hydrantColor,
                alpha: 1,
            });

        this.graphics
            .circle(
                anchor.x,
                anchor.y,
                this.definition
                    .visual
                    .hydrantRadius *
                0.45,
            )
            .fill({
                color:
                    this.definition
                        .visual
                        .hoseColor,
                alpha: 1,
            });
    }

    private drawNozzle(
        rope: HoseRope,
    ): void {
        const points =
            rope.getPoints();

        const nozzle =
            points[
            points.length - 1
            ]!;

        const angle =
            rope
                .getNozzleDirectionRadians();

        const halfLength =
            this.definition
                .visual
                .nozzleLength *
            0.5;

        const halfWidth =
            this.definition
                .visual
                .nozzleWidth *
            0.5;

        const cos =
            Math.cos(
                angle,
            );

        const sin =
            Math.sin(
                angle,
            );

        const perpendicularX =
            -sin;

        const perpendicularY =
            cos;

        const startX =
            nozzle.x -
            cos *
            halfLength;

        const startY =
            nozzle.y -
            sin *
            halfLength;

        const endX =
            nozzle.x +
            cos *
            halfLength;

        const endY =
            nozzle.y +
            sin *
            halfLength;

        this.graphics
            .poly([
                startX +
                perpendicularX *
                halfWidth,
                startY +
                perpendicularY *
                halfWidth,

                endX +
                perpendicularX *
                halfWidth,
                endY +
                perpendicularY *
                halfWidth,

                endX -
                perpendicularX *
                halfWidth,
                endY -
                perpendicularY *
                halfWidth,

                startX -
                perpendicularX *
                halfWidth,
                startY -
                perpendicularY *
                halfWidth,
            ])
            .fill({
                color:
                    this.definition
                        .visual
                        .nozzleColor,
                alpha: 1,
            });
    }

    private drawDebugPoints(
        rope: HoseRope,
    ): void {
        for (
            const point
            of rope.getPoints()
        ) {
            this.graphics
                .circle(
                    point.x,
                    point.y,
                    this.definition
                        .visual
                        .debugPointRadius,
                )
                .fill({
                    color:
                        this.definition
                            .visual
                            .debugPointColor,
                    alpha: 1,
                });
        }
    }

    public destroy():
        void {
        this.graphics.destroy();
    }
}

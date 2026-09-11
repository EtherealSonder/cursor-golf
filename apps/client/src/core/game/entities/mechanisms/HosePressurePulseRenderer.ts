import {
    Graphics,
} from "pixi.js";

import {
    DEFAULT_HOSE_PRESSURE_PULSE_DEFINITION,
    type HosePressurePulseDefinition,
    validateHosePressurePulseDefinition,
} from "../../config/HosePressurePulseDefinition";

import {
    HydrantPressureState,
} from "../../config/HydrantPressureDefinition";

import type {
    HoseRopePoint,
} from "../../physics/rope/HoseRopePoint";

/**
 * Presentation-only pressure feedback.
 *
 * The pulse owns no physics state and stores no world-space trajectory. Every
 * redraw samples the CURRENT Hose polyline, so a Ball hit that bends/moves the
 * Hose immediately changes the path followed by the travelling highlight.
 */
export class HosePressurePulseRenderer {
    private readonly graphics =
        new Graphics();

    public constructor(
        private readonly definition:
            HosePressurePulseDefinition =
            DEFAULT_HOSE_PRESSURE_PULSE_DEFINITION,
    ) {
        validateHosePressurePulseDefinition(
            definition,
        );

        this.graphics.visible =
            false;
    }

    public getGraphics():
        Graphics {
        return this.graphics;
    }

    public redraw(
        points:
            readonly HoseRopePoint[],

        pressureState:
            HydrantPressureState,

        pressureProgress:
            number,
    ): void {
        this.graphics.clear();

        if (
            pressureState !==
                HydrantPressureState
                    .PressureBuilding ||
            points.length < 2 ||
            !Number.isFinite(
                pressureProgress,
            )
        ) {
            this.graphics.visible =
                false;

            return;
        }

        const clampedProgress =
            Math.min(
                Math.max(
                    pressureProgress,
                    0,
                ),
                1,
            );

        const pathProgress =
            this.definition.startProgress +
            (
                this.definition.endProgress -
                this.definition.startProgress
            ) *
                clampedProgress;

        const geometry =
            this.buildPolylineGeometry(
                points,
            );

        if (
            geometry.totalLength <= 0
        ) {
            this.graphics.visible =
                false;

            return;
        }

        const centreDistance =
            geometry.totalLength *
            pathProgress;

        const halfLength =
            this.definition
                .pulseLength *
            0.5;

        const startDistance =
            Math.max(
                0,
                centreDistance -
                    halfLength,
            );

        const endDistance =
            Math.min(
                geometry.totalLength,
                centreDistance +
                    halfLength,
            );

        if (
            endDistance <=
            startDistance
        ) {
            this.graphics.visible =
                false;

            return;
        }

        this.graphics.visible =
            true;

        /*
         * Draw halo first, then the brighter cyan core. Both sample the same
         * live polyline interval and therefore remain inside/follow the Hose.
         */
        this.drawPolylineInterval(
            points,
            geometry.segmentLengths,
            startDistance,
            endDistance,
            this.definition
                .glowWidth,
            this.definition
                .glowColor,
            this.definition
                .glowAlpha,
        );

        this.drawPolylineInterval(
            points,
            geometry.segmentLengths,
            startDistance,
            endDistance,
            this.definition
                .coreWidth,
            this.definition
                .coreColor,
            this.definition
                .coreAlpha,
        );
    }

    public reset():
        void {
        this.graphics.clear();

        this.graphics.visible =
            false;
    }

    public destroy():
        void {
        this.graphics.destroy();
    }

    private buildPolylineGeometry(
        points:
            readonly HoseRopePoint[],
    ): {
        readonly segmentLengths:
            readonly number[];
        readonly totalLength:
            number;
    } {
        const segmentLengths:
            number[] = [];

        let totalLength =
            0;

        for (
            let index = 0;
            index <
                points.length - 1;
            index += 1
        ) {
            const first =
                points[index]!;

            const second =
                points[index + 1]!;

            const length =
                Math.hypot(
                    second.x -
                        first.x,
                    second.y -
                        first.y,
                );

            segmentLengths.push(
                length,
            );

            totalLength +=
                length;
        }

        return {
            segmentLengths,
            totalLength,
        };
    }

    private drawPolylineInterval(
        points:
            readonly HoseRopePoint[],

        segmentLengths:
            readonly number[],

        startDistance:
            number,

        endDistance:
            number,

        width:
            number,

        color:
            number,

        alpha:
            number,
    ): void {
        let travelled =
            0;

        let drawing =
            false;

        for (
            let index = 0;
            index <
                segmentLengths.length;
            index += 1
        ) {
            const segmentLength =
                segmentLengths[index]!;

            const segmentStart =
                travelled;

            const segmentEnd =
                travelled +
                segmentLength;

            travelled =
                segmentEnd;

            if (
                segmentLength <= 0 ||
                segmentEnd <
                    startDistance ||
                segmentStart >
                    endDistance
            ) {
                continue;
            }

            const first =
                points[index]!;

            const second =
                points[index + 1]!;

            const localStart =
                Math.max(
                    0,
                    (
                        startDistance -
                        segmentStart
                    ) /
                        segmentLength,
                );

            const localEnd =
                Math.min(
                    1,
                    (
                        endDistance -
                        segmentStart
                    ) /
                        segmentLength,
                );

            if (
                localEnd <
                localStart
            ) {
                continue;
            }

            const startX =
                first.x +
                (
                    second.x -
                    first.x
                ) *
                    localStart;

            const startY =
                first.y +
                (
                    second.y -
                    first.y
                ) *
                    localStart;

            const endX =
                first.x +
                (
                    second.x -
                    first.x
                ) *
                    localEnd;

            const endY =
                first.y +
                (
                    second.y -
                    first.y
                ) *
                    localEnd;

            if (
                !drawing
            ) {
                this.graphics
                    .moveTo(
                        startX,
                        startY,
                    );

                drawing =
                    true;
            } else {
                this.graphics
                    .lineTo(
                        startX,
                        startY,
                    );
            }

            this.graphics
                .lineTo(
                    endX,
                    endY,
                );
        }

        if (
            drawing
        ) {
            this.graphics
                .stroke({
                    width,
                    color,
                    alpha,
                    cap:
                        "round",
                    join:
                        "round",
                });
        }
    }
}

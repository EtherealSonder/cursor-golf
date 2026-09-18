import type {
    ScalarFieldContourBuildOptions,
    ScalarFieldPoint,
} from "../../rendering/ScalarFieldContourBuilder";

import {
    ScalarFieldContourBuilder,
} from "../../rendering/ScalarFieldContourBuilder";

export interface StandingWaterContourOptions {
    readonly simplificationTolerance: number;
    readonly smoothingPasses: number;
    readonly minimumArea: number;
}

export interface StandingWaterContour {
    readonly points: readonly ScalarFieldPoint[];
    readonly area: number;
}

/**
 * Standing-Water-specific post-processing over generic Marching Squares.
 *
 * WaterField remains authoritative. This class only simplifies and smooths
 * the presentation loops so 8 px simulation cells become broad organic lobes.
 */
export class StandingWaterContourBuilder {
    public build(
        fieldOptions: ScalarFieldContourBuildOptions,
        options: StandingWaterContourOptions,
    ): readonly StandingWaterContour[] {
        const rawLoops =
            ScalarFieldContourBuilder
                .buildLoops({
                    ...fieldOptions,

                    endpointQuantizationWorldUnits:
                        Math.max(
                            0.001,
                            fieldOptions.cellSize *
                            0.0025,
                        ),
                });

        const result:
            StandingWaterContour[] =
            [];

        for (
            let loopIndex = 0;
            loopIndex < rawLoops.length;
            loopIndex += 1
        ) {
            let points =
                rawLoops[
                    loopIndex
                ].points.slice();

            points =
                this.simplifyClosedLoop(
                    points,
                    Math.max(
                        0,
                        options
                            .simplificationTolerance,
                    ),
                );

            const smoothingPasses =
                Math.max(
                    0,
                    Math.floor(
                        options
                            .smoothingPasses,
                    ),
                );

            for (
                let pass = 0;
                pass < smoothingPasses;
                pass += 1
            ) {
                points =
                    this.smoothClosedLoop(
                        points,
                    );
            }

            const area =
                Math.abs(
                    this.getSignedArea(
                        points,
                    ),
                );

            if (
                points.length >= 3 &&
                area >=
                Math.max(
                    0,
                    options.minimumArea,
                )
            ) {
                result.push({
                    points,
                    area,
                });
            }
        }

        return result;
    }

    private simplifyClosedLoop(
        points: readonly ScalarFieldPoint[],
        tolerance: number,
    ): ScalarFieldPoint[] {
        if (
            tolerance <= 0 ||
            points.length <= 6
        ) {
            return points.slice();
        }

        const minimumDistanceSquared =
            tolerance *
            tolerance;

        const result:
            ScalarFieldPoint[] =
            [];

        for (
            let index = 0;
            index < points.length;
            index += 1
        ) {
            const point =
                points[index];

            if (
                result.length === 0
            ) {
                result.push(
                    point,
                );
                continue;
            }

            const previous =
                result[
                    result.length - 1
                ];

            const dx =
                point.x -
                previous.x;
            const dy =
                point.y -
                previous.y;

            if (
                dx * dx +
                dy * dy >=
                minimumDistanceSquared
            ) {
                result.push(
                    point,
                );
            }
        }

        if (
            result.length >= 4
        ) {
            const first =
                result[0];
            const last =
                result[
                    result.length - 1
                ];
            const dx =
                first.x -
                last.x;
            const dy =
                first.y -
                last.y;

            if (
                dx * dx +
                dy * dy <
                minimumDistanceSquared
            ) {
                result.pop();
            }
        }

        return result.length >= 3
            ? result
            : points.slice();
    }

    private smoothClosedLoop(
        points: readonly ScalarFieldPoint[],
    ): ScalarFieldPoint[] {
        if (
            points.length < 3
        ) {
            return points.slice();
        }

        const result:
            ScalarFieldPoint[] =
            [];

        for (
            let index = 0;
            index < points.length;
            index += 1
        ) {
            const a =
                points[index];
            const b =
                points[
                    (
                        index + 1
                    ) %
                    points.length
                ];

            /*
             * Closed Chaikin pass. Two restrained passes turn cell-scale
             * corners into large lobes without forcing puddles into circles.
             */
            result.push({
                x:
                    a.x * 0.75 +
                    b.x * 0.25,
                y:
                    a.y * 0.75 +
                    b.y * 0.25,
            });

            result.push({
                x:
                    a.x * 0.25 +
                    b.x * 0.75,
                y:
                    a.y * 0.25 +
                    b.y * 0.75,
            });
        }

        return result;
    }

    private getSignedArea(
        points: readonly ScalarFieldPoint[],
    ): number {
        let area =
            0;

        for (
            let index = 0;
            index < points.length;
            index += 1
        ) {
            const a =
                points[index];
            const b =
                points[
                    (
                        index + 1
                    ) %
                    points.length
                ];

            area +=
                a.x * b.y -
                b.x * a.y;
        }

        return area * 0.5;
    }
}

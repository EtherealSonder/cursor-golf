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
    readonly smoothingStrength: number;
    readonly cornerPreservation: number;
    readonly minimumArea: number;

    readonly lobeDeformation?: {
        readonly enabled: boolean;
        readonly primaryLobeCount: number;
        readonly primaryAmplitudeWorldUnits: number;
        readonly secondaryAmplitudeWorldUnits: number;
        readonly seedOffset: number;
    };
}

export interface StandingWaterContour {
    readonly points: readonly ScalarFieldPoint[];
    readonly area: number;

    /**
     * Presentation-only depth evidence sampled from WaterField inside the
     * reconstructed connected contour. Used by 8I-8B.3 classification.
     */
    readonly peakDepth: number;
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
                        Math.max(0, Math.min(0.5, options.smoothingStrength)),
                        Math.max(0, Math.min(1, options.cornerPreservation)),
                    );
            }

            if (
                options.lobeDeformation
                    ?.enabled &&
                points.length >= 4
            ) {
                points =
                    this.applyDeterministicLobeDeformation(
                        points,
                        options.lobeDeformation,
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
                    peakDepth:
                        this.getPeakDepthInsideContour(
                            points,
                            fieldOptions,
                        ),
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
        smoothingStrength: number,
        cornerPreservation: number,
    ): ScalarFieldPoint[] {
        if (points.length < 4 || smoothingStrength <= 0) {
            return points.slice();
        }

        const result: ScalarFieldPoint[] = [];

        for (let index = 0; index < points.length; index += 1) {
            const previous = points[(index - 1 + points.length) % points.length];
            const current = points[index];
            const next = points[(index + 1) % points.length];

            const inX = current.x - previous.x;
            const inY = current.y - previous.y;
            const outX = next.x - current.x;
            const outY = next.y - current.y;
            const inLength = Math.sqrt(inX * inX + inY * inY);
            const outLength = Math.sqrt(outX * outX + outY * outY);

            let turnAmount = 0;

            if (inLength > 0.0001 && outLength > 0.0001) {
                const dot = Math.max(
                    -1,
                    Math.min(
                        1,
                        (inX * outX + inY * outY) / (inLength * outLength),
                    ),
                );

                turnAmount = Math.max(0, Math.min(1, (1 - dot) * 0.5));
            }

            const preservation = Math.max(
                0,
                Math.min(1, turnAmount * cornerPreservation),
            );

            const localStrength = smoothingStrength * (1 - preservation);
            const neighbourMidX = (previous.x + next.x) * 0.5;
            const neighbourMidY = (previous.y + next.y) * 0.5;

            result.push({
                x: current.x + (neighbourMidX - current.x) * localStrength,
                y: current.y + (neighbourMidY - current.y) * localStrength,
            });
        }

        return result;
    }

    private applyDeterministicLobeDeformation(
        points: readonly ScalarFieldPoint[],
        options: {
            readonly primaryLobeCount: number;
            readonly primaryAmplitudeWorldUnits: number;
            readonly secondaryAmplitudeWorldUnits: number;
            readonly seedOffset: number;
        },
    ): ScalarFieldPoint[] {
        let centroidX = 0;
        let centroidY = 0;

        for (let index = 0; index < points.length; index += 1) {
            centroidX += points[index].x;
            centroidY += points[index].y;
        }

        centroidX /= points.length;
        centroidY /= points.length;

        let averageRadius = 0;

        for (let index = 0; index < points.length; index += 1) {
            const dx = points[index].x - centroidX;
            const dy = points[index].y - centroidY;
            averageRadius += Math.sqrt(dx * dx + dy * dy);
        }

        averageRadius /= points.length;

        if (averageRadius <= 0.0001) {
            return points.slice();
        }

        /*
         * Keep small puddles restrained while allowing large Hose puddles to
         * develop visibly broad lobes. The cap prevents presentation from
         * drifting too far away from the authoritative WaterField footprint.
         */
        const sizeScale =
            Math.max(
                0.20,
                Math.min(
                    1,
                    averageRadius / 48,
                ),
            );

        const primaryAmplitude =
            Math.min(
                Math.max(0, options.primaryAmplitudeWorldUnits) * sizeScale,
                averageRadius * 0.14,
            );

        const secondaryAmplitude =
            Math.min(
                Math.max(0, options.secondaryAmplitudeWorldUnits) * sizeScale,
                averageRadius * 0.06,
            );

        const primaryLobes =
            Math.max(
                3,
                Math.min(
                    7,
                    Math.round(options.primaryLobeCount),
                ),
            );

        /*
         * World-position anchoring makes the result deterministic. A puddle
         * does not shimmer because there is no frame-time or random input.
         */
        const worldPhase =
            centroidX * 0.017 +
            centroidY * 0.013 +
            options.seedOffset;

        const secondaryPhase =
            centroidX * 0.009 -
            centroidY * 0.015 +
            options.seedOffset * 1.73;

        const result: ScalarFieldPoint[] = [];

        for (let index = 0; index < points.length; index += 1) {
            const point = points[index];
            const radialX = point.x - centroidX;
            const radialY = point.y - centroidY;
            const radialLength = Math.sqrt(
                radialX * radialX +
                radialY * radialY,
            );

            if (radialLength <= 0.0001) {
                result.push(point);
                continue;
            }

            const angle = Math.atan2(radialY, radialX);
            const broadLobe =
                Math.sin(
                    angle * primaryLobes +
                    worldPhase,
                );

            const secondaryLobe =
                Math.sin(
                    angle * (primaryLobes - 1) +
                    secondaryPhase,
                );

            const displacement =
                broadLobe * primaryAmplitude +
                secondaryLobe * secondaryAmplitude;

            result.push({
                x: point.x + radialX / radialLength * displacement,
                y: point.y + radialY / radialLength * displacement,
            });
        }

        return result;
    }

    private getPeakDepthInsideContour(
        points: readonly ScalarFieldPoint[],
        fieldOptions: ScalarFieldContourBuildOptions,
    ): number {
        if (points.length < 3) {
            return 0;
        }

        let minimumX = Number.POSITIVE_INFINITY;
        let maximumX = Number.NEGATIVE_INFINITY;
        let minimumY = Number.POSITIVE_INFINITY;
        let maximumY = Number.NEGATIVE_INFINITY;

        for (let index = 0; index < points.length; index += 1) {
            minimumX = Math.min(minimumX, points[index].x);
            maximumX = Math.max(maximumX, points[index].x);
            minimumY = Math.min(minimumY, points[index].y);
            maximumY = Math.max(maximumY, points[index].y);
        }

        const minimumColumn = Math.max(
            0,
            Math.floor((minimumX - fieldOptions.minimumWorldX) / fieldOptions.cellSize),
        );
        const maximumColumn = Math.min(
            fieldOptions.columnCount - 1,
            Math.ceil((maximumX - fieldOptions.minimumWorldX) / fieldOptions.cellSize),
        );
        const minimumRow = Math.max(
            0,
            Math.floor((minimumY - fieldOptions.minimumWorldY) / fieldOptions.cellSize),
        );
        const maximumRow = Math.min(
            fieldOptions.rowCount - 1,
            Math.ceil((maximumY - fieldOptions.minimumWorldY) / fieldOptions.cellSize),
        );

        let peakDepth = 0;

        for (let row = minimumRow; row <= maximumRow; row += 1) {
            for (let column = minimumColumn; column <= maximumColumn; column += 1) {
                const worldX =
                    fieldOptions.minimumWorldX +
                    (column + 0.5) * fieldOptions.cellSize;
                const worldY =
                    fieldOptions.minimumWorldY +
                    (row + 0.5) * fieldOptions.cellSize;

                if (!this.isPointInsideClosedLoop(worldX, worldY, points)) {
                    continue;
                }

                const value =
                    fieldOptions.sampleValueByIndex(
                        row * fieldOptions.columnCount + column,
                    );

                if (Number.isFinite(value)) {
                    peakDepth = Math.max(peakDepth, value);
                }
            }
        }

        return peakDepth;
    }

    private isPointInsideClosedLoop(
        x: number,
        y: number,
        points: readonly ScalarFieldPoint[],
    ): boolean {
        let inside = false;

        for (
            let currentIndex = 0, previousIndex = points.length - 1;
            currentIndex < points.length;
            previousIndex = currentIndex, currentIndex += 1
        ) {
            const current = points[currentIndex];
            const previous = points[previousIndex];

            const crosses =
                (current.y > y) !== (previous.y > y) &&
                x <
                (
                    (previous.x - current.x) *
                    (y - current.y) /
                    (previous.y - current.y) +
                    current.x
                );

            if (crosses) {
                inside = !inside;
            }
        }

        return inside;
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

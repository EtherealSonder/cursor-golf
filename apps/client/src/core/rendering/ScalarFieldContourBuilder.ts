export interface ScalarFieldPoint {
    readonly x: number;
    readonly y: number;
}

export interface ScalarFieldSegment {
    readonly start: ScalarFieldPoint;
    readonly end: ScalarFieldPoint;
}

export interface ScalarFieldContourLoop {
    readonly points: readonly ScalarFieldPoint[];
}

export interface ScalarFieldContourBuildOptions {
    readonly columnCount: number;
    readonly rowCount: number;
    readonly cellSize: number;
    readonly minimumWorldX: number;
    readonly minimumWorldY: number;
    readonly isoLevel: number;

    /**
     * Inclusive scalar-sample bounds. Callers should pass a sparse active
     * bounding box expanded by one cell so we do not scan the whole world.
     */
    readonly minimumColumn: number;
    readonly maximumColumn: number;
    readonly minimumRow: number;
    readonly maximumRow: number;

    readonly sampleValueByIndex: (index: number) => number;
}

/**
 * Lightweight presentation-only scalar Marching Squares.
 *
 * The simulation field remains authoritative. This builder interpolates the
 * iso-line between scalar samples, so Water/moisture boundaries move
 * continuously as values change instead of snapping one 8 px cell at a time.
 *
 * The returned segments are suitable for direct Pixi stroke rendering. For
 * filled Water bands, callers can render the scalar cells underneath with
 * depth-based alpha and use these interpolated contours as the smooth edge.
 */
export class ScalarFieldContourBuilder {
    public static buildSegments(
        options: ScalarFieldContourBuildOptions,
    ): readonly ScalarFieldSegment[] {
        ScalarFieldContourBuilder.validate(options);

        const minColumn = Math.max(
            0,
            Math.min(options.columnCount - 1, options.minimumColumn),
        );

        const maxColumn = Math.max(
            0,
            Math.min(options.columnCount - 1, options.maximumColumn),
        );

        const minRow = Math.max(
            0,
            Math.min(options.rowCount - 1, options.minimumRow),
        );

        const maxRow = Math.max(
            0,
            Math.min(options.rowCount - 1, options.maximumRow),
        );

        if (
            maxColumn <= minColumn ||
            maxRow <= minRow
        ) {
            return [];
        }

        const segments: ScalarFieldSegment[] = [];

        for (let row = minRow; row < maxRow; row += 1) {
            for (let column = minColumn; column < maxColumn; column += 1) {
                const topLeftIndex =
                    row * options.columnCount + column;

                const topRightIndex =
                    topLeftIndex + 1;

                const bottomLeftIndex =
                    topLeftIndex + options.columnCount;

                const bottomRightIndex =
                    bottomLeftIndex + 1;

                const topLeft =
                    ScalarFieldContourBuilder.safeSample(
                        options.sampleValueByIndex(topLeftIndex),
                    );

                const topRight =
                    ScalarFieldContourBuilder.safeSample(
                        options.sampleValueByIndex(topRightIndex),
                    );

                const bottomRight =
                    ScalarFieldContourBuilder.safeSample(
                        options.sampleValueByIndex(bottomRightIndex),
                    );

                const bottomLeft =
                    ScalarFieldContourBuilder.safeSample(
                        options.sampleValueByIndex(bottomLeftIndex),
                    );

                let caseIndex = 0;

                if (topLeft >= options.isoLevel) {
                    caseIndex |= 1;
                }

                if (topRight >= options.isoLevel) {
                    caseIndex |= 2;
                }

                if (bottomRight >= options.isoLevel) {
                    caseIndex |= 4;
                }

                if (bottomLeft >= options.isoLevel) {
                    caseIndex |= 8;
                }

                if (
                    caseIndex === 0 ||
                    caseIndex === 15
                ) {
                    continue;
                }

                const x =
                    options.minimumWorldX +
                    column * options.cellSize;

                const y =
                    options.minimumWorldY +
                    row * options.cellSize;

                const size =
                    options.cellSize;

                const top =
                    ScalarFieldContourBuilder.interpolate(
                        x,
                        y,
                        x + size,
                        y,
                        topLeft,
                        topRight,
                        options.isoLevel,
                    );

                const right =
                    ScalarFieldContourBuilder.interpolate(
                        x + size,
                        y,
                        x + size,
                        y + size,
                        topRight,
                        bottomRight,
                        options.isoLevel,
                    );

                const bottom =
                    ScalarFieldContourBuilder.interpolate(
                        x + size,
                        y + size,
                        x,
                        y + size,
                        bottomRight,
                        bottomLeft,
                        options.isoLevel,
                    );

                const left =
                    ScalarFieldContourBuilder.interpolate(
                        x,
                        y + size,
                        x,
                        y,
                        bottomLeft,
                        topLeft,
                        options.isoLevel,
                    );

                /*
                 * Ambiguous saddle cases 5 and 10 are resolved using the
                 * scalar center average. This prevents arbitrary diagonal
                 * flipping as a puddle evolves.
                 */
                const center =
                    (
                        topLeft +
                        topRight +
                        bottomRight +
                        bottomLeft
                    ) * 0.25;

                const push = (
                    start: ScalarFieldPoint,
                    end: ScalarFieldPoint,
                ): void => {
                    segments.push({
                        start,
                        end,
                    });
                };

                switch (caseIndex) {
                    case 1:
                    case 14:
                        push(left, top);
                        break;

                    case 2:
                    case 13:
                        push(top, right);
                        break;

                    case 3:
                    case 12:
                        push(left, right);
                        break;

                    case 4:
                    case 11:
                        push(right, bottom);
                        break;

                    case 5:
                        if (center >= options.isoLevel) {
                            push(top, right);
                            push(bottom, left);
                        } else {
                            push(left, top);
                            push(right, bottom);
                        }
                        break;

                    case 6:
                    case 9:
                        push(top, bottom);
                        break;

                    case 7:
                    case 8:
                        push(left, bottom);
                        break;

                    case 10:
                        if (center >= options.isoLevel) {
                            push(left, top);
                            push(right, bottom);
                        } else {
                            push(top, right);
                            push(bottom, left);
                        }
                        break;

                    default:
                        break;
                }
            }
        }

        return segments;
    }

    /**
     * Build closed contour loops from the Marching Squares segments.
     *
     * Segment endpoints generated by neighbouring cells are numerically very
     * close but are not guaranteed to be bit-identical, so endpoints are
     * matched using a small world-space quantization.
     */
    public static buildLoops(
        options: ScalarFieldContourBuildOptions,
    ): readonly ScalarFieldContourLoop[] {
        const segments =
            ScalarFieldContourBuilder
                .buildSegments(
                    options,
                );

        if (segments.length === 0) {
            return [];
        }

        const quantization =
            Math.max(
                1e-4,
                options.cellSize *
                1e-4,
            );

        const keyForPoint = (
            point: ScalarFieldPoint,
        ): string => {
            const x =
                Math.round(
                    point.x /
                    quantization,
                );

            const y =
                Math.round(
                    point.y /
                    quantization,
                );

            return `${x},${y}`;
        };

        const adjacency =
            new Map<
                string,
                number[]
            >();

        for (
            let index = 0;
            index < segments.length;
            index += 1
        ) {
            const segment =
                segments[index];

            const startKey =
                keyForPoint(
                    segment.start,
                );

            const endKey =
                keyForPoint(
                    segment.end,
                );

            const startList =
                adjacency.get(
                    startKey,
                );

            if (startList) {
                startList.push(
                    index,
                );
            } else {
                adjacency.set(
                    startKey,
                    [index],
                );
            }

            const endList =
                adjacency.get(
                    endKey,
                );

            if (endList) {
                endList.push(
                    index,
                );
            } else {
                adjacency.set(
                    endKey,
                    [index],
                );
            }
        }

        const consumed =
            new Uint8Array(
                segments.length,
            );

        const loops:
            ScalarFieldContourLoop[] = [];

        for (
            let seedIndex = 0;
            seedIndex < segments.length;
            seedIndex += 1
        ) {
            if (
                consumed[
                seedIndex
                ] !== 0
            ) {
                continue;
            }

            const seed =
                segments[
                seedIndex
                ];

            consumed[
                seedIndex
            ] =
                1;

            const points:
                ScalarFieldPoint[] = [
                    seed.start,
                    seed.end,
                ];

            const startKey =
                keyForPoint(
                    seed.start,
                );

            let currentKey =
                keyForPoint(
                    seed.end,
                );

            let guard =
                0;

            while (
                currentKey !== startKey &&
                guard <= segments.length
            ) {
                guard += 1;

                const candidates =
                    adjacency.get(
                        currentKey,
                    ) ??
                    [];

                let nextIndex =
                    -1;

                for (
                    let candidateOffset = 0;
                    candidateOffset < candidates.length;
                    candidateOffset += 1
                ) {
                    const candidateIndex =
                        candidates[
                        candidateOffset
                        ];

                    if (
                        consumed[
                        candidateIndex
                        ] === 0
                    ) {
                        nextIndex =
                            candidateIndex;

                        break;
                    }
                }

                if (
                    nextIndex < 0
                ) {
                    break;
                }

                consumed[
                    nextIndex
                ] =
                    1;

                const next =
                    segments[
                    nextIndex
                    ];

                const nextStartKey =
                    keyForPoint(
                        next.start,
                    );

                const nextPoint =
                    nextStartKey === currentKey
                        ? next.end
                        : next.start;

                points.push(
                    nextPoint,
                );

                currentKey =
                    keyForPoint(
                        nextPoint,
                    );
            }

            if (
                currentKey === startKey &&
                points.length >= 4
            ) {
                /*
                 * The final point closes onto the first point. Pixi polygon
                 * filling closes the shape itself, so omit a duplicate end.
                 */
                if (
                    keyForPoint(
                        points[
                        points.length - 1
                        ],
                    ) === startKey
                ) {
                    points.pop();
                }

                if (
                    points.length >= 3
                ) {
                    loops.push({
                        points,
                    });
                }
            }
        }

        return loops;
    }

    private static interpolate(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        startValue: number,
        endValue: number,
        isoLevel: number,
    ): ScalarFieldPoint {
        const denominator =
            endValue - startValue;

        let amount =
            Math.abs(denominator) <= 1e-8
                ? 0.5
                : (isoLevel - startValue) / denominator;

        amount =
            Math.max(
                0,
                Math.min(1, amount),
            );

        return {
            x:
                startX +
                (endX - startX) * amount,

            y:
                startY +
                (endY - startY) * amount,
        };
    }

    private static safeSample(
        value: number,
    ): number {
        return Number.isFinite(value)
            ? value
            : 0;
    }

    private static validate(
        options: ScalarFieldContourBuildOptions,
    ): void {
        if (
            !Number.isInteger(options.columnCount) ||
            options.columnCount <= 1 ||
            !Number.isInteger(options.rowCount) ||
            options.rowCount <= 1
        ) {
            throw new Error(
                "Scalar field contour dimensions must be integers greater than one.",
            );
        }

        if (
            !Number.isFinite(options.cellSize) ||
            options.cellSize <= 0
        ) {
            throw new Error(
                "Scalar field contour cellSize must be finite and positive.",
            );
        }

        if (
            !Number.isFinite(options.isoLevel)
        ) {
            throw new Error(
                "Scalar field contour isoLevel must be finite.",
            );
        }
    }
}

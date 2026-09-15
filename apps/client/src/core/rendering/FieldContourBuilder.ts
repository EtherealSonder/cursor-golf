export interface FieldContourPoint {
    readonly x:
        number;

    readonly y:
        number;
}

export interface FieldContourBuildOptions {
    readonly columnCount:
        number;

    readonly rowCount:
        number;

    readonly cellSize:
        number;

    readonly minimumWorldX:
        number;

    readonly minimumWorldY:
        number;

    readonly filledIndices:
        readonly number[];

    /**
     * Number of Chaikin corner-cutting passes. Two passes are enough to hide
     * the 8 px simulation grid without creating excessive polygon vertices.
     */
    readonly smoothingPasses:
        number;

    /**
     * Ignore tiny isolated contours below this occupied-cell count.
     */
    readonly minimumComponentCellCount:
        number;
}

interface DirectedEdge {
    readonly startX:
        number;

    readonly startY:
        number;

    readonly endX:
        number;

    readonly endY:
        number;
}

interface CellCoordinate {
    readonly x:
        number;

    readonly y:
        number;
}

/**
 * Presentation-only sparse field contour extraction.
 *
 * The simulation remains cell based. This utility converts the exposed outer
 * edges of occupied cells into continuous loops and smooths those loops for
 * rendering. It does not alter WaterField or EnvironmentField state.
 */
export class FieldContourBuilder {
    public static build(
        options:
            FieldContourBuildOptions,
    ): readonly (readonly FieldContourPoint[])[] {
        FieldContourBuilder
            .validate(
                options,
            );

        if (
            options.filledIndices.length ===
            0
        ) {
            return [];
        }

        const filled =
            new Set<number>(
                options.filledIndices,
            );

        const retained =
            FieldContourBuilder
                .removeTinyComponents(
                    filled,
                    options.columnCount,
                    options.rowCount,
                    options.minimumComponentCellCount,
                );

        if (
            retained.size ===
            0
        ) {
            return [];
        }

        const edges =
            FieldContourBuilder
                .buildBoundaryEdges(
                    retained,
                    options.columnCount,
                    options.rowCount,
                );

        const loops =
            FieldContourBuilder
                .traceLoops(
                    edges,
                );

        return loops
            .map(
                (loop) =>
                    FieldContourBuilder
                        .convertAndSmoothLoop(
                            loop,
                            options,
                        ),
            )
            .filter(
                (loop) =>
                    loop.length >=
                    3,
            );
    }

    private static buildBoundaryEdges(
        filled:
            ReadonlySet<number>,

        columnCount:
            number,

        rowCount:
            number,
    ): DirectedEdge[] {
        const edges:
            DirectedEdge[] = [];

        for (
            const index
            of filled
        ) {
            const x =
                index %
                columnCount;

            const y =
                Math.floor(
                    index /
                    columnCount,
                );

            const hasTop =
                y > 0 &&
                filled.has(
                    index -
                    columnCount,
                );

            const hasRight =
                x <
                    columnCount -
                    1 &&
                filled.has(
                    index +
                    1,
                );

            const hasBottom =
                y <
                    rowCount -
                    1 &&
                filled.has(
                    index +
                    columnCount,
                );

            const hasLeft =
                x > 0 &&
                filled.has(
                    index -
                    1,
                );

            /*
             * Clockwise edge orientation around each occupied cell.
             * Shared internal edges are omitted.
             */
            if (!hasTop) {
                edges.push({
                    startX:
                        x,
                    startY:
                        y,
                    endX:
                        x + 1,
                    endY:
                        y,
                });
            }

            if (!hasRight) {
                edges.push({
                    startX:
                        x + 1,
                    startY:
                        y,
                    endX:
                        x + 1,
                    endY:
                        y + 1,
                });
            }

            if (!hasBottom) {
                edges.push({
                    startX:
                        x + 1,
                    startY:
                        y + 1,
                    endX:
                        x,
                    endY:
                        y + 1,
                });
            }

            if (!hasLeft) {
                edges.push({
                    startX:
                        x,
                    startY:
                        y + 1,
                    endX:
                        x,
                    endY:
                        y,
                });
            }
        }

        return edges;
    }

    private static traceLoops(
        edges:
            readonly DirectedEdge[],
    ): CellCoordinate[][] {
        const outgoing =
            new Map<
                string,
                DirectedEdge[]
            >();

        for (
            const edge
            of edges
        ) {
            const key =
                FieldContourBuilder
                    .pointKey(
                        edge.startX,
                        edge.startY,
                    );

            const list =
                outgoing.get(
                    key,
                );

            if (list) {
                list.push(
                    edge,
                );
            } else {
                outgoing.set(
                    key,
                    [edge],
                );
            }
        }

        const consumed =
            new Set<DirectedEdge>();

        const loops:
            CellCoordinate[][] = [];

        for (
            const firstEdge
            of edges
        ) {
            if (
                consumed.has(
                    firstEdge,
                )
            ) {
                continue;
            }

            const loop:
                CellCoordinate[] = [];

            let edge:
                DirectedEdge | null =
                firstEdge;

            const startKey =
                FieldContourBuilder
                    .pointKey(
                        firstEdge.startX,
                        firstEdge.startY,
                    );

            let guard =
                0;

            while (
                edge &&
                guard <=
                    edges.length +
                    1
            ) {
                guard +=
                    1;

                consumed.add(
                    edge,
                );

                loop.push({
                    x:
                        edge.startX,
                    y:
                        edge.startY,
                });

                const endKey =
                    FieldContourBuilder
                        .pointKey(
                            edge.endX,
                            edge.endY,
                        );

                if (
                    endKey ===
                    startKey
                ) {
                    break;
                }

                const candidates =
                    outgoing.get(
                        endKey,
                    ) ??
                    [];

                edge =
                    candidates.find(
                        (candidate) =>
                            !consumed.has(
                                candidate,
                            ),
                    ) ??
                    null;
            }

            if (
                loop.length >=
                3
            ) {
                loops.push(
                    loop,
                );
            }
        }

        return loops;
    }

    private static convertAndSmoothLoop(
        loop:
            readonly CellCoordinate[],

        options:
            FieldContourBuildOptions,
    ): FieldContourPoint[] {
        let points:
            FieldContourPoint[] =
            loop.map(
                (point) => ({
                    x:
                        options.minimumWorldX +
                        point.x *
                        options.cellSize,

                    y:
                        options.minimumWorldY +
                        point.y *
                        options.cellSize,
                }),
            );

        for (
            let pass = 0;
            pass <
                options.smoothingPasses;
            pass += 1
        ) {
            points =
                FieldContourBuilder
                    .chaikinClosed(
                        points,
                    );
        }

        return points;
    }

    private static chaikinClosed(
        points:
            readonly FieldContourPoint[],
    ): FieldContourPoint[] {
        if (
            points.length <
            3
        ) {
            return [
                ...points,
            ];
        }

        const smoothed:
            FieldContourPoint[] = [];

        for (
            let index = 0;
            index <
                points.length;
            index += 1
        ) {
            const current =
                points[
                    index
                ];

            const next =
                points[
                    (
                        index +
                        1
                    ) %
                    points.length
                ];

            smoothed.push({
                x:
                    current.x *
                        0.75 +
                    next.x *
                        0.25,

                y:
                    current.y *
                        0.75 +
                    next.y *
                        0.25,
            });

            smoothed.push({
                x:
                    current.x *
                        0.25 +
                    next.x *
                        0.75,

                y:
                    current.y *
                        0.25 +
                    next.y *
                        0.75,
            });
        }

        return smoothed;
    }

    private static removeTinyComponents(
        filled:
            ReadonlySet<number>,

        columnCount:
            number,

        rowCount:
            number,

        minimumComponentCellCount:
            number,
    ): Set<number> {
        if (
            minimumComponentCellCount <=
            1
        ) {
            return new Set(
                filled,
            );
        }

        const retained =
            new Set<number>();

        const visited =
            new Set<number>();

        const offsets =
            [
                -1,
                1,
                -columnCount,
                columnCount,
            ] as const;

        for (
            const seed
            of filled
        ) {
            if (
                visited.has(
                    seed,
                )
            ) {
                continue;
            }

            const component:
                number[] = [];

            const queue:
                number[] = [
                    seed,
                ];

            visited.add(
                seed,
            );

            while (
                queue.length >
                0
            ) {
                const index =
                    queue.pop()!;

                component.push(
                    index,
                );

                const x =
                    index %
                    columnCount;

                const y =
                    Math.floor(
                        index /
                        columnCount,
                    );

                for (
                    const offset
                    of offsets
                ) {
                    if (
                        offset ===
                            -1 &&
                        x ===
                            0
                    ) {
                        continue;
                    }

                    if (
                        offset ===
                            1 &&
                        x ===
                            columnCount -
                            1
                    ) {
                        continue;
                    }

                    if (
                        offset ===
                            -columnCount &&
                        y ===
                            0
                    ) {
                        continue;
                    }

                    if (
                        offset ===
                            columnCount &&
                        y ===
                            rowCount -
                            1
                    ) {
                        continue;
                    }

                    const neighbour =
                        index +
                        offset;

                    if (
                        filled.has(
                            neighbour,
                        ) &&
                        !visited.has(
                            neighbour,
                        )
                    ) {
                        visited.add(
                            neighbour,
                        );

                        queue.push(
                            neighbour,
                        );
                    }
                }
            }

            if (
                component.length >=
                minimumComponentCellCount
            ) {
                for (
                    const index
                    of component
                ) {
                    retained.add(
                        index,
                    );
                }
            }
        }

        return retained;
    }

    private static pointKey(
        x:
            number,

        y:
            number,
    ): string {
        return `${x},${y}`;
    }

    private static validate(
        options:
            FieldContourBuildOptions,
    ): void {
        if (
            !Number.isInteger(
                options.columnCount,
            ) ||
            options.columnCount <=
                0 ||
            !Number.isInteger(
                options.rowCount,
            ) ||
            options.rowCount <=
                0
        ) {
            throw new Error(
                "Field contour dimensions must be positive integers.",
            );
        }

        if (
            !Number.isFinite(
                options.cellSize,
            ) ||
            options.cellSize <=
                0
        ) {
            throw new Error(
                "Field contour cellSize must be finite and positive.",
            );
        }

        if (
            !Number.isInteger(
                options.smoothingPasses,
            ) ||
            options.smoothingPasses <
                0 ||
            options.smoothingPasses >
                4
        ) {
            throw new Error(
                "Field contour smoothingPasses must be an integer from zero to four.",
            );
        }

        if (
            !Number.isInteger(
                options.minimumComponentCellCount,
            ) ||
            options.minimumComponentCellCount <
                1
        ) {
            throw new Error(
                "Field contour minimumComponentCellCount must be a positive integer.",
            );
        }
    }
}

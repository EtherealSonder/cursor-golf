import { ScalarFieldActiveBounds } from "./ScalarFieldActiveBounds";
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


export interface StandingContourPostDeepProfile {
    readonly totalMilliseconds:number; readonly scalarMilliseconds:number;
    readonly postProcessMilliseconds:number; readonly peakDepthMilliseconds:number;
    readonly rawLoops:number; readonly acceptedLoops:number;
    readonly rawVertices:number; readonly finalVertices:number;
}
export interface WetContourPostDeepProfile {
    readonly totalMilliseconds:number; readonly scalarMilliseconds:number;
    readonly postProcessMilliseconds:number; readonly rawLoops:number;
    readonly acceptedLoops:number; readonly rawVertices:number; readonly finalVertices:number;
}
export interface ScalarFieldContourDeepProfile {
    readonly totalMilliseconds: number;
    readonly segmentBuildMilliseconds: number;
    readonly keyAndAdjacencyMilliseconds: number;
    readonly stitchingMilliseconds: number;
    readonly candidateCells: number;
    readonly cellsScanned: number;
    readonly scanReductionPercent: number;
    readonly activeSamples: number;
    readonly activeContourCells: number;
    readonly segmentsGenerated: number;
    readonly loopsGenerated: number;
    readonly rawVertices: number;
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

    /**
     * Optional endpoint matching tolerance used while assembling closed loops.
     * Existing callers keep the original cell-relative default.
     */
    readonly endpointQuantizationWorldUnits?: number;
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
    private static lastDeepProfile: ScalarFieldContourDeepProfile = {
        totalMilliseconds: 0,
        segmentBuildMilliseconds: 0,
        keyAndAdjacencyMilliseconds: 0,
        stitchingMilliseconds: 0,
        candidateCells: 0,
        cellsScanned: 0,
        scanReductionPercent: 0,
        activeSamples: 0,
        activeContourCells: 0,
        segmentsGenerated: 0,
        loopsGenerated: 0,
        rawVertices: 0,
    };

    public static getLastDeepProfile(): ScalarFieldContourDeepProfile {
        return ScalarFieldContourBuilder.lastDeepProfile;
    }

    private static lastCandidateCells = 0;
    private static lastScannedCells = 0;
    private static lastActiveSamples = 0;

    private static lastStandingPostProfile:StandingContourPostDeepProfile|null=null;
    private static lastWetPostProfile:WetContourPostDeepProfile|null=null;
    public static recordStandingPostProfile(p:StandingContourPostDeepProfile):void{this.lastStandingPostProfile=p;}
    public static recordWetPostProfile(p:WetContourPostDeepProfile):void{this.lastWetPostProfile=p;}
    public static getLastStandingPostProfile():StandingContourPostDeepProfile|null{return this.lastStandingPostProfile;}
    public static getLastWetPostProfile():WetContourPostDeepProfile|null{return this.lastWetPostProfile;}

    public static buildSegments(
        options: ScalarFieldContourBuildOptions,
    ): readonly ScalarFieldSegment[] {
        ScalarFieldContourBuilder.validate(options);

        const activeBounds =
            ScalarFieldActiveBounds.find({
                columnCount: options.columnCount,
                rowCount: options.rowCount,
                minimumColumn: options.minimumColumn,
                maximumColumn: options.maximumColumn,
                minimumRow: options.minimumRow,
                maximumRow: options.maximumRow,
                isoLevel: options.isoLevel,
                paddingCells: 1,
                sampleValueByIndex: options.sampleValueByIndex,
            });

        const minColumn = activeBounds.minimumColumn;
        const maxColumn = activeBounds.maximumColumn;
        const minRow = activeBounds.minimumRow;
        const maxRow = activeBounds.maximumRow;

        ScalarFieldContourBuilder.lastCandidateCells =
            activeBounds.candidateCells;
        ScalarFieldContourBuilder.lastActiveSamples =
            activeBounds.activeSamples;
        ScalarFieldContourBuilder.lastScannedCells =
            activeBounds.hasActiveSamples
                ? Math.max(0, maxColumn - minColumn) *
                  Math.max(0, maxRow - minRow)
                : 0;

        if (
            !activeBounds.hasActiveSamples ||
            maxColumn <= minColumn ||
            maxRow <= minRow
        ) {
            return [];
        }

        const segments: ScalarFieldSegment[] = [];

        const width = maxColumn - minColumn + 1;
        let topValues = new Float64Array(width);
        let bottomValues = new Float64Array(width);

        const fillRow = (
            target: Float64Array,
            row: number,
        ): void => {
            const rowOffset =
                row * options.columnCount +
                minColumn;

            for (let offset = 0; offset < width; offset += 1) {
                const sampled =
                    options.sampleValueByIndex(
                        rowOffset + offset,
                    );

                target[offset] =
                    ScalarFieldContourBuilder.safeSample(
                        sampled,
                    );
            }
        };

        fillRow(topValues, minRow);

        for (let row = minRow; row < maxRow; row += 1) {
            fillRow(bottomValues, row + 1);

            for (let column = minColumn; column < maxColumn; column += 1) {
                const offset = column - minColumn;

                const topLeft = topValues[offset];
                const topRight = topValues[offset + 1];
                const bottomLeft = bottomValues[offset];
                const bottomRight = bottomValues[offset + 1];

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

                switch (caseIndex) {
                    case 1:
                    case 14:
                        segments.push({ start: left, end: top });
                        break;

                    case 2:
                    case 13:
                        segments.push({ start: top, end: right });
                        break;

                    case 3:
                    case 12:
                        segments.push({ start: left, end: right });
                        break;

                    case 4:
                    case 11:
                        segments.push({ start: right, end: bottom });
                        break;

                    case 5:
                        if (center >= options.isoLevel) {
                            segments.push({ start: top, end: right });
                            segments.push({ start: bottom, end: left });
                        } else {
                            segments.push({ start: left, end: top });
                            segments.push({ start: right, end: bottom });
                        }
                        break;

                    case 6:
                    case 9:
                        segments.push({ start: top, end: bottom });
                        break;

                    case 7:
                    case 8:
                        segments.push({ start: left, end: bottom });
                        break;

                    case 10:
                        if (center >= options.isoLevel) {
                            segments.push({ start: left, end: top });
                            segments.push({ start: right, end: bottom });
                        } else {
                            segments.push({ start: top, end: right });
                            segments.push({ start: bottom, end: left });
                        }
                        break;

                    default:
                        break;
                }
            }

            const previousTop = topValues;
            topValues = bottomValues;
            bottomValues = previousTop;
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
        const totalStartedAt = performance.now();
        const segmentStartedAt = totalStartedAt;
        const segments =
            ScalarFieldContourBuilder
                .buildSegments(
                    options,
                );
        const segmentBuildMilliseconds =
            performance.now() - segmentStartedAt;

        if (segments.length === 0) {
            const candidateCells =
                ScalarFieldContourBuilder.lastCandidateCells;
            const cellsScanned =
                ScalarFieldContourBuilder.lastScannedCells;

            ScalarFieldContourBuilder.lastDeepProfile = {
                totalMilliseconds: performance.now() - totalStartedAt,
                segmentBuildMilliseconds,
                keyAndAdjacencyMilliseconds: 0,
                stitchingMilliseconds: 0,
                candidateCells,
                cellsScanned,
                scanReductionPercent:
                    candidateCells > 0
                        ? Math.max(
                            0,
                            (1 - cellsScanned / candidateCells) * 100,
                        )
                        : 0,
                activeSamples:
                    ScalarFieldContourBuilder.lastActiveSamples,
                activeContourCells: 0,
                segmentsGenerated: 0,
                loopsGenerated: 0,
                rawVertices: 0,
            };

            return [];
        }

        const quantization =
            Math.max(
                1e-4,
                options.endpointQuantizationWorldUnits ??
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

        const adjacencyStartedAt = performance.now();
        const adjacency =
            new Map<
                string,
                number[]
            >();

        /*
         * 8I-9B.4: endpoint quantization/string construction was repeated
         * several times while stitching. Cache both endpoint keys once per
         * segment so loop assembly reuses them without changing topology.
         */
        const startKeys: string[] =
            new Array(segments.length);
        const endKeys: string[] =
            new Array(segments.length);

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

            startKeys[index] = startKey;
            endKeys[index] = endKey;

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

        const keyAndAdjacencyMilliseconds =
            performance.now() - adjacencyStartedAt;
        const stitchingStartedAt = performance.now();

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
                startKeys[seedIndex];

            let currentKey =
                endKeys[seedIndex];

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
                    startKeys[nextIndex];

                const useEnd =
                    nextStartKey === currentKey;

                const nextPoint =
                    useEnd
                        ? next.end
                        : next.start;

                points.push(
                    nextPoint,
                );

                currentKey =
                    useEnd
                        ? endKeys[nextIndex]
                        : startKeys[nextIndex];
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
                    currentKey === startKey
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

        let rawVertices = 0;
        for (let loopIndex = 0; loopIndex < loops.length; loopIndex += 1) {
            rawVertices += loops[loopIndex].points.length;
        }

        const candidateCells =
            ScalarFieldContourBuilder.lastCandidateCells;
        const cellsScanned =
            ScalarFieldContourBuilder.lastScannedCells;

        ScalarFieldContourBuilder.lastDeepProfile = {
            totalMilliseconds: performance.now() - totalStartedAt,
            segmentBuildMilliseconds,
            keyAndAdjacencyMilliseconds,
            stitchingMilliseconds: performance.now() - stitchingStartedAt,
            candidateCells,
            cellsScanned,
            scanReductionPercent:
                candidateCells > 0
                    ? Math.max(
                        0,
                        (1 - cellsScanned / candidateCells) * 100,
                    )
                    : 0,
            activeSamples:
                ScalarFieldContourBuilder.lastActiveSamples,
            activeContourCells: segments.length,
            segmentsGenerated: segments.length,
            loopsGenerated: loops.length,
            rawVertices,
        };

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

import {
    SeededRandom,
} from "./SeededRandom";

export interface PoissonSamplePoint {
    readonly x: number;
    readonly y: number;
}

export interface CircularExclusionRegion {
    readonly centerX: number;
    readonly centerY: number;
    readonly radius: number;
}

export interface PoissonDiskSamplingDefinition {
    readonly minimumX: number;
    readonly maximumX: number;
    readonly minimumY: number;
    readonly maximumY: number;
    readonly minimumDistance: number;
    readonly maximumPointCount: number;
    readonly candidatesPerActivePoint: number;
    readonly exclusionRegions:
    readonly CircularExclusionRegion[];
}

export class PoissonDiskSampler {

    private readonly random:
        SeededRandom;

    constructor(
        random: SeededRandom,
    ) {

        this.random =
            random;
    }

    public sample(
        definition:
            PoissonDiskSamplingDefinition,
    ): readonly PoissonSamplePoint[] {

        this.validateDefinition(
            definition,
        );

        const width =
            definition.maximumX -
            definition.minimumX;

        const height =
            definition.maximumY -
            definition.minimumY;

        const cellSize =
            definition.minimumDistance /
            Math.SQRT2;

        const columnCount =
            Math.max(
                1,
                Math.ceil(
                    width /
                    cellSize,
                ),
            );

        const rowCount =
            Math.max(
                1,
                Math.ceil(
                    height /
                    cellSize,
                ),
            );

        const grid =
            new Array<number>(
                columnCount *
                rowCount,
            ).fill(
                -1,
            );

        const points:
            PoissonSamplePoint[] = [];

        const activePointIndices:
            number[] = [];

        const firstPoint =
            this.findInitialPoint(
                definition,
            );

        if (!firstPoint) {
            return points;
        }

        this.addPoint(
            firstPoint,
            definition,
            cellSize,
            columnCount,
            grid,
            points,
            activePointIndices,
        );

        while (
            activePointIndices.length >
            0 &&
            points.length <
            definition.maximumPointCount
        ) {
            const activeListIndex =
                this.random.nextInteger(
                    0,
                    activePointIndices.length -
                    1,
                );

            const sourcePoint =
                points[
                activePointIndices[
                activeListIndex
                ]
                ];

            let acceptedCandidate =
                false;

            for (
                let candidateIndex = 0;
                candidateIndex <
                definition
                    .candidatesPerActivePoint;
                candidateIndex +=
                1
            ) {
                const angle =
                    this.random.nextRange(
                        0,
                        Math.PI *
                        2,
                    );

                const radius =
                    definition
                        .minimumDistance *
                    Math.sqrt(
                        1 +
                        this.random.next() *
                        3,
                    );

                const candidate = {
                    x:
                        sourcePoint.x +
                        Math.cos(
                            angle,
                        ) *
                        radius,

                    y:
                        sourcePoint.y +
                        Math.sin(
                            angle,
                        ) *
                        radius,
                };

                if (
                    !this.isCandidateValid(
                        candidate,
                        definition,
                        cellSize,
                        columnCount,
                        rowCount,
                        grid,
                        points,
                    )
                ) {
                    continue;
                }

                this.addPoint(
                    candidate,
                    definition,
                    cellSize,
                    columnCount,
                    grid,
                    points,
                    activePointIndices,
                );

                acceptedCandidate =
                    true;

                break;
            }

            if (!acceptedCandidate) {
                activePointIndices.splice(
                    activeListIndex,
                    1,
                );
            }
        }

        return points;
    }

    private findInitialPoint(
        definition:
            PoissonDiskSamplingDefinition,
    ): PoissonSamplePoint | null {

        for (
            let attempt = 0;
            attempt <
            512;
            attempt +=
            1
        ) {
            const point = {
                x:
                    this.random.nextRange(
                        definition.minimumX,
                        definition.maximumX,
                    ),

                y:
                    this.random.nextRange(
                        definition.minimumY,
                        definition.maximumY,
                    ),
            };

            if (
                !this.isInsideAnyExclusionRegion(
                    point,
                    definition
                        .exclusionRegions,
                )
            ) {
                return point;
            }
        }

        return null;
    }

    private isCandidateValid(
        candidate:
            PoissonSamplePoint,

        definition:
            PoissonDiskSamplingDefinition,

        cellSize: number,
        columnCount: number,
        rowCount: number,

        grid:
            readonly number[],

        points:
            readonly PoissonSamplePoint[],
    ): boolean {

        if (
            candidate.x <
            definition.minimumX ||
            candidate.x >
            definition.maximumX ||
            candidate.y <
            definition.minimumY ||
            candidate.y >
            definition.maximumY
        ) {
            return false;
        }

        if (
            this.isInsideAnyExclusionRegion(
                candidate,
                definition
                    .exclusionRegions,
            )
        ) {
            return false;
        }

        const cellX =
            Math.floor(
                (
                    candidate.x -
                    definition.minimumX
                ) /
                cellSize,
            );

        const cellY =
            Math.floor(
                (
                    candidate.y -
                    definition.minimumY
                ) /
                cellSize,
            );

        const minimumDistanceSquared =
            definition.minimumDistance *
            definition.minimumDistance;

        for (
            let neighborY =
                Math.max(
                    0,
                    cellY -
                    2,
                );
            neighborY <=
            Math.min(
                rowCount -
                1,
                cellY +
                2,
            );
            neighborY +=
            1
        ) {
            for (
                let neighborX =
                    Math.max(
                        0,
                        cellX -
                        2,
                    );
                neighborX <=
                Math.min(
                    columnCount -
                    1,
                    cellX +
                    2,
                );
                neighborX +=
                1
            ) {
                const pointIndex =
                    grid[
                    neighborY *
                    columnCount +
                    neighborX
                    ];

                if (
                    pointIndex ===
                    -1
                ) {
                    continue;
                }

                const point =
                    points[
                    pointIndex
                    ];

                const deltaX =
                    candidate.x -
                    point.x;

                const deltaY =
                    candidate.y -
                    point.y;

                if (
                    deltaX *
                    deltaX +
                    deltaY *
                    deltaY <
                    minimumDistanceSquared
                ) {
                    return false;
                }
            }
        }

        return true;
    }

    private addPoint(
        point:
            PoissonSamplePoint,

        definition:
            PoissonDiskSamplingDefinition,

        cellSize: number,
        columnCount: number,

        grid:
            number[],

        points:
            PoissonSamplePoint[],

        activePointIndices:
            number[],
    ): void {

        const pointIndex =
            points.length;

        points.push(
            point,
        );

        activePointIndices.push(
            pointIndex,
        );

        const cellX =
            Math.floor(
                (
                    point.x -
                    definition.minimumX
                ) /
                cellSize,
            );

        const cellY =
            Math.floor(
                (
                    point.y -
                    definition.minimumY
                ) /
                cellSize,
            );

        grid[
            cellY *
            columnCount +
            cellX
        ] =
            pointIndex;
    }

    private isInsideAnyExclusionRegion(
        point:
            PoissonSamplePoint,

        exclusionRegions:
            readonly CircularExclusionRegion[],
    ): boolean {

        return exclusionRegions.some(
            (
                region:
                    CircularExclusionRegion,
            ) => {

                const deltaX =
                    point.x -
                    region.centerX;

                const deltaY =
                    point.y -
                    region.centerY;

                return (
                    deltaX *
                    deltaX +
                    deltaY *
                    deltaY <=
                    region.radius *
                    region.radius
                );
            },
        );
    }

    private validateDefinition(
        definition:
            PoissonDiskSamplingDefinition,
    ): void {

        if (
            definition.maximumX <=
            definition.minimumX ||
            definition.maximumY <=
            definition.minimumY
        ) {
            throw new Error(
                "Poisson Disk Sampling bounds must have positive dimensions.",
            );
        }

        if (
            !Number.isFinite(
                definition.minimumDistance,
            ) ||
            definition.minimumDistance <=
            0
        ) {
            throw new Error(
                "Poisson Disk minimumDistance must be greater than zero.",
            );
        }

        if (
            !Number.isInteger(
                definition.maximumPointCount,
            ) ||
            definition.maximumPointCount <=
            0
        ) {
            throw new Error(
                "Poisson Disk maximumPointCount must be a positive integer.",
            );
        }

        if (
            !Number.isInteger(
                definition
                    .candidatesPerActivePoint,
            ) ||
            definition
                .candidatesPerActivePoint <=
            0
        ) {
            throw new Error(
                "Poisson Disk candidatesPerActivePoint must be a positive integer.",
            );
        }
    }
}

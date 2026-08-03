import type {
    CourseBoundaryDefinition,
} from "../config/CourseBoundaryDefinition";

import {
    DEFAULT_PROCEDURAL_OBSTACLE_EXCLUSION_CENTER,
    DEFAULT_PROCEDURAL_OBSTACLE_FIELD_DEFINITION,
} from "../config/ProceduralObstacleFieldDefinition";

import type {
    ProceduralObstacleFieldDefinition,
} from "../config/ProceduralObstacleFieldDefinition";

import type {
    DynamicObstacleDefinition,
    StaticObstacleDefinition,
} from "../config/ObstacleDefinition";

import {
    SeededRandom,
} from "./SeededRandom";

/**
 * World-space point selected for one generated
 * obstacle.
 */
interface GeneratedObstaclePoint {

    readonly x: number;

    readonly y: number;
}

/**
 * One rectangular region in the stratified placement
 * grid.
 */
interface ObstaclePlacementCell {

    readonly column: number;

    readonly row: number;

    readonly minimumX: number;

    readonly maximumX: number;

    readonly minimumY: number;

    readonly maximumY: number;

    readonly centerX: number;

    readonly centerY: number;
}

/**
 * Complete generated obstacle field.
 *
 * These definitions are consumed by the existing
 * StaticObstacle and DynamicObstacle implementations.
 */
export interface ProceduralObstacleFieldResult {

    readonly staticDefinitions:
    readonly StaticObstacleDefinition[];

    readonly dynamicDefinitions:
    readonly DynamicObstacleDefinition[];
}

/**
 * Generates a deterministic, broadly distributed set
 * of rectangular obstacles.
 *
 * The generation area is divided into a grid whose
 * dimensions are calculated from:
 *
 * 1. Requested obstacle count
 * 2. Course aspect ratio
 *
 * One obstacle is then placed in each selected cell.
 *
 * This guarantees that obstacles appear across the
 * negative and positive regions of the complete map,
 * rather than growing outward from one random seed
 * point.
 */
export class ProceduralObstacleFieldGenerator {

    private readonly definition:
        ProceduralObstacleFieldDefinition;

    constructor(
        definition:
            ProceduralObstacleFieldDefinition =
            DEFAULT_PROCEDURAL_OBSTACLE_FIELD_DEFINITION,
    ) {

        this.validateDefinition(
            definition,
        );

        this.definition =
            definition;
    }

    // -------------------------------------------------------
    // Generation
    // -------------------------------------------------------

    public generate(
        courseBoundaryDefinition:
            CourseBoundaryDefinition,
    ): ProceduralObstacleFieldResult {

        this.validateCourseBoundaryDefinition(
            courseBoundaryDefinition,
        );

        const random =
            new SeededRandom(
                this.definition
                    .seed,
            );

        const generationMinimumX =
            courseBoundaryDefinition
                .minimumX +
            this.definition
                .courseBoundaryMargin;

        const generationMaximumX =
            courseBoundaryDefinition
                .maximumX -
            this.definition
                .courseBoundaryMargin;

        const generationMinimumY =
            courseBoundaryDefinition
                .minimumY +
            this.definition
                .courseBoundaryMargin;

        const generationMaximumY =
            courseBoundaryDefinition
                .maximumY -
            this.definition
                .courseBoundaryMargin;

        const generationWidth =
            generationMaximumX -
            generationMinimumX;

        const generationHeight =
            generationMaximumY -
            generationMinimumY;

        const gridDimensions =
            this.calculateGridDimensions(
                this.definition
                    .obstacleCount,

                generationWidth,

                generationHeight,
            );

        const cells =
            this.createPlacementCells(
                generationMinimumX,
                generationMaximumX,
                generationMinimumY,
                generationMaximumY,
                gridDimensions.columns,
                gridDimensions.rows,
            );

        /*
         * When the grid contains more cells than the
         * requested obstacle count, shuffle the cells
         * before selecting them.
         *
         * For the default 15-obstacle layout, the
         * calculated 5 × 3 grid contains exactly
         * fifteen cells.
         */
        const selectedCells =
            random
                .shuffle(
                    cells,
                )
                .slice(
                    0,
                    this.definition
                        .obstacleCount,
                );

        const generatedPoints:
            GeneratedObstaclePoint[] = [];

        for (
            const cell
            of selectedCells
        ) {
            const point =
                this.generatePointInsideCell(
                    cell,
                    generatedPoints,
                    random,
                );

            generatedPoints.push(
                point,
            );
        }

        /*
         * Shuffle generated points before assigning
         * static and dynamic categories.
         *
         * This prevents one category from being
         * concentrated in a specific section of the
         * grid.
         */
        const shuffledPoints =
            random.shuffle(
                generatedPoints,
            );

        const staticObstacleCount =
            Math.min(
                shuffledPoints.length,

                Math.round(
                    shuffledPoints.length *
                    this.definition
                        .staticObstacleRatio,
                ),
            );

        const staticDefinitions:
            StaticObstacleDefinition[] = [];

        const dynamicDefinitions:
            DynamicObstacleDefinition[] = [];

        for (
            let index = 0;
            index <
            shuffledPoints.length;
            index +=
            1
        ) {
            const point =
                shuffledPoints[
                index
                ];

            if (
                index <
                staticObstacleCount
            ) {
                staticDefinitions.push(
                    this.createStaticRectangle(
                        point,
                        staticDefinitions.length,
                    ),
                );

                continue;
            }

            dynamicDefinitions.push(
                this.createDynamicRectangle(
                    point,
                    dynamicDefinitions.length,
                ),
            );
        }

        console.log(
            "Generated stratified procedural obstacle field.",
            {
                total:
                    shuffledPoints.length,

                static:
                    staticDefinitions.length,

                dynamic:
                    dynamicDefinitions.length,

                gridColumns:
                    gridDimensions.columns,

                gridRows:
                    gridDimensions.rows,

                generationBounds: {
                    minimumX:
                        generationMinimumX,

                    maximumX:
                        generationMaximumX,

                    minimumY:
                        generationMinimumY,

                    maximumY:
                        generationMaximumY,
                },

                rectangleSize: {
                    width:
                        this.definition
                            .obstacleWidth,

                    height:
                        this.definition
                            .obstacleHeight,
                },
            },
        );

        return {
            staticDefinitions,
            dynamicDefinitions,
        };
    }

    // -------------------------------------------------------
    // Grid Calculation
    // -------------------------------------------------------

    /**
     * Calculates grid dimensions from the requested
     * point count and generation-area aspect ratio.
     *
     * Current default:
     *
     * Count: 15
     * Course aspect ratio: approximately 1.56
     *
     * Result:
     *
     * 5 columns
     * 3 rows
     */
    private calculateGridDimensions(
        obstacleCount: number,
        generationWidth: number,
        generationHeight: number,
    ): {
        readonly columns: number;
        readonly rows: number;
    } {

        const aspectRatio =
            generationWidth /
            generationHeight;

        const columns =
            Math.max(
                1,

                Math.ceil(
                    Math.sqrt(
                        obstacleCount *
                        aspectRatio,
                    ),
                ),
            );

        const rows =
            Math.max(
                1,

                Math.ceil(
                    obstacleCount /
                    columns,
                ),
            );

        return {
            columns,
            rows,
        };
    }

    /**
     * Divides the complete generation area into
     * rectangular cells.
     */
    private createPlacementCells(
        minimumX: number,
        maximumX: number,
        minimumY: number,
        maximumY: number,
        columns: number,
        rows: number,
    ): readonly ObstaclePlacementCell[] {

        const width =
            maximumX -
            minimumX;

        const height =
            maximumY -
            minimumY;

        const cellWidth =
            width /
            columns;

        const cellHeight =
            height /
            rows;

        const cells:
            ObstaclePlacementCell[] = [];

        for (
            let row = 0;
            row <
            rows;
            row +=
            1
        ) {
            for (
                let column = 0;
                column <
                columns;
                column +=
                1
            ) {
                const cellMinimumX =
                    minimumX +
                    column *
                    cellWidth;

                const cellMaximumX =
                    cellMinimumX +
                    cellWidth;

                const cellMinimumY =
                    minimumY +
                    row *
                    cellHeight;

                const cellMaximumY =
                    cellMinimumY +
                    cellHeight;

                cells.push({
                    column,
                    row,

                    minimumX:
                        cellMinimumX,

                    maximumX:
                        cellMaximumX,

                    minimumY:
                        cellMinimumY,

                    maximumY:
                        cellMaximumY,

                    centerX:
                        (
                            cellMinimumX +
                            cellMaximumX
                        ) /
                        2,

                    centerY:
                        (
                            cellMinimumY +
                            cellMaximumY
                        ) /
                        2,
                });
            }
        }

        return cells;
    }

    // -------------------------------------------------------
    // Point Placement
    // -------------------------------------------------------

    /**
     * Generates one jittered point inside a cell.
     *
     * Candidate points are rejected when they:
     *
     * 1. Enter the Ball spawn exclusion area
     * 2. Violate minimum obstacle spacing
     */
    private generatePointInsideCell(
        cell:
            ObstaclePlacementCell,

        existingPoints:
            readonly GeneratedObstaclePoint[],

        random:
            SeededRandom,
    ): GeneratedObstaclePoint {

        const cellWidth =
            cell.maximumX -
            cell.minimumX;

        const cellHeight =
            cell.maximumY -
            cell.minimumY;

        const maximumJitterX =
            cellWidth *
            this.definition
                .cellJitterRatio;

        const maximumJitterY =
            cellHeight *
            this.definition
                .cellJitterRatio;

        for (
            let attempt = 0;
            attempt <
            this.definition
                .placementAttemptsPerCell;
            attempt +=
            1
        ) {
            const candidate = {
                x:
                    cell.centerX +
                    random.nextRange(
                        -maximumJitterX,
                        maximumJitterX,
                    ),

                y:
                    cell.centerY +
                    random.nextRange(
                        -maximumJitterY,
                        maximumJitterY,
                    ),
            };

            if (
                this.isInsideBallExclusionArea(
                    candidate,
                )
            ) {
                continue;
            }

            if (
                !this.hasValidMinimumSpacing(
                    candidate,
                    existingPoints,
                )
            ) {
                continue;
            }

            return candidate;
        }

        /*
         * The cell center is the first fallback.
         *
         * This should normally be valid because cells
         * are already broadly separated.
         */
        const centerCandidate = {
            x:
                cell.centerX,

            y:
                cell.centerY,
        };

        if (
            !this.isInsideBallExclusionArea(
                centerCandidate,
            ) &&
            this.hasValidMinimumSpacing(
                centerCandidate,
                existingPoints,
            )
        ) {
            console.warn(
                "Procedural obstacle placement used a cell-center fallback.",
                {
                    column:
                        cell.column,

                    row:
                        cell.row,
                },
            );

            return centerCandidate;
        }

        /*
         * A final deterministic search checks several
         * positions around the cell.
         *
         * This is mainly useful for the cell containing
         * the Ball exclusion region.
         */
        const fallbackOffsets:
            readonly {
                readonly x: number;
                readonly y: number;
            }[] = [

                {
                    x: -0.35,
                    y: -0.35,
                },

                {
                    x: 0.35,
                    y: -0.35,
                },

                {
                    x: -0.35,
                    y: 0.35,
                },

                {
                    x: 0.35,
                    y: 0.35,
                },

                {
                    x: -0.4,
                    y: 0,
                },

                {
                    x: 0.4,
                    y: 0,
                },

                {
                    x: 0,
                    y: -0.4,
                },

                {
                    x: 0,
                    y: 0.4,
                },
            ];

        for (
            const offset
            of fallbackOffsets
        ) {
            const fallbackCandidate = {
                x:
                    cell.centerX +
                    cellWidth *
                    offset.x,

                y:
                    cell.centerY +
                    cellHeight *
                    offset.y,
            };

            if (
                this.isInsideBallExclusionArea(
                    fallbackCandidate,
                )
            ) {
                continue;
            }

            if (
                !this.hasValidMinimumSpacing(
                    fallbackCandidate,
                    existingPoints,
                )
            ) {
                continue;
            }

            console.warn(
                "Procedural obstacle placement used a deterministic fallback.",
                {
                    column:
                        cell.column,

                    row:
                        cell.row,
                },
            );

            return fallbackCandidate;
        }

        /*
         * Returning the cell center guarantees that
         * generation still completes.
         *
         * With the current course and configuration,
         * this final fallback should not normally be
         * reached.
         */
        console.warn(
            "Procedural obstacle placement could not satisfy all exclusion constraints.",
            {
                column:
                    cell.column,

                row:
                    cell.row,

                fallbackPosition: {
                    x:
                        centerCandidate.x,

                    y:
                        centerCandidate.y,
                },
            },
        );

        return centerCandidate;
    }

    private isInsideBallExclusionArea(
        point:
            GeneratedObstaclePoint,
    ): boolean {

        const deltaX =
            point.x -
            DEFAULT_PROCEDURAL_OBSTACLE_EXCLUSION_CENTER
                .x;

        const deltaY =
            point.y -
            DEFAULT_PROCEDURAL_OBSTACLE_EXCLUSION_CENTER
                .y;

        return (
            deltaX *
            deltaX +
            deltaY *
            deltaY <
            this.definition
                .ballSpawnExclusionRadius *
            this.definition
                .ballSpawnExclusionRadius
        );
    }

    private hasValidMinimumSpacing(
        candidate:
            GeneratedObstaclePoint,

        existingPoints:
            readonly GeneratedObstaclePoint[],
    ): boolean {

        const minimumSpacingSquared =
            this.definition
                .minimumSpacing *
            this.definition
                .minimumSpacing;

        return existingPoints.every(
            (
                existingPoint:
                    GeneratedObstaclePoint,
            ): boolean => {

                const deltaX =
                    candidate.x -
                    existingPoint.x;

                const deltaY =
                    candidate.y -
                    existingPoint.y;

                return (
                    deltaX *
                    deltaX +
                    deltaY *
                    deltaY >=
                    minimumSpacingSquared
                );
            },
        );
    }

    // -------------------------------------------------------
    // Static Rectangle Definition
    // -------------------------------------------------------

    private createStaticRectangle(
        point:
            GeneratedObstaclePoint,

        index: number,
    ): StaticObstacleDefinition {

        return {
            id:
                `procedural-static-rectangle-${index + 1}`,

            shape:
                "rectangle",

            positionX:
                point.x,

            positionY:
                point.y,

            width:
                this.definition
                    .obstacleWidth,

            height:
                this.definition
                    .obstacleHeight,

            fillColor:
                this.definition
                    .staticFillColor,

            outlineColor:
                this.definition
                    .outlineColor,

            outlineWidth:
                this.definition
                    .outlineWidth,

            material: {
                restitution:
                    this.definition
                        .staticRestitution,

                collisionFriction:
                    this.definition
                        .staticCollisionFriction,
            },
        };
    }

    // -------------------------------------------------------
    // Dynamic Rectangle Definition
    // -------------------------------------------------------

    private createDynamicRectangle(
        point:
            GeneratedObstaclePoint,

        index: number,
    ): DynamicObstacleDefinition {

        return {
            id:
                `procedural-dynamic-rectangle-${index + 1}`,

            shape:
                "rectangle",

            positionX:
                point.x,

            positionY:
                point.y,

            rotationRadians:
                0,

            width:
                this.definition
                    .obstacleWidth,

            height:
                this.definition
                    .obstacleHeight,

            fillColor:
                this.definition
                    .dynamicFillColor,

            outlineColor:
                this.definition
                    .outlineColor,

            outlineWidth:
                this.definition
                    .outlineWidth,

            material: {
                restitution:
                    this.definition
                        .dynamicRestitution,

                friction:
                    this.definition
                        .dynamicFriction,
            },

            rigidBody: {
                bodyType:
                    "dynamic",

                mass:
                    this.definition
                        .dynamicMass,

                linearDamping:
                    this.definition
                        .dynamicLinearDamping,

                angularDamping:
                    this.definition
                        .dynamicAngularDamping,

                sleepLinearSpeedThreshold:
                    this.definition
                        .dynamicSleepLinearSpeedThreshold,

                sleepAngularSpeedThreshold:
                    this.definition
                        .dynamicSleepAngularSpeedThreshold,

                sleepDelay:
                    this.definition
                        .dynamicSleepDelay,

                maximumLinearSpeed:
                    this.definition
                        .dynamicMaximumLinearSpeed,

                maximumAngularSpeed:
                    this.definition
                        .dynamicMaximumAngularSpeed,
            },
        };
    }

    // -------------------------------------------------------
    // Configuration Validation
    // -------------------------------------------------------

    private validateDefinition(
        definition:
            ProceduralObstacleFieldDefinition,
    ): void {

        if (
            !Number.isFinite(
                definition.seed,
            )
        ) {
            throw new Error(
                "Procedural obstacle seed must be finite.",
            );
        }

        if (
            !Number.isInteger(
                definition.obstacleCount,
            ) ||
            definition.obstacleCount <=
            0
        ) {
            throw new Error(
                "Procedural obstacleCount must be a positive integer.",
            );
        }

        if (
            !Number.isFinite(
                definition
                    .staticObstacleRatio,
            ) ||
            definition
                .staticObstacleRatio <
            0 ||
            definition
                .staticObstacleRatio >
            1
        ) {
            throw new Error(
                "Procedural staticObstacleRatio must remain between zero and one.",
            );
        }

        if (
            !Number.isFinite(
                definition
                    .courseBoundaryMargin,
            ) ||
            definition
                .courseBoundaryMargin <=
            0
        ) {
            throw new Error(
                "Procedural courseBoundaryMargin must be greater than zero.",
            );
        }

        if (
            !Number.isFinite(
                definition
                    .ballSpawnExclusionRadius,
            ) ||
            definition
                .ballSpawnExclusionRadius <
            0
        ) {
            throw new Error(
                "Procedural ballSpawnExclusionRadius cannot be negative.",
            );
        }

        if (
            !Number.isFinite(
                definition.minimumSpacing,
            ) ||
            definition.minimumSpacing <=
            0
        ) {
            throw new Error(
                "Procedural minimumSpacing must be greater than zero.",
            );
        }

        if (
            !Number.isFinite(
                definition
                    .cellJitterRatio,
            ) ||
            definition
                .cellJitterRatio <
            0 ||
            definition
                .cellJitterRatio >=
            0.5
        ) {
            throw new Error(
                "Procedural cellJitterRatio must remain between zero inclusive and 0.5 exclusive.",
            );
        }

        if (
            !Number.isInteger(
                definition
                    .placementAttemptsPerCell,
            ) ||
            definition
                .placementAttemptsPerCell <=
            0
        ) {
            throw new Error(
                "Procedural placementAttemptsPerCell must be a positive integer.",
            );
        }

        if (
            !Number.isFinite(
                definition.obstacleWidth,
            ) ||
            definition.obstacleWidth <=
            0 ||
            !Number.isFinite(
                definition.obstacleHeight,
            ) ||
            definition.obstacleHeight <=
            0
        ) {
            throw new Error(
                "Procedural obstacle dimensions must be finite values greater than zero.",
            );
        }

        this.validateColor(
            definition
                .staticFillColor,

            "staticFillColor",
        );

        this.validateColor(
            definition
                .dynamicFillColor,

            "dynamicFillColor",
        );

        this.validateColor(
            definition
                .outlineColor,

            "outlineColor",
        );

        if (
            !Number.isFinite(
                definition.outlineWidth,
            ) ||
            definition.outlineWidth <
            0
        ) {
            throw new Error(
                "Procedural outlineWidth cannot be negative.",
            );
        }

        this.validateUnitRange(
            definition
                .staticRestitution,

            "staticRestitution",
        );

        this.validateUnitRange(
            definition
                .staticCollisionFriction,

            "staticCollisionFriction",
        );

        this.validateUnitRange(
            definition
                .dynamicRestitution,

            "dynamicRestitution",
        );

        if (
            !Number.isFinite(
                definition.dynamicFriction,
            ) ||
            definition.dynamicFriction <
            0
        ) {
            throw new Error(
                "Procedural dynamicFriction cannot be negative.",
            );
        }

        const positiveDynamicValues = [
            definition.dynamicMass,
            definition.dynamicLinearDamping,
            definition.dynamicAngularDamping,
            definition.dynamicSleepLinearSpeedThreshold,
            definition.dynamicSleepAngularSpeedThreshold,
            definition.dynamicSleepDelay,
            definition.dynamicMaximumLinearSpeed,
            definition.dynamicMaximumAngularSpeed,
        ];

        if (
            positiveDynamicValues.some(
                (
                    value: number,
                ) =>
                    !Number.isFinite(
                        value,
                    ) ||
                    value <=
                    0,
            )
        ) {
            throw new Error(
                "Procedural dynamic obstacle physics values must be finite numbers greater than zero.",
            );
        }
    }

    private validateCourseBoundaryDefinition(
        definition:
            CourseBoundaryDefinition,
    ): void {

        if (
            !Number.isFinite(
                definition.minimumX,
            ) ||
            !Number.isFinite(
                definition.maximumX,
            ) ||
            !Number.isFinite(
                definition.minimumY,
            ) ||
            !Number.isFinite(
                definition.maximumY,
            )
        ) {
            throw new Error(
                "Procedural obstacle course boundaries must be finite.",
            );
        }

        if (
            definition.maximumX <=
            definition.minimumX ||
            definition.maximumY <=
            definition.minimumY
        ) {
            throw new Error(
                "Procedural obstacle course boundaries must have positive dimensions.",
            );
        }

        const generationWidth =
            (
                definition.maximumX -
                definition.minimumX
            ) -
            this.definition
                .courseBoundaryMargin *
            2;

        const generationHeight =
            (
                definition.maximumY -
                definition.minimumY
            ) -
            this.definition
                .courseBoundaryMargin *
            2;

        if (
            generationWidth <=
            this.definition
                .obstacleWidth ||
            generationHeight <=
            this.definition
                .obstacleHeight
        ) {
            throw new Error(
                "Procedural obstacle generation area is too small for the configured rectangles.",
            );
        }
    }

    private validateColor(
        color: number,
        propertyName: string,
    ): void {

        if (
            !Number.isInteger(
                color,
            ) ||
            color <
            0 ||
            color >
            0xffffff
        ) {
            throw new Error(
                `Procedural ${propertyName} must be a hexadecimal color between 0x000000 and 0xffffff.`,
            );
        }
    }

    private validateUnitRange(
        value: number,
        propertyName: string,
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
                `Procedural ${propertyName} must remain between zero and one.`,
            );
        }
    }
}
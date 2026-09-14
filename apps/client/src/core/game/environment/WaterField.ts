import {
    DEFAULT_COURSE_BOUNDARY_DEFINITION,
} from "../config/CourseBoundaryDefinition";

import {
    DEFAULT_WATER_FIELD_DEFINITION,
    validateWaterFieldDefinition,
} from "../config/WaterFieldDefinition";

import type {
    CourseBoundaryDefinition,
} from "../config/CourseBoundaryDefinition";

import type {
    WaterFieldDefinition,
} from "../config/WaterFieldDefinition";

import type {
    WaterFieldCell,
} from "./WaterFieldCell";

import {
    WaterFlowSolver,
} from "./WaterFlowSolver";

/**
 * Authoritative standing-Water field.
 *
 * Phase 8A-1 owns only Water storage, coordinate conversion, injection,
 * querying, and reset. It intentionally performs no fluid transport yet.
 *
 * Storage uses one-dimensional typed arrays so the later shallow-water solver
 * can update compact numeric channels without allocating per-cell objects.
 */
export class WaterField {

    private readonly definition:
        WaterFieldDefinition;

    private readonly courseBoundaryDefinition:
        CourseBoundaryDefinition;

    private readonly columnCount:
        number;

    private readonly rowCount:
        number;

    private readonly cellCount:
        number;

    private readonly depth:
        Float32Array;

    private readonly velocityX:
        Float32Array;

    private readonly velocityY:
        Float32Array;

    private readonly flowSolver:
        WaterFlowSolver;

    /** Sparse simulation membership for the current and next Water step. */
    private readonly activeFlags: Uint8Array;
    private readonly nextActiveFlags: Uint8Array;
    private activeIndices: number[] = [];
    private nextActiveIndices: number[] = [];

    /** Sparse registry of cells that currently contain any Water. */
    private readonly trackedWaterFlags: Uint8Array;
    private readonly trackedWaterPositions: Int32Array;
    private trackedWaterIndices: number[] = [];

    /** Number of cells actually offered to the solver on the last fixed step. */
    private lastProcessedCellCount = 0;

    /** Fixed-timestep accumulator owned by WaterField, not WaterFlowSolver. */
    private simulationAccumulator = 0;

    /** Number of fixed Water steps executed by the most recent update call. */
    private lastSubstepCount = 0;

    /**
     * Authoritative total standing-Water amount.
     *
     * This is updated only by explicit source/sink mutations. Internal
     * cell-to-cell transport added later must preserve this value.
     */
    private totalWaterAmount =
        0;

    /**
     * Number of cells whose depth is greater than zero.
     *
     * Maintained incrementally so diagnostics do not scan the full grid.
     */
    private nonEmptyCellCount =
        0;

    constructor(
        definition:
            WaterFieldDefinition =
            DEFAULT_WATER_FIELD_DEFINITION,

        courseBoundaryDefinition:
            CourseBoundaryDefinition =
            DEFAULT_COURSE_BOUNDARY_DEFINITION,
    ) {
        validateWaterFieldDefinition(
            definition,
        );

        this.validateCourseBoundaryDefinition(
            courseBoundaryDefinition,
        );

        this.definition =
            definition;

        this.courseBoundaryDefinition =
            courseBoundaryDefinition;

        const courseWidth =
            courseBoundaryDefinition.maximumX -
            courseBoundaryDefinition.minimumX;

        const courseHeight =
            courseBoundaryDefinition.maximumY -
            courseBoundaryDefinition.minimumY;

        this.columnCount =
            Math.ceil(
                courseWidth /
                definition.cellSize,
            );

        this.rowCount =
            Math.ceil(
                courseHeight /
                definition.cellSize,
            );

        this.cellCount =
            this.columnCount *
            this.rowCount;

        this.depth =
            new Float32Array(
                this.cellCount,
            );

        this.velocityX =
            new Float32Array(
                this.cellCount,
            );

        this.velocityY =
            new Float32Array(
                this.cellCount,
            );

        this.activeFlags =
            new Uint8Array(
                this.cellCount,
            );

        this.nextActiveFlags =
            new Uint8Array(
                this.cellCount,
            );

        this.trackedWaterFlags =
            new Uint8Array(
                this.cellCount,
            );

        this.trackedWaterPositions =
            new Int32Array(
                this.cellCount,
            );

        this.trackedWaterPositions.fill(
            -1,
        );

        this.flowSolver =
            new WaterFlowSolver(
                this.columnCount,
                this.rowCount,
                this.definition,
            );
    }

    // ---------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------

    public reset(): void {

        this.depth.fill(
            0,
        );

        this.velocityX.fill(
            0,
        );

        this.velocityY.fill(
            0,
        );

        this.totalWaterAmount =
            0;

        this.nonEmptyCellCount =
            0;

        this.activeFlags.fill(
            0,
        );

        this.nextActiveFlags.fill(
            0,
        );

        this.trackedWaterFlags.fill(
            0,
        );

        this.trackedWaterPositions.fill(
            -1,
        );

        this.activeIndices.length =
            0;

        this.nextActiveIndices.length =
            0;

        this.trackedWaterIndices.length =
            0;

        this.lastProcessedCellCount =
            0;

        this.simulationAccumulator =
            0;

        this.lastSubstepCount =
            0;
    }

    /**
     * Advances the sparse solver using a fixed internal timestep.
     *
     * The early return is important while the solver still scans the complete
     * field: normal gameplay with no Water performs no grid traversal.
     * Sparse active-region simulation replaces the full wet-field scan in 8A-5.
     */
    public update(
        deltaTime: number,
    ): void {

        this.lastProcessedCellCount =
            0;

        this.lastSubstepCount =
            0;

        if (
            this.totalWaterAmount <= 0 ||
            this.activeIndices.length === 0 ||
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return;
        }

        const admittedDelta =
            Math.min(
                deltaTime,
                this.definition
                    .maximumFrameDeltaSeconds,
            );

        this.simulationAccumulator +=
            admittedDelta;

        const fixedStep =
            this.definition
                .simulationStepSeconds;

        const maximumSubsteps =
            this.definition
                .maximumSubstepsPerFrame;

        while (
            this.simulationAccumulator + 1e-12 >= fixedStep &&
            this.lastSubstepCount < maximumSubsteps
        ) {
            /*
             * Phase 8B-4C:
             * A tiny sprinkler impact should not behave like a miniature
             * flood. Scale the solver response smoothly while the currently
             * active Water is shallow. The accumulator still advances by the
             * authoritative fixed step, so frame-rate determinism is kept.
             *
             * This changes transport speed only. Water amount remains
             * conserved by WaterFlowSolver.
             */
            const mobility =
                this.calculateCurrentShallowWaterMobility();

            const result =
                this.flowSolver.step(
                    this.depth,
                    this.velocityX,
                    this.velocityY,
                    this.activeIndices,
                    fixedStep * mobility,
                );

            this.lastProcessedCellCount =
                result.processedCellCount;

            this.rebuildTrackedWaterCells();
            this.rebuildActiveCells();

            this.simulationAccumulator -=
                fixedStep;

            this.lastSubstepCount +=
                1;

            if (
                this.activeIndices.length === 0
            ) {
                this.simulationAccumulator =
                    0;

                break;
            }
        }

        /*
         * Do not retain an unbounded backlog after a long browser hitch.
         * maximumSubstepsPerFrame is a hard performance guard.
         */
        if (
            this.lastSubstepCount >= maximumSubsteps &&
            this.simulationAccumulator >= fixedStep
        ) {
            this.simulationAccumulator =
                this.simulationAccumulator %
                fixedStep;
        }
    }

    // ---------------------------------------------------------------------
    // Authoritative mutation
    // ---------------------------------------------------------------------

    /**
     * Adds standing Water to the cell containing the supplied world point.
     *
     * Phase 8A-1 intentionally deposits into exactly one cell. Radial source
     * deposition and fluid spreading are introduced later.
     *
     * Returns the amount actually accepted after maximum-depth clamping.
     */
    public injectWater(
        worldX: number,
        worldY: number,
        amount: number,
    ): number {

        return this.injectWaterWithMomentum(
            worldX,
            worldY,
            amount,
            0,
            0,
        );
    }

    /**
     * Adds standing Water and horizontal momentum to the target cell.
     *
     * Existing and incoming Water velocities are combined by depth-weighted
     * momentum so injection does not overwrite motion already stored there.
     *
     * Returns the amount actually accepted after maximum-depth clamping.
     */
    public injectWaterWithMomentum(
        worldX: number,
        worldY: number,
        amount: number,
        incomingVelocityX: number,
        incomingVelocityY: number,
    ): number {

        if (
            !Number.isFinite(
                worldX,
            ) ||
            !Number.isFinite(
                worldY,
            ) ||
            !Number.isFinite(
                amount,
            ) ||
            !Number.isFinite(
                incomingVelocityX,
            ) ||
            !Number.isFinite(
                incomingVelocityY,
            ) ||
            amount <= 0
        ) {
            return 0;
        }

        const gridPosition =
            this.worldToGrid(
                worldX,
                worldY,
            );

        if (!gridPosition) {
            return 0;
        }

        const index =
            this.gridToIndex(
                gridPosition.gridX,
                gridPosition.gridY,
            );

        const previousDepth =
            this.depth[
            index
            ];

        const nextDepth =
            Math.min(
                this.definition.maximumDepth,
                previousDepth +
                amount,
            );

        const acceptedAmount =
            nextDepth -
            previousDepth;

        if (
            acceptedAmount <= 0
        ) {
            return 0;
        }

        const maximumVelocity =
            this.definition
                .maximumVelocity;

        const clampedIncomingVelocityX =
            this.clamp(
                incomingVelocityX,
                -maximumVelocity,
                maximumVelocity,
            );

        const clampedIncomingVelocityY =
            this.clamp(
                incomingVelocityY,
                -maximumVelocity,
                maximumVelocity,
            );

        const previousMomentumX =
            previousDepth *
            this.velocityX[
            index
            ];

        const previousMomentumY =
            previousDepth *
            this.velocityY[
            index
            ];

        const incomingMomentumX =
            acceptedAmount *
            clampedIncomingVelocityX;

        const incomingMomentumY =
            acceptedAmount *
            clampedIncomingVelocityY;

        this.depth[
            index
        ] =
            nextDepth;

        this.velocityX[
            index
        ] =
            this.clamp(
                (
                    previousMomentumX +
                    incomingMomentumX
                ) /
                nextDepth,
                -maximumVelocity,
                maximumVelocity,
            );

        this.velocityY[
            index
        ] =
            this.clamp(
                (
                    previousMomentumY +
                    incomingMomentumY
                ) /
                nextDepth,
                -maximumVelocity,
                maximumVelocity,
            );

        this.totalWaterAmount +=
            acceptedAmount;

        if (
            previousDepth <= 0 &&
            nextDepth > 0
        ) {
            this.nonEmptyCellCount +=
                1;

            this.trackWaterIndex(
                index,
            );
        }

        this.activateIndexAndCardinalNeighbors(
            index,
            this.activeFlags,
            this.activeIndices,
        );

        return acceptedAmount;
    }

    /**
     * Removes standing Water from the cell containing the supplied world
     * point. Returns the amount actually removed.
     *
     * This is the authoritative Water sink introduced for Phase 8C. External
     * systems never mutate the WaterField storage arrays directly.
     */
    public removeWater(
        worldX: number,
        worldY: number,
        amount: number,
    ): number {
        if (
            !Number.isFinite(worldX) ||
            !Number.isFinite(worldY) ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            return 0;
        }

        const gridPosition =
            this.worldToGrid(
                worldX,
                worldY,
            );

        if (!gridPosition) {
            return 0;
        }

        return this.removeWaterByIndex(
            this.gridToIndex(
                gridPosition.gridX,
                gridPosition.gridY,
            ),
            amount,
        );
    }

    /**
     * Index-based standing-Water sink for sparse interaction systems.
     *
     * Removal preserves WaterField accounting, clears meaningless velocity
     * when a cell becomes dry, maintains sparse Water membership, and wakes
     * the local flow neighbourhood so the solver can respond to the changed
     * depth on the next Water step.
     */
    public removeWaterByIndex(
        index: number,
        amount: number,
    ): number {
        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= this.cellCount ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            return 0;
        }

        const previousDepth =
            this.depth[index];

        if (previousDepth <= 0) {
            return 0;
        }

        const removedAmount =
            Math.min(
                previousDepth,
                amount,
            );

        const nextDepth =
            Math.max(
                0,
                previousDepth - removedAmount,
            );

        this.depth[index] =
            nextDepth;

        this.totalWaterAmount =
            Math.max(
                0,
                this.totalWaterAmount - removedAmount,
            );

        if (nextDepth <= 0) {
            this.depth[index] = 0;
            this.velocityX[index] = 0;
            this.velocityY[index] = 0;

            this.nonEmptyCellCount =
                Math.max(
                    0,
                    this.nonEmptyCellCount - 1,
                );

            this.untrackWaterIndex(
                index,
            );
        }

        this.activateIndexAndCardinalNeighbors(
            index,
            this.activeFlags,
            this.activeIndices,
        );

        return removedAmount;
    }

    /**
     * Sets horizontal Water velocity for the cell containing a world point.
     *
     * The velocity channels are authoritative storage only in Phase 8A-1.
     * They are not integrated until the momentum/flow solver step.
     */
    public setVelocityAt(
        worldX: number,
        worldY: number,
        velocityX: number,
        velocityY: number,
    ): boolean {

        if (
            !Number.isFinite(
                worldX,
            ) ||
            !Number.isFinite(
                worldY,
            ) ||
            !Number.isFinite(
                velocityX,
            ) ||
            !Number.isFinite(
                velocityY,
            )
        ) {
            return false;
        }

        const gridPosition =
            this.worldToGrid(
                worldX,
                worldY,
            );

        if (!gridPosition) {
            return false;
        }

        const index =
            this.gridToIndex(
                gridPosition.gridX,
                gridPosition.gridY,
            );

        const maximumVelocity =
            this.definition
                .maximumVelocity;

        this.velocityX[
            index
        ] =
            this.clamp(
                velocityX,
                -maximumVelocity,
                maximumVelocity,
            );

        this.velocityY[
            index
        ] =
            this.clamp(
                velocityY,
                -maximumVelocity,
                maximumVelocity,
            );

        if (
            this.depth[
            index
            ] > 0
        ) {
            this.trackWaterIndex(
                index,
            );

            this.activateIndexAndCardinalNeighbors(
                index,
                this.activeFlags,
                this.activeIndices,
            );
        }

        return true;
    }

    /**
     * Current global shallow-Water transport multiplier.
     *
     * Exposed read-only for validation/diagnostics. It never mutates Water.
     */
    public getCurrentShallowWaterMobility(): number {
        return this.calculateCurrentShallowWaterMobility();
    }

    private calculateCurrentShallowWaterMobility(): number {
        let representativeDepth = 0;

        for (const index of this.activeIndices) {
            representativeDepth =
                Math.max(
                    representativeDepth,
                    this.depth[index],
                );
        }

        const thinDepth =
            this.definition.thinWaterDepth;

        const fullDepth =
            this.definition.fullMobilityDepth;

        if (representativeDepth <= thinDepth) {
            return this.definition
                .thinWaterMinimumMobility;
        }

        if (representativeDepth >= fullDepth) {
            return 1;
        }

        const normalized =
            (
                representativeDepth -
                thinDepth
            ) /
            (
                fullDepth -
                thinDepth
            );

        const curved =
            Math.pow(
                normalized,
                this.definition
                    .shallowMobilityExponent,
            );

        return (
            this.definition
                .thinWaterMinimumMobility +
            (
                1 -
                this.definition
                    .thinWaterMinimumMobility
            ) *
            curved
        );
    }

    // ---------------------------------------------------------------------
    // Queries
    // ---------------------------------------------------------------------

    public sampleAt(
        worldX: number,
        worldY: number,
    ): WaterFieldCell | null {

        const gridPosition =
            this.worldToGrid(
                worldX,
                worldY,
            );

        if (!gridPosition) {
            return null;
        }

        return this.getCell(
            gridPosition.gridX,
            gridPosition.gridY,
        );
    }

    public getCell(
        gridX: number,
        gridY: number,
    ): WaterFieldCell | null {

        if (
            !this.isGridCoordinateValid(
                gridX,
                gridY,
            )
        ) {
            return null;
        }

        const index =
            this.gridToIndex(
                gridX,
                gridY,
            );

        const center =
            this.gridToWorldCenter(
                gridX,
                gridY,
            );

        return {
            gridX,
            gridY,
            index,

            worldCenterX:
                center.x,

            worldCenterY:
                center.y,

            depth:
                this.depth[
                index
                ],

            velocityX:
                this.velocityX[
                index
                ],

            velocityY:
                this.velocityY[
                index
                ],
        };
    }

    public getDepthAt(
        worldX: number,
        worldY: number,
    ): number {

        const gridPosition =
            this.worldToGrid(
                worldX,
                worldY,
            );

        if (!gridPosition) {
            return 0;
        }

        return this.depth[
            this.gridToIndex(
                gridPosition.gridX,
                gridPosition.gridY,
            )
        ];
    }

    public getVelocityAt(
        worldX: number,
        worldY: number,
    ): {
        readonly x: number;
        readonly y: number;
    } {

        const gridPosition =
            this.worldToGrid(
                worldX,
                worldY,
            );

        if (!gridPosition) {
            return {
                x: 0,
                y: 0,
            };
        }

        const index =
            this.gridToIndex(
                gridPosition.gridX,
                gridPosition.gridY,
            );

        return {
            x:
                this.velocityX[
                index
                ],

            y:
                this.velocityY[
                index
                ],
        };
    }

    public getWorldCenterByIndex(
        index: number,
    ): {
        readonly x: number;
        readonly y: number;
    } | null {

        if (
            !Number.isInteger(
                index,
            ) ||
            index < 0 ||
            index >=
            this.cellCount
        ) {
            return null;
        }

        const gridX =
            index %
            this.columnCount;

        const gridY =
            Math.floor(
                index /
                this.columnCount,
            );

        return this.gridToWorldCenter(
            gridX,
            gridY,
        );
    }

    public getDefinition():
        WaterFieldDefinition {

        return this.definition;
    }

    public getMinimumWorldX():
        number {

        return this.courseBoundaryDefinition
            .minimumX;
    }

    public getMinimumWorldY():
        number {

        return this.courseBoundaryDefinition
            .minimumY;
    }

    public getColumnCount():
        number {

        return this.columnCount;
    }

    public getRowCount():
        number {

        return this.rowCount;
    }

    public getCellCount():
        number {

        return this.cellCount;
    }

    public getTotalWaterAmount():
        number {

        return this.totalWaterAmount;
    }

    public getNonEmptyCellCount():
        number {

        return this.nonEmptyCellCount;
    }

    public getActiveCellCount():
        number {

        return this.activeIndices.length;
    }

    public getLastProcessedCellCount():
        number {

        return this.lastProcessedCellCount;
    }

    public getTrackedWaterCellCount():
        number {

        return this.trackedWaterIndices.length;
    }

    public getLastSubstepCount():
        number {

        return this.lastSubstepCount;
    }

    public getSimulationAccumulator():
        number {

        return this.simulationAccumulator;
    }

    /**
     * Read-only sparse traversal for presentation/debug consumers.
     * No mutable Water buffers are exposed.
     */
    public forEachActiveCell(
        callback: (
            cell: WaterFieldCell,
            isSimulationActive: boolean,
        ) => void,
    ): void {

        for (
            const index of
            this.activeIndices
        ) {
            const gridX =
                index %
                this.columnCount;

            const gridY =
                Math.floor(
                    index /
                    this.columnCount,
                );

            const cell =
                this.getCell(
                    gridX,
                    gridY,
                );

            if (
                cell
            ) {
                callback(
                    cell,
                    true,
                );
            }
        }
    }

    /**
     * Read-only sparse traversal of cells that actually contain Water.
     * This is useful when sleeping shallow Water is not simulation-active.
     */
    public forEachTrackedWaterCell(
        callback: (
            cell: WaterFieldCell,
        ) => void,
    ): void {

        for (
            const index of
            this.trackedWaterIndices
        ) {
            const gridX =
                index %
                this.columnCount;

            const gridY =
                Math.floor(
                    index /
                    this.columnCount,
                );

            const cell =
                this.getCell(
                    gridX,
                    gridY,
                );

            if (
                cell
            ) {
                callback(
                    cell,
                );
            }
        }
    }

    /**
     * Development diagnostic: calculates the Water-depth-weighted center of
     * mass in world space. Returns null when the field is dry.
     */
    public calculateWaterCenterOfMass(): {
        readonly x: number;
        readonly y: number;
    } | null {

        let totalDepth =
            0;

        let weightedX =
            0;

        let weightedY =
            0;

        for (
            let index = 0;
            index < this.depth.length;
            index += 1
        ) {
            const cellDepth =
                this.depth[
                index
                ];

            if (
                cellDepth <= 0
            ) {
                continue;
            }

            const gridX =
                index %
                this.columnCount;

            const gridY =
                Math.floor(
                    index /
                    this.columnCount,
                );

            const centerX =
                this.courseBoundaryDefinition
                    .minimumX +
                (
                    gridX +
                    0.5
                ) *
                this.definition
                    .cellSize;

            const centerY =
                this.courseBoundaryDefinition
                    .minimumY +
                (
                    gridY +
                    0.5
                ) *
                this.definition
                    .cellSize;

            totalDepth +=
                cellDepth;

            weightedX +=
                centerX *
                cellDepth;

            weightedY +=
                centerY *
                cellDepth;
        }

        if (
            totalDepth <= 0
        ) {
            return null;
        }

        return {
            x:
                weightedX /
                totalDepth,

            y:
                weightedY /
                totalDepth,
        };
    }

    /**
     * Development diagnostic: Water-depth-weighted average velocity.
     */
    public calculateWaterWeightedAverageVelocity(): {
        readonly x: number;
        readonly y: number;
    } {

        let totalDepth =
            0;

        let weightedVelocityX =
            0;

        let weightedVelocityY =
            0;

        for (
            let index = 0;
            index < this.depth.length;
            index += 1
        ) {
            const cellDepth =
                this.depth[
                index
                ];

            if (
                cellDepth <= 0
            ) {
                continue;
            }

            totalDepth +=
                cellDepth;

            weightedVelocityX +=
                this.velocityX[
                index
                ] *
                cellDepth;

            weightedVelocityY +=
                this.velocityY[
                index
                ] *
                cellDepth;
        }

        if (
            totalDepth <= 0
        ) {
            return {
                x: 0,
                y: 0,
            };
        }

        return {
            x:
                weightedVelocityX /
                totalDepth,

            y:
                weightedVelocityY /
                totalDepth,
        };
    }

    // ---------------------------------------------------------------------
    // Coordinate conversion
    // ---------------------------------------------------------------------

    public worldToGrid(
        worldX: number,
        worldY: number,
    ): {
        readonly gridX: number;
        readonly gridY: number;
    } | null {

        if (
            !Number.isFinite(
                worldX,
            ) ||
            !Number.isFinite(
                worldY,
            ) ||
            worldX <
            this.courseBoundaryDefinition.minimumX ||
            worldX >=
            this.courseBoundaryDefinition.maximumX ||
            worldY <
            this.courseBoundaryDefinition.minimumY ||
            worldY >=
            this.courseBoundaryDefinition.maximumY
        ) {
            return null;
        }

        const gridX =
            Math.floor(
                (
                    worldX -
                    this.courseBoundaryDefinition
                        .minimumX
                ) /
                this.definition.cellSize,
            );

        const gridY =
            Math.floor(
                (
                    worldY -
                    this.courseBoundaryDefinition
                        .minimumY
                ) /
                this.definition.cellSize,
            );

        if (
            !this.isGridCoordinateValid(
                gridX,
                gridY,
            )
        ) {
            return null;
        }

        return {
            gridX,
            gridY,
        };
    }

    public gridToWorldCenter(
        gridX: number,
        gridY: number,
    ): {
        readonly x: number;
        readonly y: number;
    } {

        if (
            !this.isGridCoordinateValid(
                gridX,
                gridY,
            )
        ) {
            throw new Error(
                `WaterField grid coordinate (${gridX}, ${gridY}) is outside the field.`,
            );
        }

        return {
            x:
                this.courseBoundaryDefinition
                    .minimumX +
                (
                    gridX +
                    0.5
                ) *
                this.definition.cellSize,

            y:
                this.courseBoundaryDefinition
                    .minimumY +
                (
                    gridY +
                    0.5
                ) *
                this.definition.cellSize,
        };
    }

    private gridToIndex(
        gridX: number,
        gridY: number,
    ): number {

        return (
            gridY *
            this.columnCount +
            gridX
        );
    }

    private isGridCoordinateValid(
        gridX: number,
        gridY: number,
    ): boolean {

        return (
            Number.isInteger(
                gridX,
            ) &&
            Number.isInteger(
                gridY,
            ) &&
            gridX >= 0 &&
            gridX <
            this.columnCount &&
            gridY >= 0 &&
            gridY <
            this.rowCount
        );
    }

    // ---------------------------------------------------------------------
    // Sparse activity bookkeeping
    // ---------------------------------------------------------------------

    private trackWaterIndex(
        index: number,
    ): void {

        if (
            this.trackedWaterFlags[
            index
            ] !== 0
        ) {
            return;
        }

        this.trackedWaterFlags[
            index
        ] =
            1;

        this.trackedWaterPositions[
            index
        ] =
            this.trackedWaterIndices.length;

        this.trackedWaterIndices.push(
            index,
        );
    }

    private untrackWaterIndex(
        index: number,
    ): void {
        if (
            this.trackedWaterFlags[index] === 0
        ) {
            return;
        }

        const position =
            this.trackedWaterPositions[index];

        const lastPosition =
            this.trackedWaterIndices.length - 1;

        const lastIndex =
            this.trackedWaterIndices[lastPosition];

        if (
            position >= 0 &&
            position <= lastPosition
        ) {
            if (position !== lastPosition) {
                this.trackedWaterIndices[position] =
                    lastIndex;

                this.trackedWaterPositions[lastIndex] =
                    position;
            }

            this.trackedWaterIndices.pop();
        }

        this.trackedWaterFlags[index] =
            0;

        this.trackedWaterPositions[index] =
            -1;
    }

    private rebuildTrackedWaterCells():
        void {

        for (
            const index of
            this.activeIndices
        ) {
            if (
                this.depth[
                index
                ] > 0
            ) {
                this.trackWaterIndex(
                    index,
                );
            }
        }

        let writeIndex =
            0;

        for (
            const index of
            this.trackedWaterIndices
        ) {
            if (
                this.depth[
                index
                ] <= 0
            ) {
                this.trackedWaterFlags[
                    index
                ] =
                    0;

                this.trackedWaterPositions[
                    index
                ] =
                    -1;

                continue;
            }

            this.trackedWaterIndices[
                writeIndex
            ] =
                index;

            this.trackedWaterPositions[
                index
            ] =
                writeIndex;

            writeIndex +=
                1;
        }

        this.trackedWaterIndices.length =
            writeIndex;

        this.nonEmptyCellCount =
            writeIndex;
    }

    private rebuildActiveCells():
        void {

        for (
            const index of
            this.nextActiveIndices
        ) {
            this.nextActiveFlags[
                index
            ] =
                0;
        }

        this.nextActiveIndices.length =
            0;

        const activeDepthThreshold =
            this.definition
                .activeDepthThreshold;

        const activeVelocityThresholdSquared =
            this.definition
                .activeVelocityThreshold *
            this.definition
                .activeVelocityThreshold;

        for (
            const index of
            this.activeIndices
        ) {
            const cellDepth =
                this.depth[
                index
                ];

            if (
                cellDepth <= 0
            ) {
                continue;
            }

            const cellVelocityX =
                this.velocityX[
                index
                ];

            const cellVelocityY =
                this.velocityY[
                index
                ];

            const speedSquared =
                cellVelocityX *
                cellVelocityX +
                cellVelocityY *
                cellVelocityY;

            if (
                cellDepth <
                activeDepthThreshold &&
                speedSquared <
                activeVelocityThresholdSquared
            ) {
                continue;
            }

            this.activateIndexAndCardinalNeighbors(
                index,
                this.nextActiveFlags,
                this.nextActiveIndices,
            );
        }

        for (
            const index of
            this.activeIndices
        ) {
            this.activeFlags[
                index
            ] =
                0;
        }

        const previousActiveIndices =
            this.activeIndices;

        this.activeIndices =
            this.nextActiveIndices;

        this.nextActiveIndices =
            previousActiveIndices;

        const previousActiveFlags =
            this.activeFlags;

        // Uint8Array references are readonly fields, so copy sparse membership
        // rather than swapping the flag buffers.
        for (
            const index of
            this.activeIndices
        ) {
            previousActiveFlags[
                index
            ] =
                1;

            this.nextActiveFlags[
                index
            ] =
                0;
        }
    }

    private activateIndexAndCardinalNeighbors(
        index: number,
        flags: Uint8Array,
        indices: number[],
    ): void {

        this.activateIndex(
            index,
            flags,
            indices,
        );

        const gridX =
            index %
            this.columnCount;

        const gridY =
            Math.floor(
                index /
                this.columnCount,
            );

        if (
            gridX > 0
        ) {
            this.activateIndex(
                index - 1,
                flags,
                indices,
            );
        }

        if (
            gridX + 1 <
            this.columnCount
        ) {
            this.activateIndex(
                index + 1,
                flags,
                indices,
            );
        }

        if (
            gridY > 0
        ) {
            this.activateIndex(
                index -
                this.columnCount,
                flags,
                indices,
            );
        }

        if (
            gridY + 1 <
            this.rowCount
        ) {
            this.activateIndex(
                index +
                this.columnCount,
                flags,
                indices,
            );
        }
    }

    private activateIndex(
        index: number,
        flags: Uint8Array,
        indices: number[],
    ): void {

        if (
            flags[
            index
            ] !== 0
        ) {
            return;
        }

        flags[
            index
        ] =
            1;

        indices.push(
            index,
        );
    }

    // ---------------------------------------------------------------------
    // Validation
    // ---------------------------------------------------------------------

    private validateCourseBoundaryDefinition(
        definition:
            CourseBoundaryDefinition,
    ): void {

        const finiteValues = [
            definition.minimumX,
            definition.maximumX,
            definition.minimumY,
            definition.maximumY,
        ];

        if (
            !finiteValues.every(
                Number.isFinite,
            )
        ) {
            throw new Error(
                "WaterField course boundary values must be finite.",
            );
        }

        if (
            definition.maximumX <=
            definition.minimumX ||
            definition.maximumY <=
            definition.minimumY
        ) {
            throw new Error(
                "WaterField course boundary maximums must be greater than minimums.",
            );
        }
    }

    private clamp(
        value: number,
        minimum: number,
        maximum: number,
    ): number {

        return Math.max(
            minimum,
            Math.min(
                value,
                maximum,
            ),
        );
    }
}

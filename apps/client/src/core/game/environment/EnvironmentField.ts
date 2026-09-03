import {
    DEFAULT_COURSE_BOUNDARY_DEFINITION,
} from "../config/CourseBoundaryDefinition";

import {
    DEFAULT_ENVIRONMENT_FIELD_DEFINITION,
    validateEnvironmentFieldDefinition,
} from "../config/EnvironmentFieldDefinition";

import type {
    CourseBoundaryDefinition,
} from "../config/CourseBoundaryDefinition";

import type {
    EnvironmentFieldDefinition,
} from "../config/EnvironmentFieldDefinition";

import {
    SurfaceState,
} from "../surface/SurfaceState";

import {
    SurfaceType,
} from "../surface/SurfaceType";

import type {
    SurfaceSystem,
} from "../surface/SurfaceSystem";

import type {
    EnvironmentFieldCell,
} from "./EnvironmentFieldCell";

import {
    EnvironmentFieldRenderCache,
} from "./EnvironmentFieldRenderCache";

/**
 * Authoritative continuous environmental substrate.
 *
 * Values are stored in typed arrays and initialized lazily from
 * SurfaceSystem the first time a field cell is touched.
 */
export class EnvironmentField {
    private readonly definition:
        EnvironmentFieldDefinition;

    private readonly courseBoundaryDefinition:
        CourseBoundaryDefinition;

    private readonly columnCount:
        number;

    private readonly rowCount:
        number;

    private readonly cellCount:
        number;

    private readonly initialized:
        Uint8Array;

    private readonly fuel:
        Float32Array;

    private readonly heat:
        Float32Array;

    private readonly burnAmount:
        Float32Array;

    private readonly moisture:
        Float32Array;

    private readonly waterAmount:
        Float32Array;

    private readonly trackedBurnIndices:
        number[] = [];

    private readonly burnIndexTracked:
        Uint8Array;

    /**
     * Sparse thermal activity set. Heat is much higher resolution
     * than Fire cells, so only cells with meaningful heat are updated.
     */
    private readonly trackedHeatIndices:
        number[] = [];

    private readonly heatIndexTracked:
        Uint8Array;

    private burnRevision =
        0;

    private readonly renderCache:
        EnvironmentFieldRenderCache;

    constructor(
        private readonly surfaceSystem:
            SurfaceSystem,

        definition:
            EnvironmentFieldDefinition =
            DEFAULT_ENVIRONMENT_FIELD_DEFINITION,

        courseBoundaryDefinition:
            CourseBoundaryDefinition =
            DEFAULT_COURSE_BOUNDARY_DEFINITION,
    ) {
        validateEnvironmentFieldDefinition(
            definition,
        );

        this.definition =
            definition;

        this.validateCourseBoundaryDefinition(
            courseBoundaryDefinition,
        );

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

        this.initialized =
            new Uint8Array(
                this.cellCount,
            );

        this.fuel =
            new Float32Array(
                this.cellCount,
            );

        this.heat =
            new Float32Array(
                this.cellCount,
            );

        this.burnAmount =
            new Float32Array(
                this.cellCount,
            );

        this.moisture =
            new Float32Array(
                this.cellCount,
            );

        this.waterAmount =
            new Float32Array(
                this.cellCount,
            );

        this.burnIndexTracked =
            new Uint8Array(
                this.cellCount,
            );

        this.heatIndexTracked =
            new Uint8Array(
                this.cellCount,
            );

        this.renderCache =
            new EnvironmentFieldRenderCache(
                this.cellCount,
            );
    }

    public reset(): void {
        this.initialized.fill(
            0,
        );

        this.fuel.fill(
            0,
        );

        this.heat.fill(
            0,
        );

        this.burnAmount.fill(
            0,
        );

        this.moisture.fill(
            0,
        );

        this.waterAmount.fill(
            0,
        );

        this.burnIndexTracked.fill(
            0,
        );

        this.heatIndexTracked.fill(
            0,
        );

        this.trackedBurnIndices.length =
            0;

        this.trackedHeatIndices.length =
            0;

        this.renderCache
            .reset();

        this.burnRevision +=
            1;
    }

    // ---------------------------------------------------------------------
    // Fire-facing operations
    // ---------------------------------------------------------------------

    public depositHeat(
        worldX: number,
        worldY: number,
        radius: number,
        amount: number,
    ): void {
        if (
            !this.validateRadialOperation(
                worldX,
                worldY,
                radius,
                amount,
            )
        ) {
            return;
        }

        this.forEachCellInRadius(
            worldX,
            worldY,
            radius,
            (
                index:
                    number,

                _gridX:
                    number,

                _gridY:
                    number,

                distanceFactor:
                    number,
            ): void => {

                this.ensureInitialized(
                    index,
                );

                this.heat[index] =
                    Math.min(
                        this.definition.maximumHeat,
                        this.heat[index] +
                        amount *
                        distanceFactor,
                    );

                if (
                    this.heat[index] >=
                    this.definition
                        .minimumTrackedHeat &&
                    this.heatIndexTracked[
                    index
                    ] ===
                    0
                ) {
                    this.heatIndexTracked[
                        index
                    ] =
                        1;

                    this.trackedHeatIndices.push(
                        index,
                    );
                }
            },
        );
    }

    public depositBurn(
        worldX: number,
        worldY: number,
        radius: number,
        amount: number,
        noiseSeed: number,
    ): void {
        if (
            !this.validateRadialOperation(
                worldX,
                worldY,
                radius,
                amount,
            ) ||
            !Number.isFinite(noiseSeed)
        ) {
            return;
        }

        let burnChanged =
            false;

        this.forEachCellInRadius(
            worldX,
            worldY,
            radius,
            (
                index:
                    number,

                gridX:
                    number,

                gridY:
                    number,

                distanceFactor:
                    number,
            ): void => {

                this.ensureInitialized(
                    index,
                );

                if (
                    this.fuel[index] <=
                    0
                ) {
                    return;
                }

                const noise =
                    this.getBurnNoiseMultiplier(
                        gridX,
                        gridY,
                        noiseSeed,
                    );

                const previousBurn =
                    this.burnAmount[
                    index
                    ];

                const nextBurn =
                    Math.min(
                        this.definition.maximumBurnAmount,
                        previousBurn +
                        amount *
                        distanceFactor *
                        noise,
                    );

                if (
                    nextBurn <=
                    previousBurn
                ) {
                    return;
                }

                this.burnAmount[index] =
                    nextBurn;

                this.renderCache
                    .markDirty(
                        index,
                    );

                burnChanged =
                    true;

                if (
                    nextBurn >=
                    this.definition
                        .minimumTrackedBurnAmount &&
                    this.burnIndexTracked[
                    index
                    ] ===
                    0
                ) {
                    this.burnIndexTracked[
                        index
                    ] =
                        1;

                    this.trackedBurnIndices.push(
                        index,
                    );
                }
            },
        );

        if (
            burnChanged
        ) {
            this.burnRevision +=
                1;
        }
    }

    public consumeFuel(
        worldX: number,
        worldY: number,
        radius: number,
        amount: number,
    ): void {
        if (
            !this.validateRadialOperation(
                worldX,
                worldY,
                radius,
                amount,
            )
        ) {
            return;
        }

        this.forEachCellInRadius(
            worldX,
            worldY,
            radius,
            (
                index:
                    number,

                _gridX:
                    number,

                _gridY:
                    number,

                distanceFactor:
                    number,
            ): void => {

                this.ensureInitialized(
                    index,
                );

                this.fuel[index] =
                    Math.max(
                        0,
                        this.fuel[index] -
                        amount *
                        distanceFactor,
                    );
            },
        );
    }

    /**
     * Applies passive cooling only to thermally active field cells.
     *
     * This intentionally does not scan the complete EnvironmentField.
     * Water will later be able to add stronger local cooling without
     * changing this sparse thermal lifecycle.
     */
    public updateHeat(
        deltaTime: number,
    ): void {
        if (
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0 ||
            this.trackedHeatIndices.length === 0
        ) {
            return;
        }

        const decay =
            this.definition
                .heatDecayPerSecond *
            deltaTime;

        for (
            let trackedIndex =
                this.trackedHeatIndices.length -
                1;

            trackedIndex >= 0;

            trackedIndex -= 1
        ) {
            const fieldIndex =
                this.trackedHeatIndices[
                trackedIndex
                ];

            if (
                fieldIndex ===
                undefined
            ) {
                continue;
            }

            const nextHeat =
                Math.max(
                    0,
                    this.heat[
                    fieldIndex
                    ] -
                    decay,
                );

            if (
                nextHeat <
                this.definition
                    .minimumTrackedHeat
            ) {
                this.heat[
                    fieldIndex
                ] =
                    0;

                this.heatIndexTracked[
                    fieldIndex
                ] =
                    0;

                this.trackedHeatIndices.splice(
                    trackedIndex,
                    1,
                );

                continue;
            }

            this.heat[
                fieldIndex
            ] =
                nextHeat;
        }
    }

    // ---------------------------------------------------------------------
    // Queries
    // ---------------------------------------------------------------------

    public getCellAtWorld(
        worldX: number,
        worldY: number,
    ): EnvironmentFieldCell | null {
        const grid =
            this.worldToGrid(
                worldX,
                worldY,
            );

        if (!grid) {
            return null;
        }

        const index =
            this.gridToIndex(
                grid.gridX,
                grid.gridY,
            );

        this.ensureInitialized(
            index,
        );

        const center =
            this.gridToWorldCenter(
                grid.gridX,
                grid.gridY,
            );

        return {
            gridX:
                grid.gridX,

            gridY:
                grid.gridY,

            index,

            worldCenterX:
                center.x,

            worldCenterY:
                center.y,

            fuel:
                this.fuel[index],

            heat:
                this.heat[index],

            burnAmount:
                this.burnAmount[index],

            moisture:
                this.moisture[index],

            waterAmount:
                this.waterAmount[index],
        };
    }

    public getHeatAt(
        worldX: number,
        worldY: number,
    ): number {
        const cell =
            this.getCellAtWorld(
                worldX,
                worldY,
            );

        return cell
            ? cell.heat
            : 0;
    }

    public getHeatByIndex(
        index: number,
    ): number {
        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >=
            this.cellCount
        ) {
            return 0;
        }

        this.ensureInitialized(
            index,
        );

        return this.heat[
            index
        ];
    }

    public getTrackedHeatIndices():
        readonly number[] {
        return this.trackedHeatIndices;
    }

    public getPeakTrackedHeat():
        number {
        let peakHeat =
            0;

        for (
            const index
            of this.trackedHeatIndices
        ) {
            peakHeat =
                Math.max(
                    peakHeat,
                    this.heat[
                    index
                    ] ??
                    0,
                );
        }

        return peakHeat;
    }

    public getFuelAt(
        worldX: number,
        worldY: number,
    ): number {
        const cell =
            this.getCellAtWorld(
                worldX,
                worldY,
            );

        return cell
            ? cell.fuel
            : 0;
    }

    public getAverageFuelInRadius(
        worldX: number,
        worldY: number,
        radius: number,
    ): number {
        if (
            !Number.isFinite(worldX) ||
            !Number.isFinite(worldY) ||
            !Number.isFinite(radius) ||
            radius <= 0
        ) {
            return 0;
        }

        let weightedFuel = 0;
        let totalWeight = 0;

        this.forEachCellInRadius(
            worldX,
            worldY,
            radius,
            (
                index: number,
                _gridX: number,
                _gridY: number,
                distanceFactor: number,
            ): void => {
                this.ensureInitialized(index);

                weightedFuel +=
                    this.fuel[index] *
                    distanceFactor;

                totalWeight +=
                    distanceFactor;
            },
        );

        return totalWeight > 0
            ? weightedFuel / totalWeight
            : this.getFuelAt(worldX, worldY);
    }

    public getMoistureAt(
        worldX: number,
        worldY: number,
    ): number {
        const cell =
            this.getCellAtWorld(
                worldX,
                worldY,
            );

        return cell
            ? cell.moisture
            : 0;
    }

    public getAverageMoistureInRadius(
        worldX: number,
        worldY: number,
        radius: number,
    ): number {
        if (
            !Number.isFinite(worldX) ||
            !Number.isFinite(worldY) ||
            !Number.isFinite(radius) ||
            radius <= 0
        ) {
            return 0;
        }

        let weightedMoisture = 0;
        let totalWeight = 0;

        this.forEachCellInRadius(
            worldX,
            worldY,
            radius,
            (
                index: number,
                _gridX: number,
                _gridY: number,
                distanceFactor: number,
            ): void => {
                this.ensureInitialized(index);

                weightedMoisture +=
                    this.moisture[index] *
                    distanceFactor;

                totalWeight +=
                    distanceFactor;
            },
        );

        return totalWeight > 0
            ? weightedMoisture / totalWeight
            : this.getMoistureAt(
                worldX,
                worldY,
            );
    }

    /**
     * Development/future-Water write path for continuous moisture.
     *
     * Only Grass cells are modified here. SurfaceSystem remains the
     * authority for terrain identity while EnvironmentField owns the
     * continuous moisture quantity.
     */
    public setMoistureInRectangle(
        worldX: number,
        worldY: number,
        width: number,
        height: number,
        moisture: number,
    ): void {
        if (
            !Number.isFinite(worldX) ||
            !Number.isFinite(worldY) ||
            !Number.isFinite(width) ||
            !Number.isFinite(height) ||
            !Number.isFinite(moisture) ||
            width <= 0 ||
            height <= 0
        ) {
            return;
        }

        const minimumGrid =
            this.worldToGridClamped(
                worldX,
                worldY,
            );

        const maximumGrid =
            this.worldToGridClamped(
                worldX + width,
                worldY + height,
            );

        const clampedMoisture =
            Math.min(
                this.definition.maximumMoisture,
                Math.max(
                    0,
                    moisture,
                ),
            );

        for (
            let gridY =
                minimumGrid.gridY;

            gridY <=
            maximumGrid.gridY;

            gridY += 1
        ) {
            for (
                let gridX =
                    minimumGrid.gridX;

                gridX <=
                maximumGrid.gridX;

                gridX += 1
            ) {
                const center =
                    this.gridToWorldCenter(
                        gridX,
                        gridY,
                    );

                if (
                    center.x < worldX ||
                    center.x >= worldX + width ||
                    center.y < worldY ||
                    center.y >= worldY + height
                ) {
                    continue;
                }

                const surface =
                    this.surfaceSystem
                        .getSurfaceAt(
                            center.x,
                            center.y,
                        );

                if (
                    surface.surfaceType !==
                    SurfaceType.Grass
                ) {
                    continue;
                }

                const index =
                    this.gridToIndex(
                        gridX,
                        gridY,
                    );

                this.ensureInitialized(
                    index,
                );

                this.moisture[index] =
                    clampedMoisture;
            }
        }
    }

    public getBurnAmountByIndex(
        index: number,
    ): number {
        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >=
            this.cellCount
        ) {
            return 0;
        }

        this.ensureInitialized(
            index,
        );

        return this.burnAmount[
            index
        ];
    }

    public getWorldCenterByIndex(
        index: number,
    ): {
        readonly x: number;
        readonly y: number;
    } | null {
        if (
            !Number.isInteger(index) ||
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

    public getTrackedBurnIndices():
        readonly number[] {
        return this.trackedBurnIndices;
    }

    public getBurnRevision():
        number {
        return this.burnRevision;
    }

    public consumeDirtyBurnIndices():
        readonly number[] {
        return this.renderCache
            .consumeDirtyIndices();
    }

    public getVisualBurnBucket(
        index: number,
    ): number {
        return this.renderCache
            .getVisualBucket(
                index,
            );
    }

    public setVisualBurnBucket(
        index: number,
        bucket: number,
    ): void {
        this.renderCache
            .setVisualBucket(
                index,
                bucket,
            );
    }

    public getMinimumWorldX():
        number {
        return this.courseBoundaryDefinition.minimumX;
    }

    public getMinimumWorldY():
        number {
        return this.courseBoundaryDefinition.minimumY;
    }

    public getDefinition():
        EnvironmentFieldDefinition {
        return this.definition;
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

    // ---------------------------------------------------------------------
    // Lazy initialization
    // ---------------------------------------------------------------------

    private ensureInitialized(
        index: number,
    ): void {
        if (
            this.initialized[
            index
            ] ===
            1
        ) {
            return;
        }

        const gridX =
            index %
            this.columnCount;

        const gridY =
            Math.floor(
                index /
                this.columnCount,
            );

        const center =
            this.gridToWorldCenter(
                gridX,
                gridY,
            );

        const surface =
            this.surfaceSystem
                .getSurfaceAt(
                    center.x,
                    center.y,
                );

        if (
            surface.surfaceType ===
            SurfaceType.Grass
        ) {
            this.fuel[index] =
                this.definition
                    .grassInitialFuel;

            this.moisture[index] =
                surface.surfaceState ===
                    SurfaceState.Wet
                    ? this.definition
                        .wetGrassInitialMoisture
                    : this.definition
                        .normalGrassInitialMoisture;
        } else if (
            surface.surfaceType ===
            SurfaceType.Sand
        ) {
            this.fuel[index] =
                this.definition
                    .sandInitialFuel;

            this.moisture[index] =
                surface.surfaceState ===
                    SurfaceState.Wet
                    ? this.definition
                        .wetSandInitialMoisture
                    : this.definition
                        .drySandInitialMoisture;
        }

        this.initialized[
            index
        ] =
            1;
    }

    // ---------------------------------------------------------------------
    // Radial iteration
    // ---------------------------------------------------------------------

    private forEachCellInRadius(
        worldX: number,
        worldY: number,
        radius: number,
        visitor: (
            index: number,
            gridX: number,
            gridY: number,
            distanceFactor: number,
        ) => void,
    ): void {
        const minimumGrid =
            this.worldToGridClamped(
                worldX -
                radius,

                worldY -
                radius,
            );

        const maximumGrid =
            this.worldToGridClamped(
                worldX +
                radius,

                worldY +
                radius,
            );

        for (
            let gridY =
                minimumGrid.gridY;

            gridY <=
            maximumGrid.gridY;

            gridY += 1
        ) {
            for (
                let gridX =
                    minimumGrid.gridX;

                gridX <=
                maximumGrid.gridX;

                gridX += 1
            ) {
                const center =
                    this.gridToWorldCenter(
                        gridX,
                        gridY,
                    );

                const deltaX =
                    center.x -
                    worldX;

                const deltaY =
                    center.y -
                    worldY;

                const distanceSquared =
                    deltaX *
                    deltaX +
                    deltaY *
                    deltaY;

                const radiusSquared =
                    radius *
                    radius;

                if (
                    distanceSquared >
                    radiusSquared
                ) {
                    continue;
                }

                const distanceFactor =
                    Math.max(
                        0,
                        1 -
                        Math.sqrt(
                            distanceSquared,
                        ) /
                        radius,
                    );

                if (
                    distanceFactor <=
                    0
                ) {
                    continue;
                }

                visitor(
                    this.gridToIndex(
                        gridX,
                        gridY,
                    ),
                    gridX,
                    gridY,
                    distanceFactor,
                );
            }
        }
    }

    // ---------------------------------------------------------------------
    // Grid conversion
    // ---------------------------------------------------------------------

    private worldToGrid(
        worldX: number,
        worldY: number,
    ): {
        readonly gridX: number;
        readonly gridY: number;
    } | null {
        if (
            !Number.isFinite(worldX) ||
            !Number.isFinite(worldY) ||
            worldX <
            this.courseBoundaryDefinition.minimumX ||
            worldX >
            this.courseBoundaryDefinition.maximumX ||
            worldY <
            this.courseBoundaryDefinition.minimumY ||
            worldY >
            this.courseBoundaryDefinition.maximumY
        ) {
            return null;
        }

        return {
            gridX:
                Math.min(
                    this.columnCount -
                    1,

                    Math.max(
                        0,
                        Math.floor(
                            (
                                worldX -
                                this.courseBoundaryDefinition.minimumX
                            ) /
                            this.definition.cellSize,
                        ),
                    ),
                ),

            gridY:
                Math.min(
                    this.rowCount -
                    1,

                    Math.max(
                        0,
                        Math.floor(
                            (
                                worldY -
                                this.courseBoundaryDefinition.minimumY
                            ) /
                            this.definition.cellSize,
                        ),
                    ),
                ),
        };
    }

    private worldToGridClamped(
        worldX: number,
        worldY: number,
    ): {
        readonly gridX: number;
        readonly gridY: number;
    } {
        const clampedX =
            Math.min(
                this.courseBoundaryDefinition.maximumX,
                Math.max(
                    this.courseBoundaryDefinition.minimumX,
                    worldX,
                ),
            );

        const clampedY =
            Math.min(
                this.courseBoundaryDefinition.maximumY,
                Math.max(
                    this.courseBoundaryDefinition.minimumY,
                    worldY,
                ),
            );

        return this.worldToGrid(
            clampedX,
            clampedY,
        ) ?? {
            gridX:
                0,

            gridY:
                0,
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

    private gridToWorldCenter(
        gridX: number,
        gridY: number,
    ): {
        readonly x: number;
        readonly y: number;
    } {
        return {
            x:
                this.courseBoundaryDefinition.minimumX +
                (
                    gridX +
                    0.5
                ) *
                this.definition.cellSize,

            y:
                this.courseBoundaryDefinition.minimumY +
                (
                    gridY +
                    0.5
                ) *
                this.definition.cellSize,
        };
    }

    // ---------------------------------------------------------------------
    // Stable burn noise
    // ---------------------------------------------------------------------

    private getBurnNoiseMultiplier(
        gridX: number,
        gridY: number,
        noiseSeed: number,
    ): number {
        let hash =
            (
                Math.imul(
                    gridX +
                    374761393,
                    668265263,
                ) ^
                Math.imul(
                    gridY +
                    1274126177,
                    -2048144777,
                ) ^
                Math.floor(
                    noiseSeed,
                )
            ) >>>
            0;

        hash ^=
            hash >>>
            13;

        hash =
            Math.imul(
                hash,
                1274126177,
            ) >>>
            0;

        hash ^=
            hash >>>
            16;

        const unit =
            hash /
            4294967295;

        return (
            this.definition
                .minimumBurnNoiseMultiplier +
            (
                this.definition
                    .maximumBurnNoiseMultiplier -
                this.definition
                    .minimumBurnNoiseMultiplier
            ) *
            unit
        );
    }

    // ---------------------------------------------------------------------
    // Validation
    // ---------------------------------------------------------------------

    private validateRadialOperation(
        worldX: number,
        worldY: number,
        radius: number,
        amount: number,
    ): boolean {
        return (
            Number.isFinite(
                worldX,
            ) &&
            Number.isFinite(
                worldY,
            ) &&
            Number.isFinite(
                radius,
            ) &&
            radius >
            0 &&
            Number.isFinite(
                amount,
            ) &&
            amount >
            0
        );
    }

    private validateCourseBoundaryDefinition(
        definition: CourseBoundaryDefinition,
    ): void {
        if (
            !Number.isFinite(definition.minimumX) ||
            !Number.isFinite(definition.maximumX) ||
            !Number.isFinite(definition.minimumY) ||
            !Number.isFinite(definition.maximumY) ||
            definition.maximumX <=
            definition.minimumX ||
            definition.maximumY <=
            definition.minimumY
        ) {
            throw new Error(
                "EnvironmentField requires valid finite course boundaries.",
            );
        }
    }
}

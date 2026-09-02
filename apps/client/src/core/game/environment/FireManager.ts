import {
    DEFAULT_COURSE_BOUNDARY_DEFINITION,
} from "../config/CourseBoundaryDefinition";

import {
    DEFAULT_FIRE_DEFINITION,
    validateFireDefinition,
} from "../config/FireDefinition";

import type {
    CourseBoundaryDefinition,
} from "../config/CourseBoundaryDefinition";

import type {
    FireDefinition,
} from "../config/FireDefinition";

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
    EnvironmentField,
} from "./EnvironmentField";

import {
    FireCell,
} from "./FireCell";

interface PendingIgnition {
    readonly gridX: number;
    readonly gridY: number;
    readonly generation: number;
}

const FIRE_NEIGHBOUR_OFFSETS:
    readonly {
        readonly x: number;
        readonly y: number;
    }[] = [
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
    ];

/**
 * Authoritative Phase 4 Fire simulation.
 *
 * Fire is represented by a sparse set of coarse world-space
 * cells. Rendering is handled separately by FireVisualizer.
 */
export class FireManager {
    private readonly activeCells:
        FireCell[] = [];

    private readonly occupiedCellKeys:
        Set<string> =
        new Set<string>();

    private readonly definition:
        FireDefinition;

    private readonly courseBoundaryDefinition:
        CourseBoundaryDefinition;

    constructor(
        private readonly surfaceSystem:
            SurfaceSystem,

        private readonly environmentField:
            EnvironmentField,

        definition:
            FireDefinition =
            DEFAULT_FIRE_DEFINITION,

        courseBoundaryDefinition:
            CourseBoundaryDefinition =
            DEFAULT_COURSE_BOUNDARY_DEFINITION,
    ) {
        validateFireDefinition(definition);

        this.definition =
            definition;

        this.validateCourseBoundaryDefinition(
            courseBoundaryDefinition,
        );

        this.courseBoundaryDefinition =
            courseBoundaryDefinition;
    }

    // ---------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------

    public update(deltaTime: number): void {
        if (!Number.isFinite(deltaTime)) {
            return;
        }

        const safeDeltaTime =
            Math.max(
                0,
                deltaTime,
            );

        if (safeDeltaTime <= 0) {
            return;
        }

        const pendingIgnitions =
            new Map<string, PendingIgnition>();

        const expiredCellKeys =
            new Set<string>();

        for (const cell of this.activeCells) {
            cell.advanceAge(
                safeDeltaTime,
            );

            this.updateCellIntensity(
                cell,
            );

            this.applyEnvironmentFieldInfluence(
                cell,
                safeDeltaTime,
            );

            if (
                !cell.hasScorchedSurface() &&
                cell.getAge() >=
                this.definition.scorchAge
            ) {
                this.scorchCellSurface(
                    cell,
                );
            }

            if (
                cell.getGeneration() <
                this.definition.maximumSpreadGeneration
            ) {
                while (
                    cell.getAge() >=
                    cell.getNextSpreadAge() &&
                    cell.getAge() <
                    this.definition.lifetime
                ) {
                    this.collectSpreadRequests(
                        cell,
                        pendingIgnitions,
                    );

                    cell.scheduleNextSpread(
                        this.definition.spreadInterval,
                    );
                }
            }

            if (
                cell.getAge() >=
                this.definition.lifetime
            ) {
                expiredCellKeys.add(
                    this.createCellKey(
                        cell.getGridX(),
                        cell.getGridY(),
                    ),
                );
            }
        }

        if (expiredCellKeys.size > 0) {
            this.removeExpiredCells(
                expiredCellKeys,
            );
        }

        this.commitPendingIgnitions(
            pendingIgnitions,
        );
    }

    public reset(): void {
        this.activeCells.length =
            0;

        this.occupiedCellKeys.clear();
    }

    // ---------------------------------------------------------------------
    // Ignition
    // ---------------------------------------------------------------------

    public ignite(
        worldX: number,
        worldY: number,
    ): boolean {
        if (
            !Number.isFinite(worldX) ||
            !Number.isFinite(worldY)
        ) {
            return false;
        }

        const gridPosition =
            this.worldToGrid(
                worldX,
                worldY,
            );

        return this.igniteGridCell(
            gridPosition.gridX,
            gridPosition.gridY,
            0,
        );
    }

    /**
     * Attempts to ignite a cluster of Fire cells inside a
     * world-space circular area.
     *
     * Every candidate still passes through ignite(), so the
     * normal surface, fuel, occupancy, course-boundary and
     * active-cell limits remain authoritative.
     *
     * Returns the number of newly ignited cells.
     */
    public igniteArea(
        centerX: number,
        centerY: number,
        radius: number,
        ignitionCount: number,
    ): number {
        if (
            !Number.isFinite(centerX) ||
            !Number.isFinite(centerY) ||
            !Number.isFinite(radius) ||
            radius < 0 ||
            !Number.isFinite(ignitionCount)
        ) {
            return 0;
        }

        const requestedCount =
            Math.max(
                0,
                Math.floor(
                    ignitionCount,
                ),
            );

        if (requestedCount <= 0) {
            return 0;
        }

        /*
         * Always try the requested centre first. This makes
         * small one-seed debug fires predictable and gives
         * gameplay emitters a useful centre-biased API.
         */
        let ignitedCount =
            this.ignite(
                centerX,
                centerY,
            )
                ? 1
                : 0;

        if (
            ignitedCount >=
            requestedCount
        ) {
            return ignitedCount;
        }

        /*
         * More attempts than requested seeds are allowed
         * because several random samples may resolve to the
         * same coarse Fire cell or land on non-ignitable
         * terrain such as Sand or Wet Grass.
         */
        const maximumAttempts =
            Math.max(
                requestedCount * 8,
                16,
            );

        for (
            let attempt = 0;
            attempt < maximumAttempts &&
            ignitedCount < requestedCount;
            attempt += 1
        ) {
            const angle =
                Math.random() *
                Math.PI *
                2;

            /*
             * sqrt(random) produces a uniform distribution
             * over the area of a circle rather than crowding
             * samples around its centre.
             */
            const distance =
                Math.sqrt(
                    Math.random(),
                ) *
                radius;

            const worldX =
                centerX +
                Math.cos(angle) *
                distance;

            const worldY =
                centerY +
                Math.sin(angle) *
                distance;

            if (
                this.ignite(
                    worldX,
                    worldY,
                )
            ) {
                ignitedCount += 1;
            }
        }

        return ignitedCount;
    }

    public isCellBurning(
        gridX: number,
        gridY: number,
    ): boolean {
        return this.occupiedCellKeys.has(
            this.createCellKey(
                gridX,
                gridY,
            ),
        );
    }

    // ---------------------------------------------------------------------
    // Queries
    // ---------------------------------------------------------------------

    public getActiveCells():
        readonly FireCell[] {
        return this.activeCells;
    }

    public getActiveCellCount(): number {
        return this.activeCells.length;
    }

    public getDefinition(): FireDefinition {
        return this.definition;
    }

    // ---------------------------------------------------------------------
    // Spread
    // ---------------------------------------------------------------------

    private collectSpreadRequests(
        sourceCell: FireCell,
        pendingIgnitions: Map<string, PendingIgnition>,
    ): void {
        const nextGeneration =
            sourceCell.getGeneration() +
            1;

        for (const offset of FIRE_NEIGHBOUR_OFFSETS) {
            const gridX =
                sourceCell.getGridX() +
                offset.x;

            const gridY =
                sourceCell.getGridY() +
                offset.y;

            const key =
                this.createCellKey(
                    gridX,
                    gridY,
                );

            if (
                this.occupiedCellKeys.has(key) ||
                pendingIgnitions.has(key)
            ) {
                continue;
            }

            const center =
                this.gridToWorldCenter(
                    gridX,
                    gridY,
                );

            if (
                !this.isWorldPointInsideCourse(
                    center.x,
                    center.y,
                )
            ) {
                continue;
            }

            if (
                !this.canIgniteAt(
                    center.x,
                    center.y,
                )
            ) {
                continue;
            }

            pendingIgnitions.set(
                key,
                {
                    gridX,
                    gridY,
                    generation:
                        nextGeneration,
                },
            );
        }
    }

    private commitPendingIgnitions(
        pendingIgnitions: Map<string, PendingIgnition>,
    ): void {
        pendingIgnitions.forEach(
            (
                request:
                    PendingIgnition,
            ): void => {

                if (
                    this.activeCells.length >=
                    this.definition.maximumActiveCellCount
                ) {
                    return;
                }

                this.igniteGridCell(
                    request.gridX,
                    request.gridY,
                    request.generation,
                );
            },
        );
    }

    private igniteGridCell(
        gridX: number,
        gridY: number,
        generation: number,
    ): boolean {
        if (
            this.activeCells.length >=
            this.definition.maximumActiveCellCount
        ) {
            return false;
        }

        const key =
            this.createCellKey(
                gridX,
                gridY,
            );

        if (
            this.occupiedCellKeys.has(
                key,
            )
        ) {
            return false;
        }

        const center =
            this.gridToWorldCenter(
                gridX,
                gridY,
            );

        if (
            !this.isWorldPointInsideCourse(
                center.x,
                center.y,
            ) ||
            !this.canIgniteAt(
                center.x,
                center.y,
            )
        ) {
            return false;
        }

        const cell =
            new FireCell(
                gridX,
                gridY,
                center.x,
                center.y,
                generation,
                this.definition.initialIntensity,
                this.definition.firstSpreadAge,
            );

        this.activeCells.push(
            cell,
        );

        this.occupiedCellKeys.add(
            key,
        );

        return true;
    }

    private canIgniteAt(
        worldX: number,
        worldY: number,
    ): boolean {
        const sample =
            this.surfaceSystem
                .getSurfaceAt(
                    worldX,
                    worldY,
                );

        if (
            sample.surfaceType !==
            SurfaceType.Grass ||
            sample.surfaceState !==
            SurfaceState.Normal
        ) {
            return false;
        }

        return (
            this.environmentField
                .getFuelAt(
                    worldX,
                    worldY,
                ) >=
            this.definition
                .minimumFuelForIgnition
        );
    }

    // ---------------------------------------------------------------------
    // Environment field interaction
    // ---------------------------------------------------------------------

    private applyEnvironmentFieldInfluence(
        cell: FireCell,
        deltaTime: number,
    ): void {
        const intensity =
            Math.min(
                1,
                Math.max(
                    0,
                    cell.getIntensity(),
                ),
            );

        if (intensity <= 0) {
            return;
        }

        const scaledDelta =
            deltaTime *
            intensity;

        const worldX =
            cell.getWorldCenterX();

        const worldY =
            cell.getWorldCenterY();

        const radius =
            this.definition
                .fieldInfluenceRadius;

        const noiseSeed =
            (
                Math.imul(
                    cell.getGridX() + 2048,
                    73856093,
                ) ^
                Math.imul(
                    cell.getGridY() + 2048,
                    19349663,
                )
            ) >>>
            0;

        this.environmentField
            .depositHeat(
                worldX,
                worldY,
                radius,
                this.definition
                    .heatDepositPerSecond *
                scaledDelta,
            );

        this.environmentField
            .depositBurn(
                worldX,
                worldY,
                radius,
                this.definition
                    .burnDepositPerSecond *
                scaledDelta,
                noiseSeed,
            );

        this.environmentField
            .consumeFuel(
                worldX,
                worldY,
                radius,
                this.definition
                    .fuelConsumptionPerSecond *
                scaledDelta,
            );
    }

    // ---------------------------------------------------------------------
    // Scorching
    // ---------------------------------------------------------------------

    private scorchCellSurface(
        cell: FireCell,
    ): void {
        const halfCell =
            this.definition.cellSize /
            2;

        const regionId =
            `fire-scorch-${cell.getGridX()}:${cell.getGridY()}`;

        const applied =
            this.surfaceSystem
                .addStateRegion({
                    id:
                        regionId,

                    surfaceType:
                        SurfaceType.Grass,

                    state:
                        SurfaceState.Scorched,

                    x:
                        cell.getWorldCenterX() -
                        halfCell,

                    y:
                        cell.getWorldCenterY() -
                        halfCell,

                    width:
                        this.definition.cellSize,

                    height:
                        this.definition.cellSize,

                    durationSeconds:
                        null,

                    reversionState:
                        null,
                });

        if (applied) {
            cell.markSurfaceScorched();
        }
    }

    // ---------------------------------------------------------------------
    // Cell bookkeeping
    // ---------------------------------------------------------------------

    private removeExpiredCells(
        expiredCellKeys: Set<string>,
    ): void {
        for (
            let index =
                this.activeCells.length -
                1;

            index >= 0;

            index -= 1
        ) {
            const cell =
                this.activeCells[
                index
                ];

            if (!cell) {
                continue;
            }

            const key =
                this.createCellKey(
                    cell.getGridX(),
                    cell.getGridY(),
                );

            if (
                !expiredCellKeys.has(
                    key,
                )
            ) {
                continue;
            }

            this.activeCells.splice(
                index,
                1,
            );

            this.occupiedCellKeys.delete(
                key,
            );
        }
    }

    private updateCellIntensity(
        cell: FireCell,
    ): void {
        const lifetimeProgress =
            Math.min(
                1,
                Math.max(
                    0,
                    cell.getAge() /
                    this.definition.lifetime,
                ),
            );

        const dyingStart =
            1 -
            this.definition
                .intensityFadeLifetimeFraction;

        if (
            lifetimeProgress <=
            dyingStart
        ) {
            cell.setIntensity(
                this.definition
                    .initialIntensity,
            );

            return;
        }

        const dyingProgress =
            (
                lifetimeProgress -
                dyingStart
            ) /
            Math.max(
                0.0001,
                1 -
                dyingStart,
            );

        cell.setIntensity(
            this.definition
                .initialIntensity *
            (
                1 -
                Math.min(
                    1,
                    dyingProgress,
                )
            ),
        );
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
    } {
        return {
            gridX:
                Math.floor(
                    (
                        worldX -
                        this.courseBoundaryDefinition
                            .minimumX
                    ) /
                    this.definition.cellSize,
                ),

            gridY:
                Math.floor(
                    (
                        worldY -
                        this.courseBoundaryDefinition
                            .minimumY
                    ) /
                    this.definition.cellSize,
                ),
        };
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

    private createCellKey(
        gridX: number,
        gridY: number,
    ): string {
        return `${gridX}:${gridY}`;
    }

    private isWorldPointInsideCourse(
        worldX: number,
        worldY: number,
    ): boolean {
        return (
            worldX >=
            this.courseBoundaryDefinition.minimumX &&
            worldX <=
            this.courseBoundaryDefinition.maximumX &&
            worldY >=
            this.courseBoundaryDefinition.minimumY &&
            worldY <=
            this.courseBoundaryDefinition.maximumY
        );
    }

    // ---------------------------------------------------------------------
    // Validation
    // ---------------------------------------------------------------------

    private validateCourseBoundaryDefinition(
        definition: CourseBoundaryDefinition,
    ): void {
        if (
            !Number.isFinite(definition.minimumX) ||
            !Number.isFinite(definition.maximumX) ||
            !Number.isFinite(definition.minimumY) ||
            !Number.isFinite(definition.maximumY) ||
            definition.maximumX <= definition.minimumX ||
            definition.maximumY <= definition.minimumY
        ) {
            throw new Error(
                "FireManager requires valid finite course boundaries.",
            );
        }
    }
}

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
    DEFAULT_FIRE_FUEL_DEFINITION,
    validateFireFuelDefinition,
} from "../config/FireFuelDefinition";

import type {
    FireFuelDefinition,
} from "../config/FireFuelDefinition";

import {
    DEFAULT_FIRE_MOISTURE_DEFINITION,
    validateFireMoistureDefinition,
} from "../config/FireMoistureDefinition";

import type {
    FireMoistureDefinition,
} from "../config/FireMoistureDefinition";

import {
    DEFAULT_FIRE_IGNITION_DEFINITION,
    validateFireIgnitionDefinition,
} from "../config/FireIgnitionDefinition";

import type {
    FireIgnitionDefinition,
} from "../config/FireIgnitionDefinition";

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

import type {
    LocalWindSystem,
} from "./LocalWindSystem";

import {
    FireCell,
} from "./FireCell";

interface PendingIgnition {
    readonly gridX: number;
    readonly gridY: number;
    readonly generation: number;
}

export interface FireFieldIgnitionMetrics {
    readonly trackedHeatCellCount: number;
    readonly peakHeat: number;
    readonly fieldIgnitionAttempts: number;
    readonly fieldIgnitions: number;
    readonly legacyIgnitions: number;
    readonly lastHotCandidateCount: number;
}

const FIRE_NEIGHBOUR_OFFSETS:
    readonly {
        readonly x: number;
        readonly y: number;
        readonly diagonal: boolean;
    }[] = [
        { x: 0, y: -1, diagonal: false },
        { x: 1, y: -1, diagonal: true },
        { x: 1, y: 0, diagonal: false },
        { x: 1, y: 1, diagonal: true },
        { x: 0, y: 1, diagonal: false },
        { x: -1, y: 1, diagonal: true },
        { x: -1, y: 0, diagonal: false },
        { x: -1, y: -1, diagonal: true },
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

    private readonly fuelDefinition:
        FireFuelDefinition;

    private readonly moistureDefinition:
        FireMoistureDefinition;

    private readonly ignitionDefinition:
        FireIgnitionDefinition;

    private fieldIgnitionAccumulator =
        0;

    private fieldIgnitionAttempts =
        0;

    private fieldIgnitions =
        0;

    private legacyIgnitions =
        0;

    private lastHotCandidateCount =
        0;

    /**
     * null = normal gameplay randomness.
     * number = deterministic validation sequence.
     */
    private validationRandomState:
        number | null =
        null;

    constructor(
        private readonly surfaceSystem:
            SurfaceSystem,

        private readonly environmentField:
            EnvironmentField,

        private readonly localWindSystem:
            LocalWindSystem,

        definition:
            FireDefinition =
            DEFAULT_FIRE_DEFINITION,

        fuelDefinition:
            FireFuelDefinition =
            DEFAULT_FIRE_FUEL_DEFINITION,

        moistureDefinition:
            FireMoistureDefinition =
            DEFAULT_FIRE_MOISTURE_DEFINITION,

        ignitionDefinition:
            FireIgnitionDefinition =
            DEFAULT_FIRE_IGNITION_DEFINITION,

        courseBoundaryDefinition:
            CourseBoundaryDefinition =
            DEFAULT_COURSE_BOUNDARY_DEFINITION,
    ) {
        validateFireDefinition(definition);

        this.definition =
            definition;

        validateFireFuelDefinition(
            fuelDefinition,
        );

        this.fuelDefinition =
            fuelDefinition;

        validateFireMoistureDefinition(
            moistureDefinition,
        );

        this.moistureDefinition =
            moistureDefinition;

        validateFireIgnitionDefinition(
            ignitionDefinition,
        );

        this.ignitionDefinition =
            ignitionDefinition;

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

            const localFuel =
                this.environmentField
                    .getAverageFuelInRadius(
                        cell.getWorldCenterX(),
                        cell.getWorldCenterY(),
                        this.definition
                            .fieldInfluenceRadius,
                    );

            cell.setFuelLevel(
                localFuel,
            );

            if (
                localFuel <=
                this.fuelDefinition
                    .extinctionFuelThreshold
            ) {
                cell.setFuelIntensityMultiplier(0);
                cell.setIntensity(0);

                expiredCellKeys.add(
                    this.createCellKey(
                        cell.getGridX(),
                        cell.getGridY(),
                    ),
                );

                continue;
            }

            const localMoisture =
                this.environmentField
                    .getAverageMoistureInRadius(
                        cell.getWorldCenterX(),
                        cell.getWorldCenterY(),
                        this.definition
                            .fieldInfluenceRadius,
                    );

            this.updateCellIntensity(
                cell,
                localFuel,
                localMoisture,
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

        this.fieldIgnitionAccumulator +=
            safeDeltaTime;

        if (
            this.fieldIgnitionAccumulator >=
            this.ignitionDefinition
                .ignitionCheckInterval
        ) {
            this.fieldIgnitionAccumulator =
                this.fieldIgnitionAccumulator %
                this.ignitionDefinition
                    .ignitionCheckInterval;

            this.collectFieldDrivenIgnitions(
                pendingIgnitions,
            );
        }

        if (expiredCellKeys.size > 0) {
            this.removeExpiredCells(
                expiredCellKeys,
            );
        }

        this.commitPendingIgnitions(
            pendingIgnitions,
        );

        /*
         * Evaluate ignition against the hottest current-frame state,
         * then passively cool the field afterward.
         */
        this.environmentField
            .updateHeat(
                safeDeltaTime,
            );
    }

    public reset(): void {
        this.activeCells.length =
            0;

        this.occupiedCellKeys.clear();

        this.fieldIgnitionAccumulator =
            0;

        this.fieldIgnitionAttempts =
            0;

        this.fieldIgnitions =
            0;

        this.legacyIgnitions =
            0;

        this.lastHotCandidateCount =
            0;
    }

    public setValidationRandomSeed(
        seed:
            number | null,
    ): void {

        if (seed === null) {
            this.validationRandomState =
                null;

            return;
        }

        if (!Number.isFinite(seed)) {
            throw new Error(
                "Fire validation random seed must be finite or null.",
            );
        }

        const normalizedSeed =
            Math.floor(seed) >>> 0;

        this.validationRandomState =
            normalizedSeed === 0
                ? 1
                : normalizedSeed;
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
                this.random() *
                Math.PI *
                2;

            /*
             * sqrt(random) produces a uniform distribution
             * over the area of a circle rather than crowding
             * samples around its centre.
             */
            const distance =
                Math.sqrt(
                    this.random(),
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

    public getFieldIgnitionMetrics():
        FireFieldIgnitionMetrics {
        return {
            trackedHeatCellCount:
                this.environmentField
                    .getTrackedHeatIndices()
                    .length,

            peakHeat:
                this.environmentField
                    .getPeakTrackedHeat(),

            fieldIgnitionAttempts:
                this.fieldIgnitionAttempts,

            fieldIgnitions:
                this.fieldIgnitions,

            legacyIgnitions:
                this.legacyIgnitions,

            lastHotCandidateCount:
                this.lastHotCandidateCount,
        };
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

        const localWind =
            this.localWindSystem
                .getAccelerationAt(
                    sourceCell.getWorldCenterX(),
                    sourceCell.getWorldCenterY(),
                );

        const windMagnitude =
            Math.sqrt(
                localWind.x *
                localWind.x +
                localWind.y *
                localWind.y,
            );

        const windBiasStrength =
            this.getWindBiasStrength(
                windMagnitude,
            );

        const normalizedWindX =
            windMagnitude >
                0
                ? localWind.x /
                windMagnitude
                : 0;

        const normalizedWindY =
            windMagnitude >
                0
                ? localWind.y /
                windMagnitude
                : 0;

        for (
            const offset
            of FIRE_NEIGHBOUR_OFFSETS
        ) {
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

            const targetMoisture =
                this.environmentField
                    .getMoistureAt(
                        center.x,
                        center.y,
                    );

            const moistureSpreadMultiplier =
                this.getMoistureSpreadMultiplier(
                    targetMoisture,
                );

            const spreadProbability =
                this.getDirectionalSpreadProbability(
                    offset.x,
                    offset.y,
                    offset.diagonal,
                    normalizedWindX,
                    normalizedWindY,
                    windBiasStrength,
                ) *
                sourceCell.getIntensity() *
                moistureSpreadMultiplier *
                this.ignitionDefinition
                    .legacySpreadMultiplier;

            if (
                this.random() >
                spreadProbability
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

    /**
     * Converts local airflow magnitude into a normalized directional
     * influence in the range 0..1.
     */
    private getWindBiasStrength(
        windMagnitude: number,
    ): number {
        if (
            !Number.isFinite(
                windMagnitude,
            ) ||
            windMagnitude <=
            this.definition
                .minimumWindAccelerationForBias
        ) {
            return 0;
        }

        const range =
            this.definition
                .windAccelerationForMaximumBias -
            this.definition
                .minimumWindAccelerationForBias;

        return Math.min(
            1,
            Math.max(
                0,
                (
                    windMagnitude -
                    this.definition
                        .minimumWindAccelerationForBias
                ) /
                Math.max(
                    0.0001,
                    range,
                ),
            ),
        );
    }

    /**
     * Computes one spread candidate's probability.
     *
     * Alignment is the dot product between the normalized candidate
     * direction and the normalized local airflow direction:
     *
     * +1 = directly downwind
     *  0 = crosswind
     * -1 = directly upwind
     */
    private getDirectionalSpreadProbability(
        offsetX: number,
        offsetY: number,
        diagonal: boolean,
        normalizedWindX: number,
        normalizedWindY: number,
        windBiasStrength: number,
    ): number {
        const directionLength =
            Math.sqrt(
                offsetX *
                offsetX +
                offsetY *
                offsetY,
            );

        if (
            directionLength <=
            0
        ) {
            return 0;
        }

        const directionX =
            offsetX /
            directionLength;

        const directionY =
            offsetY /
            directionLength;

        const alignment =
            Math.min(
                1,
                Math.max(
                    -1,
                    directionX *
                    normalizedWindX +
                    directionY *
                    normalizedWindY,
                ),
            );

        let strongWindMultiplier:
            number;

        if (
            alignment >=
            0
        ) {
            strongWindMultiplier =
                this.lerp(
                    this.definition
                        .crosswindSpreadMultiplier,
                    this.definition
                        .maximumDownwindSpreadMultiplier,
                    alignment,
                );
        } else {
            strongWindMultiplier =
                this.lerp(
                    this.definition
                        .crosswindSpreadMultiplier,
                    this.definition
                        .maximumUpwindSpreadMultiplier,
                    -alignment,
                );
        }

        /*
         * At zero Wind the multiplier is exactly one. As airflow
         * strengthens, the candidate approaches the strong-Wind
         * directional profile above.
         */
        /*
         * Smoothstep keeps weak airflow subtle while making the
         * transition into strong-Fan behavior more decisive.
         *
         * 0 stays 0, 1 stays 1, so No-Wind and maximum-Wind
         * endpoints remain unchanged.
         */
        const shapedWindBiasStrength =
            windBiasStrength *
            windBiasStrength *
            (
                3 -
                2 *
                windBiasStrength
            );

        const directionalMultiplier =
            this.lerp(
                1,
                strongWindMultiplier,
                shapedWindBiasStrength,
            );

        const diagonalMultiplier =
            diagonal
                ? this.definition
                    .diagonalSpreadMultiplier
                : 1;

        return Math.min(
            1,
            Math.max(
                0,
                this.definition
                    .baseSpreadProbability *
                directionalMultiplier *
                diagonalMultiplier,
            ),
        );
    }

    private lerp(
        start: number,
        end: number,
        amount: number,
    ): number {
        return (
            start +
            (
                end -
                start
            ) *
            Math.min(
                1,
                Math.max(
                    0,
                    amount,
                ),
            )
        );
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

                if (
                    this.igniteGridCell(
                        request.gridX,
                        request.gridY,
                        request.generation,
                    )
                ) {
                    if (
                        request.generation >=
                        this.definition
                            .maximumSpreadGeneration
                    ) {
                        this.fieldIgnitions +=
                            1;
                    } else {
                        this.legacyIgnitions +=
                            1;
                    }
                }
            },
        );
    }

    /**
     * Converts sparse hot EnvironmentField cells into coarse Fire-cell
     * ignition requests. Multiple 8 px field cells may map to the same
     * 48 px Fire cell, so requests are deduplicated by Fire-grid key.
     */
    private collectFieldDrivenIgnitions(
        pendingIgnitions:
            Map<string, PendingIgnition>,
    ): void {

        const candidates:
            Array<{
                readonly gridX: number;
                readonly gridY: number;
                readonly key: string;
                readonly score: number;
            }> = [];

        const candidateKeys =
            new Set<string>();

        const trackedHeatIndices =
            this.environmentField
                .getTrackedHeatIndices();

        this.lastHotCandidateCount =
            0;

        for (
            const fieldIndex
            of trackedHeatIndices
        ) {
            const heat =
                this.environmentField
                    .getHeatByIndex(
                        fieldIndex,
                    );

            if (
                heat <
                this.ignitionDefinition
                    .minimumHeatForIgnition
            ) {
                continue;
            }

            const center =
                this.environmentField
                    .getWorldCenterByIndex(
                        fieldIndex,
                    );

            if (!center) {
                continue;
            }

            this.lastHotCandidateCount +=
                1;

            const gridPosition =
                this.worldToGrid(
                    center.x,
                    center.y,
                );

            const key =
                this.createCellKey(
                    gridPosition.gridX,
                    gridPosition.gridY,
                );

            if (
                this.occupiedCellKeys.has(
                    key,
                ) ||
                pendingIgnitions.has(
                    key,
                ) ||
                candidateKeys.has(
                    key,
                )
            ) {
                continue;
            }

            const fireCenter =
                this.gridToWorldCenter(
                    gridPosition.gridX,
                    gridPosition.gridY,
                );

            if (
                !this.isWorldPointInsideCourse(
                    fireCenter.x,
                    fireCenter.y,
                )
            ) {
                continue;
            }

            this.fieldIgnitionAttempts +=
                1;

            const score =
                this.getFieldIgnitionScore(
                    center.x,
                    center.y,
                    heat,
                );

            if (
                score <
                this.ignitionDefinition
                    .minimumIgnitionScore
            ) {
                continue;
            }

            if (
                !this.canIgniteAt(
                    fireCenter.x,
                    fireCenter.y,
                )
            ) {
                continue;
            }

            candidateKeys.add(
                key,
            );

            candidates.push({
                gridX:
                    gridPosition.gridX,

                gridY:
                    gridPosition.gridY,

                key,

                score,
            });
        }

        /*
         * Prefer the strongest thermally supported candidates when the
         * per-check safety limit is reached.
         */
        candidates.sort(
            (
                left,
                right,
            ): number =>
                right.score -
                left.score,
        );

        const ignitionCount =
            Math.min(
                candidates.length,
                this.ignitionDefinition
                    .maximumFieldIgnitionsPerCheck,
            );

        for (
            let index = 0;
            index < ignitionCount;
            index += 1
        ) {
            const candidate =
                candidates[
                index
                ];

            if (!candidate) {
                continue;
            }

            /*
             * Field-created Fire does not recursively use the old
             * neighbour-spread path. It propagates onward by depositing
             * heat, making this a genuine field-driven chain.
             */
            pendingIgnitions.set(
                candidate.key,
                {
                    gridX:
                        candidate.gridX,

                    gridY:
                        candidate.gridY,

                    generation:
                        this.definition
                            .maximumSpreadGeneration,
                },
            );
        }
    }

    private getFieldIgnitionScore(
        worldX: number,
        worldY: number,
        heat: number,
    ): number {

        if (
            !this.canIgniteAt(
                worldX,
                worldY,
            )
        ) {
            return 0;
        }

        const maximumHeat =
            Math.max(
                0.0001,
                this.environmentField
                    .getDefinition()
                    .maximumHeat,
            );

        const normalizedHeat =
            Math.min(
                1,
                Math.max(
                    0,
                    heat /
                    maximumHeat,
                ),
            );

        const heatResponse =
            Math.pow(
                normalizedHeat,
                this.ignitionDefinition
                    .heatResponseExponent,
            );

        const fuel =
            this.environmentField
                .getFuelAt(
                    worldX,
                    worldY,
                );

        const maximumFuel =
            Math.max(
                0.0001,
                this.environmentField
                    .getDefinition()
                    .maximumFuel,
            );

        const normalizedFuel =
            Math.min(
                1,
                Math.max(
                    0,
                    fuel /
                    maximumFuel,
                ),
            );

        const moisture =
            this.environmentField
                .getMoistureAt(
                    worldX,
                    worldY,
                );

        const dryness =
            this.getDrynessFromMoisture(
                moisture,
            );

        const drynessResponse =
            Math.pow(
                dryness,
                this.moistureDefinition
                    .ignitionDrynessResponseExponent,
            );

        return (
            heatResponse *
            normalizedFuel *
            drynessResponse
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

        /*
         * Wet is no longer a binary Fire blocker. Grass remains the
         * combustible terrain type, while already-Scorched Grass stays
         * non-ignitable. Normal and Wet Grass are judged continuously by
         * EnvironmentField fuel + moisture below.
         */
        if (
            sample.surfaceType !==
            SurfaceType.Grass ||
            sample.surfaceState ===
            SurfaceState.Scorched
        ) {
            return false;
        }

        const fuel =
            this.environmentField
                .getFuelAt(
                    worldX,
                    worldY,
                );

        if (
            fuel <
            this.fuelDefinition
                .minimumFuelForIgnition
        ) {
            return false;
        }

        const moisture =
            this.environmentField
                .getMoistureAt(
                    worldX,
                    worldY,
                );

        const normalizedFuel =
            Math.min(
                1,
                Math.max(
                    0,
                    fuel /
                    Math.max(
                        0.0001,
                        this.environmentField
                            .getDefinition()
                            .maximumFuel,
                    ),
                ),
            );

        const dryness =
            this.getDrynessFromMoisture(
                moisture,
            );

        const ignitionDrynessResponse =
            Math.pow(
                dryness,
                this.moistureDefinition
                    .ignitionDrynessResponseExponent,
            );

        const ignitionCombustibility =
            normalizedFuel *
            ignitionDrynessResponse;

        return (
            ignitionCombustibility >=
            this.moistureDefinition
                .minimumIgnitionCombustibility
        );
    }

    private getMoistureSpreadMultiplier(
        moisture: number,
    ): number {
        const dryness =
            this.getDrynessFromMoisture(
                moisture,
            );

        const response =
            Math.pow(
                dryness,
                this.moistureDefinition
                    .spreadDrynessResponseExponent,
            );

        return this.lerp(
            this.moistureDefinition
                .minimumSpreadMultiplier,
            1,
            response,
        );
    }

    private getMoistureCombustionMultiplier(
        moisture: number,
    ): number {
        const dryness =
            this.getDrynessFromMoisture(
                moisture,
            );

        const response =
            Math.pow(
                dryness,
                this.moistureDefinition
                    .combustionDrynessResponseExponent,
            );

        return this.lerp(
            this.moistureDefinition
                .minimumCombustionMultiplier,
            1,
            response,
        );
    }

    private getDrynessFromMoisture(
        moisture: number,
    ): number {
        const maximumMoisture =
            Math.max(
                0.0001,
                this.environmentField
                    .getDefinition()
                    .maximumMoisture,
            );

        const normalizedMoisture =
            Math.min(
                1,
                Math.max(
                    0,
                    moisture /
                    maximumMoisture,
                ),
            );

        return (
            1 -
            normalizedMoisture
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
        /*
         * FIRE-VFX-3A.5:
         *
         * Do not create a visible 48 x 48 SurfaceSystem rectangle here.
         * EnvironmentField.burn already carries the higher-resolution,
         * persistent damage footprint, and ScorchRenderer is responsible
         * for presenting that field as one continuous organic burn mass.
         *
         * FireCell still records that it crossed the scorch lifecycle stage
         * so this event is processed only once.
         */
        cell.markSurfaceScorched();
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
        localFuel: number,
        localMoisture: number,
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

        let ageIntensity =
            this.definition.initialIntensity;

        if (
            lifetimeProgress >
            dyingStart
        ) {
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

            ageIntensity =
                this.definition
                    .initialIntensity *
                (
                    1 -
                    Math.min(
                        1,
                        dyingProgress,
                    )
                );
        }

        const fuelRange =
            Math.max(
                0.0001,
                this.fuelDefinition
                    .lowFuelThreshold -
                this.fuelDefinition
                    .extinctionFuelThreshold,
            );

        const normalizedFuel =
            Math.min(
                1,
                Math.max(
                    0,
                    (
                        localFuel -
                        this.fuelDefinition
                            .extinctionFuelThreshold
                    ) /
                    fuelRange,
                ),
            );

        const shapedFuel =
            Math.pow(
                normalizedFuel,
                this.fuelDefinition
                    .intensityResponseExponent,
            );

        const fuelIntensityMultiplier =
            this.lerp(
                this.fuelDefinition
                    .minimumSustainedIntensityMultiplier,
                1,
                shapedFuel,
            );

        cell.setFuelIntensityMultiplier(
            fuelIntensityMultiplier,
        );

        const moistureCombustionMultiplier =
            this.getMoistureCombustionMultiplier(
                localMoisture,
            );

        cell.setIntensity(
            ageIntensity *
            fuelIntensityMultiplier *
            moistureCombustionMultiplier,
        );
    }

    private random(): number {

        if (
            this.validationRandomState ===
            null
        ) {
            return Math.random();
        }

        /*
         * Small deterministic LCG used only by the development
         * validation harness. It is not gameplay/network RNG.
         */
        this.validationRandomState =
            (
                Math.imul(
                    1664525,
                    this.validationRandomState,
                ) +
                1013904223
            ) >>> 0;

        return (
            this.validationRandomState /
            4294967296
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

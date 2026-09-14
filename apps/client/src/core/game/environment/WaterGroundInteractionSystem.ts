import {
    DEFAULT_WATER_GROUND_INTERACTION_DEFINITION,
    validateWaterGroundInteractionDefinition,
} from "../config/WaterGroundInteractionDefinition";

import type {
    SurfaceInfiltrationDefinition,
    WaterGroundInteractionDefinition,
} from "../config/WaterGroundInteractionDefinition";

import {
    SurfaceType,
} from "../surface/SurfaceType";

import type {
    EnvironmentField,
} from "./EnvironmentField";

import type {
    WaterField,
} from "./WaterField";

import type {
    SurfaceSystem,
} from "../surface/SurfaceSystem";

/**
 * Transfer-accounting snapshot.
 *
 * Water depth and normalized moisture use different units, so these values
 * intentionally remain separate instead of being summed into a false
 * conservation metric.
 */
export interface WaterGroundInteractionTransferAccounting {
    readonly processedWaterCellCount: number;
    readonly infiltratingCellCount: number;
    readonly waterTransferred: number;
    readonly moistureAdded: number;
    readonly totalWaterTransferred: number;
    readonly totalMoistureAdded: number;
    readonly substepCount: number;
    readonly accumulatorSeconds: number;
}

/**
 * Dedicated bridge between standing Water and the environmental substrate.
 *
 * WaterField remains authoritative for standing Water depth and momentum.
 * EnvironmentField remains authoritative for absorbed moisture.
 * SurfaceSystem remains authoritative for terrain material.
 *
 * Phase 8C-3 infiltration:
 *
 * requestedWater =
 *     baseInfiltrationRate
 *     * surfaceRateMultiplier
 *     * standingDepthMultiplier
 *     * saturationMultiplier
 *     * fixedTimeStep
 *
 * actualWater =
 *     min(
 *         standingWaterAvailable,
 *         groundCapacityExpressedAsWater,
 *         requestedWater
 *     )
 */
export class WaterGroundInteractionSystem {
    private readonly definition:
        WaterGroundInteractionDefinition;

    private simulationAccumulator =
        0;

    private lastProcessedWaterCellCount =
        0;

    private lastInfiltratingCellCount =
        0;

    private lastWaterTransferred =
        0;

    private lastMoistureAdded =
        0;

    private totalWaterTransferred =
        0;

    private totalMoistureAdded =
        0;

    private lastSubstepCount =
        0;

    public constructor(
        private readonly waterField: WaterField,
        private readonly environmentField: EnvironmentField,
        private readonly surfaceSystem: SurfaceSystem,
        definition:
            WaterGroundInteractionDefinition =
            DEFAULT_WATER_GROUND_INTERACTION_DEFINITION,
    ) {
        validateWaterGroundInteractionDefinition(
            definition,
        );

        this.definition =
            definition;

        this.validateFieldCompatibility();
    }

    public update(
        deltaTime: number,
    ): void {
        this.lastProcessedWaterCellCount =
            0;

        this.lastInfiltratingCellCount =
            0;

        this.lastWaterTransferred =
            0;

        this.lastMoistureAdded =
            0;

        this.lastSubstepCount =
            0;

        if (
            !this.definition.enabled ||
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return;
        }

        const clampedDeltaTime =
            Math.min(
                deltaTime,
                this.definition.maximumFrameDelta,
            );

        this.simulationAccumulator +=
            clampedDeltaTime;

        const fixedTimeStep =
            this.definition.fixedTimeStep;

        const stepEpsilon =
            1e-12;

        while (
            this.simulationAccumulator +
            stepEpsilon >=
            fixedTimeStep &&
            this.lastSubstepCount <
            this.definition.maximumSubsteps
        ) {
            this.simulationAccumulator -=
                fixedTimeStep;

            if (
                this.simulationAccumulator <
                stepEpsilon
            ) {
                this.simulationAccumulator =
                    0;
            }

            this.runInfiltrationStep(
                fixedTimeStep,
            );

            this.lastSubstepCount +=
                1;
        }

        const maximumRetainedAccumulator =
            fixedTimeStep *
            this.definition.maximumSubsteps;

        if (
            this.simulationAccumulator >
            maximumRetainedAccumulator
        ) {
            this.simulationAccumulator =
                maximumRetainedAccumulator;
        }
    }

    public reset(): void {
        this.simulationAccumulator =
            0;

        this.lastProcessedWaterCellCount =
            0;

        this.lastInfiltratingCellCount =
            0;

        this.lastWaterTransferred =
            0;

        this.lastMoistureAdded =
            0;

        this.totalWaterTransferred =
            0;

        this.totalMoistureAdded =
            0;

        this.lastSubstepCount =
            0;
    }

    public getDefinition():
        WaterGroundInteractionDefinition {
        return this.definition;
    }

    public getWaterField(): WaterField {
        return this.waterField;
    }

    public getEnvironmentField(): EnvironmentField {
        return this.environmentField;
    }

    public getSurfaceSystem(): SurfaceSystem {
        return this.surfaceSystem;
    }

    public getTransferAccounting():
        WaterGroundInteractionTransferAccounting {
        return {
            processedWaterCellCount:
                this.lastProcessedWaterCellCount,

            infiltratingCellCount:
                this.lastInfiltratingCellCount,

            waterTransferred:
                this.lastWaterTransferred,

            moistureAdded:
                this.lastMoistureAdded,

            totalWaterTransferred:
                this.totalWaterTransferred,

            totalMoistureAdded:
                this.totalMoistureAdded,

            substepCount:
                this.lastSubstepCount,

            accumulatorSeconds:
                this.simulationAccumulator,
        };
    }

    private runInfiltrationStep(
        deltaTime: number,
    ): void {
        const indices:
            number[] = [];

        /*
         * Water removal can untrack a cell. Copy indices first so the sparse
         * tracked collection is never mutated during its own traversal.
         */
        this.waterField
            .forEachTrackedWaterCell(
                (cell): void => {
                    indices.push(
                        cell.index,
                    );
                },
            );

        for (
            const index
            of indices
        ) {
            this.lastProcessedWaterCellCount +=
                1;

            const waterCenter =
                this.waterField
                    .getWorldCenterByIndex(
                        index,
                    );

            if (!waterCenter) {
                continue;
            }

            const waterCell =
                this.waterField.sampleAt(
                    waterCenter.x,
                    waterCenter.y,
                );

            if (
                !waterCell ||
                waterCell.depth <= 0
            ) {
                continue;
            }

            const environmentCell =
                this.environmentField
                    .getCellAtWorld(
                        waterCenter.x,
                        waterCenter.y,
                    );

            if (!environmentCell) {
                continue;
            }

            const surfaceSample =
                this.surfaceSystem
                    .getSurfaceAt(
                        waterCenter.x,
                        waterCenter.y,
                    );

            const surfaceProfile =
                this.getSurfaceProfile(
                    surfaceSample.surfaceType,
                );

            const maximumMoisture =
                this.environmentField
                    .getDefinition()
                    .maximumMoisture;

            const remainingMoistureCapacity =
                Math.max(
                    0,
                    maximumMoisture -
                    environmentCell.moisture,
                );

            if (
                remainingMoistureCapacity <= 0
            ) {
                continue;
            }

            const waterCapacity =
                remainingMoistureCapacity /
                this.definition
                    .waterDepthToMoisture;

            const depthMultiplier =
                this.calculateDepthInfiltrationMultiplier(
                    waterCell.depth,
                );

            const normalizedSaturation =
                this.calculateNormalizedSaturation(
                    surfaceSample.surfaceType,
                    environmentCell.moisture,
                );

            const saturationMultiplier =
                this.calculateSaturationInfiltrationMultiplier(
                    normalizedSaturation,
                    surfaceProfile,
                );

            const requestedWater =
                this.definition
                    .baseInfiltrationRate *
                surfaceProfile
                    .infiltrationRateMultiplier *
                depthMultiplier *
                saturationMultiplier *
                deltaTime;

            const requestedTransfer =
                Math.min(
                    waterCell.depth,
                    waterCapacity,
                    requestedWater,
                );

            if (
                !Number.isFinite(
                    requestedTransfer,
                ) ||
                requestedTransfer <= 0
            ) {
                continue;
            }

            const removedWater =
                this.waterField
                    .removeWaterByIndex(
                        index,
                        requestedTransfer,
                    );

            if (removedWater <= 0) {
                continue;
            }

            const requestedMoisture =
                removedWater *
                this.definition
                    .waterDepthToMoisture;

            const acceptedMoisture =
                this.environmentField
                    .addMoistureAt(
                        waterCenter.x,
                        waterCenter.y,
                        requestedMoisture,
                    );

            this.lastInfiltratingCellCount +=
                1;

            this.lastWaterTransferred +=
                removedWater;

            this.lastMoistureAdded +=
                acceptedMoisture;

            this.totalWaterTransferred +=
                removedWater;

            this.totalMoistureAdded +=
                acceptedMoisture;
        }
    }

    /**
     * Very shallow standing Water infiltrates slowly so continuous low-volume
     * sources can establish a visible puddle. The multiplier ramps linearly to
     * the full depth rate as standing-Water depth increases.
     */
    private calculateDepthInfiltrationMultiplier(
        depth: number,
    ): number {
        if (
            depth <=
            this.definition.minimumInfiltrationDepth
        ) {
            return this.definition
                .minimumDepthInfiltrationMultiplier;
        }

        if (
            depth >=
            this.definition.fullInfiltrationDepth
        ) {
            return 1;
        }

        const range =
            this.definition.fullInfiltrationDepth -
            this.definition.minimumInfiltrationDepth;

        const normalizedDepth =
            (
                depth -
                this.definition.minimumInfiltrationDepth
            ) /
            range;

        return (
            this.definition
                .minimumDepthInfiltrationMultiplier +
            normalizedDepth *
            (
                1 -
                this.definition
                    .minimumDepthInfiltrationMultiplier
            )
        );
    }

    /**
     * Baseline means ordinary unwatered terrain for the material, not the
     * current categorical state. This avoids future Wet-state presentation
     * resetting the saturation curve when 8C-6 bridges moisture to surfaces.
     */
    private calculateNormalizedSaturation(
        surfaceType: SurfaceType,
        moisture: number,
    ): number {
        const environmentDefinition =
            this.environmentField
                .getDefinition();

        let baselineMoisture:
            number;

        switch (surfaceType) {
            case SurfaceType.Grass:
                baselineMoisture =
                    environmentDefinition
                        .normalGrassInitialMoisture;
                break;

            case SurfaceType.Sand:
                baselineMoisture =
                    environmentDefinition
                        .drySandInitialMoisture;
                break;

            default:
                baselineMoisture =
                    0;
                break;
        }

        const maximumMoisture =
            environmentDefinition
                .maximumMoisture;

        const usableRange =
            maximumMoisture -
            baselineMoisture;

        if (usableRange <= 0) {
            return 1;
        }

        return Math.max(
            0,
            Math.min(
                1,
                (
                    moisture -
                    baselineMoisture
                ) /
                usableRange,
            ),
        );
    }

    private calculateSaturationInfiltrationMultiplier(
        normalizedSaturation: number,
        profile:
            SurfaceInfiltrationDefinition,
    ): number {
        const saturation =
            Math.max(
                0,
                Math.min(
                    1,
                    normalizedSaturation,
                ),
            );

        const dryness =
            1 -
            saturation;

        const shapedDryness =
            Math.pow(
                dryness,
                profile.saturationExponent,
            );

        return (
            profile.minimumSaturatedAbsorption +
            (
                1 -
                profile.minimumSaturatedAbsorption
            ) *
            shapedDryness
        );
    }

    private getSurfaceProfile(
        surfaceType: SurfaceType,
    ): SurfaceInfiltrationDefinition {
        const profile =
            this.definition
                .surfaceProfiles
                .find(
                    (
                        candidate,
                    ): boolean =>
                        candidate.surfaceType ===
                        surfaceType,
                );

        if (!profile) {
            throw new Error(
                `WaterGroundInteractionSystem has no infiltration profile for surface '${surfaceType}'.`,
            );
        }

        return profile;
    }

    private validateFieldCompatibility(): void {
        const waterDefinition =
            this.waterField.getDefinition();

        const environmentDefinition =
            this.environmentField.getDefinition();

        const sameCellSize =
            Math.abs(
                waterDefinition.cellSize -
                environmentDefinition.cellSize,
            ) <= 0.000001;

        const sameDimensions =
            this.waterField.getColumnCount() ===
            this.environmentField.getColumnCount() &&
            this.waterField.getRowCount() ===
            this.environmentField.getRowCount() &&
            this.waterField.getCellCount() ===
            this.environmentField.getCellCount();

        if (
            !sameCellSize ||
            !sameDimensions
        ) {
            throw new Error(
                "WaterGroundInteractionSystem requires WaterField and EnvironmentField to use the same grid alignment and dimensions.",
            );
        }

        if (this.waterField.getCellCount() <= 0) {
            return;
        }

        const firstWaterCenter =
            this.waterField.getWorldCenterByIndex(0);

        const firstEnvironmentCenter =
            this.environmentField.getWorldCenterByIndex(0);

        const lastIndex =
            this.waterField.getCellCount() - 1;

        const lastWaterCenter =
            this.waterField.getWorldCenterByIndex(lastIndex);

        const lastEnvironmentCenter =
            this.environmentField.getWorldCenterByIndex(lastIndex);

        if (
            !this.centersMatch(
                firstWaterCenter,
                firstEnvironmentCenter,
            ) ||
            !this.centersMatch(
                lastWaterCenter,
                lastEnvironmentCenter,
            )
        ) {
            throw new Error(
                "WaterGroundInteractionSystem requires WaterField and EnvironmentField world-space cell alignment to match.",
            );
        }
    }

    private centersMatch(
        a: { readonly x: number; readonly y: number } | null,
        b: { readonly x: number; readonly y: number } | null,
    ): boolean {
        if (!a || !b) {
            return false;
        }

        return (
            Math.abs(a.x - b.x) <= 0.000001 &&
            Math.abs(a.y - b.y) <= 0.000001
        );
    }
}

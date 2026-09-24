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
    readonly groundMoistureDried: number;
    readonly totalGroundMoistureDried: number;
    readonly shallowWaterDissipated: number;
    readonly totalShallowWaterDissipated: number;
    readonly substepCount: number;
    readonly accumulatorSeconds: number;
}


export interface WaterGroundInteractionPerformanceBreakdown {
    readonly contactWettingMilliseconds: number;
    readonly infiltrationMilliseconds: number;
    readonly moistureDiffusionMilliseconds: number;
    readonly groundDryingMilliseconds: number;
    readonly shallowWaterDissipationMilliseconds: number;
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

    private lastGroundMoistureDried =
        0;

    private totalGroundMoistureDried =
        0;

    private lastShallowWaterDissipated =
        0;

    private totalShallowWaterDissipated =
        0;

    private lastSubstepCount =
        0;

    /**
     * Production runtime keeps this enabled. Historical validators can
     * temporarily disable it so their exact 8C-1..8C-5 accounting remains
     * isolated from the new contact-wetting rule.
     */
    private contactWettingEnabled =
        true;

    private moistureMaintenanceAccumulator =
        0;

    private shallowWaterMaintenanceAccumulator =
        0;

    /*
     * Reusable diffusion scratch storage. This replaces the former per-step
     * Map, Set, neighbour arrays and "a:b" pair strings.
     */
    private moistureDiffusionDeltas:
        Float64Array;

    private readonly moistureDiffusionTouchedIndices:
        number[] = [];

    private readonly moistureDiffusionTouchedFlags:
        Uint8Array;

    /** Reused snapshot because infiltration/removal can mutate sparse Water membership. */
    private readonly waterIndexScratch:
        number[] = [];

    private readonly surfaceProfileByType:
        ReadonlyMap<SurfaceType, SurfaceInfiltrationDefinition>;

    private performanceBreakdown:
        WaterGroundInteractionPerformanceBreakdown = {
            contactWettingMilliseconds: 0,
            infiltrationMilliseconds: 0,
            moistureDiffusionMilliseconds: 0,
            groundDryingMilliseconds: 0,
            shallowWaterDissipationMilliseconds: 0,
        };

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

        this.moistureDiffusionDeltas =
            new Float64Array(
                this.environmentField
                    .getCellCount(),
            );

        this.moistureDiffusionTouchedFlags =
            new Uint8Array(
                this.environmentField
                    .getCellCount(),
            );

        this.surfaceProfileByType =
            new Map(
                this.definition.surfaceProfiles.map(
                    (profile) => [
                        profile.surfaceType,
                        profile,
                    ] as const,
                ),
            );

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

        this.lastGroundMoistureDried =
            0;

        this.lastShallowWaterDissipated =
            0;

        this.lastSubstepCount =
            0;

        this.performanceBreakdown = {
            contactWettingMilliseconds: 0,
            infiltrationMilliseconds: 0,
            moistureDiffusionMilliseconds: 0,
            groundDryingMilliseconds: 0,
            shallowWaterDissipationMilliseconds: 0,
        };

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

            let stepStart =
                performance.now();

            this.runContactWettingStep();

            this.performanceBreakdown = {
                ...this.performanceBreakdown,
                contactWettingMilliseconds:
                    this.performanceBreakdown
                        .contactWettingMilliseconds +
                    (
                        performance.now() -
                        stepStart
                    ),
            };

            stepStart =
                performance.now();

            this.runInfiltrationStep(
                fixedTimeStep,
            );

            this.performanceBreakdown = {
                ...this.performanceBreakdown,
                infiltrationMilliseconds:
                    this.performanceBreakdown
                        .infiltrationMilliseconds +
                    (
                        performance.now() -
                        stepStart
                    ),
            };

            this.moistureMaintenanceAccumulator +=
                fixedTimeStep;

            if (
                this.moistureMaintenanceAccumulator +
                stepEpsilon >=
                this.definition
                    .moistureMaintenanceInterval
            ) {
                const elapsedMaintenanceTime =
                    this.moistureMaintenanceAccumulator;

                this.moistureMaintenanceAccumulator =
                    0;

                stepStart =
                    performance.now();

                this.runMoistureDiffusionStep(
                    elapsedMaintenanceTime,
                );

                this.performanceBreakdown = {
                    ...this.performanceBreakdown,
                    moistureDiffusionMilliseconds:
                        this.performanceBreakdown
                            .moistureDiffusionMilliseconds +
                        (
                            performance.now() -
                            stepStart
                        ),
                };

                stepStart =
                    performance.now();

                this.runGroundDryingStep(
                    elapsedMaintenanceTime,
                );

                this.performanceBreakdown = {
                    ...this.performanceBreakdown,
                    groundDryingMilliseconds:
                        this.performanceBreakdown
                            .groundDryingMilliseconds +
                        (
                            performance.now() -
                            stepStart
                        ),
                };
            }

            this.shallowWaterMaintenanceAccumulator +=
                fixedTimeStep;

            if (
                this.shallowWaterMaintenanceAccumulator +
                stepEpsilon >=
                this.definition
                    .shallowWaterMaintenanceInterval
            ) {
                const elapsedShallowTime =
                    this.shallowWaterMaintenanceAccumulator;

                this.shallowWaterMaintenanceAccumulator =
                    0;

                stepStart =
                    performance.now();

                this.runShallowWaterDissipationStep(
                    elapsedShallowTime,
                );

                this.performanceBreakdown = {
                    ...this.performanceBreakdown,
                    shallowWaterDissipationMilliseconds:
                        this.performanceBreakdown
                            .shallowWaterDissipationMilliseconds +
                        (
                            performance.now() -
                            stepStart
                        ),
                };
            }

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

        this.lastGroundMoistureDried =
            0;

        this.totalGroundMoistureDried =
            0;

        this.lastShallowWaterDissipated =
            0;

        this.totalShallowWaterDissipated =
            0;

        this.lastSubstepCount =
            0;

        this.moistureMaintenanceAccumulator =
            0;

        this.shallowWaterMaintenanceAccumulator =
            0;

        this.clearMoistureDiffusionScratch();

        this.performanceBreakdown = {
            contactWettingMilliseconds: 0,
            infiltrationMilliseconds: 0,
            moistureDiffusionMilliseconds: 0,
            groundDryingMilliseconds: 0,
            shallowWaterDissipationMilliseconds: 0,
        };
    }

    public getPerformanceBreakdown():
        WaterGroundInteractionPerformanceBreakdown {
        return this.performanceBreakdown;
    }

    public getDefinition():
        WaterGroundInteractionDefinition {
        return this.definition;
    }

    public setContactWettingEnabledForValidation(
        enabled:
            boolean,
    ): void {
        this.contactWettingEnabled =
            enabled;
    }

    public isContactWettingEnabled():
        boolean {
        return this.contactWettingEnabled;
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

            groundMoistureDried:
                this.lastGroundMoistureDried,

            totalGroundMoistureDried:
                this.totalGroundMoistureDried,

            shallowWaterDissipated:
                this.lastShallowWaterDissipated,

            totalShallowWaterDissipated:
                this.totalShallowWaterDissipated,

            substepCount:
                this.lastSubstepCount,

            accumulatorSeconds:
                this.simulationAccumulator,
        };
    }

    /**
     * Phase 8C-6A fast Water-contact wetting.
     *
     * EnvironmentField.moisture is the persistent substrate state. A visible
     * standing-Water cell establishes a minimum surface-moisture floor beneath
     * itself so the former puddle footprint can remain Wet after Water
     * retreats. Normal infiltration below remains the conservative standing
     * Water -> substrate mass-transfer path.
     */
    private runContactWettingStep():
        void {
        if (!this.contactWettingEnabled) {
            return;
        }

        const minimumDepth =
            this.definition.minimumContactWettingDepth;

        const moistureFloor =
            this.definition.contactWetMoistureFloor;

        /*
         * WaterField and EnvironmentField are validated as index-aligned.
         * Work directly by index to avoid WaterFieldCell creation, world
         * coordinate conversion, and a second WaterField sample per cell.
         */
        this.waterField.forEachTrackedWaterIndex(
            (index, depth): void => {
                if (depth < minimumDepth) {
                    return;
                }

                const currentMoisture =
                    this.environmentField.getMoistureByIndex(
                        index,
                    );

                if (currentMoisture >= moistureFloor) {
                    return;
                }

                this.environmentField.addMoistureByIndex(
                    index,
                    moistureFloor - currentMoisture,
                );
            },
        );
    }

    private runInfiltrationStep(
        deltaTime: number,
    ): void {
        this.waterIndexScratch.length = 0;

        /*
         * Removal can untrack Water cells. Snapshot only integer indices into
         * reusable storage so traversal remains deterministic without
         * allocating WaterFieldCell objects or a fresh array every substep.
         */
        this.waterField.forEachTrackedWaterIndex(
            (index): void => {
                this.waterIndexScratch.push(index);
            },
        );

        const maximumMoisture =
            this.environmentField
                .getDefinition()
                .maximumMoisture;

        for (
            let offset = 0;
            offset < this.waterIndexScratch.length;
            offset += 1
        ) {
            const index =
                this.waterIndexScratch[offset];

            this.lastProcessedWaterCellCount += 1;

            const waterDepth =
                this.waterField.getDepthByIndex(index);

            if (waterDepth <= 0) {
                continue;
            }

            const waterCenter =
                this.waterField.getWorldCenterByIndex(index);

            if (!waterCenter) {
                continue;
            }

            const surfaceSample =
                this.surfaceSystem.getSurfaceAt(
                    waterCenter.x,
                    waterCenter.y,
                );

            const surfaceProfile =
                this.getSurfaceProfile(
                    surfaceSample.surfaceType,
                );

            const environmentMoisture =
                this.environmentField.getMoistureByIndex(
                    index,
                );

            const remainingMoistureCapacity =
                Math.max(
                    0,
                    maximumMoisture -
                    environmentMoisture,
                );

            if (remainingMoistureCapacity <= 0) {
                continue;
            }

            const waterCapacity =
                remainingMoistureCapacity /
                this.definition.waterDepthToMoisture;

            const depthMultiplier =
                this.calculateDepthInfiltrationMultiplier(
                    waterDepth,
                );

            const normalizedSaturation =
                this.calculateNormalizedSaturation(
                    surfaceSample.surfaceType,
                    environmentMoisture,
                );

            const saturationMultiplier =
                this.calculateSaturationInfiltrationMultiplier(
                    normalizedSaturation,
                    surfaceProfile,
                );

            const requestedWater =
                this.definition.baseInfiltrationRate *
                surfaceProfile.infiltrationRateMultiplier *
                depthMultiplier *
                saturationMultiplier *
                deltaTime;

            const requestedTransfer =
                Math.min(
                    waterDepth,
                    waterCapacity,
                    requestedWater,
                );

            if (
                !Number.isFinite(requestedTransfer) ||
                requestedTransfer <= 0
            ) {
                continue;
            }

            const removedWater =
                this.waterField.removeWaterByIndex(
                    index,
                    requestedTransfer,
                );

            if (removedWater <= 0) {
                continue;
            }

            const requestedMoisture =
                removedWater *
                this.definition.waterDepthToMoisture;

            const acceptedMoisture =
                this.environmentField.addMoistureByIndex(
                    index,
                    requestedMoisture,
                );

            this.lastInfiltratingCellCount += 1;
            this.lastWaterTransferred += removedWater;
            this.lastMoistureAdded += acceptedMoisture;
            this.totalWaterTransferred += removedWater;
            this.totalMoistureAdded += acceptedMoisture;
        }
    }

    /**
     * Slow four-neighbour exchange of absorbed ground moisture.
     *
     * Transfers are calculated from a read-only snapshot first, then applied
     * in a second pass. This prevents iteration-order bias and preserves
     * symmetry and frame-rate determinism.
     */
    private runMoistureDiffusionStep(
        deltaTime: number,
    ): void {
        const trackedIndices =
            this.environmentField
                .getTrackedMoistureIndices();

        if (
            trackedIndices.length === 0 ||
            this.definition.moistureDiffusionRate <= 0
        ) {
            return;
        }

        const columnCount =
            this.environmentField
                .getColumnCount();

        const rowCount =
            this.environmentField
                .getRowCount();

        /*
         * Each grid edge is visited exactly once by considering only RIGHT
         * and DOWN neighbours. This removes the old visited-pair Set and its
         * per-edge string allocations.
         */
        for (
            const sourceIndex
            of trackedIndices
        ) {
            const sourceColumn =
                sourceIndex %
                columnCount;

            const sourceRow =
                Math.floor(
                    sourceIndex /
                    columnCount,
                );

            if (
                sourceColumn <
                columnCount - 1
            ) {
                this.scheduleMoistureDiffusionPair(
                    sourceIndex,
                    sourceIndex + 1,
                    deltaTime,
                );
            }

            if (
                sourceRow <
                rowCount - 1
            ) {
                this.scheduleMoistureDiffusionPair(
                    sourceIndex,
                    sourceIndex +
                    columnCount,
                    deltaTime,
                );
            }
        }

        /*
         * Apply losses first, then gains. All deltas were calculated from the
         * pre-apply field state, preserving deterministic two-pass behavior.
         */
        for (
            const index
            of this.moistureDiffusionTouchedIndices
        ) {
            const delta =
                this.moistureDiffusionDeltas[
                index
                ];

            if (delta < 0) {
                this.environmentField
                    .removeMoistureByIndex(
                        index,
                        -delta,
                    );
            }
        }

        for (
            const index
            of this.moistureDiffusionTouchedIndices
        ) {
            const delta =
                this.moistureDiffusionDeltas[
                index
                ];

            if (delta > 0) {
                this.environmentField
                    .addMoistureByIndex(
                        index,
                        delta,
                    );
            }
        }

        this.clearMoistureDiffusionScratch();
    }

    private scheduleMoistureDiffusionPair(
        firstIndex: number,
        secondIndex: number,
        deltaTime: number,
    ): void {
        const firstMoisture =
            this.environmentField
                .getMoistureByIndex(
                    firstIndex,
                );

        const secondMoisture =
            this.environmentField
                .getMoistureByIndex(
                    secondIndex,
                );

        const signedDifference =
            firstMoisture -
            secondMoisture;

        if (
            Math.abs(
                signedDifference,
            ) <=
            this.definition
                .minimumDiffusionDifference
        ) {
            return;
        }

        const wetterIndex =
            signedDifference > 0
                ? firstIndex
                : secondIndex;

        const drierIndex =
            signedDifference > 0
                ? secondIndex
                : firstIndex;

        const availableExcess =
            this.environmentField
                .getExcessMoistureByIndex(
                    wetterIndex,
                );

        if (availableExcess <= 0) {
            return;
        }

        const drierMoisture =
            this.environmentField
                .getMoistureByIndex(
                    drierIndex,
                );

        const remainingCapacity =
            Math.max(
                0,
                this.environmentField
                    .getDefinition()
                    .maximumMoisture -
                drierMoisture,
            );

        const requestedTransfer =
            Math.abs(
                signedDifference,
            ) *
            this.definition
                .moistureDiffusionRate *
            deltaTime;

        const transfer =
            Math.min(
                availableExcess,
                remainingCapacity,
                requestedTransfer,
            );

        if (transfer <= 0) {
            return;
        }

        this.addMoistureDiffusionDelta(
            wetterIndex,
            -transfer,
        );

        this.addMoistureDiffusionDelta(
            drierIndex,
            transfer,
        );
    }

    private addMoistureDiffusionDelta(
        index: number,
        delta: number,
    ): void {
        if (
            this.moistureDiffusionTouchedFlags[
            index
            ] === 0
        ) {
            this.moistureDiffusionTouchedFlags[
                index
            ] = 1;

            this.moistureDiffusionTouchedIndices
                .push(
                    index,
                );
        }

        this.moistureDiffusionDeltas[
            index
        ] +=
            delta;
    }

    private clearMoistureDiffusionScratch():
        void {
        for (
            const index
            of this.moistureDiffusionTouchedIndices
        ) {
            this.moistureDiffusionDeltas[
                index
            ] = 0;

            this.moistureDiffusionTouchedFlags[
                index
            ] = 0;
        }

        this.moistureDiffusionTouchedIndices
            .length =
            0;
    }

    /**
     * Slowly returns absorbed ground moisture toward each cell's immutable
     * terrain baseline.
     *
     * Drying is proportional to current excess moisture. This produces a
     * smooth gameplay-scale decay and avoids total drying speed exploding as
     * diffusion expands the wet footprint across more cells.
     */
    private runGroundDryingStep(
        deltaTime: number,
    ): void {
        const trackedIndices =
            [
                ...this.environmentField
                    .getTrackedMoistureIndices(),
            ];

        if (
            trackedIndices.length === 0
        ) {
            return;
        }

        const trackingThreshold =
            this.environmentField
                .getDefinition()
                .minimumTrackedMoistureExcess;

        const baselineSnapThreshold =
            Math.max(
                trackingThreshold,
                this.definition.moistureBaselineSnapEpsilon,
            );

        for (
            const index
            of trackedIndices
        ) {
            const center =
                this.environmentField
                    .getWorldCenterByIndex(
                        index,
                    );

            if (!center) {
                continue;
            }

            const surfaceType =
                this.surfaceSystem
                    .getSurfaceAt(
                        center.x,
                        center.y,
                    )
                    .surfaceType;

            const profile =
                this.getSurfaceProfile(
                    surfaceType,
                );

            if (
                profile.dryingRate <= 0
            ) {
                continue;
            }

            const excessMoisture =
                this.environmentField
                    .getExcessMoistureByIndex(
                        index,
                    );

            if (
                excessMoisture <= 0
            ) {
                continue;
            }

            let requestedDrying =
                excessMoisture *
                profile.dryingRate *
                deltaTime;

            const projectedRemaining =
                Math.max(
                    0,
                    excessMoisture -
                    requestedDrying,
                );

            /*
             * Once the remaining excess would fall below the sparse tracking
             * threshold, finish the final microscopic remainder in this step.
             * This lets a cell reach its true terrain baseline and untrack.
             */
            if (
                projectedRemaining <=
                baselineSnapThreshold
            ) {
                requestedDrying =
                    excessMoisture;
            }

            const removedMoisture =
                this.environmentField
                    .removeMoistureByIndex(
                        index,
                        requestedDrying,
                    );

            this.lastGroundMoistureDried +=
                removedMoisture;

            this.totalGroundMoistureDried +=
                removedMoisture;
        }
    }

    /**
     * Removes only microscopic residual Water films.
     *
     * Normal puddles remain controlled by Water flow and infiltration. This
     * sink is intentionally restricted to depths near the numerical tail so
     * barely visible Water cannot survive forever because of solver cutoffs.
     */
    private runShallowWaterDissipationStep(
        deltaTime: number,
    ): void {
        const threshold =
            this.definition.shallowWaterDissipationDepth;

        const rate =
            this.definition.shallowWaterDissipationRate;

        if (threshold <= 0 || rate <= 0) {
            return;
        }

        this.waterIndexScratch.length = 0;

        this.waterField.forEachTrackedWaterIndex(
            (index): void => {
                this.waterIndexScratch.push(index);
            },
        );

        for (
            let offset = 0;
            offset < this.waterIndexScratch.length;
            offset += 1
        ) {
            const index =
                this.waterIndexScratch[offset];

            const depth =
                this.waterField.getDepthByIndex(index);

            if (
                depth <= 0 ||
                depth > threshold
            ) {
                continue;
            }

            let requestedRemoval =
                Math.min(
                    depth,
                    rate * deltaTime,
                );

            const projectedRemaining =
                Math.max(0, depth - requestedRemoval);

            if (
                projectedRemaining <=
                this.waterField.getDefinition().residualRetirementDepth
            ) {
                requestedRemoval = depth;
            }

            if (requestedRemoval <= 0) {
                continue;
            }

            const removedWater =
                this.waterField.removeWaterByIndex(
                    index,
                    requestedRemoval,
                );

            this.lastShallowWaterDissipated += removedWater;
            this.totalShallowWaterDissipated += removedWater;
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
            this.surfaceProfileByType.get(
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

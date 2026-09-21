import {
    DEFAULT_WATER_FIRE_INTERACTION_DEFINITION,
    validateWaterFireInteractionDefinition,
} from "../config/WaterFireInteractionDefinition";

import type {
    WaterFireInteractionDefinition,
} from "../config/WaterFireInteractionDefinition";

import type {
    FireManager,
} from "./FireManager";

import type {
    WaterField,
} from "./WaterField";

import type {
    FireSourceSystem,
} from "./FireSourceSystem";

import {
    FireSourceType,
} from "../config/FireSourceDefinition";

import type {
    AirborneWaterSweep,
} from "./AirborneWaterSystem";

import type { WaterFireContactEvent } from "./WaterFireContactEvent";
import type { WaterFireExtinguishedEvent } from "./WaterFireExtinguishedEvent";

/** Water state that is participating in a Fire interaction. */
export enum WaterFireWaterInfluence {
    None = "none",
    AirborneWater = "airborne-water",
    StandingWater = "standing-water",
    GroundMoisture = "ground-moisture",
}

/** Fire representation targeted by a direct Water interaction. */
export enum WaterFireTarget {
    GroundFire = "ground-fire",
    DirectionalFire = "directional-fire",
}

/**
 * Explicit direct-contact categories used by the later 8F implementation.
 *
 * Phase 8F-1 only classifies the interaction. It deliberately does not
 * extinguish Fire cells, truncate directional Fire jets, consume Water, or
 * modify EnvironmentField.
 */
export enum DirectWaterFireInteractionCategory {
    None = "none",
    AirborneWaterGroundFire = "airborne-water-ground-fire",
    StandingWaterGroundFire = "standing-water-ground-fire",
    AirborneWaterDirectionalFire = "airborne-water-directional-fire",
    StandingWaterDirectionalFire = "standing-water-directional-fire",
}

/** Existing moisture-driven Fire behaviours that 8F will validate/tune. */
export enum MoistureFireInfluenceCategory {
    Ignition = "ignition",
    Spread = "spread",
    Reignition = "reignition",
    EstablishedFire = "established-fire",
}

export interface DirectWaterFireInteraction {
    readonly category: DirectWaterFireInteractionCategory;
    readonly waterInfluence: WaterFireWaterInfluence;
    readonly target: WaterFireTarget;
    readonly isMeaningfulContact: boolean;
    readonly shouldSuppressImmediately: boolean;
}

export interface MoistureFireInfluence {
    readonly category: MoistureFireInfluenceCategory;
    readonly waterInfluence: WaterFireWaterInfluence.GroundMoisture;
    readonly moisture: number;
    readonly baselineMoisture: number;
    readonly moistureExcess: number;
    readonly isMeaningfulInfluence: boolean;
}

export interface StandingWaterGroundFireResult {
    readonly inspectedFireCellCount: number;
    readonly extinguishedFireCellCount: number;
    readonly meaningfulWaterSampleCount: number;
}

export interface StandingWaterDirectionalFireResult {
    readonly inspectedWaterCellCount: number;
    readonly inspectedDirectionalSourceCount: number;
    readonly meaningfulWaterCellCount: number;
    readonly contactCount: number;
    readonly suppressedSourceCount: number;
}

export interface AirborneWaterDirectionalFireResult {
    readonly inspectedSweepCount: number;
    readonly inspectedDirectionalSourceCount: number;
    readonly meaningfulSweepCount: number;
    readonly contactCount: number;
    readonly suppressedSourceCount: number;
}

export interface AirborneWaterGroundFireResult {
    readonly inspectedSweepCount: number;
    readonly inspectedFireCellCount: number;
    readonly meaningfulSweepCount: number;
    readonly contactCount: number;
    readonly extinguishedFireCellCount: number;
}

/**
 * Phase 8F interaction-policy boundary between the independent Water and Fire
 * simulations.
 *
 * The class is intentionally stateless. WaterField, AirborneWaterSystem,
 * EnvironmentField, FireManager, and FireSourceSystem remain authoritative for
 * their own runtime state. Later 8F phases can ask this contract to classify an
 * interaction and then apply the result through controlled APIs on those
 * authoritative systems.
 */
export class WaterFireInteraction {
    private readonly contactEvents: WaterFireContactEvent[] = [];
    private readonly extinguishedEvents: WaterFireExtinguishedEvent[] = [];

    public constructor(
        private readonly definition:
            WaterFireInteractionDefinition =
            DEFAULT_WATER_FIRE_INTERACTION_DEFINITION,
    ) {
        validateWaterFireInteractionDefinition(
            definition,
        );
    }

    public getDefinition():
        WaterFireInteractionDefinition {
        return this.definition;
    }


    public consumeContactEvents(): readonly WaterFireContactEvent[] {
        return this.contactEvents.splice(0, this.contactEvents.length);
    }

    public consumeExtinguishedEvents(): readonly WaterFireExtinguishedEvent[] {
        return this.extinguishedEvents.splice(0, this.extinguishedEvents.length);
    }

    public clearGameplayEvents(): void {
        this.contactEvents.length = 0;
        this.extinguishedEvents.length = 0;
    }

    public classifyStandingWaterContact(
        target: WaterFireTarget,
        waterDepth: number,
    ): DirectWaterFireInteraction {
        const meaningful =
            Number.isFinite(waterDepth) &&
            waterDepth >=
            this.definition
                .minimumMeaningfulStandingWaterDepth;

        if (!meaningful) {
            return this.createNoDirectContact(
                target,
            );
        }

        return {
            category:
                target === WaterFireTarget.GroundFire
                    ? DirectWaterFireInteractionCategory
                        .StandingWaterGroundFire
                    : DirectWaterFireInteractionCategory
                        .StandingWaterDirectionalFire,
            waterInfluence:
                WaterFireWaterInfluence.StandingWater,
            target,
            isMeaningfulContact:
                true,
            shouldSuppressImmediately:
                true,
        };
    }

    public classifyAirborneWaterContact(
        target: WaterFireTarget,
        waterAmount: number,
    ): DirectWaterFireInteraction {
        const meaningful =
            Number.isFinite(waterAmount) &&
            waterAmount >=
            this.definition
                .minimumMeaningfulAirborneWaterAmount;

        if (!meaningful) {
            return this.createNoDirectContact(
                target,
            );
        }

        return {
            category:
                target === WaterFireTarget.GroundFire
                    ? DirectWaterFireInteractionCategory
                        .AirborneWaterGroundFire
                    : DirectWaterFireInteractionCategory
                        .AirborneWaterDirectionalFire,
            waterInfluence:
                WaterFireWaterInfluence.AirborneWater,
            target,
            isMeaningfulContact:
                true,
            shouldSuppressImmediately:
                true,
        };
    }

    public classifyMoistureInfluence(
        category: MoistureFireInfluenceCategory,
        moisture: number,
        baselineMoisture: number,
    ): MoistureFireInfluence {
        const safeMoisture =
            Number.isFinite(moisture)
                ? Math.max(0, moisture)
                : 0;

        const safeBaseline =
            Number.isFinite(baselineMoisture)
                ? Math.max(0, baselineMoisture)
                : 0;

        const moistureExcess =
            Math.max(
                0,
                safeMoisture - safeBaseline,
            );

        return {
            category,
            waterInfluence:
                WaterFireWaterInfluence.GroundMoisture,
            moisture:
                safeMoisture,
            baselineMoisture:
                safeBaseline,
            moistureExcess,
            isMeaningfulInfluence:
                moistureExcess >=
                this.definition
                    .minimumMeaningfulMoistureExcess,
        };
    }

    /**
     * Phase 8F-2 runtime interaction. Meaningful standing Water overlapping
     * the coarse footprint of an active Ground Fire cell extinguishes that
     * Fire cell immediately. Standing Water is sampled read-only and is not
     * consumed by this interaction.
     */
    public updateStandingWaterGroundFire(
        waterField: WaterField,
        fireManager: FireManager,
    ): StandingWaterGroundFireResult {
        /*
         * Pass 5 sparse interaction path.
         *
         * The previous implementation traversed every tracked Water cell for
         * every active Fire cell, producing O(Fire x Water) work in the exact
         * stress case where both fields are dense. Ground Fire already gives
         * us a small authoritative footprint, so query only Water grid cells
         * whose centres can lie inside that footprint.
         */
        const activeCells = [
            ...fireManager.getActiveCells(),
        ];

        if (activeCells.length === 0) {
            return {
                inspectedFireCellCount: 0,
                extinguishedFireCellCount: 0,
                meaningfulWaterSampleCount: 0,
            };
        }

        const fireCellSize =
            fireManager.getDefinition().cellSize;

        const halfExtent =
            fireCellSize *
            (
                0.5 -
                this.definition
                    .standingWaterGroundFireFootprintInsetFraction
            );

        const waterCellSize =
            Math.max(
                0.000001,
                waterField.getDefinition().cellSize,
            );

        const minimumWorldX =
            waterField.getMinimumWorldX();
        const minimumWorldY =
            waterField.getMinimumWorldY();
        const waterColumns =
            waterField.getColumnCount();
        const waterRows =
            waterField.getRowCount();
        const meaningfulDepth =
            this.definition.minimumMeaningfulStandingWaterDepth;

        let extinguishedFireCellCount = 0;
        let meaningfulWaterSampleCount = 0;

        for (const fireCell of activeCells) {
            const fireX = fireCell.getWorldCenterX();
            const fireY = fireCell.getWorldCenterY();

            /*
             * Convert the old centre-in-footprint test directly into integer
             * Water-grid bounds. The ceil/floor half-cell terms preserve the
             * same inclusion rule as the former world-space traversal.
             */
            const minimumGridX = Math.max(
                0,
                Math.ceil(
                    (fireX - halfExtent - minimumWorldX) / waterCellSize - 0.5,
                ),
            );
            const maximumGridX = Math.min(
                waterColumns - 1,
                Math.floor(
                    (fireX + halfExtent - minimumWorldX) / waterCellSize - 0.5,
                ),
            );
            const minimumGridY = Math.max(
                0,
                Math.ceil(
                    (fireY - halfExtent - minimumWorldY) / waterCellSize - 0.5,
                ),
            );
            const maximumGridY = Math.min(
                waterRows - 1,
                Math.floor(
                    (fireY + halfExtent - minimumWorldY) / waterCellSize - 0.5,
                ),
            );

            if (
                maximumGridX < minimumGridX ||
                maximumGridY < minimumGridY
            ) {
                continue;
            }

            let shouldExtinguish = false;
            let eventWaterDepth = 0;
            let eventX = fireX;
            let eventY = fireY;

            for (
                let gridY = minimumGridY;
                gridY <= maximumGridY && !shouldExtinguish;
                gridY += 1
            ) {
                const rowStart = gridY * waterColumns;

                for (
                    let gridX = minimumGridX;
                    gridX <= maximumGridX;
                    gridX += 1
                ) {
                    const waterIndex =
                        rowStart + gridX;
                    const waterDepth =
                        waterField.getDepthByIndex(waterIndex);

                    /*
                     * Inline the already-validated meaningful standing-Water
                     * threshold in this hot loop. classifyStandingWaterContact
                     * remains the public policy API for non-hot callers.
                     */
                    if (
                        !Number.isFinite(waterDepth) ||
                        waterDepth < meaningfulDepth
                    ) {
                        continue;
                    }

                    meaningfulWaterSampleCount += 1;
                    shouldExtinguish = true;
                    eventWaterDepth = waterDepth;
                    eventX =
                        minimumWorldX +
                        (gridX + 0.5) * waterCellSize;
                    eventY =
                        minimumWorldY +
                        (gridY + 0.5) * waterCellSize;
                    break;
                }
            }

            if (shouldExtinguish) {
                const fireIntensity =
                    fireCell.getIntensity();

                if (fireManager.extinguishCell(
                    fireCell.getGridX(),
                    fireCell.getGridY(),
                )) {
                    extinguishedFireCellCount += 1;

                    const event: WaterFireExtinguishedEvent = {
                        positionX: eventX,
                        positionY: eventY,
                        interactionType: "standing-water-ground-fire",
                        waterType: "standing",
                        fireType: "ground",
                        waterAmount: eventWaterDepth,
                        fireIntensity,
                        extinguished: true,
                    };

                    this.contactEvents.push(event);
                    this.extinguishedEvents.push(event);
                }
            }
        }

        return {
            inspectedFireCellCount: activeCells.length,
            extinguishedFireCellCount,
            meaningfulWaterSampleCount,
        };
    }

    /**
     * Phase 8F-3 runtime interaction.
     *
     * Every authoritative airborne movement segment is swept against the
     * coarse Ground Fire footprint. This avoids tunnelling when a fast Hose or
     * Sprinkler packet crosses a Fire cell between fixed transport samples.
     *
     * The packet itself is not consumed. Water continues its ballistic flight
     * and can later become standing Water through the existing impact path.
     */
    public updateAirborneWaterGroundFire(
        sweeps: readonly AirborneWaterSweep[],
        fireManager: FireManager,
    ): AirborneWaterGroundFireResult {
        const activeCells = [
            ...fireManager.getActiveCells(),
        ];

        let meaningfulSweepCount = 0;
        let contactCount = 0;
        let extinguishedFireCellCount = 0;

        const extinguishedKeys =
            new Set<string>();

        const fireHalfExtent =
            fireManager
                .getDefinition()
                .cellSize *
            0.5;

        for (const sweep of sweeps) {
            const contact =
                this.classifyAirborneWaterContact(
                    WaterFireTarget.GroundFire,
                    sweep.waterAmount,
                );

            if (
                !contact.isMeaningfulContact ||
                !contact.shouldSuppressImmediately
            ) {
                continue;
            }

            meaningfulSweepCount +=
                1;

            for (const fireCell of activeCells) {
                const key =
                    `${fireCell.getGridX()},${fireCell.getGridY()}`;

                if (extinguishedKeys.has(key)) {
                    continue;
                }

                if (
                    !this.doesAirborneSweepContactGroundFire(
                        sweep,
                        fireCell.getWorldCenterX(),
                        fireCell.getWorldCenterY(),
                        fireHalfExtent,
                    )
                ) {
                    continue;
                }

                contactCount +=
                    1;

                if (
                    fireManager.extinguishCell(
                        fireCell.getGridX(),
                        fireCell.getGridY(),
                    )
                ) {
                    extinguishedKeys.add(
                        key,
                    );

                    extinguishedFireCellCount +=
                        1;

                    const event: WaterFireExtinguishedEvent = {
                        positionX: fireCell.getWorldCenterX(),
                        positionY: fireCell.getWorldCenterY(),
                        interactionType: "airborne-water-ground-fire",
                        waterType: "airborne",
                        fireType: "ground",
                        waterSourceId: sweep.sourceId,
                        waterAmount: sweep.waterAmount,
                        fireIntensity: fireCell.getIntensity(),
                        extinguished: true,
                    };
                    this.contactEvents.push(event);
                    this.extinguishedEvents.push(event);
                }
            }
        }

        return {
            inspectedSweepCount:
                sweeps.length,
            inspectedFireCellCount:
                activeCells.length,
            meaningfulSweepCount,
            contactCount,
            extinguishedFireCellCount,
        };
    }

    /**
     * Phase 8F-5 runtime interaction.
     *
     * Meaningful standing-Water cells are tested against the authoritative
     * directional Fire source geometry. Contact contributes a transient
     * effective-length cutoff through FireSourceSystem. It shares the same
     * cutoff map as airborne Water, so whichever Water influence is reached
     * first along the jet wins for the current frame.
     *
     * Standing Water is sampled read-only. The Fire source remains enabled,
     * and removing/infiltrating the puddle automatically removes this direct
     * suppression on the next frame. Retained ground moisture is deliberately
     * not treated as standing Water here.
     */
    public updateStandingWaterDirectionalFire(
        waterField: WaterField,
        fireSourceSystem: FireSourceSystem,
    ): StandingWaterDirectionalFireResult {
        const directionalSources =
            fireSourceSystem
                .getSources()
                .filter(
                    (source): boolean =>
                        source.isEnabled() &&
                        source.getType() ===
                        FireSourceType.Directional,
                );

        let inspectedWaterCellCount = 0;
        let meaningfulWaterCellCount = 0;
        let contactCount = 0;

        const suppressedSourceIds =
            new Set<string>();

        const waterCellRadius =
            waterField
                .getDefinition()
                .cellSize *
            Math.SQRT2 *
            0.5 +
            this.definition
                .standingWaterDirectionalFireContactRadius;

        waterField.forEachTrackedWaterCell(
            (waterCell): void => {
                inspectedWaterCellCount += 1;

                const contact =
                    this.classifyStandingWaterContact(
                        WaterFireTarget.DirectionalFire,
                        waterCell.depth,
                    );

                if (
                    !contact.isMeaningfulContact ||
                    !contact.shouldSuppressImmediately
                ) {
                    return;
                }

                meaningfulWaterCellCount += 1;

                for (const source of directionalSources) {
                    const definition =
                        source.getDefinition();

                    if (
                        definition.type !==
                        FireSourceType.Directional
                    ) {
                        continue;
                    }

                    const suppressionDistance =
                        this.getStandingWaterDirectionalFireContactDistance(
                            waterCell.worldCenterX,
                            waterCell.worldCenterY,
                            waterCellRadius,
                            source.getPositionX(),
                            source.getPositionY(),
                            source.getDirectionRadians(),
                            definition.length,
                            definition.halfWidth,
                        );

                    if (suppressionDistance === null) {
                        continue;
                    }

                    contactCount += 1;

                    if (
                        fireSourceSystem
                            .suppressDirectionalSourceFromDistance(
                                source.getId(),
                                suppressionDistance,
                            )
                    ) {
                        suppressedSourceIds.add(
                            source.getId(),
                        );

                        this.contactEvents.push({
                            positionX: waterCell.worldCenterX,
                            positionY: waterCell.worldCenterY,
                            interactionType: "standing-water-directional-fire",
                            waterType: "standing",
                            fireType: "directional",
                            fireSourceId: source.getId(),
                            waterAmount: waterCell.depth,
                        });
                    }
                }
            },
        );

        return {
            inspectedWaterCellCount,
            inspectedDirectionalSourceCount:
                directionalSources.length,
            meaningfulWaterCellCount,
            contactCount,
            suppressedSourceCount:
                suppressedSourceIds.size,
        };
    }

    private getStandingWaterDirectionalFireContactDistance(
        waterX: number,
        waterY: number,
        waterRadius: number,
        fireStartX: number,
        fireStartY: number,
        fireDirectionRadians: number,
        fireLength: number,
        fireHalfWidth: number,
    ): number | null {
        const directionX =
            Math.cos(fireDirectionRadians);

        const directionY =
            Math.sin(fireDirectionRadians);

        const offsetX =
            waterX - fireStartX;

        const offsetY =
            waterY - fireStartY;

        const projectedDistance =
            offsetX * directionX +
            offsetY * directionY;

        const clampedProjectedDistance =
            Math.max(
                0,
                Math.min(
                    fireLength,
                    projectedDistance,
                ),
            );

        const closestX =
            fireStartX +
            directionX *
            clampedProjectedDistance;

        const closestY =
            fireStartY +
            directionY *
            clampedProjectedDistance;

        const deltaX =
            waterX - closestX;

        const deltaY =
            waterY - closestY;

        const lateralDistanceSquared =
            deltaX * deltaX +
            deltaY * deltaY;

        const combinedRadius =
            Math.max(0, fireHalfWidth) +
            Math.max(0, waterRadius);

        if (
            lateralDistanceSquared >
            combinedRadius * combinedRadius
        ) {
            return null;
        }

        const lateralDistance =
            Math.sqrt(
                Math.max(
                    0,
                    lateralDistanceSquared,
                ),
            );

        const forwardAllowance =
            Math.sqrt(
                Math.max(
                    0,
                    combinedRadius * combinedRadius -
                    lateralDistance * lateralDistance,
                ),
            );

        return Math.max(
            0,
            Math.min(
                fireLength,
                clampedProjectedDistance -
                forwardAllowance,
            ),
        );
    }

    /**
     * Phase 8F-4 runtime interaction.
     *
     * Current airborne Water sweeps are tested against the authoritative
     * directional Fire source geometry. Contact writes only a transient
     * effective-length cutoff into FireSourceSystem. The source itself remains
     * enabled, so removing or moving Water restores the complete jet on the
     * next frame.
     */
    public updateAirborneWaterDirectionalFire(
        sweeps: readonly AirborneWaterSweep[],
        fireSourceSystem: FireSourceSystem,
    ): AirborneWaterDirectionalFireResult {
        const directionalSources =
            fireSourceSystem
                .getSources()
                .filter(
                    (source): boolean =>
                        source.isEnabled() &&
                        source.getType() ===
                        FireSourceType.Directional,
                );

        let meaningfulSweepCount = 0;
        let contactCount = 0;

        const suppressedSourceIds =
            new Set<string>();

        for (const sweep of sweeps) {
            const contact =
                this.classifyAirborneWaterContact(
                    WaterFireTarget.DirectionalFire,
                    sweep.waterAmount,
                );

            if (
                !contact.isMeaningfulContact ||
                !contact.shouldSuppressImmediately
            ) {
                continue;
            }

            meaningfulSweepCount += 1;

            for (const source of directionalSources) {
                const definition =
                    source.getDefinition();

                if (
                    definition.type !==
                    FireSourceType.Directional
                ) {
                    continue;
                }

                const suppressionDistance =
                    this.getAirborneSweepDirectionalFireContactDistance(
                        sweep,
                        source.getPositionX(),
                        source.getPositionY(),
                        source.getDirectionRadians(),
                        definition.length,
                        definition.halfWidth,
                    );

                if (suppressionDistance === null) {
                    continue;
                }

                contactCount += 1;

                if (
                    fireSourceSystem
                        .suppressDirectionalSourceFromDistance(
                            source.getId(),
                            suppressionDistance,
                        )
                ) {
                    suppressedSourceIds.add(
                        source.getId(),
                    );

                    this.contactEvents.push({
                        positionX:
                            source.getPositionX() +
                            Math.cos(
                                source.getDirectionRadians(),
                            ) *
                            suppressionDistance,
                        positionY:
                            source.getPositionY() +
                            Math.sin(
                                source.getDirectionRadians(),
                            ) *
                            suppressionDistance,
                        interactionType:
                            "airborne-water-directional-fire",
                        waterType:
                            "airborne",
                        fireType:
                            "directional",
                        waterSourceId:
                            sweep.sourceId,
                        fireSourceId:
                            source.getId(),
                        waterAmount:
                            sweep.waterAmount,
                    });
                }
            }
        }

        return {
            inspectedSweepCount:
                sweeps.length,
            inspectedDirectionalSourceCount:
                directionalSources.length,
            meaningfulSweepCount,
            contactCount,
            suppressedSourceCount:
                suppressedSourceIds.size,
        };
    }

    private getAirborneSweepDirectionalFireContactDistance(
        sweep: AirborneWaterSweep,
        fireStartX: number,
        fireStartY: number,
        fireDirectionRadians: number,
        fireLength: number,
        fireHalfWidth: number,
    ): number | null {
        const fireEndX =
            fireStartX +
            Math.cos(fireDirectionRadians) *
            fireLength;

        const fireEndY =
            fireStartY +
            Math.sin(fireDirectionRadians) *
            fireLength;

        const closest =
            this.getClosestSegmentParameters(
                sweep.startX,
                sweep.startY,
                sweep.endX,
                sweep.endY,
                fireStartX,
                fireStartY,
                fireEndX,
                fireEndY,
            );

        const waterHeight =
            this.lerp(
                sweep.startHeight,
                sweep.endHeight,
                closest.firstT,
            );

        if (
            waterHeight >
            this.definition
                .airborneWaterDirectionalFireMaximumContactHeight
        ) {
            return null;
        }

        const contactRadius =
            fireHalfWidth +
            this.definition
                .airborneWaterDirectionalFireContactRadius;

        if (
            closest.distanceSquared >
            contactRadius * contactRadius
        ) {
            return null;
        }

        const closestFireDistance =
            closest.secondT *
            fireLength;

        const lateralDistance =
            Math.sqrt(
                Math.max(
                    0,
                    closest.distanceSquared,
                ),
            );

        const alongJetAllowance =
            Math.sqrt(
                Math.max(
                    0,
                    contactRadius * contactRadius -
                    lateralDistance * lateralDistance,
                ),
            );

        return Math.max(
            0,
            closestFireDistance -
            alongJetAllowance,
        );
    }

    private getClosestSegmentParameters(
        firstStartX: number,
        firstStartY: number,
        firstEndX: number,
        firstEndY: number,
        secondStartX: number,
        secondStartY: number,
        secondEndX: number,
        secondEndY: number,
    ): {
        readonly firstT: number;
        readonly secondT: number;
        readonly distanceSquared: number;
    } {
        const firstX = firstEndX - firstStartX;
        const firstY = firstEndY - firstStartY;
        const secondX = secondEndX - secondStartX;
        const secondY = secondEndY - secondStartY;
        const offsetX = firstStartX - secondStartX;
        const offsetY = firstStartY - secondStartY;

        const a = firstX * firstX + firstY * firstY;
        const e = secondX * secondX + secondY * secondY;
        const epsilon = 0.000000001;

        let firstT = 0;
        let secondT = 0;

        if (a <= epsilon && e <= epsilon) {
            return {
                firstT: 0,
                secondT: 0,
                distanceSquared:
                    offsetX * offsetX +
                    offsetY * offsetY,
            };
        }

        if (a <= epsilon) {
            secondT =
                this.clamp01(
                    (
                        secondX * offsetX +
                        secondY * offsetY
                    ) /
                    e,
                );
        } else {
            const c =
                firstX * offsetX +
                firstY * offsetY;

            if (e <= epsilon) {
                firstT =
                    this.clamp01(
                        -c / a,
                    );
            } else {
                const b =
                    firstX * secondX +
                    firstY * secondY;

                const f =
                    secondX * offsetX +
                    secondY * offsetY;

                const denominator =
                    a * e -
                    b * b;

                if (
                    Math.abs(denominator) >
                    epsilon
                ) {
                    firstT =
                        this.clamp01(
                            (b * f - c * e) /
                            denominator,
                        );
                }

                secondT =
                    (b * firstT + f) /
                    e;

                if (secondT < 0) {
                    secondT = 0;
                    firstT =
                        this.clamp01(
                            -c / a,
                        );
                } else if (secondT > 1) {
                    secondT = 1;
                    firstT =
                        this.clamp01(
                            (b - c) / a,
                        );
                }
            }
        }

        const firstClosestX =
            firstStartX +
            firstX * firstT;

        const firstClosestY =
            firstStartY +
            firstY * firstT;

        const secondClosestX =
            secondStartX +
            secondX * secondT;

        const secondClosestY =
            secondStartY +
            secondY * secondT;

        const deltaX =
            firstClosestX -
            secondClosestX;

        const deltaY =
            firstClosestY -
            secondClosestY;

        return {
            firstT,
            secondT,
            distanceSquared:
                deltaX * deltaX +
                deltaY * deltaY,
        };
    }

    private clamp01(
        value: number,
    ): number {
        return Math.max(
            0,
            Math.min(
                1,
                value,
            ),
        );
    }

    private doesAirborneSweepContactGroundFire(
        sweep: AirborneWaterSweep,
        fireCenterX: number,
        fireCenterY: number,
        fireHalfExtent: number,
    ): boolean {
        const expandedHalfExtent =
            fireHalfExtent +
            this.definition
                .airborneWaterGroundFireContactRadius;

        const minimumX =
            fireCenterX -
            expandedHalfExtent;

        const maximumX =
            fireCenterX +
            expandedHalfExtent;

        const minimumY =
            fireCenterY -
            expandedHalfExtent;

        const maximumY =
            fireCenterY +
            expandedHalfExtent;

        const interval =
            this.getSegmentAabbIntersectionInterval(
                sweep.startX,
                sweep.startY,
                sweep.endX,
                sweep.endY,
                minimumX,
                maximumX,
                minimumY,
                maximumY,
            );

        if (!interval) {
            return false;
        }

        const heightAtEntry =
            this.lerp(
                sweep.startHeight,
                sweep.endHeight,
                interval.entryT,
            );

        const heightAtExit =
            this.lerp(
                sweep.startHeight,
                sweep.endHeight,
                interval.exitT,
            );

        const minimumContactHeight =
            Math.min(
                heightAtEntry,
                heightAtExit,
            );

        return (
            minimumContactHeight <=
            this.definition
                .airborneWaterGroundFireMaximumContactHeight
        );
    }

    private getSegmentAabbIntersectionInterval(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        minimumX: number,
        maximumX: number,
        minimumY: number,
        maximumY: number,
    ): {
        readonly entryT: number;
        readonly exitT: number;
    } | null {
        let entryT = 0;
        let exitT = 1;

        const deltaX =
            endX -
            startX;

        const deltaY =
            endY -
            startY;

        const clipAxis = (
            start: number,
            delta: number,
            minimum: number,
            maximum: number,
        ): boolean => {
            if (
                Math.abs(delta) <
                0.000000001
            ) {
                return (
                    start >= minimum &&
                    start <= maximum
                );
            }

            const inverseDelta =
                1 /
                delta;

            let first =
                (minimum - start) *
                inverseDelta;

            let second =
                (maximum - start) *
                inverseDelta;

            if (first > second) {
                const temporary =
                    first;

                first =
                    second;

                second =
                    temporary;
            }

            entryT =
                Math.max(
                    entryT,
                    first,
                );

            exitT =
                Math.min(
                    exitT,
                    second,
                );

            return (
                entryT <=
                exitT
            );
        };

        if (
            !clipAxis(
                startX,
                deltaX,
                minimumX,
                maximumX,
            ) ||
            !clipAxis(
                startY,
                deltaY,
                minimumY,
                maximumY,
            )
        ) {
            return null;
        }

        return {
            entryT,
            exitT,
        };
    }

    private lerp(
        start: number,
        end: number,
        t: number,
    ): number {
        return (
            start +
            (end - start) *
            t
        );
    }

    private createNoDirectContact(
        target: WaterFireTarget,
    ): DirectWaterFireInteraction {
        return {
            category:
                DirectWaterFireInteractionCategory.None,
            waterInfluence:
                WaterFireWaterInfluence.None,
            target,
            isMeaningfulContact:
                false,
            shouldSuppressImmediately:
                false,
        };
    }
}

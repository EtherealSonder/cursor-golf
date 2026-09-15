import type {
    Sprinkler,
} from "../entities/mechanisms/Sprinkler";

import type {
    HydrantHose,
} from "../entities/mechanisms/HydrantHose";

import type {
    AirborneWaterSystem,
} from "../environment/AirborneWaterSystem";

import type {
    EnvironmentField,
} from "../environment/EnvironmentField";

import type {
    MoistureSurfaceBridge,
} from "../environment/MoistureSurfaceBridge";

import type {
    WaterField,
} from "../environment/WaterField";

/**
 * Live, development-only acceptance monitor for Phase 8C-7.
 *
 * Unlike the lower-level deterministic validators, this monitor observes the
 * real runtime systems and entities while the developer interacts with the
 * Sprinkler and Hose. It never injects Water, changes source state, or resets
 * production systems.
 */
export interface WaterLifecycleAcceptanceValidationState {
    readonly firstWateringPassed: boolean;
    readonly repeatedWateringPassed: boolean;
    readonly dryingPassed: boolean;
    readonly sprinklerPassed: boolean;
    readonly hosePassed: boolean;
    readonly passed: boolean;

    readonly wateringSessionCount: number;
    readonly maximumStandingWater: number;
    readonly currentStandingWater: number;
    readonly maximumWetCellCount: number;
    readonly currentWetCellCount: number;
    readonly currentTrackedMoistureCellCount: number;

    readonly totalDepositedWater: number;
    readonly sprinklerEmissionSequence: number;
    readonly hoseJetActive: boolean;
}

/**
 * Phase 8C-7 integrated lifecycle acceptance monitor.
 *
 * Acceptance is intentionally based on observed runtime behavior:
 *
 * First Watering:
 *   ground impact -> standing Water -> moisture tracking -> Wet classification
 *
 * Repeated Watering:
 *   two distinct watering sessions both produce standing Water
 *
 * Drying:
 *   after a watering session ends, standing Water retreats while Wet Ground
 *   remains classified beneath/behind it
 *
 * Sprinkler:
 *   Sprinkler emits and its Water eventually deposits on the WaterField
 *
 * Hose:
 *   Hose jet becomes active and its Water eventually deposits on WaterField
 */
export class WaterLifecycleAcceptanceValidation {

    private state:
        WaterLifecycleAcceptanceValidationState;

    private previousStandingWater =
        0;

    private previousDepositedWater =
        0;

    private previousSprinklerEmissionSequence =
        0;

    private previousHoseJetActive =
        false;

    private wateringActive =
        false;

    private wateringSessionCount =
        0;

    private maximumStandingWater =
        0;

    private maximumWetCellCount =
        0;

    private firstWateringPassed =
        false;

    private repeatedWateringPassed =
        false;

    private dryingPassed =
        false;

    private sprinklerPassed =
        false;

    private hosePassed =
        false;

    private sprinklerObservedEmitting =
        false;

    private sprinklerDepositBaseline =
        0;

    private hoseObservedActive =
        false;

    private hoseDepositBaseline =
        0;

    private loggedOverallPass =
        false;

    public constructor(
        private readonly waterField:
            WaterField,

        private readonly environmentField:
            EnvironmentField,

        private readonly moistureSurfaceBridge:
            MoistureSurfaceBridge,

        private readonly airborneWaterSystem:
            AirborneWaterSystem,

        private readonly sprinklers:
            readonly Sprinkler[],

        private readonly hydrantHose:
            HydrantHose,
    ) {
        this.previousStandingWater =
            waterField.getTotalWaterAmount();

        this.previousDepositedWater =
            airborneWaterSystem
                .getTotalDepositedWaterAmount();

        this.previousSprinklerEmissionSequence =
            this.getSprinklerEmissionSequence();

        this.previousHoseJetActive =
            hydrantHose.isJetActive();

        this.state =
            this.buildState();
    }

    public update():
        void {

        const standingWater =
            this.waterField
                .getTotalWaterAmount();

        const wetCellCount =
            this.moistureSurfaceBridge
                .getWetCellCount();

        const trackedMoistureCellCount =
            this.environmentField
                .getTrackedMoistureCellCount();

        const depositedWater =
            this.airborneWaterSystem
                .getTotalDepositedWaterAmount();

        const sprinklerEmissionSequence =
            this.getSprinklerEmissionSequence();

        const hoseJetActive =
            this.hydrantHose
                .isJetActive();

        this.maximumStandingWater =
            Math.max(
                this.maximumStandingWater,
                standingWater,
            );

        this.maximumWetCellCount =
            Math.max(
                this.maximumWetCellCount,
                wetCellCount,
            );

        const depositIncreased =
            depositedWater >
            this.previousDepositedWater +
            0.000001;

        const waterIncreasing =
            standingWater >
            this.previousStandingWater +
            0.000001;

        const waterRetreating =
            standingWater <
            this.previousStandingWater -
            0.000001;

        /*
         * A watering session begins when deposited Water or standing Water is
         * actively increasing. A session ends once both stop increasing.
         */
        const currentlyWatering =
            depositIncreased ||
            waterIncreasing ||
            hoseJetActive ||
            sprinklerEmissionSequence >
            this.previousSprinklerEmissionSequence;

        if (
            currentlyWatering &&
            !this.wateringActive
        ) {
            this.wateringActive =
                true;

            this.wateringSessionCount +=
                1;
        }

        if (
            this.wateringActive &&
            !currentlyWatering
        ) {
            this.wateringActive =
                false;
        }

        if (
            !this.firstWateringPassed &&
            this.maximumStandingWater > 0 &&
            trackedMoistureCellCount > 0 &&
            wetCellCount > 0
        ) {
            this.firstWateringPassed =
                true;

            console.info(
                "[8C-7] First Watering: PASS",
            );
        }

        if (
            !this.repeatedWateringPassed &&
            this.wateringSessionCount >= 2 &&
            standingWater > 0
        ) {
            this.repeatedWateringPassed =
                true;

            console.info(
                "[8C-7] Repeated Watering: PASS",
            );
        }

        /*
         * The important lifecycle relationship is Water retreat while the
         * retained Wet footprint still exists.
         */
        if (
            !this.dryingPassed &&
            !currentlyWatering &&
            waterRetreating &&
            wetCellCount > 0
        ) {
            this.dryingPassed =
                true;

            console.info(
                "[8C-7] Drying / Wet Footprint Retention: PASS",
            );
        }

        /*
         * Observe a Sprinkler emission first, then require a later increase in
         * deposited Water. This confirms the real airborne -> ground chain.
         */
        if (
            sprinklerEmissionSequence >
            this.previousSprinklerEmissionSequence
        ) {
            if (
                !this.sprinklerObservedEmitting
            ) {
                this.sprinklerDepositBaseline =
                    depositedWater;
            }

            this.sprinklerObservedEmitting =
                true;
        }

        if (
            !this.sprinklerPassed &&
            this.sprinklerObservedEmitting &&
            depositedWater >
            this.sprinklerDepositBaseline +
            0.000001
        ) {
            this.sprinklerPassed =
                true;

            console.info(
                "[8C-7] Sprinkler Lifecycle: PASS",
            );
        }

        /*
         * Observe the Hose pressure/jet becoming active, then require Water
         * deposition after that activation.
         */
        if (
            hoseJetActive &&
            !this.previousHoseJetActive
        ) {
            this.hoseObservedActive =
                true;

            this.hoseDepositBaseline =
                depositedWater;
        }

        if (
            !this.hosePassed &&
            this.hoseObservedActive &&
            depositedWater >
            this.hoseDepositBaseline +
            0.000001
        ) {
            this.hosePassed =
                true;

            console.info(
                "[8C-7] Hose Lifecycle: PASS",
            );
        }

        this.previousStandingWater =
            standingWater;

        this.previousDepositedWater =
            depositedWater;

        this.previousSprinklerEmissionSequence =
            sprinklerEmissionSequence;

        this.previousHoseJetActive =
            hoseJetActive;

        this.state =
            this.buildState();

        if (
            this.state.passed &&
            !this.loggedOverallPass
        ) {
            this.loggedOverallPass =
                true;

            console.info(
                "[8C-7] Integrated Water Lifecycle: PASS",
                this.state,
            );
        }
    }

    public getState():
        WaterLifecycleAcceptanceValidationState {

        return this.state;
    }

    private getSprinklerEmissionSequence():
        number {

        let total =
            0;

        for (
            const sprinkler of
            this.sprinklers
        ) {
            total +=
                sprinkler
                    .getEmissionSequence();
        }

        return total;
    }

    private buildState():
        WaterLifecycleAcceptanceValidationState {

        const currentStandingWater =
            this.waterField
                .getTotalWaterAmount();

        const currentWetCellCount =
            this.moistureSurfaceBridge
                .getWetCellCount();

        const state:
            WaterLifecycleAcceptanceValidationState = {

            firstWateringPassed:
                this.firstWateringPassed,

            repeatedWateringPassed:
                this.repeatedWateringPassed,

            dryingPassed:
                this.dryingPassed,

            sprinklerPassed:
                this.sprinklerPassed,

            hosePassed:
                this.hosePassed,

            passed:
                this.firstWateringPassed &&
                this.repeatedWateringPassed &&
                this.dryingPassed &&
                this.sprinklerPassed &&
                this.hosePassed,

            wateringSessionCount:
                this.wateringSessionCount,

            maximumStandingWater:
                this.maximumStandingWater,

            currentStandingWater,

            maximumWetCellCount:
                this.maximumWetCellCount,

            currentWetCellCount,

            currentTrackedMoistureCellCount:
                this.environmentField
                    .getTrackedMoistureCellCount(),

            totalDepositedWater:
                this.airborneWaterSystem
                    .getTotalDepositedWaterAmount(),

            sprinklerEmissionSequence:
                this.getSprinklerEmissionSequence(),

            hoseJetActive:
                this.hydrantHose
                    .isJetActive(),
        };

        return state;
    }
}

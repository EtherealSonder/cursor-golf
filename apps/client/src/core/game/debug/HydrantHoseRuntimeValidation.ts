import {
    HydrantPressureState,
} from "../config/HydrantPressureDefinition";

import {
    WaterSourceType,
} from "../config/WaterSourceDefinition";

import type {
    HydrantHose,
} from "../entities/mechanisms/HydrantHose";

import type {
    AirborneWaterSystem,
} from "../environment/AirborneWaterSystem";

import type {
    WaterField,
} from "../environment/WaterField";

import type {
    WaterSource,
} from "../environment/WaterSource";

export interface HydrantHoseRuntimeValidationState {
    readonly completed: boolean;
    readonly hydrantHoseAvailablePassed: boolean;
    readonly sourceRegistrationPassed: boolean;
    readonly sourceTypePassed: boolean;
    readonly pressureStateProgressionPassed: boolean;
    readonly inactiveWaterOffPassed: boolean;
    readonly buildingWaterOffPassed: boolean;
    readonly activeWaterOnPassed: boolean;
    readonly releasingWaterOffPassed: boolean;
    readonly activeEmissionPassed: boolean;
    readonly dryStateEmissionStablePassed: boolean;
    readonly airborneStreamDuringActivePassed: boolean;
    readonly depositionDuringActivePassed: boolean;
    readonly nozzleCouplingPassed: boolean;
    readonly sourceIdentityStablePassed: boolean;
    readonly finiteRuntimeStatePassed: boolean;
    readonly fullCycleObserved: boolean;
    readonly secondCycleStarted: boolean;
    readonly passed: boolean;
}

/**
 * Phase 8B-10D live Hydrant + Hose runtime acceptance observer.
 *
 * It observes the production HydrantHose and Water pipeline. It does not
 * change pressure state, source state, rope physics, packet state, or Water.
 *
 * Important scheduling detail:
 * World currently updates WaterSourceSystem before entities. HydrantHose then
 * advances pressure state and synchronizes source enablement during its entity
 * update. Therefore a state transition can have a one-frame source-timing
 * boundary. Dry-state emission checks intentionally allow a short grace window
 * before requiring the source emission sequence to remain stable.
 */
export class HydrantHoseRuntimeValidation {
    private static readonly DRY_STATE_GRACE_SECONDS =
        0.12;

    private readonly initialSource:
        WaterSource | null;

    private previousPressureState:
        HydrantPressureState;

    private observedStateTime =
        0;

    private observedPressureBuilding =
        false;

    private observedActive =
        false;

    private observedPressureReleasing =
        false;

    private observedReturnToInactive =
        false;

    private initialCompletedCycleCount =
        0;

    private dryStableBaselineSequence:
        number | null =
        null;

    private activeBaselineSequence:
        number | null =
        null;

    private activeBaselineDepositedWater:
        number | null =
        null;

    private activeBaselineFieldWater:
        number | null =
        null;

    private completed =
        false;

    private hydrantHoseAvailablePassed =
        true;

    private sourceRegistrationPassed =
        false;

    private sourceTypePassed =
        false;

    private pressureStateProgressionPassed =
        true;

    private inactiveWaterOffPassed =
        true;

    private buildingWaterOffPassed =
        true;

    private activeWaterOnPassed =
        true;

    private releasingWaterOffPassed =
        true;

    private activeEmissionPassed =
        false;

    private dryStateEmissionStablePassed =
        true;

    private airborneStreamDuringActivePassed =
        false;

    private depositionDuringActivePassed =
        false;

    private nozzleCouplingPassed =
        true;

    private sourceIdentityStablePassed =
        true;

    private finiteRuntimeStatePassed =
        true;

    private fullCycleObserved =
        false;

    private secondCycleStarted =
        false;

    private state:
        HydrantHoseRuntimeValidationState;

    public constructor(
        private readonly hydrantHose:
            HydrantHose,

        private readonly airborneWaterSystem:
            AirborneWaterSystem,

        private readonly waterField:
            WaterField,
    ) {
        this.initialSource =
            this.hydrantHose
                .getWaterSource();

        this.previousPressureState =
            this.hydrantHose
                .getPressureState();

        this.initialCompletedCycleCount =
            this.hydrantHose
                .getPressureController()
                .getCompletedCycleCount();

        this.sourceRegistrationPassed =
            this.initialSource !==
            null;

        this.sourceTypePassed =
            this.initialSource
                ?.getType() ===
            WaterSourceType.DirectionalJet;

        if (
            this.previousPressureState !==
            HydrantPressureState.Inactive
        ) {
            this.pressureStateProgressionPassed =
                false;
        }

        this.state =
            this.buildState(
                false,
            );
    }

    public update(
        deltaTime:
            number,
    ): void {

        if (
            this.completed ||
            !Number.isFinite(
                deltaTime,
            ) ||
            deltaTime <= 0
        ) {
            return;
        }

        this.observedStateTime +=
            deltaTime;

        const source =
            this.hydrantHose
                .getWaterSource();

        this.sourceRegistrationPassed =
            this.sourceRegistrationPassed &&
            source !==
            null;

        if (
            !source
        ) {
            this.sourceIdentityStablePassed =
                false;

            this.nozzleCouplingPassed =
                false;

            this.finiteRuntimeStatePassed =
                false;

            this.state =
                this.buildState(
                    false,
                );

            return;
        }

        this.sourceIdentityStablePassed =
            this.sourceIdentityStablePassed &&
            source ===
            this.initialSource;

        this.sourceTypePassed =
            this.sourceTypePassed &&
            source.getType() ===
            WaterSourceType
                .DirectionalJet;

        const pressureState =
            this.hydrantHose
                .getPressureState();

        if (
            pressureState !==
            this.previousPressureState
        ) {
            this.handleStateTransition(
                pressureState,
                source,
            );
        }

        this.validateSourceEnablement(
            pressureState,
            source,
        );

        this.validateNozzleCoupling(
            source,
        );

        this.validateFiniteRuntimeState(
            source,
        );

        this.validateEmissionBehavior(
            pressureState,
            source,
        );

        this.validateAirborneStream(
            pressureState,
        );

        this.validateDeposition(
            pressureState,
        );

        const completedCycleCount =
            this.hydrantHose
                .getPressureController()
                .getCompletedCycleCount();

        if (
            completedCycleCount >
            this.initialCompletedCycleCount
        ) {
            this.fullCycleObserved =
                true;
        }

        if (
            this.fullCycleObserved &&
            pressureState ===
            HydrantPressureState
                .PressureBuilding
        ) {
            this.secondCycleStarted =
                true;
        }

        this.previousPressureState =
            pressureState;

        if (
            this.secondCycleStarted
        ) {
            this.complete();
            return;
        }

        this.state =
            this.buildState(
                false,
            );
    }

    public getState():
        HydrantHoseRuntimeValidationState {

        return this.state;
    }

    private handleStateTransition(
        nextState:
            HydrantPressureState,

        source:
            WaterSource,
    ): void {

        this.observedStateTime =
            0;

        this.dryStableBaselineSequence =
            null;

        /*
         * This is a live observer, so it must not assume that every
         * intermediate pressure state is sampled by a rendered frame.
         * HydrantPressureController is authoritative and can legitimately
         * cross multiple state boundaries during a large deltaTime.
         *
         * We therefore record the states that are actually observed and use
         * the controller's completed-cycle count as the authoritative proof
         * that a full legal cycle was completed.
         */
        switch (
        nextState
        ) {
            case HydrantPressureState
                .PressureBuilding:
                this.observedPressureBuilding =
                    true;
                break;

            case HydrantPressureState
                .Active:
                this.observedActive =
                    true;

                this.activeBaselineSequence =
                    source.getEmissionSequence();

                this.activeBaselineDepositedWater =
                    this.airborneWaterSystem
                        .getTotalDepositedWaterAmount();

                this.activeBaselineFieldWater =
                    this.waterField
                        .getTotalWaterAmount();
                break;

            case HydrantPressureState
                .PressureReleasing:
                this.observedPressureReleasing =
                    true;
                break;

            case HydrantPressureState
                .Inactive:
                if (
                    this.hydrantHose
                        .getPressureController()
                        .getCompletedCycleCount() >
                    this.initialCompletedCycleCount
                ) {
                    this.observedReturnToInactive =
                        true;
                }
                break;

            case HydrantPressureState
                .Broken:
                /*
                 * Broken gameplay is introduced in 8B-11. Reaching it during
                 * the normal 10D acceptance run is unexpected.
                 */
                this.pressureStateProgressionPassed =
                    false;
                break;
        }

        const completedCycleCount =
            this.hydrantHose
                .getPressureController()
                .getCompletedCycleCount();

        if (
            completedCycleCount >
            this.initialCompletedCycleCount
        ) {
            this.fullCycleObserved =
                true;
        }

        if (
            this.fullCycleObserved &&
            nextState ===
            HydrantPressureState
                .PressureBuilding
        ) {
            this.secondCycleStarted =
                true;
        }
    }

    private validateSourceEnablement(
        pressureState:
            HydrantPressureState,

        source:
            WaterSource,
    ): void {

        const enabled =
            source.isEnabled();

        switch (
        pressureState
        ) {
            case HydrantPressureState.Inactive:
                this.inactiveWaterOffPassed =
                    this.inactiveWaterOffPassed &&
                    !enabled;
                break;

            case HydrantPressureState.PressureBuilding:
                this.buildingWaterOffPassed =
                    this.buildingWaterOffPassed &&
                    !enabled;
                break;

            case HydrantPressureState.Active:
                this.activeWaterOnPassed =
                    this.activeWaterOnPassed &&
                    enabled;
                break;

            case HydrantPressureState.PressureReleasing:
                this.releasingWaterOffPassed =
                    this.releasingWaterOffPassed &&
                    !enabled;
                break;

            case HydrantPressureState.Broken:
                /*
                 * Broken gameplay is accepted later in 8B-11. If it appears
                 * unexpectedly during 10D, the normal-cycle validation fails.
                 */
                this.pressureStateProgressionPassed =
                    false;
                break;
        }
    }

    private validateEmissionBehavior(
        pressureState:
            HydrantPressureState,

        source:
            WaterSource,
    ): void {

        const sequence =
            source.getEmissionSequence();

        if (
            pressureState ===
            HydrantPressureState.Active
        ) {
            if (
                this.activeBaselineSequence !==
                null &&
                sequence >
                this.activeBaselineSequence
            ) {
                this.activeEmissionPassed =
                    true;
            }

            return;
        }

        /*
         * Because WaterSourceSystem runs before HydrantHose each frame, the
         * first dry-state frame can legitimately contain the final emission
         * scheduled while the source was Active on the preceding frame.
         */
        if (
            this.observedStateTime <
            HydrantHoseRuntimeValidation
                .DRY_STATE_GRACE_SECONDS
        ) {
            return;
        }

        if (
            this.dryStableBaselineSequence ===
            null
        ) {
            this.dryStableBaselineSequence =
                sequence;

            return;
        }

        if (
            sequence !==
            this.dryStableBaselineSequence
        ) {
            this.dryStateEmissionStablePassed =
                false;
        }
    }

    private validateAirborneStream(
        pressureState:
            HydrantPressureState,
    ): void {

        if (
            pressureState !==
            HydrantPressureState.Active
        ) {
            return;
        }

        this.airborneWaterSystem
            .forEachActivePacket(
                (packet): void => {
                    if (
                        packet.getSourceId() ===
                        this.hydrantHose
                            .getWaterSourceId()
                    ) {
                        this.airborneStreamDuringActivePassed =
                            true;
                    }
                },
            );
    }

    private validateDeposition(
        pressureState:
            HydrantPressureState,
    ): void {

        if (
            pressureState !==
            HydrantPressureState.Active ||
            this.activeBaselineDepositedWater ===
            null ||
            this.activeBaselineFieldWater ===
            null
        ) {
            return;
        }

        const depositedIncrease =
            this.airborneWaterSystem
                .getTotalDepositedWaterAmount() >
            this.activeBaselineDepositedWater;

        const fieldIncrease =
            this.waterField
                .getTotalWaterAmount() >
            this.activeBaselineFieldWater;

        if (
            depositedIncrease ||
            fieldIncrease
        ) {
            this.depositionDuringActivePassed =
                true;
        }
    }

    private validateNozzleCoupling(
        source:
            WaterSource,
    ): void {

        const nozzle =
            this.hydrantHose
                .getNozzlePosition();

        const sourcePositionMatches =
            this.nearlyEqual(
                nozzle.x,
                source.getPositionX(),
            ) &&
            this.nearlyEqual(
                nozzle.y,
                source.getPositionY(),
            );

        const directionMatches =
            Math.abs(
                this.angleDifference(
                    this.hydrantHose
                        .getNozzleDirectionRadians(),
                    source
                        .getDirectionRadians(),
                ),
            ) <=
            1e-8;

        this.nozzleCouplingPassed =
            this.nozzleCouplingPassed &&
            sourcePositionMatches &&
            directionMatches;
    }

    private validateFiniteRuntimeState(
        source:
            WaterSource,
    ): void {

        const nozzle =
            this.hydrantHose
                .getNozzlePosition();

        const values = [
            nozzle.x,
            nozzle.y,
            this.hydrantHose
                .getNozzleDirectionRadians(),
            this.hydrantHose
                .getPressureStateProgress(),
            source.getPositionX(),
            source.getPositionY(),
            source.getDirectionRadians(),
            source.getFlowRate(),
            source.getEmissionInterval(),
            source.getLaunchSpeed(),
            source.getLaunchElevationRadians(),
            source.getWindResponse(),
            source.getImpactMomentumRetention(),
        ];

        if (
            values.some(
                (value): boolean =>
                    !Number.isFinite(
                        value,
                    ),
            )
        ) {
            this.finiteRuntimeStatePassed =
                false;
        }
    }

    private complete():
        void {

        this.completed =
            true;

        this.state =
            this.buildState(
                true,
            );

        console.group(
            "Phase 8B-10D Combined Hydrant + Hose Runtime Validation",
        );

        console.log(
            "Hydrant / Hose Available",
            {
                hydrantHoseAvailablePassed:
                    this.state
                        .hydrantHoseAvailablePassed,
                sourceRegistrationPassed:
                    this.state
                        .sourceRegistrationPassed,
                sourceTypePassed:
                    this.state
                        .sourceTypePassed,
            },
        );

        console.log(
            "Pressure State Progression",
            {
                pressureStateProgressionPassed:
                    this.state
                        .pressureStateProgressionPassed,
                fullCycleObserved:
                    this.state
                        .fullCycleObserved,
                secondCycleStarted:
                    this.state
                        .secondCycleStarted,
            },
        );

        console.log(
            "Water Enable Mapping",
            {
                inactiveWaterOffPassed:
                    this.state
                        .inactiveWaterOffPassed,
                buildingWaterOffPassed:
                    this.state
                        .buildingWaterOffPassed,
                activeWaterOnPassed:
                    this.state
                        .activeWaterOnPassed,
                releasingWaterOffPassed:
                    this.state
                        .releasingWaterOffPassed,
            },
        );

        console.log(
            "Emission Scheduling",
            {
                activeEmissionPassed:
                    this.state
                        .activeEmissionPassed,
                dryStateEmissionStablePassed:
                    this.state
                        .dryStateEmissionStablePassed,
            },
        );

        console.log(
            "Airborne Hose Stream",
            {
                airborneStreamDuringActivePassed:
                    this.state
                        .airborneStreamDuringActivePassed,
            },
        );

        console.log(
            "Water Deposition",
            {
                depositionDuringActivePassed:
                    this.state
                        .depositionDuringActivePassed,
            },
        );

        console.log(
            "Nozzle Coupling",
            {
                nozzleCouplingPassed:
                    this.state
                        .nozzleCouplingPassed,
            },
        );

        console.log(
            "Source Identity",
            {
                sourceIdentityStablePassed:
                    this.state
                        .sourceIdentityStablePassed,
            },
        );

        console.log(
            "Finite Runtime State",
            {
                finiteRuntimeStatePassed:
                    this.state
                        .finiteRuntimeStatePassed,
            },
        );

        console.log(
            "RESULT",
            this.state.passed
                ? "PASS"
                : "FAIL",
        );

        console.groupEnd();
    }

    private buildState(
        completed:
            boolean,
    ): HydrantHoseRuntimeValidationState {

        const passed =
            completed &&
            this.hydrantHoseAvailablePassed &&
            this.sourceRegistrationPassed &&
            this.sourceTypePassed &&
            this.pressureStateProgressionPassed &&
            this.inactiveWaterOffPassed &&
            this.buildingWaterOffPassed &&
            this.activeWaterOnPassed &&
            this.releasingWaterOffPassed &&
            this.activeEmissionPassed &&
            this.dryStateEmissionStablePassed &&
            this.airborneStreamDuringActivePassed &&
            this.depositionDuringActivePassed &&
            this.nozzleCouplingPassed &&
            this.sourceIdentityStablePassed &&
            this.finiteRuntimeStatePassed &&
            this.fullCycleObserved &&
            this.secondCycleStarted;

        return {
            completed,
            hydrantHoseAvailablePassed:
                this.hydrantHoseAvailablePassed,
            sourceRegistrationPassed:
                this.sourceRegistrationPassed,
            sourceTypePassed:
                this.sourceTypePassed,
            pressureStateProgressionPassed:
                this.pressureStateProgressionPassed,
            inactiveWaterOffPassed:
                this.inactiveWaterOffPassed,
            buildingWaterOffPassed:
                this.buildingWaterOffPassed,
            activeWaterOnPassed:
                this.activeWaterOnPassed,
            releasingWaterOffPassed:
                this.releasingWaterOffPassed,
            activeEmissionPassed:
                this.activeEmissionPassed,
            dryStateEmissionStablePassed:
                this.dryStateEmissionStablePassed,
            airborneStreamDuringActivePassed:
                this.airborneStreamDuringActivePassed,
            depositionDuringActivePassed:
                this.depositionDuringActivePassed,
            nozzleCouplingPassed:
                this.nozzleCouplingPassed,
            sourceIdentityStablePassed:
                this.sourceIdentityStablePassed,
            finiteRuntimeStatePassed:
                this.finiteRuntimeStatePassed,
            fullCycleObserved:
                this.fullCycleObserved,
            secondCycleStarted:
                this.secondCycleStarted,
            passed,
        };
    }

    private nearlyEqual(
        first:
            number,

        second:
            number,
    ): boolean {

        return (
            Math.abs(
                first -
                second,
            ) <=
            1e-8
        );
    }

    private angleDifference(
        first:
            number,

        second:
            number,
    ): number {

        return Math.atan2(
            Math.sin(
                first -
                second,
            ),
            Math.cos(
                first -
                second,
            ),
        );
    }
}

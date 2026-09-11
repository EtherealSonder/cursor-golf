import {
    DEFAULT_HOSE_WATER_DEFINITION,
} from "../config/HoseWaterDefinition";

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

export interface HoseCombinedAcceptanceValidationState {
    readonly completed: boolean;
    readonly hoseEntityPassed: boolean;
    readonly sourceRegistrationPassed: boolean;
    readonly sourceTypePassed: boolean;
    readonly sourceEnabledPassed: boolean;
    readonly nozzleCouplingPassed: boolean;
    readonly tuningPassed: boolean;
    readonly sustainedEmissionPassed: boolean;
    readonly airborneStreamPassed: boolean;
    readonly depositionPassed: boolean;
    readonly sourceIdentityStablePassed: boolean;
    readonly finiteRuntimeStatePassed: boolean;
    readonly nozzleMovementObserved: boolean;
    readonly passed: boolean;
}

/**
 * Phase 8B-10B.6 live acceptance observer.
 *
 * This class does not create, move, enable, disable, emit, or deposit Water.
 * It only samples the already-running gameplay systems for a short window.
 *
 * Acceptance is intentionally live:
 *
 * HydrantHose
 *   -> dynamic nozzle transform
 *   -> registered DirectionalJet
 *   -> sustained source emissions
 *   -> Hose AirborneWaterPacket activity
 *   -> Water deposition activity
 *
 * Exact impact-momentum magnitude/direction is already covered by the isolated
 * Phase 8B-10B.5 validation. This combined check confirms that the production
 * runtime keeps the complete stream chain alive together.
 */
export class HoseCombinedAcceptanceValidation {
    private readonly acceptanceDurationSeconds =
        2;

    private elapsedSeconds =
        0;

    private completed =
        false;

    private readonly initialSource:
        WaterSource | null;

    private readonly initialEmissionSequence:
        number;

    private readonly initialCreatedPacketCount:
        number;

    private readonly initialDepositedWater:
        number;

    private readonly initialWaterFieldAmount:
        number;

    private readonly initialNozzleX:
        number;

    private readonly initialNozzleY:
        number;

    private hoseEntityPassed =
        false;

    private sourceRegistrationPassed =
        false;

    private sourceTypePassed =
        false;

    private sourceEnabledPassed =
        false;

    private nozzleCouplingPassed =
        true;

    private tuningPassed =
        false;

    private sustainedEmissionPassed =
        false;

    private airborneStreamPassed =
        false;

    private depositionPassed =
        false;

    private sourceIdentityStablePassed =
        true;

    private finiteRuntimeStatePassed =
        true;

    private nozzleMovementObserved =
        false;

    private state:
        HoseCombinedAcceptanceValidationState;

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

        this.initialEmissionSequence =
            this.initialSource
                ?.getEmissionSequence() ??
            0;

        this.initialCreatedPacketCount =
            this.airborneWaterSystem
                .getTotalCreatedPacketCount();

        this.initialDepositedWater =
            this.airborneWaterSystem
                .getTotalDepositedWaterAmount();

        this.initialWaterFieldAmount =
            this.waterField
                .getTotalWaterAmount();

        const nozzle =
            this.hydrantHose
                .getNozzlePosition();

        this.initialNozzleX =
            nozzle.x;

        this.initialNozzleY =
            nozzle.y;

        this.hoseEntityPassed =
            true;

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

        this.elapsedSeconds +=
            deltaTime;

        const source =
            this.hydrantHose
                .getWaterSource();

        this.sourceRegistrationPassed =
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

            this.finishIfReady();

            return;
        }

        this.sourceIdentityStablePassed =
            this.sourceIdentityStablePassed &&
            source ===
            this.initialSource;

        this.sourceTypePassed =
            source.getType() ===
            WaterSourceType
                .DirectionalJet;

        this.sourceEnabledPassed =
            source.isEnabled();

        const nozzle =
            this.hydrantHose
                .getNozzlePosition();

        const nozzleDirection =
            this.hydrantHose
                .getNozzleDirectionRadians();

        const positionMatches =
            this.nearlyEqual(
                source.getPositionX(),
                nozzle.x,
            ) &&
            this.nearlyEqual(
                source.getPositionY(),
                nozzle.y,
            );

        const directionMatches =
            Math.abs(
                this.angleDifference(
                    source
                        .getDirectionRadians(),
                    nozzleDirection,
                ),
            ) <=
            1e-8;

        this.nozzleCouplingPassed =
            this.nozzleCouplingPassed &&
            positionMatches &&
            directionMatches;

        const nozzleMovement =
            Math.hypot(
                nozzle.x -
                this.initialNozzleX,
                nozzle.y -
                this.initialNozzleY,
            );

        if (
            nozzleMovement >
            0.5
        ) {
            this.nozzleMovementObserved =
                true;
        }

        this.tuningPassed =
            this.nearlyEqual(
                source.getFlowRate(),
                DEFAULT_HOSE_WATER_DEFINITION
                    .flowRate,
            ) &&
            this.nearlyEqual(
                source.getEmissionInterval(),
                DEFAULT_HOSE_WATER_DEFINITION
                    .emissionInterval,
            ) &&
            this.nearlyEqual(
                source.getLaunchSpeed(),
                DEFAULT_HOSE_WATER_DEFINITION
                    .launchSpeed,
            ) &&
            this.nearlyEqual(
                source.getLaunchElevationRadians(),
                DEFAULT_HOSE_WATER_DEFINITION
                    .launchElevationRadians,
            ) &&
            this.nearlyEqual(
                source.getWindResponse(),
                DEFAULT_HOSE_WATER_DEFINITION
                    .windResponse,
            ) &&
            this.nearlyEqual(
                source.getImpactMomentumRetention(),
                DEFAULT_HOSE_WATER_DEFINITION
                    .impactMomentumRetention,
            );

        this.sustainedEmissionPassed =
            source.getEmissionSequence() >
            this.initialEmissionSequence +
            1;

        let liveHosePacketObserved =
            false;

        this.airborneWaterSystem
            .forEachActivePacket(
                (packet): void => {
                    if (
                        packet.getSourceId() !==
                        this.hydrantHose
                            .getWaterSourceId()
                    ) {
                        return;
                    }

                    liveHosePacketObserved =
                        true;

                    const numericValues = [
                        packet.getPositionX(),
                        packet.getPositionY(),
                        packet.getHeight(),
                        packet.getVelocityX(),
                        packet.getVelocityY(),
                        packet.getVerticalVelocity(),
                        packet.getWaterAmount(),
                    ];

                    if (
                        numericValues.some(
                            (value): boolean =>
                                !Number.isFinite(
                                    value,
                                ),
                        )
                    ) {
                        this.finiteRuntimeStatePassed =
                            false;
                    }

                    if (
                        packet.getSourceType() !==
                        WaterSourceType
                            .DirectionalJet
                    ) {
                        this.finiteRuntimeStatePassed =
                            false;
                    }
                },
            );

        this.airborneStreamPassed =
            this.airborneStreamPassed ||
            liveHosePacketObserved ||
            this.airborneWaterSystem
                .getTotalCreatedPacketCount() >
            this.initialCreatedPacketCount;

        const depositedWaterDelta =
            this.airborneWaterSystem
                .getTotalDepositedWaterAmount() -
            this.initialDepositedWater;

        const fieldWaterDelta =
            this.waterField
                .getTotalWaterAmount() -
            this.initialWaterFieldAmount;

        this.depositionPassed =
            this.depositionPassed ||
            depositedWaterDelta >
            0 ||
            fieldWaterDelta >
            0;

        const finiteSourceValues = [
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
            finiteSourceValues.some(
                (value): boolean =>
                    !Number.isFinite(
                        value,
                    ),
            )
        ) {
            this.finiteRuntimeStatePassed =
                false;
        }

        this.finishIfReady();
    }

    public getState():
        HoseCombinedAcceptanceValidationState {

        return this.state;
    }

    private finishIfReady():
        void {

        if (
            this.elapsedSeconds <
            this.acceptanceDurationSeconds
        ) {
            this.state =
                this.buildState(
                    false,
                );

            return;
        }

        this.completed =
            true;

        this.state =
            this.buildState(
                true,
            );

        console.group(
            "Phase 8B-10B.6 Combined Hose Stream Acceptance",
        );

        console.log(
            "Hose Entity",
            {
                hoseEntityPassed:
                    this.state
                        .hoseEntityPassed,
            },
        );

        console.log(
            "Water Source Registration",
            {
                sourceRegistrationPassed:
                    this.state
                        .sourceRegistrationPassed,
                sourceTypePassed:
                    this.state
                        .sourceTypePassed,
                sourceEnabledPassed:
                    this.state
                        .sourceEnabledPassed,
            },
        );

        console.log(
            "Dynamic Nozzle Coupling",
            {
                nozzleCouplingPassed:
                    this.state
                        .nozzleCouplingPassed,
                nozzleMovementObserved:
                    this.state
                        .nozzleMovementObserved,
            },
        );

        console.log(
            "Hose Tuning",
            {
                tuningPassed:
                    this.state
                        .tuningPassed,
            },
        );

        console.log(
            "Sustained Emission",
            {
                sustainedEmissionPassed:
                    this.state
                        .sustainedEmissionPassed,
            },
        );

        console.log(
            "Airborne Stream",
            {
                airborneStreamPassed:
                    this.state
                        .airborneStreamPassed,
            },
        );

        console.log(
            "Water Deposition",
            {
                depositionPassed:
                    this.state
                        .depositionPassed,
            },
        );

        console.log(
            "Source Identity Stability",
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
    ): HoseCombinedAcceptanceValidationState {

        const passed =
            completed &&
            this.hoseEntityPassed &&
            this.sourceRegistrationPassed &&
            this.sourceTypePassed &&
            this.sourceEnabledPassed &&
            this.nozzleCouplingPassed &&
            this.tuningPassed &&
            this.sustainedEmissionPassed &&
            this.airborneStreamPassed &&
            this.depositionPassed &&
            this.sourceIdentityStablePassed &&
            this.finiteRuntimeStatePassed;

        return {
            completed,
            hoseEntityPassed:
                this.hoseEntityPassed,
            sourceRegistrationPassed:
                this.sourceRegistrationPassed,
            sourceTypePassed:
                this.sourceTypePassed,
            sourceEnabledPassed:
                this.sourceEnabledPassed,
            nozzleCouplingPassed:
                this.nozzleCouplingPassed,
            tuningPassed:
                this.tuningPassed,
            sustainedEmissionPassed:
                this.sustainedEmissionPassed,
            airborneStreamPassed:
                this.airborneStreamPassed,
            depositionPassed:
                this.depositionPassed,
            sourceIdentityStablePassed:
                this.sourceIdentityStablePassed,
            finiteRuntimeStatePassed:
                this.finiteRuntimeStatePassed,
            nozzleMovementObserved:
                this.nozzleMovementObserved,
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

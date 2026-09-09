import {
    WaterSourceType,
} from "../config/WaterSourceDefinition";

import {
    AirborneWaterSystem,
} from "../environment/AirborneWaterSystem";

import {
    WaterField,
} from "../environment/WaterField";

import {
    WaterSourceSystem,
} from "../environment/WaterSourceSystem";

export interface AirborneWaterValidationState {
    readonly packetCreationPassed: boolean;
    readonly ballisticFlightPassed: boolean;
    readonly impactPassed: boolean;
    readonly momentumTransferPassed: boolean;
    readonly frameRateStabilityPassed: boolean;
    readonly hitchGuardPassed: boolean;
    readonly packetBoundPassed: boolean;
    readonly resetPassed: boolean;
    readonly passed: boolean;
}

interface FlightScenarioResult {
    readonly landingX: number;
    readonly landingY: number;
    readonly depositedAmount: number;
    readonly depositedVelocityX: number;
    readonly depositedVelocityY: number;
    readonly createdPackets: number;
    readonly impactedPackets: number;
    readonly activePackets: number;
}

/** Development-only validation for Phase 8B-2 airborne Water transport. */
export class AirborneWaterValidation {
    private state:
        AirborneWaterValidationState | null =
        null;

    public run(): AirborneWaterValidationState {
        const creationField =
            new WaterField();

        const creationSystem =
            new AirborneWaterSystem(
                creationField,
            );

        creationSystem.consumeEmissionRequests([
            {
                sourceId:
                    "8B-2-packet-creation",
                sourceType:
                    WaterSourceType.Sprinkler,
                sequence: 1,
                positionX: 0,
                positionY: 0,
                directionRadians: 0,
                launchSpeed: 360,
                launchElevationRadians:
                    Math.PI / 4,
                waterAmount: 0.4,
                windResponse: 0.75,
            },
        ]);

        const packetCreationPassed =
            creationSystem
                .getActivePacketCount() === 1 &&
            creationSystem
                .getTotalCreatedPacketCount() === 1;

        let initialHeight = 0;
        let initialPositionX = 0;

        creationSystem.update(
            1 / 60,
        );

        creationSystem.forEachActivePacket(
            (packet): void => {
                initialHeight =
                    packet.getHeight();

                initialPositionX =
                    packet.getPositionX();
            },
        );

        const ballisticFlightPassed =
            initialHeight > 0 &&
            initialPositionX > 0;

        const sixtyFps =
            this.runFlightScenario(
                1 / 60,
            );

        const thirtyFps =
            this.runFlightScenario(
                1 / 30,
            );

        const oneTwentyFps =
            this.runFlightScenario(
                1 / 120,
            );

        const impactPassed =
            sixtyFps.createdPackets === 1 &&
            sixtyFps.impactedPackets === 1 &&
            sixtyFps.activePackets === 0 &&
            Math.abs(
                sixtyFps.depositedAmount -
                0.4,
            ) <= 0.00001;

        const momentumTransferPassed =
            sixtyFps.depositedVelocityX > 0 &&
            Math.abs(
                sixtyFps.depositedVelocityY,
            ) <= 0.0001;

        const maxLandingError =
            Math.max(
                Math.abs(
                    sixtyFps.landingX -
                    thirtyFps.landingX,
                ),
                Math.abs(
                    sixtyFps.landingX -
                    oneTwentyFps.landingX,
                ),
                Math.abs(
                    sixtyFps.landingY -
                    thirtyFps.landingY,
                ),
                Math.abs(
                    sixtyFps.landingY -
                    oneTwentyFps.landingY,
                ),
            );

        const frameRateStabilityPassed =
            maxLandingError <= 0.0001;

        const hitchField =
            new WaterField();

        const hitchSystem =
            new AirborneWaterSystem(
                hitchField,
            );

        hitchSystem.consumeEmissionRequests([
            {
                sourceId: "8B-2-hitch",
                sourceType:
                    WaterSourceType.Sprinkler,
                sequence: 1,
                positionX: 0,
                positionY: 0,
                directionRadians: 0,
                launchSpeed: 500,
                launchElevationRadians:
                    Math.PI / 4,
                waterAmount: 0.2,
                windResponse: 0,
            },
        ]);

        hitchSystem.update(
            0.2,
        );

        const hitchSubsteps =
            hitchSystem
                .getLastSubstepCount();

        const hitchGuardPassed =
            hitchSubsteps <= 4;

        const boundedField =
            new WaterField();

        const boundedSystem =
            new AirborneWaterSystem(
                boundedField,
                {
                    simulationStepSeconds:
                        1 / 60,
                    maximumSubstepsPerFrame: 4,
                    maximumFrameDeltaSeconds: 0.1,
                    gravity: 980,
                    maximumPacketCount: 3,
                    maximumPacketAgeSeconds: 5,
                    minimumWaterAmount: 0.000001,
                },
            );

        boundedSystem.consumeEmissionRequests(
            [0, 1, 2, 3, 4].map(
                (sequence): {
                    sourceId: string;
                    sourceType: WaterSourceType;
                    sequence: number;
                    positionX: number;
                    positionY: number;
                    directionRadians: number;
                    launchSpeed: number;
                    launchElevationRadians: number;
                    waterAmount: number;
                    windResponse: number;
                } => ({
                    sourceId:
                        "8B-2-bounded",
                    sourceType:
                        WaterSourceType.Sprinkler,
                    sequence:
                        sequence + 1,
                    positionX: 0,
                    positionY: 0,
                    directionRadians: 0,
                    launchSpeed: 300,
                    launchElevationRadians:
                        Math.PI / 4,
                    waterAmount: 0.1,
                    windResponse: 0,
                }),
            ),
        );

        const packetBoundPassed =
            boundedSystem
                .getActivePacketCount() === 3 &&
            boundedSystem
                .getTotalDroppedPacketCount() === 2;

        boundedSystem.reset();

        const resetPassed =
            boundedSystem
                .getActivePacketCount() === 0 &&
            boundedSystem
                .getTotalCreatedPacketCount() === 0 &&
            boundedSystem
                .getTotalImpactedPacketCount() === 0 &&
            boundedSystem
                .getTotalRequestedWaterAmount() === 0 &&
            boundedSystem
                .getTotalDepositedWaterAmount() === 0;

        const passed =
            packetCreationPassed &&
            ballisticFlightPassed &&
            impactPassed &&
            momentumTransferPassed &&
            frameRateStabilityPassed &&
            hitchGuardPassed &&
            packetBoundPassed &&
            resetPassed;

        this.state = {
            packetCreationPassed,
            ballisticFlightPassed,
            impactPassed,
            momentumTransferPassed,
            frameRateStabilityPassed,
            hitchGuardPassed,
            packetBoundPassed,
            resetPassed,
            passed,
        };

        console.group(
            "Phase 8B-2 AirborneWaterSystem validation",
        );

        console.log(
            "Packet Creation",
            {
                activePacketsAfterCreation: 1,
                packetCreationPassed,
            },
        );

        console.log(
            "Ballistic Flight",
            {
                heightAfterFirstStep:
                    initialHeight,
                xAfterFirstStep:
                    initialPositionX,
                ballisticFlightPassed,
            },
        );

        console.log(
            "Ground Impact",
            {
                landingX:
                    sixtyFps.landingX,
                landingY:
                    sixtyFps.landingY,
                depositedAmount:
                    sixtyFps.depositedAmount,
                activePackets:
                    sixtyFps.activePackets,
                impactPassed,
            },
        );

        console.log(
            "Momentum Transfer",
            {
                depositedVelocityX:
                    sixtyFps.depositedVelocityX,
                depositedVelocityY:
                    sixtyFps.depositedVelocityY,
                momentumTransferPassed,
            },
        );

        console.log(
            "Frame-rate Stability",
            {
                landing60Fps: {
                    x: sixtyFps.landingX,
                    y: sixtyFps.landingY,
                },
                landing30Fps: {
                    x: thirtyFps.landingX,
                    y: thirtyFps.landingY,
                },
                landing120Fps: {
                    x: oneTwentyFps.landingX,
                    y: oneTwentyFps.landingY,
                },
                maxLandingError,
                frameRateStabilityPassed,
            },
        );

        console.log(
            "Hitch Guard",
            {
                hitchSubsteps,
                maximumSubsteps: 4,
                hitchGuardPassed,
            },
        );

        console.log(
            "Packet Bound",
            {
                activePackets:
                    3,
                droppedPackets:
                    2,
                packetBoundPassed,
            },
        );

        console.log(
            "Reset",
            {
                resetPassed,
            },
        );

        if (
            passed
        ) {
            console.log(
                "RESULT: PASS",
            );
        } else {
            console.error(
                "RESULT: FAIL",
                this.state,
            );
        }

        console.groupEnd();

        return this.state;
    }

    private runFlightScenario(
        frameDelta: number,
    ): FlightScenarioResult {
        const waterField =
            new WaterField();

        const sourceSystem =
            new WaterSourceSystem();

        const airborneSystem =
            new AirborneWaterSystem(
                waterField,
            );

        sourceSystem.addSource({
            id: "8B-2-flight-scenario",
            type: WaterSourceType.Sprinkler,
            enabled: true,
            positionX: 0,
            positionY: 0,
            directionRadians: 0,
            flowRate: 4,
            emissionInterval: 0.1,
            launchSpeed: 360,
            launchElevationRadians:
                Math.PI / 4,
            windResponse: 0.75,
        });

        sourceSystem.update(
            0.1,
        );

        airborneSystem
            .consumeEmissionRequests(
                sourceSystem
                    .drainEmissionRequests(),
            );

        let elapsed = 0;

        while (
            airborneSystem
                .getActivePacketCount() > 0 &&
            elapsed < 2
        ) {
            airborneSystem.update(
                frameDelta,
            );

            elapsed +=
                frameDelta;
        }

        let landingX = 0;
        let landingY = 0;

        waterField.forEachTrackedWaterCell(
            (cell): void => {
                if (
                    cell.depth <= 0
                ) {
                    return;
                }

                landingX =
                    cell.worldCenterX;

                landingY =
                    cell.worldCenterY;
            },
        );

        const depositedVelocity =
            waterField.getVelocityAt(
                landingX,
                landingY,
            );

        return {
            landingX,
            landingY,
            depositedAmount:
                airborneSystem
                    .getTotalDepositedWaterAmount(),
            depositedVelocityX:
                depositedVelocity.x,
            depositedVelocityY:
                depositedVelocity.y,
            createdPackets:
                airborneSystem
                    .getTotalCreatedPacketCount(),
            impactedPackets:
                airborneSystem
                    .getTotalImpactedPacketCount(),
            activePackets:
                airborneSystem
                    .getActivePacketCount(),
        };
    }

    public getState():
        AirborneWaterValidationState | null {
        return this.state;
    }
}

import { DEFAULT_SPRINKLER_DEFINITION } from "../config/SprinklerDefinition";
import { AirborneWaterSystem } from "../environment/AirborneWaterSystem";
import { WaterField } from "../environment/WaterField";
import { WaterSourceSystem } from "../environment/WaterSourceSystem";
import { Sprinkler } from "../entities/mechanisms/Sprinkler";

export interface SprinklerValidationState {
    readonly nozzleGeometryPassed: boolean;
    readonly rotationPassed: boolean;
    readonly fourEmissionPulsePassed: boolean;
    readonly airborneBatchPassed: boolean;
    readonly fourWayImpactPassed: boolean;
    readonly passed: boolean;
}

/** Development-only validation for the Phase 8B-3 four-nozzle Sprinkler. */
export class SprinklerValidation {
    private state: SprinklerValidationState | null = null;

    public run(): SprinklerValidationState {
        const sourceSystem = new WaterSourceSystem();
        const sprinkler = new Sprinkler(
            "8B-3-validation-sprinkler",
            0,
            0,
            0,
            sourceSystem,
        );

        sprinkler.initialize();

        const initialNozzles = sprinkler.getNozzleWorldStates();
        const expectedOffset = DEFAULT_SPRINKLER_DEFINITION.nozzleOffset;

        const nozzleGeometryPassed =
            initialNozzles.length === 4 &&
            initialNozzles.every((nozzle, index): boolean => {
                const expectedAngle = index * Math.PI / 2;
                const distance = Math.hypot(nozzle.positionX, nozzle.positionY);
                return (
                    Math.abs(distance - expectedOffset) <= 0.00001 &&
                    this.angleDistance(nozzle.directionRadians, expectedAngle) <= 0.00001
                );
            });

        sprinkler.setRotationRadians(Math.PI / 4);
        const rotatedNozzles = sprinkler.getNozzleWorldStates();
        const rotationPassed = rotatedNozzles.every((nozzle, index): boolean =>
            this.angleDistance(
                nozzle.directionRadians,
                Math.PI / 4 + index * Math.PI / 2,
            ) <= 0.00001,
        );

        sprinkler.setRotationRadians(0);
        const queuedCount = sprinkler.emitImmediately();
        const requests = sourceSystem.drainEmissionRequests();

        const expectedWaterPerNozzle =
            DEFAULT_SPRINKLER_DEFINITION.flowRate *
            DEFAULT_SPRINKLER_DEFINITION.emissionInterval /
            DEFAULT_SPRINKLER_DEFINITION.nozzleCount;

        const fourEmissionPulsePassed =
            queuedCount === 4 &&
            requests.length === 4 &&
            requests.every((request): boolean =>
                request.sequence === 1 &&
                Math.abs(request.waterAmount - expectedWaterPerNozzle) <= 0.000001,
            );

        const waterField = new WaterField();
        const airborneSystem = new AirborneWaterSystem(waterField);
        airborneSystem.consumeEmissionRequests(requests);

        const airborneBatchPassed =
            airborneSystem.getActivePacketCount() === 4 &&
            airborneSystem.getTotalCreatedPacketCount() === 4;

        for (let step = 0; step < 360 && airborneSystem.getActivePacketCount() > 0; step += 1) {
            airborneSystem.update(1 / 60);
        }

        const fourWayImpactPassed =
            airborneSystem.getActivePacketCount() === 0 &&
            airborneSystem.getTotalImpactedPacketCount() === 4 &&
            waterField.getNonEmptyCellCount() >= 4 &&
            Math.abs(
                waterField.getTotalWaterAmount() -
                DEFAULT_SPRINKLER_DEFINITION.flowRate * DEFAULT_SPRINKLER_DEFINITION.emissionInterval,
            ) <= 0.00001;

        const passed =
            nozzleGeometryPassed &&
            rotationPassed &&
            fourEmissionPulsePassed &&
            airborneBatchPassed &&
            fourWayImpactPassed;

        this.state = {
            nozzleGeometryPassed,
            rotationPassed,
            fourEmissionPulsePassed,
            airborneBatchPassed,
            fourWayImpactPassed,
            passed,
        };

        console.group("Phase 8B-3 Sprinkler validation");
        console.log("Nozzle Geometry", { nozzleCount: initialNozzles.length, nozzleGeometryPassed });
        console.log("Rotation", { rotationRadians: Math.PI / 4, rotationPassed });
        console.log("Four-Emission Pulse", { queuedCount, requestCount: requests.length, fourEmissionPulsePassed });
        console.log("Airborne Batch", { createdPackets: airborneSystem.getTotalCreatedPacketCount(), airborneBatchPassed });
        console.log("Four-Way Impact", {
            impactedPackets: airborneSystem.getTotalImpactedPacketCount(),
            depositedWater: waterField.getTotalWaterAmount(),
            wetCells: waterField.getNonEmptyCellCount(),
            fourWayImpactPassed,
        });
        console.log(`RESULT: ${passed ? "PASS" : "FAIL"}`);
        console.groupEnd();

        sprinkler.destroy();
        return this.state;
    }

    public getState(): SprinklerValidationState | null {
        return this.state;
    }

    private angleDistance(first: number, second: number): number {
        const difference = Math.atan2(
            Math.sin(first - second),
            Math.cos(first - second),
        );
        return Math.abs(difference);
    }
}

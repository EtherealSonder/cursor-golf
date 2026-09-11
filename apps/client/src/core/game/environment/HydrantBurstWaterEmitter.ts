import {
    DEFAULT_HYDRANT_DAMAGE_DEFINITION,
    type HydrantDamageDefinition,
} from "../config/HydrantDamageDefinition";

import {
    WaterSourceType,
} from "../config/WaterSourceDefinition";

import type {
    WaterSourceSystem,
} from "./WaterSourceSystem";

/**
 * One-shot destruction response for a broken Hydrant.
 *
 * It does not inject WaterField directly. It queues a radial batch into the
 * same WaterSourceSystem handoff used by normal Water sources so the existing
 * AirborneWaterSystem owns flight, impact and WaterField deposition.
 */
export class HydrantBurstWaterEmitter {
    private emitted =
        false;

    public constructor(
        private readonly waterSourceSystem:
            WaterSourceSystem,

        private readonly definition:
            HydrantDamageDefinition =
            DEFAULT_HYDRANT_DAMAGE_DEFINITION,
    ) {}

    public emitBurst(
        positionX:
            number,

        positionY:
            number,

        sourceId =
            "hydrant-destruction-burst",
    ): boolean {
        if (
            this.emitted
        ) {
            return false;
        }

        this.emitted =
            true;

        const packetCount =
            this.definition
                .burstPacketCount;

        const waterPerPacket =
            this.definition
                .burstWaterAmount /
            packetCount;

        for (
            let index = 0;
            index < packetCount;
            index += 1
        ) {
            const directionRadians =
                (
                    index /
                    packetCount
                ) *
                Math.PI *
                2;

            this.waterSourceSystem
                .queueEmissionRequest({
                    sourceId,
                    sourceType:
                        WaterSourceType
                            .DirectionalJet,
                    sequence:
                        index + 1,
                    positionX,
                    positionY,
                    directionRadians,
                    launchSpeed:
                        this.definition
                            .burstLaunchSpeed,
                    launchElevationRadians:
                        this.definition
                            .burstLaunchElevationRadians,
                    waterAmount:
                        waterPerPacket,
                    windResponse:
                        this.definition
                            .burstWindResponse,
                    impactMomentumRetention:
                        this.definition
                            .burstImpactMomentumRetention,
                });
        }

        return true;
    }

    public reset():
        void {
        this.emitted =
            false;
    }

    public hasEmitted():
        boolean {
        return this.emitted;
    }
}

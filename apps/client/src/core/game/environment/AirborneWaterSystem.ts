import {
    DEFAULT_AIRBORNE_WATER_DEFINITION,
    validateAirborneWaterDefinition,
} from "../config/AirborneWaterDefinition";

import type {
    AirborneWaterDefinition,
} from "../config/AirborneWaterDefinition";

import type {
    WaterEmissionRequest,
} from "./WaterSourceSystem";

import {
    getDefaultImpactMomentumRetention,
} from "../config/WaterSourceDefinition";

import {
    AirborneWaterPacket,
} from "./AirborneWaterPacket";

import type {
    AirborneWaterImpact,
} from "./AirborneWaterPacket";

import type {
    WaterField,
} from "./WaterField";

import type {
    WindManager,
} from "./WindManager";

import type {
    LocalWindSystem,
} from "./LocalWindSystem";

import type {
    AirborneWaterCollisionField,
} from "./AirborneWaterCollisionField";

import type {
    AirborneWaterCollisionHit,
} from "./AirborneWaterObstacleShape";

/**
 * Authoritative transport system for Water that has left a source but has not
 * yet become standing Water.
 *
 * Phase 8B-7 adds authoritative global and local Wind coupling while
 * preserving presentation independence.
 */
export class AirborneWaterSystem {
    private readonly definition:
        AirborneWaterDefinition;

    private readonly activePackets:
        AirborneWaterPacket[] = [];

    /**
     * Presentation-independent impact tuning kept alongside packet runtime
     * state so AirborneWaterPacket remains a pure ballistic transport object.
     */
    private readonly impactMomentumRetentionByPacket =
        new WeakMap<AirborneWaterPacket, number>();

    private simulationAccumulator = 0;
    private lastSubstepCount = 0;

    private totalCreatedPacketCount = 0;
    private totalImpactedPacketCount = 0;
    private totalExpiredPacketCount = 0;
    private totalDroppedPacketCount = 0;
    private totalStaticCollisionCount = 0;

    private totalRequestedWaterAmount = 0;
    private totalDepositedWaterAmount = 0;
    private totalRejectedWaterAmount = 0;

    public constructor(
        private readonly waterField: WaterField,
        definition:
            AirborneWaterDefinition =
            DEFAULT_AIRBORNE_WATER_DEFINITION,
        private readonly windManager:
            WindManager | null =
            null,
        private readonly localWindSystem:
            LocalWindSystem | null =
            null,
        private readonly staticCollisionField:
            AirborneWaterCollisionField | null =
            null,
    ) {
        validateAirborneWaterDefinition(
            definition,
        );

        this.definition = definition;
    }

    /**
     * Converts immutable source handoff records into runtime ballistic packets.
     * Multiple requests may share one sourceId/sequence, which is required by
     * four-nozzle Sprinkler pulses. Every request remains an independent packet.
     */
    public consumeEmissionRequests(
        requests:
            readonly WaterEmissionRequest[],
    ): void {
        for (
            const request
            of requests
        ) {
            this.totalRequestedWaterAmount +=
                Math.max(
                    0,
                    request.waterAmount,
                );

            if (
                !this.isValidRequest(
                    request,
                ) ||
                request.waterAmount <
                this.definition.minimumWaterAmount
            ) {
                this.totalRejectedWaterAmount +=
                    Math.max(
                        0,
                        request.waterAmount,
                    );

                continue;
            }

            if (
                this.activePackets.length >=
                this.definition.maximumPacketCount
            ) {
                this.totalDroppedPacketCount +=
                    1;

                this.totalRejectedWaterAmount +=
                    request.waterAmount;

                continue;
            }

            const horizontalSpeed =
                Math.cos(
                    request.launchElevationRadians,
                ) *
                request.launchSpeed;

            const velocityX =
                Math.cos(
                    request.directionRadians,
                ) *
                horizontalSpeed;

            const velocityY =
                Math.sin(
                    request.directionRadians,
                ) *
                horizontalSpeed;

            const verticalVelocity =
                Math.sin(
                    request.launchElevationRadians,
                ) *
                request.launchSpeed;

            const packet =
                new AirborneWaterPacket(
                    request.sourceId,
                    request.sourceType,
                    request.sequence,
                    request.positionX,
                    request.positionY,
                    velocityX,
                    velocityY,
                    verticalVelocity,
                    request.waterAmount,
                    request.windResponse,
                );

            const impactMomentumRetention =
                request.impactMomentumRetention ??
                getDefaultImpactMomentumRetention(
                    request.sourceType,
                );

            this.impactMomentumRetentionByPacket.set(
                packet,
                impactMomentumRetention,
            );

            this.activePackets.push(
                packet,
            );

            this.totalCreatedPacketCount +=
                1;
        }
    }

    /**
     * Advances packet transport using a fixed timestep and capped hitch catchup.
     */
    public update(
        deltaTime: number,
    ): void {
        this.lastSubstepCount = 0;

        if (
            this.activePackets.length === 0 ||
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return;
        }

        const admittedDelta =
            Math.min(
                deltaTime,
                this.definition.maximumFrameDeltaSeconds,
            );

        this.simulationAccumulator +=
            admittedDelta;

        const fixedStep =
            this.definition.simulationStepSeconds;

        while (
            this.simulationAccumulator + 1e-12 >=
            fixedStep &&
            this.lastSubstepCount <
            this.definition.maximumSubstepsPerFrame
        ) {
            this.stepPackets(
                fixedStep,
            );

            this.simulationAccumulator -=
                fixedStep;

            this.lastSubstepCount +=
                1;

            if (
                this.activePackets.length === 0
            ) {
                this.simulationAccumulator = 0;
                break;
            }
        }

        if (
            this.lastSubstepCount >=
            this.definition.maximumSubstepsPerFrame &&
            this.simulationAccumulator >=
            fixedStep
        ) {
            this.simulationAccumulator =
                this.simulationAccumulator %
                fixedStep;
        }
    }

    private stepPackets(
        deltaTime: number,
    ): void {
        for (
            let index =
                this.activePackets.length - 1;
            index >= 0;
            index -= 1
        ) {
            const packet =
                this.activePackets[
                index
                ];

            /*
             * Global environmental Wind is course-wide. Local Wind is sampled
             * at the packet's current ground-plane position every fixed
             * substep, so a packet bends only while it is inside a Fan stream.
             *
             * We deliberately use WindManager.getAcceleration(), not the
             * Ball-speed-scaled APIs. Airborne Water has its own source-authored
             * windResponse and must not inherit Ball rest/reversal behaviour.
             */
            const globalWind =
                this.windManager
                    ?.getAcceleration() ??
                { x: 0, y: 0 };

            const localWind =
                this.localWindSystem
                    ?.getAccelerationAt(
                        packet.getPositionX(),
                        packet.getPositionY(),
                    ) ??
                { x: 0, y: 0 };

            const combinedWindAccelerationX =
                globalWind.x +
                localWind.x;

            const combinedWindAccelerationY =
                globalWind.y +
                localWind.y;

            const previousPositionX =
                packet.getPositionX();

            const previousPositionY =
                packet.getPositionY();

            const impact =
                packet.step(
                    deltaTime,
                    this.definition.gravity,
                    combinedWindAccelerationX,
                    combinedWindAccelerationY,
                );

            const proposedPositionX =
                impact
                    ? impact.positionX
                    : packet.getPositionX();

            const proposedPositionY =
                impact
                    ? impact.positionY
                    : packet.getPositionY();

            /*
             * Phase 8D-5 performs a continuous ground-plane sweep from the
             * packet's previous position to its proposed position. This
             * prevents fast Hose/Sprinkler packets from tunnelling through
             * thin static geometry between fixed simulation steps.
             *
             * Static obstacle deposition is intentionally deferred to 8D-6.
             * For 8D-5 a static hit terminates the airborne packet and records
             * its Water as rejected rather than allowing it through the solid.
             */
            const staticHit =
                this.staticCollisionField
                    ?.sweep(
                        previousPositionX,
                        previousPositionY,
                        proposedPositionX,
                        proposedPositionY,
                        packet.getSourceId(),
                    ) ??
                null;

            if (
                staticHit
            ) {
                this.depositStaticImpact(
                    packet,
                    staticHit,
                );

                this.activePackets.splice(
                    index,
                    1,
                );

                this.totalStaticCollisionCount +=
                    1;

                continue;
            }

            if (
                impact
            ) {
                this.depositImpact(
                    packet,
                    impact,
                );

                this.activePackets.splice(
                    index,
                    1,
                );

                this.totalImpactedPacketCount +=
                    1;

                continue;
            }

            if (
                packet.getAge() >=
                this.definition.maximumPacketAgeSeconds
            ) {
                this.activePackets.splice(
                    index,
                    1,
                );

                this.totalExpiredPacketCount +=
                    1;

                this.totalRejectedWaterAmount +=
                    packet.getWaterAmount();
            }
        }
    }

    /**
     * Converts an airborne static-obstacle hit into standing Water.
     *
     * The deposit is moved one Water cell away from the collision surface so
     * it begins on the approach side of the solid. Forward momentum into the
     * surface is removed while tangential momentum is retained according to
     * the source's normal impact-momentum retention.
     */
    private depositStaticImpact(
        packet: AirborneWaterPacket,
        hit: AirborneWaterCollisionHit,
    ): void {
        if (!this.staticCollisionField) {
            return;
        }

        const clearance =
            this.waterField
                .getDefinition()
                .cellSize;

        const depositPoint =
            this.staticCollisionField
                .getExteriorPoint(
                    hit,
                    clearance,
                );

        const velocityX =
            packet.getVelocityX();

        const velocityY =
            packet.getVelocityY();

        const velocityIntoNormal =
            velocityX * hit.normalX +
            velocityY * hit.normalY;

        /*
         * A negative dot product means velocity points into the obstacle
         * because the hit normal points outward from its surface.
         */
        const inwardMagnitude =
            Math.min(
                0,
                velocityIntoNormal,
            );

        const tangentVelocityX =
            velocityX -
            hit.normalX *
            inwardMagnitude;

        const tangentVelocityY =
            velocityY -
            hit.normalY *
            inwardMagnitude;

        const impactMomentumRetention =
            this.impactMomentumRetentionByPacket.get(
                packet,
            ) ??
            getDefaultImpactMomentumRetention(
                packet.getSourceType(),
            );

        const waterAmount =
            packet.getWaterAmount();

        const acceptedAmount =
            this.waterField
                .injectWaterWithMomentum(
                    depositPoint.x,
                    depositPoint.y,
                    waterAmount,
                    tangentVelocityX *
                    impactMomentumRetention,
                    tangentVelocityY *
                    impactMomentumRetention,
                );

        this.totalDepositedWaterAmount +=
            acceptedAmount;

        this.totalRejectedWaterAmount +=
            waterAmount -
            acceptedAmount;
    }

    private depositImpact(
        packet: AirborneWaterPacket,
        impact: AirborneWaterImpact,
    ): void {
        const impactMomentumRetention =
            this.impactMomentumRetentionByPacket.get(
                packet,
            ) ??
            getDefaultImpactMomentumRetention(
                packet.getSourceType(),
            );

        const acceptedAmount =
            this.waterField
                .injectWaterWithMomentum(
                    impact.positionX,
                    impact.positionY,
                    impact.waterAmount,
                    impact.velocityX *
                    impactMomentumRetention,
                    impact.velocityY *
                    impactMomentumRetention,
                );

        this.totalDepositedWaterAmount +=
            acceptedAmount;

        this.totalRejectedWaterAmount +=
            impact.waterAmount -
            acceptedAmount;
    }

    private isValidRequest(
        request: WaterEmissionRequest,
    ): boolean {
        const numericValues = [
            request.positionX,
            request.positionY,
            request.directionRadians,
            request.launchSpeed,
            request.launchElevationRadians,
            request.waterAmount,
            request.windResponse,
            request.impactMomentumRetention ??
            getDefaultImpactMomentumRetention(
                request.sourceType,
            ),
        ];

        const impactMomentumRetention =
            request.impactMomentumRetention ??
            getDefaultImpactMomentumRetention(
                request.sourceType,
            );

        return (
            request.sourceId.trim().length > 0 &&
            numericValues.every(
                (value): boolean =>
                    Number.isFinite(value),
            ) &&
            request.launchSpeed >= 0 &&
            request.launchElevationRadians >= 0 &&
            request.launchElevationRadians <=
            Math.PI / 2 &&
            request.waterAmount > 0 &&
            request.windResponse >= 0 &&
            impactMomentumRetention >= 0 &&
            impactMomentumRetention <= 1
        );
    }

    public forEachActivePacket(
        callback:
            (
                packet:
                    Readonly<AirborneWaterPacket>,
            ) => void,
    ): void {
        for (
            const packet
            of this.activePackets
        ) {
            callback(
                packet,
            );
        }
    }

    public getActivePacketCount(): number {
        return this.activePackets.length;
    }

    public getTotalCreatedPacketCount(): number {
        return this.totalCreatedPacketCount;
    }

    public getTotalImpactedPacketCount(): number {
        return this.totalImpactedPacketCount;
    }

    public getTotalExpiredPacketCount(): number {
        return this.totalExpiredPacketCount;
    }

    public getTotalDroppedPacketCount(): number {
        return this.totalDroppedPacketCount;
    }

    public getTotalStaticCollisionCount(): number {
        return this.totalStaticCollisionCount;
    }

    public getTotalRequestedWaterAmount(): number {
        return this.totalRequestedWaterAmount;
    }

    public getTotalDepositedWaterAmount(): number {
        return this.totalDepositedWaterAmount;
    }

    public getTotalRejectedWaterAmount(): number {
        return this.totalRejectedWaterAmount;
    }

    public getLastSubstepCount(): number {
        return this.lastSubstepCount;
    }

    public getSimulationAccumulator(): number {
        return this.simulationAccumulator;
    }

    public reset(): void {
        this.activePackets.length = 0;
        this.simulationAccumulator = 0;
        this.lastSubstepCount = 0;

        this.totalCreatedPacketCount = 0;
        this.totalImpactedPacketCount = 0;
        this.totalExpiredPacketCount = 0;
        this.totalDroppedPacketCount = 0;
        this.totalStaticCollisionCount = 0;

        this.totalRequestedWaterAmount = 0;
        this.totalDepositedWaterAmount = 0;
        this.totalRejectedWaterAmount = 0;
    }
}

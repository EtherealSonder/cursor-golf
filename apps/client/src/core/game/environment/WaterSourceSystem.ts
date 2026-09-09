import type {
    WaterSourceDefinition,
    WaterSourceType,
} from "../config/WaterSourceDefinition";

import {
    getDefaultImpactMomentumRetention,
} from "../config/WaterSourceDefinition";

import {
    WaterSource,
} from "./WaterSource";

/**
 * Handoff record produced by WaterSourceSystem.
 * Phase 8B-2 will consume these requests in AirborneWaterSystem.
 */
export interface WaterEmissionRequest {
    readonly sourceId: string;
    readonly sourceType: WaterSourceType;
    readonly sequence: number;

    readonly positionX: number;
    readonly positionY: number;
    readonly directionRadians: number;

    readonly launchSpeed: number;
    readonly launchElevationRadians: number;
    readonly waterAmount: number;
    readonly windResponse: number;

    /**
     * Fraction of horizontal airborne velocity retained when this packet
     * deposits into WaterField. Omitted requests use their source-type default.
     */
    readonly impactMomentumRetention?: number;
}

/**
 * Authoritative registry and timing owner for Water-producing sources.
 *
 * The system deliberately stops at WaterEmissionRequest. AirborneWaterSystem
 * consumes these immutable handoff records in Phase 8B-2.
 */
export class WaterSourceSystem {
    private readonly sources =
        new Map<string, WaterSource>();

    private readonly pendingRequests:
        WaterEmissionRequest[] = [];

    public addSource(
        definition: WaterSourceDefinition,
    ): WaterSource {
        if (
            this.sources.has(
                definition.id,
            )
        ) {
            throw new Error(
                `WaterSourceSystem already contains source '${definition.id}'.`,
            );
        }

        const source =
            new WaterSource(
                definition,
            );

        this.sources.set(
            source.getId(),
            source,
        );

        return source;
    }

    public removeSource(
        id: string,
    ): boolean {
        return this.sources.delete(id);
    }

    public getSource(
        id: string,
    ): WaterSource | null {
        return this.sources.get(id) ?? null;
    }

    public getSources(): readonly WaterSource[] {
        return Array.from(
            this.sources.values(),
        );
    }

    public getSourceCount(): number {
        return this.sources.size;
    }

    public getPendingRequestCount(): number {
        return this.pendingRequests.length;
    }

    /**
     * Queues one already-normalized source-specific emission.
     *
     * Multi-nozzle mechanisms such as Sprinkler own their geometry and use
     * this handoff instead of teaching WaterSourceSystem about nozzle layout.
     */
    public queueEmissionRequest(
        request: WaterEmissionRequest,
    ): void {
        const numericValues = [
            request.sequence,
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

        if (
            request.sourceId.trim().length === 0 ||
            numericValues.some((value): boolean => !Number.isFinite(value)) ||
            request.sequence < 0 ||
            request.launchSpeed < 0 ||
            request.launchElevationRadians < 0 ||
            request.launchElevationRadians > Math.PI / 2 ||
            request.waterAmount <= 0 ||
            request.windResponse < 0 ||
            impactMomentumRetention < 0 ||
            impactMomentumRetention > 1
        ) {
            throw new Error(
                `WaterSourceSystem received an invalid explicit emission from '${request.sourceId}'.`,
            );
        }

        this.pendingRequests.push({
            ...request,
            impactMomentumRetention,
        });
    }

    public update(
        deltaTime: number,
    ): void {
        if (
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return;
        }

        for (
            const source
            of this.getSources()
        ) {
            const sequenceBefore =
                source.getEmissionSequence();

            const emissionCount =
                source.update(
                    deltaTime,
                );

            for (
                let emissionIndex = 0;
                emissionIndex < emissionCount;
                emissionIndex += 1
            ) {
                this.queueEmissionRequest({
                    sourceId:
                        source.getId(),

                    sourceType:
                        source.getType(),

                    sequence:
                        sequenceBefore +
                        emissionIndex +
                        1,

                    positionX:
                        source.getPositionX(),

                    positionY:
                        source.getPositionY(),

                    directionRadians:
                        source.getDirectionRadians(),

                    launchSpeed:
                        source.getLaunchSpeed(),

                    launchElevationRadians:
                        source.getLaunchElevationRadians(),

                    waterAmount:
                        source.getWaterPerEmission(),

                    windResponse:
                        source.getWindResponse(),

                    impactMomentumRetention:
                        getDefaultImpactMomentumRetention(
                            source.getType(),
                        ),
                });
            }
        }
    }

    /**
     * Transfers ownership of all currently pending requests to the caller.
     */
    public drainEmissionRequests(): WaterEmissionRequest[] {
        if (
            this.pendingRequests.length === 0
        ) {
            return [];
        }

        return this.pendingRequests.splice(
            0,
            this.pendingRequests.length,
        );
    }

    public clearPendingRequests(): void {
        this.pendingRequests.length = 0;
    }

    /** Resets runtime state while preserving registered source definitions. */
    public reset(): void {
        this.pendingRequests.length = 0;

        for (
            const source
            of this.getSources()
        ) {
            source.reset();
        }
    }

    /** Full lifecycle cleanup used by World.destroy(). */
    public clearSources(): void {
        this.pendingRequests.length = 0;
        this.sources.clear();
    }
}

import type {
    SprinklerWaterVfxDefinition,
} from "../config/WaterVfxDefinition";

import type {
    Sprinkler,
} from "../entities/mechanisms/Sprinkler";

import type {
    AirborneWaterSystem,
} from "../environment/AirborneWaterSystem";

import type {
    WaterVfxSystem,
} from "./WaterVfxSystem";

import type {
    SprinklerDropletRendererPerformanceDetails,
} from "./SprinklerDropletRenderer";

import type { PresentationVisibilityQuery } from "../../rendering/PresentationVisibilityQuery";

export interface SprinklerWaterVfxPerformanceDetails {
    readonly activeSources: number;
    readonly inspectedPackets: number;
    readonly preparedPackets: number;
    readonly renderedElements: number;
    readonly sourceBookkeepingMilliseconds: number;
    readonly packetTraversalMilliseconds: number;
    readonly packetPreparationMilliseconds: number;
    readonly rendererSyncMilliseconds: number;
    readonly legacyHideMilliseconds: number;
    readonly dropletRenderer: SprinklerDropletRendererPerformanceDetails;
}

/**
 * 8I-5 production segmented Sprinkler Water presentation.
 *
 * The Sprinkler deliberately does NOT reconstruct a continuous stream.
 * Each visible mark follows one current authoritative airborne packet.
 * Previously emitted packets therefore keep moving naturally when the
 * Sprinkler is hit or rotated, while new packets leave from the new pose.
 */
interface PreparedSprinklerDroplet {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly velocityX: number;
    readonly velocityY: number;
    readonly ageSeconds: number;
    readonly flightProgress: number;
    readonly seed: number;
}

export class SprinklerWaterVfx {
    private readonly sourceHashCache = new Map<string, number>();
    // O6: frame-local source lookup storage is retained and cleared instead of reallocated.
    private readonly enabledSourceHashesScratch = new Map<string, number>();
    private readonly preparedDroplets: PreparedSprinklerDroplet[] = [];
    private lastActiveSources = 0;
    private lastInspectedPackets = 0;
    private lastPreparedPackets = 0;
    private lastRenderedDroplets = 0;
    private lastSourceBookkeepingMilliseconds = 0;
    private lastPacketTraversalMilliseconds = 0;
    private lastPacketPreparationMilliseconds = 0;
    private lastRendererSyncMilliseconds = 0;
    private lastLegacyHideMilliseconds = 0;
    public constructor(
        private readonly sprinklers: readonly Sprinkler[],
        private readonly airborneWaterSystem: AirborneWaterSystem,
        private readonly waterVfxSystem: WaterVfxSystem,
        private readonly definition: SprinklerWaterVfxDefinition,
        private readonly presentationVisibilityQuery: PresentationVisibilityQuery | null = null,
    ) { }

    public update(
        dt: number,
    ): void {
        const renderer =
            this.waterVfxSystem
                .getSprinklerDropletRenderer();

        if (
            !this.definition.enabled ||
            !Number.isFinite(dt) ||
            dt <= 0
        ) {
            renderer.renderFrame([]);
            return;
        }

        const enabledSourceHashes = this.enabledSourceHashesScratch;
        enabledSourceHashes.clear();
        this.lastInspectedPackets = 0;
        this.lastPreparedPackets = 0;
        this.lastRenderedDroplets = 0;
        this.preparedDroplets.length = 0;

        let startedAt = performance.now();
        for (let index = 0; index < this.sprinklers.length; index += 1) {
            const sprinkler = this.sprinklers[index];
            if (!sprinkler.isEnabled()) {
                continue;
            }
            if (
                this.presentationVisibilityQuery &&
                !this.presentationVisibilityQuery.isPointNearViewport(
                    sprinkler.getX(),
                    sprinkler.getY(),
                    160,
                )
            ) {
                continue;
            }

            const sourceId = sprinkler.getSourceId();
            enabledSourceHashes.set(
                sourceId,
                this.getSourceHash(sourceId),
            );
        }

        this.lastActiveSources = enabledSourceHashes.size;
        this.lastSourceBookkeepingMilliseconds = performance.now() - startedAt;

        const stride =
            Math.max(
                1,
                Math.floor(
                    this.definition.visualPacketStride,
                ),
            );

        const terminalAge =
            Math.max(
                0.001,
                this.definition.terminalDropletStartAgeSeconds,
            );

        startedAt = performance.now();
        this.airborneWaterSystem
            .forEachActivePacketWithEmissionOrdinal(
                (
                    packet,
                    emissionOrdinal,
                ): void => {
                    this.lastInspectedPackets += 1;

                    const sourceId = packet.getSourceId();
                    const sourceHash = enabledSourceHashes.get(sourceId);
                    if (sourceHash === undefined) {
                        return;
                    }
                    if (
                        this.presentationVisibilityQuery &&
                        !this.presentationVisibilityQuery.isPointNearViewport(
                            packet.getPositionX(),
                            packet.getPositionY(),
                            96,
                        )
                    ) {
                        return;
                    }

                    const sequence = packet.getSequence();
                    if (
                        Math.abs(sequence) %
                        stride !==
                        0
                    ) {
                        return;
                    }

                    const packetSeed =
                        this.finishPacketSeed(
                            sourceHash,
                            sequence,
                            emissionOrdinal,
                        );

                    const velocityX = packet.getVelocityX();
                    const velocityY = packet.getVelocityY();
                    const speedSquared =
                        velocityX * velocityX +
                        velocityY * velocityY;

                    let directionX = 0;
                    let directionY = 0;
                    if (speedSquared > 0.00000001) {
                        const inverseSpeed =
                            1 / Math.sqrt(speedSquared);
                        directionX = velocityX * inverseSpeed;
                        directionY = velocityY * inverseSpeed;
                    }

                    const spacingOffset =
                        this.getSpacingOffset(packetSeed);
                    const ageSeconds = packet.getAge();

                    this.preparedDroplets.push({
                        id:
                            `sprinkler:${sourceId}:` +
                            `${sequence}:${emissionOrdinal}`,
                        x:
                            packet.getPositionX() +
                            directionX * spacingOffset,
                        y:
                            packet.getPositionY() +
                            directionY * spacingOffset,
                        velocityX,
                        velocityY,
                        ageSeconds,
                        flightProgress:
                            Math.max(
                                0,
                                Math.min(
                                    1,
                                    ageSeconds / terminalAge,
                                ),
                            ),
                        seed: packetSeed,
                    });
                },
            );

        this.lastPacketTraversalMilliseconds = performance.now() - startedAt;
        this.lastPreparedPackets = this.preparedDroplets.length;
        this.lastPacketPreparationMilliseconds = this.lastPacketTraversalMilliseconds;

        startedAt = performance.now();
        renderer.renderFrame(this.preparedDroplets);
        this.lastRendererSyncMilliseconds = performance.now() - startedAt;
        this.lastRenderedDroplets = this.preparedDroplets.length;

        /*
         * The old continuous Sprinkler ribbon is explicitly hidden. The
         * WaterStreamRenderer remains alive for later Hose/Hydrant VFX.
         */
        startedAt = performance.now();
        for (let index = 0; index < this.sprinklers.length; index += 1) {
            const sprinkler = this.sprinklers[index];
            this.waterVfxSystem
                .getStreamRenderer()
                .hideStreamsWithPrefix(
                    `sprinkler:${sprinkler.getSourceId()}:`,
                );
        }
        this.lastLegacyHideMilliseconds = performance.now() - startedAt;
    }

    public getPerformanceDetails(): SprinklerWaterVfxPerformanceDetails {
        return {
            activeSources: this.lastActiveSources,
            inspectedPackets: this.lastInspectedPackets,
            preparedPackets: this.lastPreparedPackets,
            renderedElements: this.lastRenderedDroplets,
            sourceBookkeepingMilliseconds: this.lastSourceBookkeepingMilliseconds,
            packetTraversalMilliseconds: this.lastPacketTraversalMilliseconds,
            packetPreparationMilliseconds: this.lastPacketPreparationMilliseconds,
            rendererSyncMilliseconds: this.lastRendererSyncMilliseconds,
            legacyHideMilliseconds: this.lastLegacyHideMilliseconds,
            dropletRenderer: this.waterVfxSystem
                .getSprinklerDropletRenderer()
                .getPerformanceDetails(),
        };
    }

    public reset(): void {
        this.waterVfxSystem
            .getSprinklerDropletRenderer()
            .reset();

        this.hideLegacyStreams();
    }

    public destroy(): void {
        this.reset();
    }

    private hideLegacyStreams(): void {
        for (const sprinkler of this.sprinklers) {
            this.waterVfxSystem
                .getStreamRenderer()
                .hideStreamsWithPrefix(
                    `sprinkler:${sprinkler.getSourceId()}:`,
                );
        }
    }

    private getSpacingOffset(
        seed: number,
    ): number {
        /*
         * Presentation-only longitudinal spacing variation. No lateral
         * displacement, angular jitter, packet timing, collision, or Water
         * deposition is changed.
         */
        const raw =
            Math.sin(
                seed * 12.9898 +
                78.233,
            ) *
            43758.5453;
        const fractional =
            raw -
            Math.floor(raw);
        const signed =
            fractional * 2 - 1;

        // 8I-7A uses 520 px/s and 0.08 s between pulses: ~41.6 px.
        const nominalSpacing = 41.6;

        return signed *
            nominalSpacing *
            this.definition.packetSpacingVariation;
    }

    private getSourceHash(
        sourceId: string,
    ): number {
        const cached = this.sourceHashCache.get(sourceId);
        if (cached !== undefined) {
            return cached;
        }

        let hash = 2166136261;
        for (let index = 0; index < sourceId.length; index += 1) {
            hash ^= sourceId.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }

        const normalized = hash >>> 0;
        this.sourceHashCache.set(sourceId, normalized);
        return normalized;
    }

    private finishPacketSeed(
        sourceHash: number,
        sequence: number,
        emissionOrdinal: number,
    ): number {
        return (
            sourceHash ^
            (sequence + emissionOrdinal * 1013)
        ) >>> 0;
    }

}

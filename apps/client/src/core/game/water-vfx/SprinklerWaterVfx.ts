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

/**
 * 8I-5 production segmented Sprinkler Water presentation.
 *
 * The Sprinkler deliberately does NOT reconstruct a continuous stream.
 * Each visible mark follows one current authoritative airborne packet.
 * Previously emitted packets therefore keep moving naturally when the
 * Sprinkler is hit or rotated, while new packets leave from the new pose.
 */
export class SprinklerWaterVfx {
    public constructor(
        private readonly sprinklers: readonly Sprinkler[],
        private readonly airborneWaterSystem: AirborneWaterSystem,
        private readonly waterVfxSystem: WaterVfxSystem,
        private readonly definition: SprinklerWaterVfxDefinition,
    ) { }

    public update(
        dt: number,
    ): void {
        const renderer =
            this.waterVfxSystem
                .getSprinklerDropletRenderer();

        renderer.beginFrame();

        if (
            !this.definition.enabled ||
            !Number.isFinite(dt) ||
            dt <= 0
        ) {
            renderer.endFrame();
            return;
        }

        const enabledSourceIds =
            new Set<string>();

        for (const sprinkler of this.sprinklers) {
            if (sprinkler.isEnabled()) {
                enabledSourceIds.add(
                    sprinkler.getSourceId(),
                );
            }
        }

        const stride =
            Math.max(
                1,
                Math.floor(
                    this.definition.visualPacketStride,
                ),
            );

        this.airborneWaterSystem
            .forEachActivePacketWithEmissionOrdinal(
                (
                    packet,
                    emissionOrdinal,
                ): void => {
                    if (
                        !enabledSourceIds.has(
                            packet.getSourceId(),
                        )
                    ) {
                        return;
                    }

                    const sequence =
                        packet.getSequence();

                    if (
                        Math.abs(sequence) %
                        stride !==
                        0
                    ) {
                        return;
                    }

                    const sourceId =
                        packet.getSourceId();

                    const packetSeed =
                        this.hashSeed(
                            sourceId,
                            sequence,
                            emissionOrdinal,
                        );

                    const velocityX =
                        packet.getVelocityX();
                    const velocityY =
                        packet.getVelocityY();
                    const speed =
                        Math.hypot(
                            velocityX,
                            velocityY,
                        );

                    const directionX =
                        speed > 0.0001
                            ? velocityX / speed
                            : 0;
                    const directionY =
                        speed > 0.0001
                            ? velocityY / speed
                            : 0;

                    const spacingOffset =
                        this.getSpacingOffset(
                            packetSeed,
                        );

                    renderer.setDroplet({
                        id:
                            `sprinkler:${sourceId}:` +
                            `${sequence}:${emissionOrdinal}`,
                        x:
                            packet.getPositionX() +
                            directionX *
                            spacingOffset,
                        y:
                            packet.getPositionY() +
                            directionY *
                            spacingOffset,
                        velocityX,
                        velocityY,
                        ageSeconds:
                            packet.getAge(),
                        flightProgress:
                            this.getFlightProgress(
                                packet.getAge(),
                            ),
                        seed:
                            packetSeed,
                    });
                },
            );

        renderer.endFrame();

        /*
         * The old continuous Sprinkler ribbon is explicitly hidden. The
         * WaterStreamRenderer remains alive for later Hose/Hydrant VFX.
         */
        for (const sprinkler of this.sprinklers) {
            this.waterVfxSystem
                .getStreamRenderer()
                .hideStreamsWithPrefix(
                    `sprinkler:${sprinkler.getSourceId()}:`,
                );
        }
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

    private getFlightProgress(
        ageSeconds: number,
    ): number {
        const terminalAge =
            Math.max(
                0.001,
                this.definition
                    .terminalDropletStartAgeSeconds,
            );

        return Math.max(
            0,
            Math.min(
                1,
                ageSeconds / terminalAge,
            ),
        );
    }

    private hashSeed(
        sourceId: string,
        sequence: number,
        emissionOrdinal: number,
    ): number {
        let hash = 2166136261;

        for (
            let index = 0;
            index < sourceId.length;
            index += 1
        ) {
            hash ^=
                sourceId.charCodeAt(index);

            hash =
                Math.imul(
                    hash,
                    16777619,
                );
        }

        hash ^=
            sequence +
            emissionOrdinal * 1013;

        return hash >>> 0;
    }
}

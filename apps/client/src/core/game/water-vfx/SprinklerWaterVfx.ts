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

                    renderer.setDroplet({
                        id:
                            `sprinkler:${sourceId}:` +
                            `${sequence}:${emissionOrdinal}`,
                        x:
                            packet.getPositionX(),
                        y:
                            packet.getPositionY(),
                        velocityX:
                            packet.getVelocityX(),
                        velocityY:
                            packet.getVelocityY(),
                        ageSeconds:
                            packet.getAge(),
                        seed:
                            this.hashSeed(
                                sourceId,
                                sequence,
                                emissionOrdinal,
                            ),
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

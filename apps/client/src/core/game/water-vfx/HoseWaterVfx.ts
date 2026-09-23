import type {
    HoseWaterVfxDefinition,
} from "../config/WaterVfxDefinition";

import { HydrantHose } from "../entities/mechanisms/HydrantHose";

import type {
    AirborneWaterSystem,
} from "../environment/AirborneWaterSystem";

import type {
    WaterStreamPoint,
} from "./WaterStreamRenderer";

import type {
    WaterVfxSystem,
} from "./WaterVfxSystem";

export interface HoseWaterVfxSource {
    getWaterSourceId(): string;
    getNozzlePosition(): { readonly x: number; readonly y: number };
    isWaterEnabled(): boolean;
}

interface HosePacketSample extends WaterStreamPoint {
    readonly ageSeconds: number;
}

/**
 * 8I-6A production Hose body presentation.
 *
 * The authoritative Hose Water remains AirborneWaterSystem packets. This
 * class reconstructs only the CURRENT source-anchored visual centerline.
 * It stores no trajectory history and never feeds data back into simulation.
 */
export class HoseWaterVfx {
    private readonly streamId:
        string;

    public constructor(
        private readonly hose: HydrantHose | HoseWaterVfxSource,
        private readonly airborneWaterSystem: AirborneWaterSystem,
        private readonly waterVfxSystem: WaterVfxSystem,
        private readonly definition: HoseWaterVfxDefinition,
    ) {
        this.streamId =
            `hose:${this.hose.getWaterSourceId()}:body`;
    }

    public update(
        deltaTime: number,
    ): void {
        const renderer =
            this.waterVfxSystem
                .getStreamRenderer();

        if (
            Number.isFinite(deltaTime) &&
            deltaTime > 0
        ) {
            this.waterVfxSystem
                .updateHoseGroundImpact(
                    deltaTime,
                    this.hose as HydrantHose,
                    this.airborneWaterSystem,
                );
        }

        if (
            !this.definition.enabled ||
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            renderer.hideStream(
                this.streamId,
            );
            return;
        }

        const sourceId =
            this.hose.getWaterSourceId();

        const packetSamples:
            HosePacketSample[] = [];

        this.airborneWaterSystem
            .forEachActivePacket(
                (packet): void => {
                    if (
                        packet.getSourceId() !==
                        sourceId
                    ) {
                        return;
                    }

                    packetSamples.push({
                        x:
                            packet.getPositionX(),
                        y:
                            packet.getPositionY(),
                        ageSeconds:
                            packet.getAge(),
                    });
                },
            );

        if (
            packetSamples.length ===
            0
        ) {
            renderer.hideStream(
                this.streamId,
            );
            return;
        }

        /*
         * Newest packets are closest to the current nozzle. Sorting by age
         * therefore reconstructs the live jet from source outward without
         * nearest-neighbour linking or persistent path history.
         */
        packetSamples.sort(
            (
                a,
                b,
            ): number =>
                a.ageSeconds -
                b.ageSeconds,
        );

        const points:
            WaterStreamPoint[] = [];

        /*
         * While pressure is active, the visible body is anchored to the
         * physical nozzle. After shutoff, no new Water is invented at the
         * source: the remaining authoritative packets continue downstream
         * and the tail naturally travels away from the nozzle.
         */
        if (
            this.hose.isWaterEnabled()
        ) {
            /*
             * Use the exact authoritative source origin. RobotWaterAttackController
             * places this just inside the nozzle lip, so the ribbon overlaps the
             * artwork instead of beginning in open air. The same point is consumed
             * by Robot Hose gameplay force geometry.
             */
            const nozzle = this.hose.getNozzlePosition();
            points.push({ x: nozzle.x, y: nozzle.y });
        }

        for (
            let index = 0;
            index < packetSamples.length;
            index += 1
        ) {
            const sample =
                packetSamples[index];

            const previous =
                points.length > 0
                    ? points[points.length - 1]
                    : undefined;

            /*
             * Ignore effectively duplicate points only when a previous
             * centerline point exists. During Hose shutoff/pressure release,
             * authoritative airborne packets can outlive the nozzle anchor,
             * so the first surviving packet must be allowed to seed the
             * presentation centerline.
             */
            if (
                previous &&
                Math.hypot(
                    sample.x -
                    previous.x,
                    sample.y -
                    previous.y,
                ) <
                0.25
            ) {
                continue;
            }

            points.push({
                x:
                    sample.x,
                y:
                    sample.y,
            });
        }

        /*
         * An authoritative packet is removed immediately when it impacts.
         * Retain the youngest read-only presentation impact as the current
         * terminal point so the visible jet does not jump backward for the
         * frame(s) between successive impacts.
         */
        let newestImpact:
            {
                readonly x: number;
                readonly y: number;
                readonly ageSeconds: number;
            } |
            null =
            null;

        this.airborneWaterSystem
            .forEachRecentPresentationImpact(
                sourceId,
                (impact): void => {
                    if (
                        newestImpact === null ||
                        impact.ageSeconds <
                        newestImpact.ageSeconds
                    ) {
                        newestImpact = {
                            x:
                                impact.positionX,
                            y:
                                impact.positionY,
                            ageSeconds:
                                impact.ageSeconds,
                        };
                    }
                },
            );

        if (
            newestImpact !==
            null &&
            points.length >
            0
        ) {
            const previous =
                points[
                points.length - 1
                ];

            const distance =
                Math.hypot(
                    newestImpact.x -
                    previous.x,
                    newestImpact.y -
                    previous.y,
                );

            /*
             * A recent impact belongs at the downstream end only. Ignore
             * effectively duplicate points and implausibly remote stale
             * endpoints. The generous upper bound is presentation safety,
             * not a physics constraint.
             */
            if (
                distance >=
                0.25 &&
                distance <=
                96
            ) {
                points.push({
                    x:
                        newestImpact.x,
                    y:
                        newestImpact.y,
                });
            }
        }

        if (
            points.length <
            2
        ) {
            renderer.hideStream(
                this.streamId,
            );
            return;
        }

        renderer.setStreamById(
            this.streamId,
            {
                points,
                startWidth:
                    this.definition.startWidth,
                middleWidth:
                    this.definition.middleWidth,
                endWidth:
                    this.definition.endWidth,
                minimumBodyWidth:
                    this.definition.minimumBodyWidth,
                downstreamDisturbanceMultiplier:
                    this.definition.downstreamDisturbanceMultiplier,
                bodyColor:
                    this.definition.bodyColor,
                bodyAlpha:
                    this.definition.bodyAlpha,

                /*
                 * Hose uses the authored animated flow material rather than
                 * the shared Graphics highlight path.
                 */
                highlightWidthFraction:
                    0,
                highlightAlpha:
                    0,

                useFlowTexture:
                    true,
                flowTextureWorldLength:
                    this.definition.flowTextureWorldLength,
                flowTextureSpeed:
                    Math.max(
                        this.definition.minimumFlowTextureSpeed,
                        Math.min(
                            this.definition.maximumFlowTextureSpeed,
                            this.definition.flowTextureSpeed *
                            this.definition.flowTransportSpeedScale,
                        ),
                    ),
                centerlineSmoothingPasses:
                    this.definition.centerlineSmoothingPasses,
                trajectorySmoothingPasses:
                    this.definition.trajectorySmoothingPasses,
                flowTextureContrast:
                    this.definition.flowTextureContrast,
                flowTextureStrength:
                    this.definition.flowTextureStrength,
                toonMidColor:
                    this.definition.toonMidColor,
                toonMidThreshold:
                    this.definition.toonMidThreshold,
                toonHighlightThreshold:
                    this.definition.toonHighlightThreshold,
                toonMaskBlurPixels:
                    this.definition.toonMaskBlurPixels,
                toonMassCount:
                    this.definition.toonMassCount,
                toonMassLengthFraction:
                    this.definition.toonMassLengthFraction,
                toonMassWidthFraction:
                    this.definition.toonMassWidthFraction,
                toonMassAsymmetry:
                    this.definition.toonMassAsymmetry,
                sourceCapLength:
                    this.definition.sourceCapLength,
                downstreamCapLength:
                    this.definition.downstreamCapLength,

                resampleSpacing:
                    this.definition.resampleSpacing,
                centerWaveAmplitude:
                    this.definition.centerWaveAmplitude,
                centerWaveFrequency:
                    this.definition.centerWaveFrequency,
                centerWaveSpeed:
                    this.definition.centerWaveSpeed,
                edgeWaveAmplitude:
                    this.definition.edgeWaveAmplitude,
                edgeWaveFrequency:
                    this.definition.edgeWaveFrequency,
                edgeWaveSpeed:
                    this.definition.edgeWaveSpeed,
                widthSquishAmplitude:
                    this.definition.widthSquishAmplitude,
                widthSquishFrequency:
                    this.definition.widthSquishFrequency,
                widthSquishSpeed:
                    this.definition.widthSquishSpeed,
                edgeIrregularityAmplitude:
                    this.definition.edgeIrregularityAmplitude,
                edgeIrregularityFrequency:
                    this.definition.edgeIrregularityFrequency,
                edgeIrregularitySpeed:
                    this.definition.edgeIrregularitySpeed,
                maximumMovementSpread:
                    this.definition.maximumMovementSpread,
                movementSpreadRampExponent:
                    this.definition.movementSpreadRampExponent,
                motionDisturbanceBoost:
                    this.definition.motionDisturbanceBoost,
                motionMaximumWidthBonus:
                    this.definition.motionMaximumWidthBonus,
                motionWidthRampExponent:
                    this.definition.motionWidthRampExponent,
                breakupThreshold:
                    this.definition.breakupThreshold,
                breakupMaximumFragments:
                    this.definition.breakupMaximumFragments,
                breakupMinimumLifetimeSeconds:
                    this.definition.breakupMinimumLifetimeSeconds,
                breakupMaximumLifetimeSeconds:
                    this.definition.breakupMaximumLifetimeSeconds,
                breakupMinimumSizeFraction:
                    this.definition.breakupMinimumSizeFraction,
                breakupMaximumSizeFraction:
                    this.definition.breakupMaximumSizeFraction,
                breakupMinimumSeparation:
                    this.definition.breakupMinimumSeparation,
                breakupMaximumSeparation:
                    this.definition.breakupMaximumSeparation,
                breakupTravelSpeed:
                    this.definition.breakupTravelSpeed,
                phaseOffset:
                    this.hashPhase(
                        sourceId,
                    ),
            },
        );
    }

    public reset(): void {
        this.waterVfxSystem
            .getStreamRenderer()
            .hideStream(
                this.streamId,
            );
    }

    public destroy(): void {
        this.reset();
    }

    private hashPhase(
        value: string,
    ): number {
        let hash =
            2166136261;

        for (
            let index = 0;
            index < value.length;
            index += 1
        ) {
            hash ^=
                value.charCodeAt(
                    index,
                );

            hash =
                Math.imul(
                    hash,
                    16777619,
                );
        }

        return (
            (hash >>> 0) /
            0xFFFFFFFF *
            Math.PI *
            2
        );
    }
}

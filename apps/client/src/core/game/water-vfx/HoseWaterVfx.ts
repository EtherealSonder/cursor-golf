import type {
    HoseWaterVfxDefinition,
} from "../config/WaterVfxDefinition";

import type {
    HydrantHose,
} from "../entities/mechanisms/HydrantHose";

import type {
    AirborneWaterSystem,
} from "../environment/AirborneWaterSystem";

import type {
    WaterStreamPoint,
} from "./WaterStreamRenderer";

import type {
    WaterVfxSystem,
} from "./WaterVfxSystem";

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

    private previousNozzleX: number | null = null;
    private previousNozzleY: number | null = null;
    private previousNozzleDirectionRadians: number | null = null;

    /** 8I-6C.3 smoothed presentation-only width response. */
    private motionBroadeningIntensity = 0;

    public constructor(
        private readonly hose: HydrantHose,
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

        const nozzle =
            this.hose.getNozzlePosition();
        const nozzleDirection =
            this.hose.getNozzleDirectionRadians();

        const motionIntensity =
            this.calculateMotionIntensity(
                nozzle.x,
                nozzle.y,
                nozzleDirection,
                deltaTime,
            );

        this.updateMotionBroadening(
            motionIntensity,
            deltaTime,
        );

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

        /*
         * Estimate the live transport velocity from CURRENT authoritative
         * packets. No previous-frame trajectory or velocity history is kept.
         *
         * Adjacent packets were emitted at different times, so their spatial
         * separation divided by age separation gives a useful presentation
         * estimate of Water travelling downstream.
         */
        const transportSpeed =
            this.estimateTransportSpeed(
                packetSamples,
            );

        /*
         * Current-frame-only directional spread estimate. Rapid changes in
         * the authoritative packet chain indicate that the Hose has swept
         * while Water was in flight. This drives presentation width only.
         */
        const movementSpread =
            this.estimateMovementSpread(
                packetSamples,
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
            points.push({
                x:
                    nozzle.x,
                y:
                    nozzle.y,
            });
        }

        /*
         * 8I-6C.1 trajectory memory comes from CURRENT authoritative packets.
         * Each packet keeps travelling along the direction it had when emitted.
         * During a Hose sweep, age therefore becomes a natural history axis:
         * newest Water follows the new nozzle direction while older Water
         * remains on the previous trajectory.
         *
         * Keep enough age-separated samples to expose that history. Also keep
         * meaningful turns even when samples are temporally close. No fake
         * previous-frame path is stored here.
         */
        let lastAcceptedPacket:
            HosePacketSample | null =
            null;

        for (
            let index = 0;
            index < packetSamples.length;
            index += 1
        ) {
            const sample =
                packetSamples[index];

            if (
                lastAcceptedPacket !== null
            ) {
                const ageDelta =
                    sample.ageSeconds -
                    lastAcceptedPacket.ageSeconds;

                let shouldRetain =
                    ageDelta >=
                    this.definition
                        .trajectoryMinimumAgeStepSeconds;

                if (
                    !shouldRetain &&
                    index > 0 &&
                    index <
                    packetSamples.length - 1
                ) {
                    const previous =
                        packetSamples[index - 1];
                    const next =
                        packetSamples[index + 1];

                    const ax =
                        sample.x - previous.x;
                    const ay =
                        sample.y - previous.y;
                    const bx =
                        next.x - sample.x;
                    const by =
                        next.y - sample.y;

                    const aLength =
                        Math.hypot(ax, ay);
                    const bLength =
                        Math.hypot(bx, by);

                    if (
                        aLength > 0.0001 &&
                        bLength > 0.0001
                    ) {
                        const dot =
                            Math.max(
                                -1,
                                Math.min(
                                    1,
                                    (
                                        ax * bx +
                                        ay * by
                                    ) /
                                    (
                                        aLength *
                                        bLength
                                    ),
                                ),
                            );

                        shouldRetain =
                            Math.acos(dot) >=
                            this.definition
                                .trajectoryTurnRetentionRadians;
                    }
                }

                /*
                 * Always retain the oldest packet so the visible trajectory
                 * reaches the true downstream authoritative body.
                 */
                if (
                    !shouldRetain &&
                    index !==
                    packetSamples.length - 1
                ) {
                    continue;
                }
            }

            if (
                points.length >
                0
            ) {
                const previousPoint =
                    points[
                    points.length - 1
                    ];

                if (
                    Math.hypot(
                        sample.x -
                        previousPoint.x,
                        sample.y -
                        previousPoint.y,
                    ) <
                    0.25
                ) {
                    lastAcceptedPacket =
                        sample;
                    continue;
                }
            }

            points.push({
                x:
                    sample.x,
                y:
                    sample.y,
            });

            lastAcceptedPacket =
                sample;
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
                motionIntensity,
                motionDisturbanceBoost:
                    this.definition.motionDisturbanceBoost,
                motionBroadeningIntensity:
                    this.motionBroadeningIntensity,
                motionMaximumWidthBonus:
                    this.definition.motionMaximumWidthBonus,
                motionWidthRampExponent:
                    this.definition.motionWidthRampExponent,
                bodyColor:
                    this.definition.bodyColor,
                bodyAlpha:
                    this.definition.bodyAlpha,
                useFlowTexture: true,
                flowTextureWorldLength:
                    this.definition.flowTextureWorldLength,
                flowTextureSpeed:
                    this.resolveFlowTextureSpeed(
                        transportSpeed,
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

                // Legacy 8I-6B Graphics streaks remain disabled in config.
                highlightColor:
                    this.definition.highlightColor,
                highlightAlpha:
                    this.definition.highlightAlpha,
                highlightWidthFraction:
                    this.definition.highlightWidthFraction,
                highlightLength:
                    this.definition.highlightLength,
                highlightSpacing:
                    this.definition.highlightSpacing,
                highlightSpeed:
                    this.definition.highlightSpeed,

                // Smaller independent interior highlight fragments.
                fragmentColor:
                    this.definition.fragmentColor,
                fragmentAlpha:
                    this.definition.fragmentAlpha,
                fragmentWidthFraction:
                    this.definition.fragmentWidthFraction,
                fragmentLength:
                    this.definition.fragmentLength,
                fragmentSpacing:
                    this.definition.fragmentSpacing,
                fragmentSpeed:
                    this.definition.fragmentSpeed,

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

                movementSpread,
                maximumMovementSpread:
                    this.definition.maximumMovementSpread,
                movementSpreadRampExponent:
                    this.definition.movementSpreadRampExponent,
                phaseOffset:
                    this.hashPhase(
                        sourceId,
                    ),
            },
        );
    }

    public reset(): void {
        this.previousNozzleX = null;
        this.previousNozzleY = null;
        this.previousNozzleDirectionRadians = null;
        this.motionBroadeningIntensity = 0;

        this.waterVfxSystem
            .getStreamRenderer()
            .hideStream(
                this.streamId,
            );
    }

    public destroy(): void {
        this.reset();
    }

    private updateMotionBroadening(
        targetIntensity: number,
        deltaTime: number,
    ): void {
        const target =
            Math.max(
                0,
                Math.min(
                    1,
                    targetIntensity,
                ),
            );

        /*
         * 8I-6C.3 reacts quickly while movement increases, but residual
         * broadening decays over the configured recovery window.
         */
        if (
            target >=
            this.motionBroadeningIntensity
        ) {
            const attackRate = 14;
            const blend =
                1 -
                Math.exp(
                    -attackRate *
                    deltaTime,
                );

            this.motionBroadeningIntensity +=
                (
                    target -
                    this.motionBroadeningIntensity
                ) *
                blend;

            return;
        }

        const recoverySeconds =
            Math.max(
                0.01,
                this.definition.motionWidthRecoverySeconds,
            );
        const recoveryRate =
            4.6 /
            recoverySeconds;
        const blend =
            1 -
            Math.exp(
                -recoveryRate *
                deltaTime,
            );

        this.motionBroadeningIntensity +=
            (
                target -
                this.motionBroadeningIntensity
            ) *
            blend;

        if (
            this.motionBroadeningIntensity <
            0.001
        ) {
            this.motionBroadeningIntensity = 0;
        }
    }

    private calculateMotionIntensity(
        nozzleX: number,
        nozzleY: number,
        directionRadians: number,
        deltaTime: number,
    ): number {
        if (
            this.previousNozzleX === null ||
            this.previousNozzleY === null ||
            this.previousNozzleDirectionRadians === null ||
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            this.previousNozzleX = nozzleX;
            this.previousNozzleY = nozzleY;
            this.previousNozzleDirectionRadians = directionRadians;
            return 0;
        }

        const linearSpeed =
            Math.hypot(
                nozzleX - this.previousNozzleX,
                nozzleY - this.previousNozzleY,
            ) /
            deltaTime;

        let angularDelta =
            directionRadians -
            this.previousNozzleDirectionRadians;

        while (angularDelta > Math.PI) {
            angularDelta -= Math.PI * 2;
        }

        while (angularDelta < -Math.PI) {
            angularDelta += Math.PI * 2;
        }

        const angularSpeed =
            Math.abs(angularDelta) /
            deltaTime;

        this.previousNozzleX = nozzleX;
        this.previousNozzleY = nozzleY;
        this.previousNozzleDirectionRadians = directionRadians;

        const angularIntensity =
            Math.min(
                1,
                angularSpeed /
                Math.max(
                    0.0001,
                    this.definition.motionAngularVelocityForFullIntensity,
                ),
            );

        const linearIntensity =
            Math.min(
                1,
                linearSpeed /
                Math.max(
                    0.0001,
                    this.definition.motionLinearVelocityForFullIntensity,
                ),
            );

        const weightTotal =
            Math.max(
                0.0001,
                this.definition.motionAngularWeight +
                this.definition.motionLinearWeight,
            );

        return Math.max(
            0,
            Math.min(
                1,
                (
                    angularIntensity *
                    this.definition.motionAngularWeight +
                    linearIntensity *
                    this.definition.motionLinearWeight
                ) /
                weightTotal,
            ),
        );
    }

    private estimateTransportSpeed(
        samples: readonly HosePacketSample[],
    ): number {
        let totalSpeed = 0;
        let sampleCount = 0;

        for (
            let index = 1;
            index < samples.length;
            index += 1
        ) {
            const newer =
                samples[index - 1];
            const older =
                samples[index];

            const ageDelta =
                older.ageSeconds -
                newer.ageSeconds;

            if (
                !Number.isFinite(ageDelta) ||
                ageDelta <= 0.0001
            ) {
                continue;
            }

            const distance =
                Math.hypot(
                    older.x - newer.x,
                    older.y - newer.y,
                );

            const speed =
                distance /
                ageDelta;

            if (
                !Number.isFinite(speed) ||
                speed <= 0
            ) {
                continue;
            }

            totalSpeed += speed;
            sampleCount += 1;
        }

        if (sampleCount === 0) {
            return this.definition.flowTextureSpeed;
        }

        return totalSpeed / sampleCount;
    }

    private estimateMovementSpread(
        samples: readonly HosePacketSample[],
    ): number {
        if (samples.length < 3) {
            return 0;
        }

        let accumulatedTurn = 0;
        let turnSamples = 0;

        for (
            let index = 1;
            index < samples.length - 1;
            index += 1
        ) {
            const previous = samples[index - 1];
            const current = samples[index];
            const next = samples[index + 1];

            const ax = current.x - previous.x;
            const ay = current.y - previous.y;
            const bx = next.x - current.x;
            const by = next.y - current.y;

            const aLength = Math.hypot(ax, ay);
            const bLength = Math.hypot(bx, by);

            if (
                aLength <= 0.0001 ||
                bLength <= 0.0001
            ) {
                continue;
            }

            const dot =
                (ax * bx + ay * by) /
                (aLength * bLength);

            const clampedDot =
                Math.max(-1, Math.min(1, dot));

            accumulatedTurn +=
                Math.acos(clampedDot);
            turnSamples += 1;
        }

        if (turnSamples === 0) {
            return 0;
        }

        const averageTurn =
            accumulatedTurn /
            turnSamples;

        return Math.max(
            0,
            Math.min(
                this.definition.maximumMovementSpread,
                averageTurn *
                this.definition.movementSpreadScale,
            ),
        );
    }

    private resolveFlowTextureSpeed(
        authoritativeTransportSpeed: number,
    ): number {
        const scaled =
            authoritativeTransportSpeed *
            this.definition.flowTransportSpeedScale;

        const candidate =
            Number.isFinite(scaled) &&
                scaled > 0
                ? scaled
                : this.definition.flowTextureSpeed;

        return Math.max(
            this.definition.minimumFlowTextureSpeed,
            Math.min(
                this.definition.maximumFlowTextureSpeed,
                candidate,
            ),
        );
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

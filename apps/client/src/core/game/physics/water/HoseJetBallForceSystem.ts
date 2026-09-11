import {
    DEFAULT_HOSE_JET_BALL_FORCE_DEFINITION,
    type HoseJetBallForceDefinition,
    validateHoseJetBallForceDefinition,
} from "../../config/HoseJetBallForceDefinition";

import type {
    Ball,
} from "../../entities/Ball";

import type {
    HydrantHose,
} from "../../entities/mechanisms/HydrantHose";

export interface HoseJetBallForceSample {
    readonly insideJet: boolean;

    readonly accelerationX: number;
    readonly accelerationY: number;
    readonly accelerationMagnitude: number;

    readonly distanceAlongJet: number;
    readonly lateralDistance: number;
    readonly jetRadius: number;

    readonly distanceInfluence: number;
    readonly edgeInfluence: number;
    readonly flowInfluence: number;
    readonly launchSpeedInfluence: number;
}

/**
 * Gameplay response for the continuous Hydrant Hose jet.
 *
 * The Water packets remain authoritative for airborne Water transport and
 * WaterField deposition. Ball response uses a continuous geometric jet field
 * so force never depends on visual/emission packet spacing.
 */
export class HoseJetBallForceSystem {
    private lastSample:
        HoseJetBallForceSample =
        HoseJetBallForceSystem.createZeroSample();

    public constructor(
        private readonly hydrantHose:
            HydrantHose,

        private readonly ball:
            Ball,

        private readonly definition:
            HoseJetBallForceDefinition =
            DEFAULT_HOSE_JET_BALL_FORCE_DEFINITION,
    ) {
        validateHoseJetBallForceDefinition(
            definition,
        );
    }

    public update(
        deltaTime:
            number,
    ): void {
        if (
            !this.hydrantHose
                .isJetActive() ||
            !this.ball
                .isAvailableForInteraction()
        ) {
            this.lastSample =
                HoseJetBallForceSystem
                    .createZeroSample();

            return;
        }

        const source =
            this.hydrantHose
                .getWaterSource();

        if (
            !source
        ) {
            this.lastSample =
                HoseJetBallForceSystem
                    .createZeroSample();

            return;
        }

        const safeDeltaTime =
            Math.min(
                Math.max(
                    0,
                    deltaTime,
                ),
                this.definition
                    .maximumDeltaTime,
            );

        if (
            safeDeltaTime <= 0
        ) {
            return;
        }

        const nozzle =
            this.hydrantHose
                .getNozzlePosition();

        const directionRadians =
            this.hydrantHose
                .getNozzleDirectionRadians();

        this.lastSample =
            HoseJetBallForceSystem
                .calculateSample(
                    nozzle.x,
                    nozzle.y,
                    directionRadians,
                    this.ball.getX(),
                    this.ball.getY(),
                    this.ball.getRadius(),
                    source.getFlowRate(),
                    source.getLaunchSpeed(),
                    this.definition,
                );

        if (
            !this.lastSample
                .insideJet ||
            this.lastSample
                .accelerationMagnitude <= 0
        ) {
            return;
        }

        /*
         * Ball exposes a stable public impulse interface already used by the
         * collision architecture. For continuous acceleration:
         *
         * impulse = mass * acceleration * dt
         *
         * Ball then converts the impulse back through inverse mass, preserves
         * its own maximum-speed guard and wakes from Stationary when required.
         */
        const impulseScale =
            this.ball.getMass() *
            safeDeltaTime;

        this.ball
            .applyImpulseAtWorldPoint(
                this.lastSample
                    .accelerationX *
                    impulseScale,

                this.lastSample
                    .accelerationY *
                    impulseScale,

                this.ball.getX(),
                this.ball.getY(),
            );
    }

    public getLastSample():
        HoseJetBallForceSample {
        return this.lastSample;
    }

    public getDefinition():
        HoseJetBallForceDefinition {
        return this.definition;
    }

    public static calculateSample(
        nozzleX:
            number,

        nozzleY:
            number,

        directionRadians:
            number,

        ballX:
            number,

        ballY:
            number,

        ballRadius:
            number,

        flowRate:
            number,

        launchSpeed:
            number,

        definition:
            HoseJetBallForceDefinition =
            DEFAULT_HOSE_JET_BALL_FORCE_DEFINITION,
    ): HoseJetBallForceSample {
        validateHoseJetBallForceDefinition(
            definition,
        );

        const values = [
            nozzleX,
            nozzleY,
            directionRadians,
            ballX,
            ballY,
            ballRadius,
            flowRate,
            launchSpeed,
        ];

        if (
            values.some(
                (value): boolean =>
                    !Number.isFinite(value),
            ) ||
            ballRadius < 0 ||
            flowRate <= 0 ||
            launchSpeed <= 0
        ) {
            return this.createZeroSample();
        }

        const directionX =
            Math.cos(
                directionRadians,
            );

        const directionY =
            Math.sin(
                directionRadians,
            );

        const relativeX =
            ballX -
            nozzleX;

        const relativeY =
            ballY -
            nozzleY;

        const distanceAlongJet =
            relativeX *
                directionX +
            relativeY *
                directionY;

        if (
            distanceAlongJet < 0 ||
            distanceAlongJet >
                definition.jetLength
        ) {
            return {
                ...this.createZeroSample(),
                distanceAlongJet,
            };
        }

        const lateralX =
            relativeX -
            directionX *
                distanceAlongJet;

        const lateralY =
            relativeY -
            directionY *
                distanceAlongJet;

        const lateralDistance =
            Math.hypot(
                lateralX,
                lateralY,
            );

        const normalizedDistance =
            Math.min(
                Math.max(
                    distanceAlongJet /
                    definition.jetLength,
                    0,
                ),
                1,
            );

        const jetRadius =
            definition.startRadius +
            (
                definition.endRadius -
                definition.startRadius
            ) *
                normalizedDistance;

        const effectiveRadius =
            jetRadius +
            ballRadius;

        if (
            lateralDistance >
            effectiveRadius
        ) {
            return {
                ...this.createZeroSample(),
                distanceAlongJet,
                lateralDistance,
                jetRadius,
            };
        }

        const distanceCurve =
            Math.pow(
                1 -
                    normalizedDistance,
                definition
                    .distanceFalloffExponent,
            );

        const distanceInfluence =
            definition.minimumDistanceInfluence +
            (
                1 -
                definition.minimumDistanceInfluence
            ) *
                distanceCurve;

        const normalizedLateralDistance =
            effectiveRadius >
                0
                ? Math.min(
                    lateralDistance /
                        effectiveRadius,
                    1,
                )
                : 1;

        const edgeInfluence =
            Math.pow(
                1 -
                    normalizedLateralDistance,
                definition
                    .edgeFalloffExponent,
            );

        const flowInfluence =
            Math.max(
                0,
                flowRate /
                    definition
                        .referenceFlowRate,
            );

        const launchSpeedInfluence =
            Math.max(
                0,
                launchSpeed /
                    definition
                        .referenceLaunchSpeed,
            );

        const unclampedAcceleration =
            definition.baseAcceleration *
            flowInfluence *
            launchSpeedInfluence *
            distanceInfluence *
            edgeInfluence;

        const accelerationMagnitude =
            Math.min(
                definition
                    .maximumAcceleration,
                Math.max(
                    0,
                    unclampedAcceleration,
                ),
            );

        return {
            insideJet:
                true,

            accelerationX:
                directionX *
                accelerationMagnitude,

            accelerationY:
                directionY *
                accelerationMagnitude,

            accelerationMagnitude,

            distanceAlongJet,
            lateralDistance,
            jetRadius,

            distanceInfluence,
            edgeInfluence,
            flowInfluence,
            launchSpeedInfluence,
        };
    }

    private static createZeroSample():
        HoseJetBallForceSample {
        return {
            insideJet:
                false,

            accelerationX:
                0,

            accelerationY:
                0,

            accelerationMagnitude:
                0,

            distanceAlongJet:
                0,

            lateralDistance:
                0,

            jetRadius:
                0,

            distanceInfluence:
                0,

            edgeInfluence:
                0,

            flowInfluence:
                0,

            launchSpeedInfluence:
                0,
        };
    }
}

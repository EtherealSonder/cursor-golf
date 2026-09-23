import {
    DEFAULT_HOSE_JET_BALL_FORCE_DEFINITION,
    type HoseJetBallForceDefinition,
    validateHoseJetBallForceDefinition,
} from "../../config/HoseJetBallForceDefinition";

import type {
    Ball,
} from "../../entities/Ball";

import type { WaterSource } from "../../environment/WaterSource";
import type { AirborneWaterSystem } from "../../environment/AirborneWaterSystem";
import type { PhysicsWorld } from "../PhysicsWorld";
import type { DynamicCollidable } from "../DynamicCollidable";

export interface HoseJetBallForceSource {
    isJetActive(): boolean;
    getWaterSource(): WaterSource | null;
    getNozzlePosition(): { readonly x: number; readonly y: number };
    getNozzleDirectionRadians(): number;
    getBallForceMultiplier?(): number;
    getJetForceMultiplier?(): number;
    getWaterSourceId?(): string;
    getOwnerColliderId?(): string;
    requiresAuthoritativeJetReach?(): boolean;
    shouldTransportBallToImpactPoint?(): boolean;
}

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
 * Gameplay response for any authoritative continuous Hose jet.
 *
 * The Water packets remain authoritative for airborne Water transport and
 * WaterField deposition. Ball response uses a continuous geometric jet field
 * so force never depends on visual/emission packet spacing.
 */
export class HoseJetBallForceSystem {
    private lastSample:
        HoseJetBallForceSample =
        HoseJetBallForceSystem.createZeroSample();

    // Presentation impacts are short-lived events. Keep the most recent ground
    // terminal for the duration of an active Robot jet so Ball capture cannot
    // intermittently fall back to an uncapped downstream push between impacts.
    private cachedTerminalPoint: { readonly x: number; readonly y: number; readonly distanceAlongJet: number } | null = null;

    public constructor(
        private readonly hose:
            HoseJetBallForceSource,

        private readonly ball:
            Ball,

        private readonly definition:
            HoseJetBallForceDefinition =
            DEFAULT_HOSE_JET_BALL_FORCE_DEFINITION,

        private readonly airborneWaterSystem?: AirborneWaterSystem,

        private readonly physicsWorld?: PhysicsWorld,
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
            !this.hose
                .isJetActive()
        ) {
            this.lastSample =
                HoseJetBallForceSystem
                    .createZeroSample();
            this.cachedTerminalPoint = null;

            return;
        }

        const source =
            this.hose
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
            this.hose
                .getNozzlePosition();

        const directionRadians =
            this.hose
                .getNozzleDirectionRadians();

        const liveExtent = this.getLiveJetExtent(
            nozzle.x, nozzle.y, directionRadians,
        );

        // Robot Hose jets influence every eligible dynamic Hose collider through
        // the shared rigid-body impulse contract. The impulse itself is fixed by
        // jet strength; target inverse mass determines the resulting velocity, so
        // heavier mechanisms move less without per-object Water multipliers.
        this.applyJetToDynamicCollidables(
            safeDeltaTime, source.getFlowRate(), source.getLaunchSpeed(),
            nozzle.x, nozzle.y, directionRadians, liveExtent.distanceAlongJet,
        );

        if (!this.ball.isAvailableForInteraction()) {
            this.lastSample = HoseJetBallForceSystem.createZeroSample();
            return;
        }

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

        /*
         * Robot jets must not behave like an already-filled 620 px force ray.
         * Until authoritative airborne Water has physically reached the Ball's
         * longitudinal position, there is no gameplay force.
         */
        if (
            this.hose.requiresAuthoritativeJetReach?.() &&
            this.lastSample.distanceAlongJet >
                liveExtent.distanceAlongJet + this.ball.getRadius() + this.definition.authoritativeReachPadding
        ) {
            this.lastSample = HoseJetBallForceSystem.createZeroSample();
            return;
        }

        if (
            !this.lastSample.insideJet ||
            this.lastSample.accelerationMagnitude <= 0
        ) {
            return;
        }

        /*
         * For the Robot Hose, the live terminal impact is also the Water
         * deposition point that grows the destination puddle. Once the Ball is
         * touched by the stream, bias the force toward that endpoint so it is
         * carried with the jet into the puddle rather than being kicked past it.
         */
        if (
            this.hose.shouldTransportBallToImpactPoint?.() &&
            liveExtent.hasTerminalPoint
        ) {
            const toImpactX = liveExtent.endX - this.ball.getX();
            const toImpactY = liveExtent.endY - this.ball.getY();
            const distanceToImpact = Math.hypot(toImpactX, toImpactY);

            /*
             * The terminal impact is where this Robot Hose deposits Water, so
             * it is the centre/core of the puddle being created. Capture the
             * Ball there instead of allowing its accumulated downstream
             * velocity to carry it through and far beyond the puddle.
             */
            if (distanceToImpact <= this.definition.impactCaptureRadius) {
                this.ball.stop(false);
                this.lastSample = HoseJetBallForceSystem.createZeroSample();
                return;
            }

            const directionToImpactX = toImpactX / distanceToImpact;
            const directionToImpactY = toImpactY / distanceToImpact;
            const brakingRange = Math.max(
                this.definition.impactCaptureRadius + 1,
                this.definition.impactBrakingRadius,
            );
            const approach01 = Math.min(1, Math.max(0,
                (distanceToImpact - this.definition.impactCaptureRadius) /
                (brakingRange - this.definition.impactCaptureRadius),
            ));
            const desiredSpeed = this.definition.impactTransportSpeed * approach01;
            const desiredVelocityX = directionToImpactX * desiredSpeed;
            const desiredVelocityY = directionToImpactY * desiredSpeed;
            const deltaVelocityX = desiredVelocityX - this.ball.getVelocityX();
            const deltaVelocityY = desiredVelocityY - this.ball.getVelocityY();
            const deltaVelocityMagnitude = Math.hypot(deltaVelocityX, deltaVelocityY);

            if (deltaVelocityMagnitude > 0.0001) {
                const maximumDeltaSpeed =
                    this.lastSample.accelerationMagnitude *
                    Math.max(1, this.hose.getBallForceMultiplier?.() ?? 1) *
                    safeDeltaTime;
                const appliedDeltaSpeed = Math.min(deltaVelocityMagnitude, maximumDeltaSpeed);
                const impulseMagnitude = this.ball.getMass() * appliedDeltaSpeed;
                this.ball.applyImpulseAtWorldPoint(
                    deltaVelocityX / deltaVelocityMagnitude * impulseMagnitude,
                    deltaVelocityY / deltaVelocityMagnitude * impulseMagnitude,
                    this.ball.getX(),
                    this.ball.getY(),
                );
            }

            this.lastSample = {
                ...this.lastSample,
                accelerationX: directionToImpactX * this.lastSample.accelerationMagnitude,
                accelerationY: directionToImpactY * this.lastSample.accelerationMagnitude,
            };
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
            safeDeltaTime *
            Math.max(1, this.hose.getBallForceMultiplier?.() ?? 1);

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


    private applyJetToDynamicCollidables(
        deltaTime: number,
        flowRate: number,
        launchSpeed: number,
        nozzleX: number,
        nozzleY: number,
        directionRadians: number,
        liveReach: number,
    ): void {
        if (!this.physicsWorld) return;

        const ownerColliderId = this.hose.getOwnerColliderId?.() ?? null;
        const multiplier = Math.max(1,
            this.hose.getJetForceMultiplier?.() ?? this.hose.getBallForceMultiplier?.() ?? 1,
        );

        for (const body of this.physicsWorld.getHoseDynamicCollidables()) {
            const bodyDefinition = body.getDefinition();
            if (ownerColliderId && bodyDefinition.id === ownerColliderId) continue;
            if (body.getInverseMass() <= 0) continue;

            const radius = HoseJetBallForceSystem.getBoundingRadius(body);
            const sample = HoseJetBallForceSystem.calculateSample(
                nozzleX, nozzleY, directionRadians,
                body.getX(), body.getY(), radius,
                flowRate, launchSpeed, this.definition,
            );
            if (!sample.insideJet || sample.accelerationMagnitude <= 0) continue;
            if (
                this.hose.requiresAuthoritativeJetReach?.() &&
                sample.distanceAlongJet > liveReach + radius + this.definition.authoritativeReachPadding
            ) continue;

            const impulseScale =
                this.definition.dynamicTargetReferenceMass * deltaTime * multiplier;
            body.applyImpulseAtWorldPoint(
                sample.accelerationX * impulseScale,
                sample.accelerationY * impulseScale,
                body.getX(),
                body.getY(),
            );
        }
    }

    private static getBoundingRadius(body: DynamicCollidable): number {
        const definition = body.getDefinition();
        if (definition.shape === "circle") return definition.radius;
        if (definition.shape === "rectangle") {
            return Math.hypot(definition.width * 0.5, definition.height * 0.5);
        }
        let radius = 0;
        for (const point of definition.points) radius = Math.max(radius, Math.hypot(point.x, point.y));
        return radius;
    }

    private getLiveJetExtent(
        nozzleX: number, nozzleY: number, directionRadians: number,
    ): { readonly distanceAlongJet: number; readonly endX: number; readonly endY: number; readonly hasTerminalPoint: boolean } {
        const fallback = {
            distanceAlongJet: this.definition.jetLength,
            endX: nozzleX + Math.cos(directionRadians) * this.definition.jetLength,
            endY: nozzleY + Math.sin(directionRadians) * this.definition.jetLength,
            hasTerminalPoint: false,
        };
        if (!this.hose.requiresAuthoritativeJetReach?.() || !this.airborneWaterSystem) return fallback;
        const sourceId = this.hose.getWaterSourceId?.();
        if (!sourceId) return { ...fallback, distanceAlongJet: 0 };

        const dx = Math.cos(directionRadians);
        const dy = Math.sin(directionRadians);
        let farthest = 0;
        let endX = nozzleX;
        let endY = nozzleY;
        let hasTerminalPoint = false;

        this.airborneWaterSystem.forEachActivePacket((packet): void => {
            if (packet.getSourceId() !== sourceId) return;
            const px = packet.getPositionX();
            const py = packet.getPositionY();
            const along = (px - nozzleX) * dx + (py - nozzleY) * dy;
            if (along > farthest) { farthest = along; endX = px; endY = py; }
        });

        this.airborneWaterSystem.forEachRecentPresentationImpact(sourceId, (impact): void => {
            const along = (impact.positionX - nozzleX) * dx + (impact.positionY - nozzleY) * dy;
            if (along >= farthest - 8) {
                farthest = Math.max(farthest, along);
                endX = impact.positionX;
                endY = impact.positionY;
                hasTerminalPoint = true;
            }
        });

        if (hasTerminalPoint) {
            this.cachedTerminalPoint = {
                x: endX, y: endY,
                distanceAlongJet: Math.max(0, Math.min(this.definition.jetLength, farthest)),
            };
        } else if (this.cachedTerminalPoint) {
            // The impact event may disappear for a frame even though the same
            // committed jet is still active. Preserve its deposition target.
            endX = this.cachedTerminalPoint.x;
            endY = this.cachedTerminalPoint.y;
            farthest = Math.max(farthest, this.cachedTerminalPoint.distanceAlongJet);
            hasTerminalPoint = true;
        }

        return {
            distanceAlongJet: Math.max(0, Math.min(this.definition.jetLength, farthest)),
            endX, endY, hasTerminalPoint,
        };
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

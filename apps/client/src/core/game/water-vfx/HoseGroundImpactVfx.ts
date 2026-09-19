import type {
    WaterImpactVfxDefinition,
} from "../config/WaterImpactVfxDefinition";

import {
    DEFAULT_WATER_IMPACT_VFX_DEFINITION,
} from "../config/WaterImpactVfxDefinition";

import type {
    HydrantHose,
} from "../entities/mechanisms/HydrantHose";

import type {
    AirborneWaterPresentationImpact,
    AirborneWaterSystem,
} from "../environment/AirborneWaterSystem";

import {
    WaterImpactTier,
} from "./WaterImpactIntensityModel";

import type {
    WaterImpactVfxSystem,
} from "./WaterImpactVfxSystem";

import {
    HoseImpactContactState,
} from "./HoseImpactContactState";

/**
 * 8I-7G presentation-only Hose ground-impact adapter.
 *
 * Ground impacts are accumulated into one short-lived contact state and emit
 * periodic Heavy compositions. Static-obstacle impacts are deliberately
 * ignored here and remain reserved for 8I-7H.
 */
export class HoseGroundImpactVfx {
    private readonly processedImpactKeys =
        new Set<string>();

    private readonly contactState:
        HoseImpactContactState;

    private readonly obstacleContactState:
        HoseImpactContactState;

    private emissionCooldownRemaining = 0;
    private obstacleEmissionCooldownRemaining = 0;
    private emissionSequence = 0;
    private obstacleEmissionSequence = 0;

    public constructor(
        private readonly definition:
            WaterImpactVfxDefinition =
            DEFAULT_WATER_IMPACT_VFX_DEFINITION,
    ) {
        this.contactState =
            new HoseImpactContactState(
                definition.hoseGroundContactTimeoutSeconds,
                definition.hoseGroundPositionSmoothing,
            );

        this.obstacleContactState =
            new HoseImpactContactState(
                definition.hoseObstacleContactTimeoutSeconds,
                definition.hoseObstaclePositionSmoothing,
            );
    }

    public update(
        deltaTime: number,
        hose: HydrantHose,
        airborneWaterSystem: AirborneWaterSystem,
        impactVfxSystem: WaterImpactVfxSystem,
    ): void {
        if (
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return;
        }

        this.emissionCooldownRemaining =
            Math.max(
                0,
                this.emissionCooldownRemaining -
                deltaTime,
            );

        this.obstacleEmissionCooldownRemaining =
            Math.max(
                0,
                this.obstacleEmissionCooldownRemaining -
                deltaTime,
            );

        this.contactState.update(deltaTime);
        this.obstacleContactState.update(deltaTime);

        const sourceId =
            hose.getWaterSourceId();

        airborneWaterSystem
            .forEachRecentPresentationImpact(
                sourceId,
                (impact): void => {
                    this.consumeImpact(impact);
                },
            );

        this.emitGroundContact(
            sourceId,
            impactVfxSystem,
        );

        this.emitObstacleContact(
            sourceId,
            impactVfxSystem,
        );
    }

    private emitGroundContact(
        sourceId: string,
        impactVfxSystem: WaterImpactVfxSystem,
    ): void {
        const sample =
            this.contactState.getSample();

        if (
            sample === null ||
            sample.waterAmount <
            this.definition
                .hoseGroundMinimumAccumulatedAmount ||
            this.emissionCooldownRemaining > 0
        ) {
            return;
        }

        const motion =
            this.resolveMotion(
                sample.velocityX,
                sample.velocityY,
            );

        const intensity =
            this.resolveIntensity(
                motion.speed,
                sample.waterAmount,
                this.definition.hoseGroundMinimumIntensity,
                this.definition.hoseGroundMaximumIntensity,
            );

        impactVfxSystem.emitImpact({
            x: sample.x,
            y: sample.y,
            normalizedIntensity: intensity,
            tier: WaterImpactTier.Heavy,
            directionX: motion.directionX,
            directionY: motion.directionY,
            speed: motion.speed,
            directionalBias:
                this.definition
                    .hoseGroundDirectionalBias,
            seed:
                this.makeSeed(
                    sourceId,
                    `hose-ground:${this.emissionSequence}`,
                ),
        });

        this.emissionSequence += 1;
        this.emissionCooldownRemaining =
            this.definition
                .hoseGroundEmissionCooldownSeconds;

        this.contactState
            .consumeAccumulatedWater();
    }

    private emitObstacleContact(
        sourceId: string,
        impactVfxSystem: WaterImpactVfxSystem,
    ): void {
        const sample =
            this.obstacleContactState.getSample();

        if (
            sample === null ||
            sample.waterAmount <
            this.definition
                .hoseObstacleMinimumAccumulatedAmount ||
            this.obstacleEmissionCooldownRemaining > 0
        ) {
            return;
        }

        const motion =
            this.resolveMotion(
                sample.velocityX,
                sample.velocityY,
            );

        const intensity =
            this.resolveIntensity(
                motion.speed,
                sample.waterAmount,
                this.definition.hoseObstacleMinimumIntensity,
                this.definition.hoseObstacleMaximumIntensity,
            );

        impactVfxSystem.emitImpact({
            x: sample.x,
            y: sample.y,
            normalizedIntensity: intensity,
            tier: WaterImpactTier.Heavy,
            directionX: motion.directionX,
            directionY: motion.directionY,
            speed: motion.speed,
            directionalBias:
                this.definition
                    .hoseObstacleDirectionalBias,
            seed:
                this.makeSeed(
                    sourceId,
                    `hose-obstacle:${this.obstacleEmissionSequence}`,
                ),
        });

        this.obstacleEmissionSequence += 1;
        this.obstacleEmissionCooldownRemaining =
            this.definition
                .hoseObstacleEmissionCooldownSeconds;

        this.obstacleContactState
            .consumeAccumulatedWater();
    }

    public reset(): void {
        this.processedImpactKeys.clear();
        this.contactState.reset();
        this.obstacleContactState.reset();
        this.emissionCooldownRemaining = 0;
        this.obstacleEmissionCooldownRemaining = 0;
        this.emissionSequence = 0;
        this.obstacleEmissionSequence = 0;
    }

    private consumeImpact(
        impact:
            Readonly<AirborneWaterPresentationImpact>,
    ): void {
        const key =
            `${impact.sourceId}:${impact.sequence}:${impact.emissionOrdinal}`;

        if (
            this.processedImpactKeys.has(key)
        ) {
            return;
        }

        this.processedImpactKeys.add(key);

        if (impact.isStaticCollision) {
            this.obstacleContactState.addImpact(impact);
            return;
        }

        this.contactState.addImpact(impact);
    }

    private resolveMotion(
        velocityX: number,
        velocityY: number,
    ): {
        readonly speed: number;
        readonly directionX: number;
        readonly directionY: number;
    } {
        const speed =
            Math.hypot(
                velocityX,
                velocityY,
            );

        return {
            speed,
            directionX:
                speed > 0.001
                    ? velocityX / speed
                    : 0,
            directionY:
                speed > 0.001
                    ? velocityY / speed
                    : 0,
        };
    }

    private resolveIntensity(
        speed: number,
        waterAmount: number,
        minimum: number,
        maximum: number,
    ): number {
        const speedSignal =
            this.clamp01(
                speed /
                this.definition
                    .speedForFullIntensity,
            );

        const amountSignal =
            this.clamp01(
                waterAmount /
                this.definition
                    .waterAmountForFullIntensity,
            );

        const totalWeight =
            this.definition.speedWeight +
            this.definition.waterAmountWeight;

        const rawIntensity =
            totalWeight > 0
                ? (
                    speedSignal *
                    this.definition.speedWeight +
                    amountSignal *
                    this.definition.waterAmountWeight
                ) /
                totalWeight
                : 0;

        return this.clamp(
            rawIntensity,
            minimum,
            maximum,
        );
    }

    private makeSeed(
        sourceId: string,
        discriminator: string,
    ): number {
        let hash = 2166136261;
        const text =
            `${sourceId}:${discriminator}`;

        for (
            let index = 0;
            index < text.length;
            index += 1
        ) {
            hash ^= text.charCodeAt(index);
            hash =
                Math.imul(
                    hash,
                    16777619,
                );
        }

        return hash >>> 0;
    }

    private clamp(
        value: number,
        minimum: number,
        maximum: number,
    ): number {
        return Math.max(
            minimum,
            Math.min(maximum, value),
        );
    }

    private clamp01(
        value: number,
    ): number {
        return this.clamp(value, 0, 1);
    }
}

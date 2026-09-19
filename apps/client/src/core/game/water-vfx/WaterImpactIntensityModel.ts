import {
    DEFAULT_WATER_IMPACT_VFX_DEFINITION,
    validateWaterImpactVfxDefinition,
} from "../config/WaterImpactVfxDefinition";

import type {
    WaterImpactVfxDefinition,
} from "../config/WaterImpactVfxDefinition";

import type {
    AirborneWaterPresentationImpact,
} from "../environment/AirborneWaterSystem";

export enum WaterImpactTier {
    Fine = "fine",
    Medium = "medium",
    Heavy = "heavy",
}

export interface WaterImpactPresentationProfile {
    readonly normalizedIntensity: number;
    readonly tier: WaterImpactTier;
    readonly directionX: number;
    readonly directionY: number;
    readonly speed: number;
}

/**
 * Phase 8I-7B read-only presentation interpretation of an authoritative Water
 * impact. It performs no collision/deposition work and never mutates the
 * supplied impact record.
 */
export class WaterImpactIntensityModel {
    public constructor(
        private readonly definition: WaterImpactVfxDefinition =
            DEFAULT_WATER_IMPACT_VFX_DEFINITION,
    ) {
        validateWaterImpactVfxDefinition(definition);
    }

    public evaluate(
        impact: AirborneWaterPresentationImpact,
    ): WaterImpactPresentationProfile {
        const velocityX = this.finiteOrZero(impact.velocityX);
        const velocityY = this.finiteOrZero(impact.velocityY);
        const speed = Math.hypot(velocityX, velocityY);

        let directionX = 0;
        let directionY = 0;

        if (speed > 0) {
            directionX = velocityX / speed;
            directionY = velocityY / speed;
        }

        const speedSignal = this.clamp01(
            speed / this.definition.speedForFullIntensity,
        );

        const amountSignal = this.clamp01(
            Math.max(0, this.finiteOrZero(impact.waterAmount)) /
            this.definition.waterAmountForFullIntensity,
        );

        const totalWeight =
            this.definition.speedWeight +
            this.definition.waterAmountWeight;

        let intensity = (
            speedSignal * this.definition.speedWeight +
            amountSignal * this.definition.waterAmountWeight
        ) / totalWeight;

        if (impact.isStaticCollision) {
            intensity *= this.definition.staticCollisionMultiplier;
        }

        const normalizedIntensity = this.clamp01(intensity);

        return {
            normalizedIntensity,
            tier: this.classifyTier(normalizedIntensity),
            directionX,
            directionY,
            speed,
        };
    }

    private classifyTier(intensity: number): WaterImpactTier {
        if (intensity >= this.definition.heavyTierThreshold) {
            return WaterImpactTier.Heavy;
        }

        if (intensity >= this.definition.mediumTierThreshold) {
            return WaterImpactTier.Medium;
        }

        return WaterImpactTier.Fine;
    }

    private finiteOrZero(value: number): number {
        return Number.isFinite(value) ? value : 0;
    }

    private clamp01(value: number): number {
        return Math.max(0, Math.min(1, value));
    }
}

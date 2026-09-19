import type {
    AirborneWaterPresentationImpact,
    AirborneWaterSystem,
} from "../environment/AirborneWaterSystem";

import {
    DEFAULT_WATER_IMPACT_VFX_DEFINITION,
} from "../config/WaterImpactVfxDefinition";

import type {
    WaterImpactVfxDefinition,
} from "../config/WaterImpactVfxDefinition";

import {
    WaterImpactIntensityModel,
    WaterImpactTier,
} from "./WaterImpactIntensityModel";

import type {
    WaterImpactVfxSystem,
} from "./WaterImpactVfxSystem";

import type {
    Sprinkler,
} from "../entities/mechanisms/Sprinkler";

/**
 * Presentation-only adapter between authoritative Sprinkler airborne-Water
 * impacts and the shared impact VFX runtime.
 *
 * Phase 8I-7E.1 intentionally suppresses Sprinkler ground-impact splashes.
 * Continuous ground landing is already communicated by standing Water and
 * wet-ground presentation. Static-obstacle impacts retain the directional
 * splash response.
 */
export class SprinklerImpactVfx {
    private readonly intensityModel:
        WaterImpactIntensityModel;

    private readonly processedImpactKeys =
        new Set<string>();

    private readonly lastObstacleEmissionTimeBySource =
        new Map<string, number>();

    private elapsedSeconds = 0;

    public constructor(
        private readonly definition:
            WaterImpactVfxDefinition =
            DEFAULT_WATER_IMPACT_VFX_DEFINITION,
    ) {
        this.intensityModel =
            new WaterImpactIntensityModel(
                definition,
            );
    }

    public update(
        deltaTime: number,
        sprinklers: readonly Sprinkler[],
        airborneWaterSystem: AirborneWaterSystem,
        impactVfxSystem: WaterImpactVfxSystem,
    ): void {
        const safeDeltaTime =
            Number.isFinite(deltaTime)
                ? Math.max(0, deltaTime)
                : 0;

        this.elapsedSeconds += safeDeltaTime;

        for (const sprinkler of sprinklers) {
            const sourceId = sprinkler.getSourceId();

            airborneWaterSystem
                .forEachRecentPresentationImpact(
                    sourceId,
                    (impact) => {
                        this.consumeImpact(
                            impact,
                            impactVfxSystem,
                        );
                    },
                );
        }
    }

        /*
     * 8I-7K lifecycle contract: reset is the hard cleanup boundary for all
     * retained Sprinkler presentation state. No authoritative Water state is
     * owned or modified here.
     */
public reset(): void {
        this.processedImpactKeys.clear();
        this.lastObstacleEmissionTimeBySource.clear();
        this.elapsedSeconds = 0;
    }

    public destroy(): void {
        this.reset();
    }

    private consumeImpact(
        impact:
            Readonly<AirborneWaterPresentationImpact>,
        impactVfxSystem: WaterImpactVfxSystem,
    ): void {
        const impactKey =
            `${impact.sourceId}:${impact.sequence}:${impact.emissionOrdinal}`;

        if (
            this.processedImpactKeys.has(
                impactKey,
            )
        ) {
            return;
        }

        /*
         * Mark every authoritative impact as observed before presentation
         * filtering. Ground impacts remain valid Water simulation events, but
         * they intentionally produce no Sprinkler splash VFX.
         */
        this.processedImpactKeys.add(
            impactKey,
        );

        if (!impact.isStaticCollision) {
            return;
        }

        const profile =
            this.intensityModel.evaluate(
                impact,
            );

        const constrainedIntensity =
            this.clamp(
                profile.normalizedIntensity,
                this.definition
                    .sprinklerObstacleMinimumIntensity,
                this.definition
                    .sprinklerObstacleMaximumIntensity,
            );

        if (
            constrainedIntensity <
            this.definition
                .sprinklerObstacleMinimumIntensity
        ) {
            return;
        }

        const previousEmissionTime =
            this.lastObstacleEmissionTimeBySource
                .get(impact.sourceId) ??
            Number.NEGATIVE_INFINITY;

        if (
            this.elapsedSeconds -
            previousEmissionTime <
            this.definition
                .sprinklerObstacleEmissionCooldownSeconds
        ) {
            return;
        }

        this.lastObstacleEmissionTimeBySource.set(
            impact.sourceId,
            this.elapsedSeconds,
        );

        const tier =
            constrainedIntensity >=
                this.definition.heavyTierThreshold
                ? WaterImpactTier.Heavy
                : constrainedIntensity >=
                    this.definition.mediumTierThreshold
                    ? WaterImpactTier.Medium
                    : WaterImpactTier.Fine;

        /*
         * 8I-7J: the per-source obstacle cooldown remains the primary
         * Sprinkler aggregator. The shared composer applies the final global
         * presentation budget after this point.
         */
        impactVfxSystem.emitImpact({
            x: impact.positionX,
            y: impact.positionY,
            normalizedIntensity:
                constrainedIntensity,
            tier,
            directionX:
                profile.directionX,
            directionY:
                profile.directionY,
            speed:
                profile.speed,
            directionalBias:
                this.definition
                    .sprinklerObstacleDirectionalBias,
            seed:
                this.makeSeed(
                    impact,
                ),
        });
    }

    private makeSeed(
        impact:
            Readonly<AirborneWaterPresentationImpact>,
    ): number {
        let hash = 2166136261;

        /*
         * 8I-7I: authoritative impact identity is the stable seed. This keeps
         * replay/reset output deterministic while still varying each impact.
         */
        const text =
            `${impact.sourceId}:${impact.sequence}:${impact.emissionOrdinal}`;

        for (
            let index = 0;
            index < text.length;
            index += 1
        ) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(
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
            Math.min(
                maximum,
                value,
            ),
        );
    }
}

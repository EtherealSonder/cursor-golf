import {
    DEFAULT_HYDRANT_DAMAGE_DEFINITION,
    type HydrantDamageDefinition,
    validateHydrantDamageDefinition,
} from "../../config/HydrantDamageDefinition";

export interface HydrantImpactResult {
    readonly accepted: boolean;
    readonly damage: number;
    readonly remainingDurability: number;
    readonly destroyed: boolean;
}

export class HydrantDamageController {
    private durability:
        number;

    private cooldownRemaining =
        0;

    private broken =
        false;

    public constructor(
        private readonly definition:
            HydrantDamageDefinition =
            DEFAULT_HYDRANT_DAMAGE_DEFINITION,
    ) {
        validateHydrantDamageDefinition(
            definition,
        );

        this.durability =
            definition.maxDurability;
    }

    public update(
        deltaTime:
            number,
    ): void {
        if (
            !Number.isFinite(
                deltaTime,
            ) ||
            deltaTime <= 0
        ) {
            return;
        }

        this.cooldownRemaining =
            Math.max(
                0,
                this.cooldownRemaining -
                    deltaTime,
            );
    }

    public applyImpact(
        impactSpeed:
            number,

        ballMass:
            number,
    ): HydrantImpactResult {
        if (
            this.broken ||
            this.cooldownRemaining > 0 ||
            !Number.isFinite(
                impactSpeed,
            ) ||
            !Number.isFinite(
                ballMass,
            ) ||
            impactSpeed <= 0 ||
            ballMass <= 0
        ) {
            return this.makeResult(
                false,
                0,
                false,
            );
        }

        const speed =
            Math.abs(
                impactSpeed,
            );

        const impactEnergy =
            0.5 *
            ballMass *
            speed *
            speed;

        if (
            speed <
                this.definition
                    .minimumImpactSpeed ||
            impactEnergy <
                this.definition
                    .minimumImpactEnergy
        ) {
            return this.makeResult(
                false,
                0,
                false,
            );
        }

        const effectiveEnergy =
            Math.max(
                0,
                impactEnergy -
                    this.definition
                        .minimumImpactEnergy,
            );

        const damage =
            Math.min(
                this.definition
                    .maximumDamagePerImpact,
                effectiveEnergy *
                    this.definition
                        .damageEnergyScale,
            );

        if (
            damage <= 0
        ) {
            return this.makeResult(
                false,
                0,
                false,
            );
        }

        this.cooldownRemaining =
            this.definition
                .impactCooldown;

        this.durability =
            Math.max(
                0,
                this.durability -
                    damage,
            );

        const destroyed =
            this.durability <= 0;

        if (
            destroyed
        ) {
            this.broken =
                true;
        }

        return this.makeResult(
            true,
            damage,
            destroyed,
        );
    }

    public reset():
        void {
        this.durability =
            this.definition
                .maxDurability;

        this.cooldownRemaining =
            0;

        this.broken =
            false;
    }

    public getDurability():
        number {
        return this.durability;
    }

    public getDurabilityRatio():
        number {
        return (
            this.durability /
            this.definition
                .maxDurability
        );
    }

    public getCooldownRemaining():
        number {
        return this.cooldownRemaining;
    }

    public isBroken():
        boolean {
        return this.broken;
    }

    public getDefinition():
        HydrantDamageDefinition {
        return this.definition;
    }

    private makeResult(
        accepted:
            boolean,

        damage:
            number,

        destroyed:
            boolean,
    ): HydrantImpactResult {
        return {
            accepted,
            damage,
            remainingDurability:
                this.durability,
            destroyed,
        };
    }
}

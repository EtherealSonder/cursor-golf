import {
    DEFAULT_HYDRANT_DAMAGE_DEFINITION,
    type HydrantDamageDefinition,
    validateHydrantDamageDefinition,
} from "../../config/HydrantDamageDefinition";

import {
    HydrantDamageState,
} from "../../config/HydrantDamageState";

export interface HydrantImpactResult {
    readonly accepted: boolean;
    readonly stateChanged: boolean;
    readonly previousState: HydrantDamageState;
    readonly state: HydrantDamageState;
    readonly destroyed: boolean;
    readonly impactNormalSpeed: number;
}

export class HydrantDamageController {
    private state =
        HydrantDamageState.Normal;

    private cooldownRemaining =
        0;

    public constructor(
        private readonly definition:
            HydrantDamageDefinition =
            DEFAULT_HYDRANT_DAMAGE_DEFINITION,
    ) {
        validateHydrantDamageDefinition(
            definition,
        );
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

    /**
     * Applies one collision event.
     *
     * There is no accumulated durability. An impact either qualifies for one
     * discrete transition or changes nothing.
     *
     * The optional second argument is retained only for compatibility with
     * older callers that previously supplied Ball mass.
     */
    public applyImpact(
        impactNormalSpeed:
            number,

        _legacyBallMass?:
            number,
    ): HydrantImpactResult {
        const previousState =
            this.state;

        if (
            this.state ===
            HydrantDamageState.Broken ||
            this.cooldownRemaining > 0 ||
            !Number.isFinite(
                impactNormalSpeed,
            ) ||
            impactNormalSpeed <= 0
        ) {
            return this.makeResult(
                false,
                false,
                previousState,
                impactNormalSpeed,
            );
        }

        const threshold =
            this.state ===
                HydrantDamageState.Normal
                ? this.definition
                    .normalToDamagedImpactSpeed
                : this.definition
                    .damagedToBrokenImpactSpeed;

        if (
            impactNormalSpeed <
            threshold
        ) {
            /*
             * Weak impacts do not start cooldown and do not accumulate hidden
             * progress. Any number of sub-threshold hits leaves the state
             * unchanged.
             */
            return this.makeResult(
                false,
                false,
                previousState,
                impactNormalSpeed,
            );
        }

        this.cooldownRemaining =
            this.definition
                .impactCooldown;

        if (
            this.state ===
            HydrantDamageState.Normal
        ) {
            this.state =
                HydrantDamageState.Damaged;
        } else if (
            this.state ===
            HydrantDamageState.Damaged
        ) {
            this.state =
                HydrantDamageState.Broken;
        }

        return this.makeResult(
            true,
            this.state !==
            previousState,
            previousState,
            impactNormalSpeed,
        );
    }

    public reset():
        void {
        this.state =
            HydrantDamageState.Normal;

        this.cooldownRemaining =
            0;
    }

    public getState():
        HydrantDamageState {
        return this.state;
    }

    public isNormal():
        boolean {
        return (
            this.state ===
            HydrantDamageState.Normal
        );
    }

    public isDamaged():
        boolean {
        return (
            this.state ===
            HydrantDamageState.Damaged
        );
    }

    public isBroken():
        boolean {
        return (
            this.state ===
            HydrantDamageState.Broken
        );
    }

    public getCooldownRemaining():
        number {
        return this.cooldownRemaining;
    }

    public getDefinition():
        HydrantDamageDefinition {
        return this.definition;
    }

    /**
     * Compatibility diagnostic only. This is NOT hidden durability.
     * It maps the three discrete states to 1.0, 0.5 and 0.0.
     */
    public getDurabilityRatio():
        number {
        switch (
        this.state
        ) {
            case HydrantDamageState.Normal:
                return 1;

            case HydrantDamageState.Damaged:
                return 0.5;

            case HydrantDamageState.Broken:
                return 0;
        }
    }

    private makeResult(
        accepted:
            boolean,

        stateChanged:
            boolean,

        previousState:
            HydrantDamageState,

        impactNormalSpeed:
            number,
    ): HydrantImpactResult {
        return {
            accepted,
            stateChanged,
            previousState,
            state:
                this.state,
            destroyed:
                this.state ===
                HydrantDamageState.Broken &&
                previousState !==
                HydrantDamageState.Broken,
            impactNormalSpeed:
                Number.isFinite(
                    impactNormalSpeed,
                )
                    ? Math.max(
                        0,
                        impactNormalSpeed,
                    )
                    : 0,
        };
    }
}

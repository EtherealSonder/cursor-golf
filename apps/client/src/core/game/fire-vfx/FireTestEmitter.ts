import type {
    FireParticleThermalRoleDefinition,
    FireParticleVfxDefinition,
} from "../config/FireParticleVfxDefinition";

import type {
    FireVfxParticleActivation,
} from "./FireVfxParticle";

import type {
    FireVfxTextureVariant,
} from "./FireVfxSystem";

type EmitParticleFunction =
    (
        variant:
            FireVfxTextureVariant,
        activation:
            FireVfxParticleActivation,
    ) => boolean;

/**
 * FIRE-VFX-1 development-only emitter.
 *
 * This class intentionally has no FireManager, FireCell, EnvironmentField,
 * Wind or FireSource dependency. Its only purpose is to prove that pooled
 * textured Pixi Sprites can form a convincing Fire material before we
 * reconnect presentation to gameplay simulation.
 */
export class FireTestEmitter {
    private readonly definition:
        FireParticleVfxDefinition;

    private readonly emitParticle:
        EmitParticleFunction;

    private emissionAccumulator =
        0;

    public constructor(
        definition:
            FireParticleVfxDefinition,
        emitParticle:
            EmitParticleFunction,
    ) {
        this.definition =
            definition;

        this.emitParticle =
            emitParticle;
    }

    public update(
        deltaTime: number,
    ): void {

        if (
            !this.definition.enabled ||
            !Number.isFinite(
                deltaTime,
            ) ||
            deltaTime <= 0
        ) {
            return;
        }

        this.emissionAccumulator +=
            this.definition
                .testEmitter
                .particlesPerSecond *
            deltaTime;

        const wholeParticles =
            Math.floor(
                this.emissionAccumulator,
            );

        if (
            wholeParticles <=
            0
        ) {
            return;
        }

        /*
         * Remove the budget before spawning. If the pool is saturated we
         * intentionally drop emissions rather than building an ever-growing
         * backlog that would burst later.
         */
        this.emissionAccumulator -=
            wholeParticles;

        for (
            let index = 0;
            index <
            wholeParticles;
            index += 1
        ) {
            this.spawnParticle();
        }
    }

    public reset():
        void {

        this.emissionAccumulator =
            0;
    }

    public destroy():
        void {

        this.reset();
    }

    private spawnParticle():
        void {

        const thermalRole =
            this.chooseThermalRole();

        const particleDefinition =
            this.definition
                .particle;

        const emitterDefinition =
            this.definition
                .testEmitter;

        const lifetime =
            this.randomRange(
                particleDefinition
                    .lifetimeMinimum,
                particleDefinition
                    .lifetimeMaximum,
            ) *
            thermalRole
                .lifetimeMultiplier;

        const speedMultiplier =
            thermalRole
                .speedMultiplier;

        const scaleMultiplier =
            thermalRole
                .scaleMultiplier;

        const maximumAlpha =
            Math.min(
                1,
                this.randomRange(
                    particleDefinition
                        .alphaMinimum,
                    particleDefinition
                        .alphaMaximum,
                ) *
                thermalRole
                    .alphaMultiplier,
            );

        const activation:
            FireVfxParticleActivation = {

            x:
                emitterDefinition
                    .positionX +
                this.randomRange(
                    -emitterDefinition
                        .spawnRadiusX,
                    emitterDefinition
                        .spawnRadiusX,
                ),

            y:
                emitterDefinition
                    .positionY +
                this.randomRange(
                    -emitterDefinition
                        .spawnRadiusY,
                    emitterDefinition
                        .spawnRadiusY,
                ),

            velocityX:
                this.randomRange(
                    particleDefinition
                        .horizontalVelocityMinimum,
                    particleDefinition
                        .horizontalVelocityMaximum,
                ) *
                speedMultiplier,

            velocityY:
                this.randomRange(
                    particleDefinition
                        .upwardVelocityMinimum,
                    particleDefinition
                        .upwardVelocityMaximum,
                ) *
                speedMultiplier,

            lifetime,

            startScaleX:
                this.randomRange(
                    particleDefinition
                        .startScaleXMinimum,
                    particleDefinition
                        .startScaleXMaximum,
                ) *
                scaleMultiplier,

            startScaleY:
                this.randomRange(
                    particleDefinition
                        .startScaleYMinimum,
                    particleDefinition
                        .startScaleYMaximum,
                ) *
                scaleMultiplier,

            endScaleX:
                this.randomRange(
                    particleDefinition
                        .endScaleXMinimum,
                    particleDefinition
                        .endScaleXMaximum,
                ) *
                scaleMultiplier,

            endScaleY:
                this.randomRange(
                    particleDefinition
                        .endScaleYMinimum,
                    particleDefinition
                        .endScaleYMaximum,
                ) *
                scaleMultiplier,

            maximumAlpha,

            rotation:
                this.randomRange(
                    particleDefinition
                        .rotationMinimum,
                    particleDefinition
                        .rotationMaximum,
                ),

            angularVelocity:
                this.randomRange(
                    particleDefinition
                        .angularVelocityMinimum,
                    particleDefinition
                        .angularVelocityMaximum,
                ),

            flickerPhase:
                Math.random() *
                Math.PI *
                2,

            flickerSpeed:
                this.randomRange(
                    particleDefinition
                        .flickerSpeedMinimum,
                    particleDefinition
                        .flickerSpeedMaximum,
                ),

            flickerAmount:
                this.randomRange(
                    particleDefinition
                        .flickerAmountMinimum,
                    particleDefinition
                        .flickerAmountMaximum,
                ),

            growEndFraction:
                particleDefinition
                    .emergenceEndFraction,

            shrinkStartFraction:
                particleDefinition
                    .fadeStartFraction,

            turbulenceAmplitude:
                this.randomRange(
                    particleDefinition
                        .turbulenceAmplitudeMinimum,
                    particleDefinition
                        .turbulenceAmplitudeMaximum,
                ),

            turbulenceFrequency:
                this.randomRange(
                    particleDefinition
                        .turbulenceFrequencyMinimum,
                    particleDefinition
                        .turbulenceFrequencyMaximum,
                ),

            tint:
                thermalRole
                    .tint,
        };

        this.emitParticle(
            thermalRole
                .textureVariant,

            activation,
        );
    }

    private chooseThermalRole():
        FireParticleThermalRoleDefinition {

        const roles =
            this.definition
                .thermalRoles;

        const totalWeight =
            Math.max(
                0,
                roles.hot.weight,
            ) +
            Math.max(
                0,
                roles.body.weight,
            ) +
            Math.max(
                0,
                roles.cool.weight,
            );

        if (
            totalWeight <=
            0
        ) {
            return roles.body;
        }

        let selection =
            Math.random() *
            totalWeight;

        const hotWeight =
            Math.max(
                0,
                roles.hot.weight,
            );

        if (
            selection <
            hotWeight
        ) {
            return roles.hot;
        }

        selection -=
            hotWeight;

        const bodyWeight =
            Math.max(
                0,
                roles.body.weight,
            );

        if (
            selection <
            bodyWeight
        ) {
            return roles.body;
        }

        return roles.cool;
    }

    private randomRange(
        minimum: number,
        maximum: number,
    ): number {

        if (
            maximum <=
            minimum
        ) {
            return minimum;
        }

        return (
            minimum +
            Math.random() *
            (
                maximum -
                minimum
            )
        );
    }
}

import {
    DEFAULT_FIRE_PARTICLE_VFX_DEFINITION,
} from "../config/FireParticleVfxDefinition";

import type {
    FireParticleMaterialLayer,
    FireParticleThermalRoleDefinition,
    FireParticleVfxDefinition,
} from "../config/FireParticleVfxDefinition";

import {
    FireSourceType,
} from "../config/FireSourceDefinition";

import {
    DEFAULT_JET_FIRE_VFX_DEFINITION,
} from "../config/JetFireVfxDefinition";

import type {
    JetFireVfxDefinition,
} from "../config/JetFireVfxDefinition";

import type {
    FireSource,
} from "../environment/FireSource";

import type {
    FireSourceSystem,
} from "../environment/FireSourceSystem";

import type {
    LocalWindSystem,
} from "../environment/LocalWindSystem";

import type {
    FireVfxParticleActivation,
} from "./FireVfxParticle";

import type {
    FireVfxTextureVariant,
} from "./FireVfxSystem";

export type JetFireEmitterSpawnCallback =
    (
        variant:
            FireVfxTextureVariant,

        materialLayer:
            FireParticleMaterialLayer,

        activation:
            FireVfxParticleActivation,
    ) => boolean;

interface JetFireEmitterState {
    fractionalCarry: number;
    lastSeenUpdate: number;
}

/**
 * FIRE-VFX-5 presentation bridge for authoritative Directional FireSource
 * records.
 *
 * FireSourceSystem
 *      ↓ read only
 * JetFireEmitter
 *      ↓
 * FireVfxSystem.emitParticle(...)
 *      ↓
 * shared FireVfxPool
 *
 * This class never deposits heat, ignites terrain or changes a FireSource.
 */
export class JetFireEmitter {

    private readonly emitterStates =
        new Map<FireSource, JetFireEmitterState>();

    private updateSerial =
        0;

    public constructor(
        private readonly fireSourceSystem:
            FireSourceSystem,

        private readonly localWindSystem:
            LocalWindSystem,

        private readonly spawnParticle:
            JetFireEmitterSpawnCallback,

        private readonly definition:
            JetFireVfxDefinition =
            DEFAULT_JET_FIRE_VFX_DEFINITION,

        private readonly particleDefinition:
            FireParticleVfxDefinition =
            DEFAULT_FIRE_PARTICLE_VFX_DEFINITION,
    ) {
    }

    public update(
        deltaTime:
            number,
    ): void {

        if (
            !this.definition.enabled ||
            !this.particleDefinition.enabled ||
            !Number.isFinite(deltaTime) ||
            deltaTime <=
            0
        ) {
            return;
        }

        this.updateSerial +=
            1;

        let sawDirectionalSource =
            false;

        for (
            const source
            of this.fireSourceSystem
                .getSources()
        ) {
            if (
                !source.isEnabled() ||
                source.getType() !==
                FireSourceType.Directional
            ) {
                continue;
            }

            sawDirectionalSource =
                true;

            const state =
                this.getOrCreateEmitterState(
                    source,
                );

            state.lastSeenUpdate =
                this.updateSerial;

            this.emitFromSource(
                source,
                state,
                deltaTime,
            );
        }

        if (!sawDirectionalSource) {
            this.emitterStates.clear();

            return;
        }

        this.cleanupInactiveEmitterStates();
    }

    public reset():
        void {

        this.emitterStates.clear();

        this.updateSerial =
            0;
    }

    public destroy():
        void {

        this.reset();
    }

    private emitFromSource(
        source:
            FireSource,

        state:
            JetFireEmitterState,

        deltaTime:
            number,
    ): void {

        state.fractionalCarry +=
            Math.max(
                0,
                this.definition
                    .particlesPerSecondPerSource,
            ) *
            deltaTime;

        const requestedSpawnCount =
            Math.floor(
                state.fractionalCarry,
            );

        const spawnCount =
            Math.min(
                requestedSpawnCount,
                Math.max(
                    1,
                    this.definition
                        .maximumSpawnsPerSourcePerFrame,
                ),
            );

        state.fractionalCarry -=
            spawnCount;

        state.fractionalCarry =
            Math.min(
                state.fractionalCarry,
                Math.max(
                    1,
                    this.definition
                        .emitterState
                        .maximumCarryParticles,
                ),
            );

        for (
            let index = 0;
            index <
            spawnCount;
            index += 1
        ) {
            this.spawnOne(
                source,
            );
        }
    }

    private spawnOne(
        source:
            FireSource,
    ): void {

        const role =
            this.selectThermalRole();

        const materialLayer =
            this.selectMaterialLayer();

        const activation =
            this.createActivation(
                source,
                role,
            );

        this.spawnParticle(
            role.textureVariant,
            materialLayer,
            activation,
        );
    }

    private createActivation(
        source:
            FireSource,

        role:
            FireParticleThermalRoleDefinition,
    ): FireVfxParticleActivation {

        const particle =
            this.particleDefinition
                .particle;

        const sourceDirection =
            source.getDirectionRadians();

        const coneOffset =
            this.randomRange(
                -this.definition
                    .coneHalfAngleRadians,
                this.definition
                    .coneHalfAngleRadians,
            );

        const emissionDirection =
            sourceDirection +
            coneOffset;

        const directionX =
            Math.cos(
                emissionDirection,
            );

        const directionY =
            Math.sin(
                emissionDirection,
            );

        const perpendicularX =
            -directionY;

        const perpendicularY =
            directionX;

        const sourceDirectionX =
            Math.cos(
                sourceDirection,
            );

        const sourceDirectionY =
            Math.sin(
                sourceDirection,
            );

        const spawnAngle =
            Math.random() *
            Math.PI *
            2;

        const spawnRadius =
            Math.sqrt(
                Math.random(),
            ) *
            Math.max(
                0,
                this.definition
                    .spawnRadius,
            );

        const spawnOffsetX =
            Math.cos(
                spawnAngle,
            ) *
            spawnRadius;

        const spawnOffsetY =
            Math.sin(
                spawnAngle,
            ) *
            spawnRadius;

        const spawnX =
            source.getPositionX() +
            sourceDirectionX *
            this.definition
                .spawnForwardOffset +
            spawnOffsetX;

        const spawnY =
            source.getPositionY() +
            sourceDirectionY *
            this.definition
                .spawnForwardOffset +
            spawnOffsetY;

        const forwardVelocity =
            this.randomRange(
                this.definition
                    .forwardVelocityMinimum,
                this.definition
                    .forwardVelocityMaximum,
            ) *
            Math.max(
                0,
                role.speedMultiplier,
            );

        const lateralVelocity =
            this.randomRange(
                this.definition
                    .lateralVelocityMinimum,
                this.definition
                    .lateralVelocityMaximum,
            );

        const windAcceleration =
            this.getLocalWindAcceleration(
                spawnX,
                spawnY,
            );

        const lifetimeMultiplier =
            Math.max(
                0.001,
                role.lifetimeMultiplier *
                this.definition
                    .lifetimeMultiplier,
            );

        const startScaleMultiplier =
            Math.max(
                0,
                role.scaleMultiplier *
                this.definition
                    .startScaleMultiplier,
            );

        const endScaleMultiplier =
            Math.max(
                0,
                role.scaleMultiplier *
                this.definition
                    .endScaleMultiplier,
            );

        const alphaMultiplier =
            Math.max(
                0,
                role.alphaMultiplier *
                this.definition
                    .alphaMultiplier,
            );

        return {
            x:
                spawnX,

            y:
                spawnY,

            velocityX:
                directionX *
                forwardVelocity +
                perpendicularX *
                lateralVelocity,

            velocityY:
                directionY *
                forwardVelocity +
                perpendicularY *
                lateralVelocity,

            windAccelerationX:
                windAcceleration.x,

            windAccelerationY:
                windAcceleration.y,

            windInfluenceStartMultiplier:
                this.definition
                    .windInfluenceStartMultiplier,

            windInfluenceFullFraction:
                this.definition
                    .windInfluenceFullFraction,

            windInfluenceResponseExponent:
                this.definition
                    .windInfluenceResponseExponent,

            orientToVelocity:
                true,

            orientationFollowSpeed:
                this.definition
                    .orientationFollowSpeed,

            angularVelocityRetention:
                this.definition
                    .angularVelocityRetention,

            lifetime:
                this.randomRange(
                    particle
                        .lifetimeMinimum,
                    particle
                        .lifetimeMaximum,
                ) *
                lifetimeMultiplier,

            startScaleX:
                this.randomRange(
                    particle
                        .startScaleXMinimum,
                    particle
                        .startScaleXMaximum,
                ) *
                startScaleMultiplier,

            startScaleY:
                this.randomRange(
                    particle
                        .startScaleYMinimum,
                    particle
                        .startScaleYMaximum,
                ) *
                startScaleMultiplier,

            endScaleX:
                this.randomRange(
                    particle
                        .endScaleXMinimum,
                    particle
                        .endScaleXMaximum,
                ) *
                endScaleMultiplier,

            endScaleY:
                this.randomRange(
                    particle
                        .endScaleYMinimum,
                    particle
                        .endScaleYMaximum,
                ) *
                endScaleMultiplier,

            maximumAlpha:
                this.clamp01(
                    this.randomRange(
                        particle
                            .alphaMinimum,
                        particle
                            .alphaMaximum,
                    ) *
                    alphaMultiplier,
                ),

            /*
             * Start almost aligned with the source direction. Particle
             * velocity-following then keeps the elongated mask aligned as
             * turbulence or Wind bends the stream.
             */
            rotation:
                sourceDirection +
                Math.PI /
                2 +
                this.randomRange(
                    -0.08,
                    0.08,
                ),

            angularVelocity:
                this.randomRange(
                    particle
                        .angularVelocityMinimum,
                    particle
                        .angularVelocityMaximum,
                ),

            flickerPhase:
                Math.random() *
                Math.PI *
                2,

            flickerSpeed:
                this.randomRange(
                    particle
                        .flickerSpeedMinimum,
                    particle
                        .flickerSpeedMaximum,
                ),

            flickerAmount:
                this.randomRange(
                    particle
                        .flickerAmountMinimum,
                    particle
                        .flickerAmountMaximum,
                ),

            growEndFraction:
                particle
                    .emergenceEndFraction,

            shrinkStartFraction:
                particle
                    .fadeStartFraction,

            turbulenceAmplitude:
                this.randomRange(
                    particle
                        .turbulenceAmplitudeMinimum,
                    particle
                        .turbulenceAmplitudeMaximum,
                ) *
                0.72,

            turbulenceFrequency:
                this.randomRange(
                    particle
                        .turbulenceFrequencyMinimum,
                    particle
                        .turbulenceFrequencyMaximum,
                ),

            tint:
                role.tint,
        };
    }

    private getLocalWindAcceleration(
        worldX:
            number,

        worldY:
            number,
    ): {
        readonly x: number;
        readonly y: number;
    } {

        const sampled =
            this.localWindSystem
                .getAccelerationAt(
                    worldX,
                    worldY,
                );

        const sampledX =
            Number.isFinite(
                sampled.x,
            )
                ? sampled.x
                : 0;

        const sampledY =
            Number.isFinite(
                sampled.y,
            )
                ? sampled.y
                : 0;

        let accelerationX =
            sampledX *
            Math.max(
                0,
                this.definition
                    .localWindAccelerationMultiplier,
            );

        let accelerationY =
            sampledY *
            Math.max(
                0,
                this.definition
                    .localWindAccelerationMultiplier,
            );

        const magnitude =
            Math.sqrt(
                accelerationX *
                accelerationX +
                accelerationY *
                accelerationY,
            );

        const maximumMagnitude =
            Math.max(
                0,
                this.definition
                    .maximumLocalWindAcceleration,
            );

        if (
            maximumMagnitude > 0 &&
            magnitude >
            maximumMagnitude
        ) {
            const scale =
                maximumMagnitude /
                magnitude;

            accelerationX *=
                scale;

            accelerationY *=
                scale;
        }

        return {
            x:
                accelerationX,

            y:
                accelerationY,
        };
    }

    private selectMaterialLayer():
        FireParticleMaterialLayer {

        return (
            Math.random() <
                this.clamp01(
                    this.particleDefinition
                        .material
                        .detailParticleChance,
                )
                ? "detail"
                : "main"
        );
    }

    private selectThermalRole():
        FireParticleThermalRoleDefinition {

        const hot =
            this.particleDefinition
                .thermalRoles
                .hot;

        const body =
            this.particleDefinition
                .thermalRoles
                .body;

        const cool =
            this.particleDefinition
                .thermalRoles
                .cool;

        /*
         * Jet-specific weighting keeps the nozzle visibly hotter while still
         * using the exact same authored thermal materials.
         */
        const hotWeight =
            Math.max(
                0,
                hot.weight *
                1.65,
            );

        const bodyWeight =
            Math.max(
                0,
                body.weight *
                1.05,
            );

        const coolWeight =
            Math.max(
                0,
                cool.weight *
                0.78,
            );

        const totalWeight =
            hotWeight +
            bodyWeight +
            coolWeight;

        if (
            totalWeight <=
            0
        ) {
            return body;
        }

        const roll =
            Math.random() *
            totalWeight;

        if (
            roll <
            hotWeight
        ) {
            return hot;
        }

        if (
            roll <
            hotWeight +
            bodyWeight
        ) {
            return body;
        }

        return cool;
    }

    private getOrCreateEmitterState(
        source:
            FireSource,
    ): JetFireEmitterState {

        const existing =
            this.emitterStates
                .get(
                    source,
                );

        if (existing) {
            return existing;
        }

        if (
            this.emitterStates.size >=
            Math.max(
                1,
                this.definition
                    .emitterState
                    .maximumTrackedStates,
            )
        ) {
            this.removeOldestEmitterState();
        }

        const state:
            JetFireEmitterState = {
            fractionalCarry:
                0,

            lastSeenUpdate:
                this.updateSerial,
        };

        this.emitterStates.set(
            source,
            state,
        );

        return state;
    }

    private cleanupInactiveEmitterStates():
        void {

        this.emitterStates.forEach(
            (
                state,
                source,
            ): void => {

                if (
                    state.lastSeenUpdate !==
                    this.updateSerial
                ) {
                    this.emitterStates.delete(
                        source,
                    );
                }
            },
        );
    }

    private removeOldestEmitterState():
        void {

        let oldestSource:
            FireSource | null =
            null;

        let oldestUpdate =
            Number.POSITIVE_INFINITY;

        this.emitterStates.forEach(
            (
                state,
                source,
            ): void => {

                if (
                    state.lastSeenUpdate <
                    oldestUpdate
                ) {
                    oldestUpdate =
                        state.lastSeenUpdate;

                    oldestSource =
                        source;
                }
            },
        );

        if (oldestSource) {
            this.emitterStates.delete(
                oldestSource,
            );
        }
    }

    private randomRange(
        minimum:
            number,

        maximum:
            number,
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

    private clamp01(
        value:
            number,
    ): number {

        return Math.max(
            0,
            Math.min(
                1,
                value,
            ),
        );
    }
}

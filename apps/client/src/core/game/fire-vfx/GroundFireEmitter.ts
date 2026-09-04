import {
    DEFAULT_FIRE_PARTICLE_VFX_DEFINITION,
} from "../config/FireParticleVfxDefinition";

import type {
    FireParticleMaterialLayer,
    FireParticleThermalRoleDefinition,
    FireParticleVfxDefinition,
} from "../config/FireParticleVfxDefinition";

import {
    DEFAULT_GROUND_FIRE_VFX_DEFINITION,
} from "../config/GroundFireVfxDefinition";

import {
    DEFAULT_FIRE_WIND_VFX_DEFINITION,
} from "../config/FireWindVfxDefinition";

import type {
    FireWindVfxDefinition,
} from "../config/FireWindVfxDefinition";

import type {
    GroundFireVfxDefinition,
} from "../config/GroundFireVfxDefinition";

import type {
    FireManager,
} from "../environment/FireManager";

import type {
    LocalWindSystem,
} from "../environment/LocalWindSystem";

import type {
    FireCell,
} from "../environment/FireCell";

import type {
    FireVfxParticleActivation,
} from "./FireVfxParticle";

import type {
    FireVfxTextureVariant,
} from "./FireVfxSystem";

export type GroundFireEmitterSpawnCallback =
    (
        variant:
            FireVfxTextureVariant,

        materialLayer:
            FireParticleMaterialLayer,

        activation:
            FireVfxParticleActivation,
    ) => boolean;

/**
 * FIRE-VFX-4 presentation bridge between FireManager, LocalWindSystem,
 * and FireVfxPool.
 *
 * Authoritative relationship:
 *
 * FireManager
 *     ↓ read only
 * GroundFireEmitter ← read only ← LocalWindSystem
 *     ↓ visualEnergy + sampled visual Wind acceleration
 * FireVfxSystem / FireVfxPool
 *
 * FireCells remain invisible simulation records.
 *
 * visualEnergy is presentation-only and controls:
 * - emission
 * - particle scale
 * - particle alpha
 * - particle speed
 *
 * Fuel/moisture response is already represented by authoritative FireCell
 * intensity in the current FireManager, so this renderer does not duplicate
 * EnvironmentField queries.
 *
 * Persistent per-cell emission carry remains FIRE-VFX-3C.
 */
interface GroundFireEmitterState {
    fractionalCarry: number;
    lastSeenUpdate: number;
}

export class GroundFireEmitter {

    private readonly emitterStates =
        new Map<FireCell, GroundFireEmitterState>();

    private updateSerial =
        0;

    public constructor(
        private readonly fireManager:
            FireManager,

        private readonly localWindSystem:
            LocalWindSystem,

        private readonly spawnParticle:
            GroundFireEmitterSpawnCallback,

        private readonly definition:
            GroundFireVfxDefinition =
            DEFAULT_GROUND_FIRE_VFX_DEFINITION,

        private readonly particleDefinition:
            FireParticleVfxDefinition =
            DEFAULT_FIRE_PARTICLE_VFX_DEFINITION,

        private readonly windDefinition:
            FireWindVfxDefinition =
            DEFAULT_FIRE_WIND_VFX_DEFINITION,
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
            deltaTime <= 0
        ) {
            return;
        }

        this.updateSerial += 1;

        const cells =
            this.fireManager.getActiveCells();

        if (cells.length === 0) {
            this.emitterStates.clear();
            return;
        }

        const cellSize =
            Math.max(
                1,
                this.fireManager.getDefinition().cellSize,
            );

        for (const cell of cells) {
            if (!cell) {
                continue;
            }

            const state =
                this.getOrCreateEmitterState(cell);

            state.lastSeenUpdate =
                this.updateSerial;

            this.emitFromCell(
                cell,
                state,
                cellSize,
                deltaTime,
            );
        }

        this.cleanupInactiveEmitterStates();
    }

    public reset():
        void {

        this.emitterStates.clear();
        this.updateSerial = 0;
    }

    public destroy():
        void {

        this.reset();
    }

    private emitFromCell(
        cell:
            FireCell,

        state:
            GroundFireEmitterState,

        cellSize:
            number,

        deltaTime:
            number,
    ): void {

        const intensity =
            this.clamp01(
                cell.getIntensity(),
            );

        if (
            intensity <
            this.definition
                .minimumIntensity
        ) {
            return;
        }

        const visualEnergy =
            this.calculateVisualEnergy(
                cell,
                intensity,
            );

        if (
            visualEnergy <=
            0
        ) {
            return;
        }

        const energyDefinition =
            this.definition
                .visualEnergy;

        const emissionMultiplier =
            this.lerp(
                energyDefinition
                    .minimumEmissionMultiplier,
                energyDefinition
                    .maximumEmissionMultiplier,
                visualEnergy,
            );

        const particlesPerSecond =
            Math.max(
                0,
                this.definition
                    .particlesPerSecondPerCell,
            ) *
            emissionMultiplier;

        if (
            particlesPerSecond <=
            0
        ) {
            return;
        }

        /*
         * FIRE-VFX-3C deterministic per-cell emission carry.
         */
        state.fractionalCarry +=
            particlesPerSecond *
            deltaTime;

        const requestedSpawnCount =
            Math.floor(state.fractionalCarry);

        const spawnCount =
            Math.min(
                requestedSpawnCount,
                Math.max(
                    1,
                    this.definition
                        .maximumSpawnsPerCellPerFrame,
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
            let spawnIndex =
                0;

            spawnIndex <
            spawnCount;

            spawnIndex +=
            1
        ) {
            this.spawnOne(
                cell,
                cellSize,
                visualEnergy,
            );
        }
    }

    private calculateVisualEnergy(
        cell:
            FireCell,

        intensity:
            number,
    ): number {

        const fireLifetime =
            Math.max(
                0.0001,
                this.fireManager
                    .getDefinition()
                    .lifetime,
            );

        const ageProgress =
            this.clamp01(
                cell.getAge() /
                fireLifetime,
            );

        const ignitionRampEnd =
            Math.max(
                0.0001,
                this.definition
                    .visualEnergy
                    .ignitionRampLifetimeFraction,
            );

        const ignitionProgress =
            this.clamp01(
                ageProgress /
                ignitionRampEnd,
            );

        /*
         * Smoothstep gives one one-way ignition build-up with no oscillation:
         *
         * 0 -> quickly establish -> 1
         */
        const ageFactor =
            this.smoothStep(
                ignitionProgress,
            );

        /*
         * Current FireManager already computes FireCell intensity from the
         * authoritative combustion state, including age and fuel/moisture
         * response. We shape that value here rather than sampling the
         * EnvironmentField a second time in presentation code.
         */
        const intensityFactor =
            Math.pow(
                intensity,
                Math.max(
                    0.01,
                    this.definition
                        .visualEnergy
                        .intensityExponent,
                ),
            );

        return this.clamp01(
            ageFactor *
            intensityFactor,
        );
    }

    private spawnOne(
        cell:
            FireCell,

        cellSize:
            number,

        visualEnergy:
            number,
    ): void {

        const thermalRole =
            this.selectThermalRole();

        const materialLayer =
            this.selectMaterialLayer();

        const activation =
            this.createActivation(
                cell,
                cellSize,
                thermalRole,
                visualEnergy,
            );

        this.spawnParticle(
            thermalRole
                .textureVariant,

            materialLayer,

            activation,
        );
    }

    private selectMaterialLayer():
        FireParticleMaterialLayer {

        const detailChance =
            this.clamp01(
                this.particleDefinition
                    .material
                    .detailParticleChance,
            );

        return (
            Math.random() <
                detailChance
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

        const hotWeight =
            Math.max(
                0,
                hot.weight,
            );

        const bodyWeight =
            Math.max(
                0,
                body.weight,
            );

        const coolWeight =
            Math.max(
                0,
                cool.weight,
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

    private createActivation(
        cell:
            FireCell,

        cellSize:
            number,

        role:
            FireParticleThermalRoleDefinition,

        visualEnergy:
            number,
    ): FireVfxParticleActivation {

        const particle =
            this.particleDefinition
                .particle;

        const energyDefinition =
            this.definition
                .visualEnergy;

        const halfCell =
            cellSize *
            0.5;

        const spawnRadiusX =
            halfCell *
            Math.max(
                0,
                this.definition
                    .spawnHalfWidthMultiplier,
            ) +
            Math.max(
                0,
                this.definition
                    .spawnOverscanX,
            );

        const spawnRadiusY =
            halfCell *
            Math.max(
                0,
                this.definition
                    .spawnHalfHeightMultiplier,
            ) +
            Math.max(
                0,
                this.definition
                    .spawnOverscanY,
            );

        const angle =
            Math.random() *
            Math.PI *
            2;

        const radius =
            Math.sqrt(
                Math.random(),
            );

        const spawnOffsetX =
            Math.cos(
                angle,
            ) *
            spawnRadiusX *
            radius;

        const spawnOffsetY =
            Math.sin(
                angle,
            ) *
            spawnRadiusY *
            radius;

        const energySpeedMultiplier =
            this.lerp(
                energyDefinition
                    .minimumSpeedMultiplier,
                energyDefinition
                    .maximumSpeedMultiplier,
                visualEnergy,
            );

        const energyScaleMultiplier =
            this.lerp(
                energyDefinition
                    .minimumScaleMultiplier,
                energyDefinition
                    .maximumScaleMultiplier,
                visualEnergy,
            );

        const energyAlphaMultiplier =
            this.lerp(
                energyDefinition
                    .minimumAlphaMultiplier,
                energyDefinition
                    .maximumAlphaMultiplier,
                visualEnergy,
            );

        const speedMultiplier =
            Math.max(
                0,
                role.speedMultiplier *
                energySpeedMultiplier,
            );

        const scaleMultiplier =
            Math.max(
                0,
                role.scaleMultiplier *
                energyScaleMultiplier,
            );

        const lifetimeMultiplier =
            Math.max(
                0.001,
                role.lifetimeMultiplier,
            );

        const alphaMultiplier =
            Math.max(
                0,
                role.alphaMultiplier *
                energyAlphaMultiplier,
            );

        const spawnX =
            cell.getWorldCenterX() +
            spawnOffsetX;

        const spawnY =
            cell.getWorldCenterY() +
            spawnOffsetY;

        /*
         * FIRE-VFX-4B samples authoritative local airflow once per spawned
         * particle and derives:
         *
         * - immediate Wind velocity contribution
         * - upward buoyancy suppression
         * - continuing Wind acceleration
         *
         * This avoids a LocalWindSystem query for every active particle on
         * every frame while making strong Wind readable immediately.
         */
        const windResponse =
            this.getVisualWindResponse(
                spawnX,
                spawnY,
            );

        const authoredVelocityX =
            this.randomRange(
                particle
                    .horizontalVelocityMinimum,
                particle
                    .horizontalVelocityMaximum,
            ) *
            speedMultiplier;

        const authoredVelocityY =
            this.randomRange(
                particle
                    .upwardVelocityMinimum,
                particle
                    .upwardVelocityMaximum,
            ) *
            speedMultiplier;

        /*
         * Strong Wind suppresses only the authored upward buoyancy.
         *
         * Downward authored motion, if introduced by future particle
         * definitions, is preserved.
         */
        const upwardSuppressionMultiplier =
            authoredVelocityY <
                0
                ? 1 -
                windResponse
                    .upwardVelocitySuppression
                : 1;

        const initialVelocityX =
            authoredVelocityX +
            windResponse
                .velocityContributionX;

        const initialVelocityY =
            authoredVelocityY *
            upwardSuppressionMultiplier +
            windResponse
                .velocityContributionY;

        return {
            x:
                spawnX,

            y:
                spawnY,

            velocityX:
                initialVelocityX,

            velocityY:
                initialVelocityY,

            windAccelerationX:
                windResponse
                    .accelerationX,

            windAccelerationY:
                windResponse
                    .accelerationY,

            orientToVelocity:
                windResponse
                    .strength >
                0,

            orientationFollowSpeed:
                this.windDefinition
                    .orientationFollowSpeed,

            angularVelocityRetention:
                this.windDefinition
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
                scaleMultiplier,

            startScaleY:
                this.randomRange(
                    particle
                        .startScaleYMinimum,
                    particle
                        .startScaleYMaximum,
                ) *
                scaleMultiplier,

            endScaleX:
                this.randomRange(
                    particle
                        .endScaleXMinimum,
                    particle
                        .endScaleXMaximum,
                ) *
                scaleMultiplier,

            endScaleY:
                this.randomRange(
                    particle
                        .endScaleYMinimum,
                    particle
                        .endScaleYMaximum,
                ) *
                scaleMultiplier,

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

            rotation:
                this.randomRange(
                    particle
                        .rotationMinimum,
                    particle
                        .rotationMaximum,
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
                ),

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

    private getVisualWindResponse(
        worldX:
            number,

        worldY:
            number,
    ): {
        readonly accelerationX: number;
        readonly accelerationY: number;
        readonly velocityContributionX: number;
        readonly velocityContributionY: number;
        readonly upwardVelocitySuppression: number;
        readonly strength: number;
    } {

        if (
            !this.windDefinition.enabled
        ) {
            return {
                accelerationX: 0,
                accelerationY: 0,
                velocityContributionX: 0,
                velocityContributionY: 0,
                upwardVelocitySuppression: 0,
                strength: 0,
            };
        }

        const sampled =
            this.localWindSystem
                .getAccelerationAt(
                    worldX,
                    worldY,
                );

        const sourceX =
            Number.isFinite(
                sampled.x,
            )
                ? sampled.x
                : 0;

        const sourceY =
            Number.isFinite(
                sampled.y,
            )
                ? sampled.y
                : 0;

        const sourceMagnitude =
            Math.sqrt(
                sourceX *
                sourceX +
                sourceY *
                sourceY,
            );

        if (
            sourceMagnitude <
            Math.max(
                0,
                this.windDefinition
                    .minimumSourceAcceleration,
            )
        ) {
            return {
                accelerationX: 0,
                accelerationY: 0,
                velocityContributionX: 0,
                velocityContributionY: 0,
                upwardVelocitySuppression: 0,
                strength: 0,
            };
        }

        const strength =
            this.clamp01(
                sourceMagnitude /
                Math.max(
                    0.0001,
                    this.windDefinition
                        .sourceAccelerationForMaximumStrength,
                ),
            );

        const directionX =
            sourceX /
            Math.max(
                0.0001,
                sourceMagnitude,
            );

        const directionY =
            sourceY /
            Math.max(
                0.0001,
                sourceMagnitude,
            );

        // ---------------------------------------------------
        // Immediate velocity contribution
        // ---------------------------------------------------

        const requestedVelocityMagnitude =
            sourceMagnitude *
            Math.max(
                0,
                this.windDefinition
                    .velocityContributionTime,
            );

        const velocityMagnitude =
            Math.min(
                Math.max(
                    0,
                    this.windDefinition
                        .maximumVelocityContribution,
                ),
                requestedVelocityMagnitude,
            );

        // ---------------------------------------------------
        // Continuing acceleration
        // ---------------------------------------------------

        const requestedAccelerationMagnitude =
            sourceMagnitude *
            Math.max(
                0,
                this.windDefinition
                    .accelerationMultiplier,
            );

        const accelerationMagnitude =
            Math.min(
                Math.max(
                    0,
                    this.windDefinition
                        .maximumParticleAcceleration,
                ),
                requestedAccelerationMagnitude,
            );

        return {
            accelerationX:
                directionX *
                accelerationMagnitude,

            accelerationY:
                directionY *
                accelerationMagnitude,

            velocityContributionX:
                directionX *
                velocityMagnitude,

            velocityContributionY:
                directionY *
                velocityMagnitude,

            upwardVelocitySuppression:
                this.clamp01(
                    this.windDefinition
                        .maximumUpwardVelocitySuppression *
                    strength,
                ),

            strength,
        };
    }

    private getOrCreateEmitterState(
        cell:
            FireCell,
    ): GroundFireEmitterState {

        const existing =
            this.emitterStates.get(cell);

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
            GroundFireEmitterState = {
            fractionalCarry: 0,
            lastSeenUpdate: this.updateSerial,
        };

        this.emitterStates.set(
            cell,
            state,
        );

        return state;
    }

    private cleanupInactiveEmitterStates():
        void {

        this.emitterStates.forEach(
            (
                state,
                cell,
            ) => {

                if (
                    state.lastSeenUpdate !==
                    this.updateSerial
                ) {
                    this.emitterStates.delete(
                        cell,
                    );
                }
            },
        );
    }

    private removeOldestEmitterState():
        void {

        let oldestCell:
            FireCell | null =
            null;

        let oldestUpdate =
            Number.POSITIVE_INFINITY;

        this.emitterStates.forEach(
            (
                state,
                cell,
            ) => {

                if (
                    state.lastSeenUpdate <
                    oldestUpdate
                ) {
                    oldestUpdate =
                        state.lastSeenUpdate;

                    oldestCell =
                        cell;
                }
            },
        );

        if (oldestCell) {
            this.emitterStates.delete(
                oldestCell,
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

    private lerp(
        start:
            number,

        end:
            number,

        amount:
            number,
    ): number {

        return (
            start +
            (
                end -
                start
            ) *
            this.clamp01(
                amount,
            )
        );
    }

    private smoothStep(
        value:
            number,
    ): number {

        const t =
            this.clamp01(
                value,
            );

        return (
            t *
            t *
            (
                3 -
                2 *
                t
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

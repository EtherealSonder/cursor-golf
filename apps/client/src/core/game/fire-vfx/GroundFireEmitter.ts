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

import type {
    GroundFireVfxDefinition,
} from "../config/GroundFireVfxDefinition";

import type {
    FireManager,
} from "../environment/FireManager";

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
 * FIRE-VFX-3A presentation bridge between FireManager and FireVfxPool.
 *
 * Authoritative relationship:
 *
 * FireManager
 *     ↓ read only
 * GroundFireEmitter
 *     ↓ presentation spawn request
 * FireVfxSystem / FireVfxPool
 *
 * A FireCell is never drawn directly.
 * Each cell behaves only as an invisible probabilistic emitter region.
 *
 * FIRE-VFX-3A intentionally uses only cell intensity for emission strength.
 * Age/fuel visual-energy curves and persistent per-cell emission carry are
 * deferred to FIRE-VFX-3B / 3C.
 */
export class GroundFireEmitter {

    public constructor(
        private readonly fireManager:
            FireManager,

        private readonly spawnParticle:
            GroundFireEmitterSpawnCallback,

        private readonly definition:
            GroundFireVfxDefinition =
            DEFAULT_GROUND_FIRE_VFX_DEFINITION,

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
            !Number.isFinite(
                deltaTime,
            ) ||
            deltaTime <=
            0
        ) {
            return;
        }

        const cells =
            this.fireManager
                .getActiveCells();

        if (
            cells.length ===
            0
        ) {
            return;
        }

        const cellSize =
            Math.max(
                1,
                this.fireManager
                    .getDefinition()
                    .cellSize,
            );

        for (
            let index =
                0;

            index <
            cells.length;

            index +=
            1
        ) {
            const cell =
                cells[index];

            if (!cell) {
                continue;
            }

            this.emitFromCell(
                cell,
                cellSize,
                deltaTime,
            );
        }
    }

    public reset():
        void {

        /*
         * FIRE-VFX-3A is deliberately stateless.
         *
         * FIRE-VFX-3C will introduce persistent per-cell emission carry and
         * this method will then clear those emitter states.
         */
    }

    public destroy():
        void {

        this.reset();
    }

    private emitFromCell(
        cell:
            FireCell,

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

        const particlesPerSecond =
            Math.max(
                0,
                this.definition
                    .particlesPerSecondPerCell,
            ) *
            intensity;

        if (
            particlesPerSecond <=
            0
        ) {
            return;
        }

        /*
         * FIRE-VFX-3A intentionally avoids persistent per-cell bookkeeping.
         *
         * Integer expected spawns are emitted directly. The fractional
         * remainder is treated as a probability, giving the correct average
         * emission rate without exposing the simulation grid visually.
         *
         * Persistent fractional carry is the explicit FIRE-VFX-3C step.
         */
        const expectedSpawns =
            particlesPerSecond *
            deltaTime;

        let spawnCount =
            Math.floor(
                expectedSpawns,
            );

        const fractionalSpawn =
            expectedSpawns -
            spawnCount;

        if (
            Math.random() <
            fractionalSpawn
        ) {
            spawnCount +=
                1;
        }

        spawnCount =
            Math.min(
                spawnCount,
                Math.max(
                    1,
                    this.definition
                        .maximumSpawnsPerCellPerFrame,
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
            );
        }
    }

    private spawnOne(
        cell:
            FireCell,

        cellSize:
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
    ): FireVfxParticleActivation {

        const particle =
            this.particleDefinition
                .particle;

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

        /*
         * sqrt(random) distributes samples uniformly over the ellipse area.
         *
         * Because neighbouring cells use overlapping emitter regions, the
         * resulting Fire should read as one particle field rather than as
         * a sequence of 48 px cell-centre stamps.
         */
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

        const speedMultiplier =
            Math.max(
                0,
                role.speedMultiplier,
            );

        const scaleMultiplier =
            Math.max(
                0,
                role.scaleMultiplier,
            );

        const lifetimeMultiplier =
            Math.max(
                0.001,
                role.lifetimeMultiplier,
            );

        const alphaMultiplier =
            Math.max(
                0,
                role.alphaMultiplier,
            );

        return {
            x:
                cell.getWorldCenterX() +
                spawnOffsetX,

            y:
                cell.getWorldCenterY() +
                spawnOffsetY,

            velocityX:
                this.randomRange(
                    particle
                        .horizontalVelocityMinimum,
                    particle
                        .horizontalVelocityMaximum,
                ) *
                speedMultiplier,

            velocityY:
                this.randomRange(
                    particle
                        .upwardVelocityMinimum,
                    particle
                        .upwardVelocityMaximum,
                ) *
                speedMultiplier,

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

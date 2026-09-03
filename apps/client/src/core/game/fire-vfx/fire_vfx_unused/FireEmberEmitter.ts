import {
    DEFAULT_FIRE_EMBER_VFX_DEFINITION,
} from "../config/FireEmberVfxDefinition";

import type {
    FireEmberVfxDefinition,
} from "../config/FireEmberVfxDefinition";

import type {
    FireManager,
} from "../environment/FireManager";

import type {
    FireCell,
} from "../environment/FireCell";

import type {
    LocalWindSystem,
} from "../environment/LocalWindSystem";

import type {
    FireVfxSystem,
} from "./FireVfxSystem";

/**
 * Sparse Wind-aware ember emitter.
 *
 * Embers are presentation-only and do not ignite terrain. Gameplay spot-fire
 * behavior remains intentionally deferred.
 */
export class FireEmberEmitter {
    private readonly carry =
        new Map<string, number>();

    private readonly sequence =
        new Map<string, number>();

    private estimatedVisibleEmbers =
        0;

    public constructor(
        private readonly fireManager:
            FireManager,

        private readonly localWindSystem:
            LocalWindSystem,

        private readonly fireVfxSystem:
            FireVfxSystem,

        private readonly definition:
            FireEmberVfxDefinition =
            DEFAULT_FIRE_EMBER_VFX_DEFINITION,
    ) { }

    public update(
        deltaTime: number,
    ): void {

        if (
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return;
        }

        /*
         * This estimate intentionally decays. It is a cheap visual cap rather
         * than a second particle-authority system.
         */
        this.estimatedVisibleEmbers =
            Math.max(
                0,
                this.estimatedVisibleEmbers -
                deltaTime *
                12,
            );

        if (
            this.estimatedVisibleEmbers >=
            this.definition
                .maximumVisibleEmbers
        ) {
            return;
        }

        const cells =
            this.fireManager
                .getActiveCells();

        for (
            let index = 0;
            index <
            cells.length;
            index += 1
        ) {
            if (
                this.estimatedVisibleEmbers >=
                this.definition
                    .maximumVisibleEmbers
            ) {
                break;
            }

            this.updateCell(
                cells[index],
                deltaTime,
            );
        }
    }

    public reset():
        void {

        this.carry.clear();

        this.sequence.clear();

        this.estimatedVisibleEmbers =
            0;
    }

    private updateCell(
        cell: FireCell,
        deltaTime: number,
    ): void {

        const intensity =
            this.clamp01(
                cell.getIntensity(),
            );

        const youngFactor =
            1 -
            this.clamp01(
                cell.getAge() /
                2.4,
            );

        const heatFactor =
            intensity *
            (
                0.45 +
                youngFactor *
                0.55
            );

        if (
            heatFactor <
            0.32
        ) {
            return;
        }

        const key =
            `${cell.getGridX()}:` +
            `${cell.getGridY()}`;

        const rate =
            this.lerp(
                this.definition
                    .minimumSpawnRatePerHotCell,
                this.definition
                    .maximumSpawnRatePerHotCell,
                heatFactor,
            );

        let budget =
            (
                this.carry.get(
                    key,
                ) ??
                0
            ) +
            rate *
            deltaTime;

        if (budget < 1) {
            this.carry.set(
                key,
                budget,
            );

            return;
        }

        budget -=
            1;

        this.carry.set(
            key,
            budget,
        );

        const sequence =
            this.sequence.get(
                key,
            ) ??
            0;

        this.sequence.set(
            key,
            sequence +
            1,
        );

        this.spawn(
            cell,
            sequence,
            heatFactor,
        );
    }

    private spawn(
        cell: FireCell,
        sequence: number,
        heatFactor: number,
    ): void {

        const seed =
            cell.getGridX() *
            73856093 ^
            cell.getGridY() *
            19349663 ^
            sequence *
            83492791;

        const angle =
            this.random01(
                seed +
                11,
            ) *
            Math.PI *
            2;

        const radius =
            Math.sqrt(
                this.random01(
                    seed +
                    17,
                ),
            ) *
            this.definition
                .maximumSpawnRadius;

        const x =
            cell.getWorldCenterX() +
            Math.cos(
                angle,
            ) *
            radius;

        const y =
            cell.getWorldCenterY() +
            Math.sin(
                angle,
            ) *
            radius;

        const wind =
            this.localWindSystem
                .getAccelerationAt(
                    x,
                    y,
                );

        const baseAngle =
            this.random01(
                seed +
                23,
            ) *
            Math.PI *
            2;

        const baseSpeed =
            this.lerp(
                this.definition
                    .minimumBaseSpeed,
                this.definition
                    .maximumBaseSpeed,
                this.random01(
                    seed +
                    29,
                ),
            );

        const scale =
            this.lerp(
                this.definition
                    .minimumScale,
                this.definition
                    .maximumScale,
                this.random01(
                    seed +
                    31,
                ),
            ) *
            this.lerp(
                0.82,
                1,
                heatFactor,
            );

        this.fireVfxSystem
            .emitParticle(
                "ember",
                {
                    x,
                    y,

                    velocityX:
                        Math.cos(
                            baseAngle,
                        ) *
                        baseSpeed +
                        wind.x *
                        this.definition
                            .windAccelerationMultiplier,

                    velocityY:
                        Math.sin(
                            baseAngle,
                        ) *
                        baseSpeed -
                        6 +
                        wind.y *
                        this.definition
                            .windAccelerationMultiplier,

                    lifetime:
                        this.lerp(
                            this.definition
                                .minimumLifetime,
                            this.definition
                                .maximumLifetime,
                            this.random01(
                                seed +
                                37,
                            ),
                        ),

                    startScaleX:
                        scale,

                    startScaleY:
                        scale,

                    endScaleX:
                        scale *
                        0.22,

                    endScaleY:
                        scale *
                        0.22,

                    maximumAlpha:
                        this.lerp(
                            this.definition
                                .minimumAlpha,
                            this.definition
                                .maximumAlpha,
                            heatFactor,
                        ),

                    rotation:
                        0,

                    angularVelocity:
                        0,

                    flickerPhase:
                        this.random01(
                            seed +
                            41,
                        ) *
                        Math.PI *
                        2,

                    flickerSpeed:
                        14,

                    flickerAmount:
                        0.08,

                    growEndFraction:
                        0.08,

                    shrinkStartFraction:
                        0.44,

                    turbulenceAmplitude:
                        1.1,

                    turbulenceFrequency:
                        8,
                },
            );

        this.estimatedVisibleEmbers +=
            1;
    }

    private random01(
        seed: number,
    ): number {

        let value =
            seed |
            0;

        value ^=
            value << 13;

        value ^=
            value >>>
            17;

        value ^=
            value << 5;

        return (
            (value >>> 0) /
            4294967295
        );
    }

    private lerp(
        start: number,
        end: number,
        amount: number,
    ): number {

        return (
            start +
            (
                end -
                start
            ) *
            amount
        );
    }

    private clamp01(
        value: number,
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

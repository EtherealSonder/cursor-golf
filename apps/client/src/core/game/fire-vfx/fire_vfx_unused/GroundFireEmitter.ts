import type {
    FireManager,
} from "../environment/FireManager";

import type {
    FireCell,
} from "../environment/FireCell";

import type {
    FireVfxSystem,
    FireVfxTextureVariant,
} from "./FireVfxSystem";

/**
 * Secondary Ground Fire detail emitter.
 *
 * The connected Fire silhouette is now owned by GroundFireFieldRenderer.
 * This emitter deliberately produces only small flickers and hot accents.
 * Individual particles must never become the primary Fire body again.
 */
export class GroundFireEmitter {
    private readonly emissionCarry =
        new Map<string, number>();

    private readonly emissionSequence =
        new Map<string, number>();

    public constructor(
        private readonly fireManager:
            FireManager,

        private readonly fireVfxSystem:
            FireVfxSystem,
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

        const activeKeys =
            new Set<string>();

        const cells =
            this.fireManager
                .getActiveCells();

        for (
            let index = 0;
            index <
            cells.length;
            index += 1
        ) {
            const cell =
                cells[index];

            const key =
                this.getCellKey(
                    cell,
                );

            activeKeys.add(
                key,
            );

            this.emitForCell(
                cell,
                key,
                deltaTime,
            );
        }

        this.emissionCarry.forEach(
            (
                _carry: number,
                key: string,
            ) => {
                if (
                    activeKeys.has(
                        key,
                    )
                ) {
                    return;
                }

                this.emissionCarry
                    .delete(
                        key,
                    );

                this.emissionSequence
                    .delete(
                        key,
                    );
            },
        );
    }

    public reset():
        void {

        this.emissionCarry.clear();

        this.emissionSequence.clear();
    }

    private emitForCell(
        cell: FireCell,
        key: string,
        deltaTime: number,
    ): void {

        const intensity =
            this.clamp01(
                cell.getIntensity(),
            );

        if (intensity <= 0) {
            return;
        }

        const ageRamp =
            this.clamp01(
                cell.getAge() /
                0.18,
            );

        const visualStrength =
            intensity *
            ageRamp;

        /*
         * Intentionally sparse. The field renderer supplies continuous mass.
         */
        const emissionRate =
            this.lerp(
                2.5,
                10,
                visualStrength,
            );

        let carry =
            (
                this.emissionCarry
                    .get(
                        key,
                    ) ??
                0
            ) +
            emissionRate *
            deltaTime;

        const spawnCount =
            Math.min(
                Math.floor(
                    carry,
                ),
                2,
            );

        carry -=
            spawnCount;

        this.emissionCarry.set(
            key,
            carry,
        );

        let sequence =
            this.emissionSequence
                .get(
                    key,
                ) ??
            0;

        for (
            let index = 0;
            index <
            spawnCount;
            index += 1
        ) {
            this.emitDetailParticle(
                cell,
                sequence,
                visualStrength,
            );

            sequence +=
                1;
        }

        this.emissionSequence.set(
            key,
            sequence,
        );
    }

    private emitDetailParticle(
        cell: FireCell,
        sequence: number,
        visualStrength: number,
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
            18;

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

        const variant =
            this.chooseVariant(
                this.random01(
                    seed +
                    23,
                ),
            );

        const baseScale =
            this.lerp(
                0.16,
                0.30,
                this.random01(
                    seed +
                    29,
                ),
            ) *
            this.lerp(
                0.82,
                1,
                visualStrength,
            );

        this.fireVfxSystem
            .emitParticle(
                variant,
                {
                    x,
                    y,

                    velocityX:
                        (
                            this.random01(
                                seed +
                                31,
                            ) -
                            0.5
                        ) *
                        5,

                    velocityY:
                        -this.lerp(
                            4,
                            11,
                            this.random01(
                                seed +
                                37,
                            ),
                        ),

                    lifetime:
                        this.lerp(
                            0.24,
                            0.48,
                            this.random01(
                                seed +
                                41,
                            ),
                        ),

                    startScaleX:
                        baseScale,

                    startScaleY:
                        baseScale *
                        this.lerp(
                            1.05,
                            1.38,
                            this.random01(
                                seed +
                                43,
                            ),
                        ),

                    endScaleX:
                        baseScale *
                        0.88,

                    endScaleY:
                        baseScale *
                        1.12,

                    maximumAlpha:
                        variant ===
                            "core"
                            ? 0.92
                            : 0.72,

                    rotation:
                        (
                            this.random01(
                                seed +
                                47,
                            ) -
                            0.5
                        ) *
                        0.72,

                    angularVelocity:
                        (
                            this.random01(
                                seed +
                                53,
                            ) -
                            0.5
                        ) *
                        0.35,

                    flickerPhase:
                        this.random01(
                            seed +
                            59,
                        ) *
                        Math.PI *
                        2,

                    flickerSpeed:
                        12,

                    flickerAmount:
                        0.07,

                    growEndFraction:
                        0.16,

                    shrinkStartFraction:
                        0.70,

                    turbulenceAmplitude:
                        1.3,

                    turbulenceFrequency:
                        9,
                },
            );
    }

    private chooseVariant(
        value: number,
    ): FireVfxTextureVariant {

        if (value < 0.62) {
            return "core";
        }

        if (value < 0.91) {
            return "body";
        }

        return "accent";
    }

    private getCellKey(
        cell: FireCell,
    ): string {

        return (
            `${cell.getGridX()}:` +
            `${cell.getGridY()}`
        );
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
            value >>> 17;

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

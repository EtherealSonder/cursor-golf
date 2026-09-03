import {
    Container,
    Graphics,
} from "pixi.js";

import {
    GAME_COLOR_PALETTE,
} from "../config/GameColorPalette";

import {
    DEFAULT_GROUND_FIRE_BODY_VFX_DEFINITION,
} from "../config/GroundFireBodyVfxDefinition";

import type {
    GroundFireBodyVfxDefinition,
} from "../config/GroundFireBodyVfxDefinition";

import type {
    FireManager,
} from "../environment/FireManager";

import type {
    FireCell,
} from "../environment/FireCell";

interface GroundFireBodyInstance {
    readonly container: Container;
    readonly outer: Graphics;
    readonly body: Graphics;
    readonly core: Graphics;
    readonly phase: number;
}

/**
 * Continuous illustrated body layer for established Ground Fire.
 *
 * Each authoritative FireCell owns one reusable three-color body instance.
 * Adjacent instances deliberately overlap, producing one graphic Fire mass.
 * The renderer only reads Fire simulation state.
 */
export class GroundFireBodyRenderer {
    private readonly container =
        new Container();

    private readonly instances =
        new Map<
            string,
            GroundFireBodyInstance
        >();

    private elapsedTime =
        0;

    public constructor(
        private readonly fireManager:
            FireManager,

        private readonly definition:
            GroundFireBodyVfxDefinition =
            DEFAULT_GROUND_FIRE_BODY_VFX_DEFINITION,
    ) { }

    public getContainer():
        Container {

        return this.container;
    }

    public update(
        deltaTime: number,
    ): void {

        if (
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return;
        }

        this.elapsedTime +=
            deltaTime;

        const activeKeys =
            new Set<string>();

        const cells =
            this.fireManager
                .getActiveCells();

        for (
            let index = 0;
            index < cells.length;
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

            let instance =
                this.instances.get(
                    key,
                );

            if (!instance) {
                instance =
                    this.createInstance(
                        cell,
                    );

                this.instances.set(
                    key,
                    instance,
                );
            }

            this.updateInstance(
                instance,
                cell,
            );
        }

        this.instances.forEach(
            (
                instance:
                    GroundFireBodyInstance,
                key: string,
            ) => {
                if (
                    activeKeys.has(
                        key,
                    )
                ) {
                    return;
                }

                this.destroyInstance(
                    instance,
                );

                this.instances.delete(
                    key,
                );
            },
        );
    }

    public reset():
        void {

        this.instances.forEach(
            (
                instance:
                    GroundFireBodyInstance,
            ) => {
                this.destroyInstance(
                    instance,
                );
            },
        );

        this.instances.clear();

        this.elapsedTime =
            0;
    }

    public destroy():
        void {

        this.reset();

        this.container.destroy({
            children: false,
        });
    }

    private createInstance(
        cell: FireCell,
    ): GroundFireBodyInstance {

        const container =
            new Container();

        const outer =
            new Graphics();

        const body =
            new Graphics();

        const core =
            new Graphics();

        container.addChild(
            outer,
        );

        container.addChild(
            body,
        );

        container.addChild(
            core,
        );

        this.container.addChild(
            container,
        );

        const seed =
            this.getCellSeed(
                cell,
            );

        this.drawLobedShape(
            outer,
            this.definition
                .outerRadius,
            this.definition
                .outerLobeCount,
            seed +
            101,
            GAME_COLOR_PALETTE
                .fire.accent,
        );

        this.drawLobedShape(
            body,
            this.definition
                .innerRadius,
            this.definition
                .innerLobeCount,
            seed +
            211,
            GAME_COLOR_PALETTE
                .fire.body,
        );

        this.drawLobedShape(
            core,
            this.definition
                .hotCoreRadius,
            this.definition
                .hotCoreLobeCount,
            seed +
            307,
            GAME_COLOR_PALETTE
                .fire.core,
        );

        return {
            container,
            outer,
            body,
            core,
            phase:
                this.random01(
                    seed +
                    401,
                ) *
                Math.PI *
                2,
        };
    }

    private updateInstance(
        instance:
            GroundFireBodyInstance,
        cell: FireCell,
    ): void {

        const intensity =
            this.clamp01(
                cell.getIntensity(),
            );

        const ageRamp =
            this.clamp01(
                cell.getAge() /
                0.20,
            );

        const strength =
            intensity *
            ageRamp;

        if (strength <= 0) {
            instance.container.visible =
                false;

            return;
        }

        instance.container.visible =
            true;

        const pulse =
            Math.sin(
                this.elapsedTime *
                this.definition
                    .pulseSpeed +
                instance.phase,
            );

        const secondaryPulse =
            Math.sin(
                this.elapsedTime *
                (
                    this.definition
                        .pulseSpeed *
                    0.73
                ) +
                instance.phase *
                1.71,
            );

        const baseScale =
            this.lerp(
                this.definition
                    .minimumBodyScale,
                this.definition
                    .maximumBodyScale,
                Math.sqrt(
                    strength,
                ),
            );

        const scaleX =
            baseScale *
            (
                1 +
                pulse *
                this.definition
                    .pulseAmount
            );

        const scaleY =
            baseScale *
            (
                1 -
                pulse *
                this.definition
                    .pulseAmount *
                0.72
            );

        const wobbleX =
            Math.sin(
                this.elapsedTime *
                this.definition
                    .wobbleSpeed +
                instance.phase,
            ) *
            this.definition
                .positionWobble;

        const wobbleY =
            Math.cos(
                this.elapsedTime *
                (
                    this.definition
                        .wobbleSpeed *
                    0.81
                ) +
                instance.phase *
                1.23,
            ) *
            this.definition
                .positionWobble;

        instance.container.position.set(
            cell.getWorldCenterX() +
            wobbleX,
            cell.getWorldCenterY() +
            wobbleY,
        );

        instance.container.scale.set(
            scaleX,
            scaleY,
        );

        instance.container.rotation =
            secondaryPulse *
            0.055;

        instance.container.alpha =
            this.lerp(
                this.definition
                    .minimumAlpha,
                this.definition
                    .maximumAlpha,
                strength,
            );

        /*
         * Independent inner motion prevents the three flat color layers from
         * looking like a single static badge.
         */
        instance.body.position.set(
            secondaryPulse *
            1.6,
            -pulse *
            1.3,
        );

        instance.body.scale.set(
            1 +
            secondaryPulse *
            0.055,
            1 -
            secondaryPulse *
            0.035,
        );

        instance.core.position.set(
            -pulse *
            2.0,
            secondaryPulse *
            1.5,
        );

        instance.core.scale.set(
            0.92 +
            pulse *
            0.08,
            1.02 -
            pulse *
            0.06,
        );
    }

    private drawLobedShape(
        graphics: Graphics,
        radius: number,
        lobeCount: number,
        seed: number,
        color: number,
    ): void {

        graphics.clear();

        /*
         * Overlapping circles create a chunky illustrated amoeba/flame body.
         * They are intentionally not perfect radial blobs: every lobe gets a
         * deterministic angle, radius, offset, and scale.
         */
        graphics
            .circle(
                0,
                2,
                radius *
                0.70,
            )
            .fill({
                color,
                alpha: 1,
            });

        for (
            let index = 0;
            index < lobeCount;
            index += 1
        ) {
            const angle =
                (
                    index /
                    lobeCount
                ) *
                Math.PI *
                2 +
                (
                    this.random01(
                        seed +
                        index *
                        17,
                    ) -
                    0.5
                ) *
                0.62;

            const offset =
                radius *
                this.lerp(
                    0.31,
                    0.58,
                    this.random01(
                        seed +
                        index *
                        31 +
                        7,
                    ),
                );

            const lobeRadius =
                radius *
                this.lerp(
                    0.31,
                    0.50,
                    this.random01(
                        seed +
                        index *
                        47 +
                        13,
                    ),
                );

            const x =
                Math.cos(
                    angle,
                ) *
                offset;

            const y =
                Math.sin(
                    angle,
                ) *
                offset -
                (
                    this.random01(
                        seed +
                        index *
                        59 +
                        19,
                    ) *
                    radius *
                    0.12
                );

            graphics
                .circle(
                    x,
                    y,
                    lobeRadius,
                )
                .fill({
                    color,
                    alpha: 1,
                });
        }
    }

    private destroyInstance(
        instance:
            GroundFireBodyInstance,
    ): void {

        instance.container
            .removeFromParent();

        instance.container.destroy({
            children: true,
        });
    }

    private getCellKey(
        cell: FireCell,
    ): string {

        return (
            `${cell.getGridX()}:` +
            `${cell.getGridY()}`
        );
    }

    private getCellSeed(
        cell: FireCell,
    ): number {

        return (
            cell.getGridX() *
            73856093 ^
            cell.getGridY() *
            19349663
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

import {
    Container,
    Graphics,
} from "pixi.js";

import {
    FireSourceType,
} from "../config/FireSourceDefinition";

import type {
    FireSource,
} from "./FireSource";

import {
    DEFAULT_DIRECTIONAL_FIRE_SOURCE_DEFINITION,
} from "../config/DirectionalFireSourceDefinition";

import type {
    FireSourceSystem,
} from "./FireSourceSystem";

/**
 * Read-only development visualization for FireSource runtime state.
 *
 * This visualizer is intentionally presentation/debug only.
 * FireSourceSystem and EnvironmentField remain authoritative.
 */
export class FireSourceVisualizer {
    private readonly container =
        new Container();

    private readonly graphics =
        new Graphics();

    /*
     * Debug source geometry is hidden by default.
     *
     * It can still be enabled through the Fire Source Test UI whenever
     * source origin, direction, range, or sweep behavior needs inspection.
     */
    private debugVisible =
        false;

    constructor(
        private readonly fireSourceSystem:
            FireSourceSystem,
    ) {
        this.container.addChild(
            this.graphics,
        );
    }

    public setDebugVisible(
        visible: boolean,
    ): void {
        this.debugVisible =
            visible;

        if (!visible) {
            this.graphics.clear();
        }
    }

    public isDebugVisible():
        boolean {

        return this.debugVisible;
    }

    public update():
        void {

        this.graphics.clear();

        if (!this.debugVisible) {
            return;
        }

        for (
            const source
            of this.fireSourceSystem.getSources()
        ) {
            if (!source.isEnabled()) {
                continue;
            }

            /*
             * Point sources are one-shot emissions.
             * Once consumed, their marker disappears so presentation
             * matches source lifetime.
             */
            if (
                source.getType() ===
                FireSourceType.Point &&
                source.hasConsumedPointEmission()
            ) {
                continue;
            }

            this.drawSource(
                source,
            );
        }
    }

    public getContainer():
        Container {

        return this.container;
    }

    public destroy():
        void {

        this.graphics.destroy();

        this.container.destroy({
            children: false,
        });
    }

    private drawSource(
        source: FireSource,
    ): void {
        const x =
            source.getPositionX();

        const y =
            source.getPositionY();

        switch (
        source.getType()
        ) {
            case FireSourceType.Point:
                this.graphics
                    .circle(
                        x,
                        y,
                        10,
                    )
                    .fill({
                        color: 0xffd84a,
                        alpha: 0.80,
                    })
                    .circle(
                        x,
                        y,
                        4,
                    )
                    .fill({
                        color: 0xf47b45,
                        alpha: 1,
                    });

                break;

            case FireSourceType.Persistent:
                this.graphics
                    .circle(
                        x,
                        y,
                        14,
                    )
                    .fill({
                        color: 0x29243a,
                        alpha: 0.90,
                    })
                    .circle(
                        x,
                        y,
                        7,
                    )
                    .fill({
                        color: 0xf47b45,
                        alpha: 1,
                    });

                break;

            case FireSourceType.Directional:
                this.drawDirectionalSource(
                    source,
                );

                break;
        }
    }

    private drawDirectionalSource(
        source: FireSource,
    ): void {
        const definition =
            source.getDefinition();

        if (
            definition.type !==
            FireSourceType.Directional
        ) {
            return;
        }

        const tuning =
            DEFAULT_DIRECTIONAL_FIRE_SOURCE_DEFINITION;

        const x =
            source.getPositionX();

        const y =
            source.getPositionY();

        const direction =
            source.getDirectionRadians();

        const directionX =
            Math.cos(
                direction,
            );

        const directionY =
            Math.sin(
                direction,
            );

        const perpendicularX =
            -directionY;

        const perpendicularY =
            directionX;

        const endX =
            x +
            directionX *
            definition.length;

        const endY =
            y +
            directionY *
            definition.length;

        /*
         * Development-only representation of the emitted directional
         * Fire stream.
         *
         * This is NOT authoritative Fire simulation and will normally
         * remain hidden now that Phase 4B-6C/6D source validation is
         * complete.
         */
        const segmentSpacing =
            Math.max(
                4,
                tuning.visualSegmentSpacing,
            );

        const segmentCount =
            Math.max(
                1,
                Math.ceil(
                    definition.length /
                    segmentSpacing,
                ),
            );

        const age =
            source.getAge();

        for (
            let segmentIndex = 0;
            segmentIndex <= segmentCount;
            segmentIndex += 1
        ) {
            const normalizedDistance =
                segmentIndex /
                segmentCount;

            const distance =
                normalizedDistance *
                definition.length;

            const heatFalloff =
                1 +
                (
                    definition.endHeatMultiplier -
                    1
                ) *
                normalizedDistance;

            const phase =
                segmentIndex *
                1.73 +
                age *
                tuning.visualFlickerSpeed;

            const flicker =
                Math.sin(
                    phase,
                ) *
                tuning.visualFlickerAmount;

            const lateralOffset =
                Math.sin(
                    phase *
                    0.71,
                ) *
                definition.halfWidth *
                0.24;

            const centerX =
                x +
                directionX *
                distance +
                perpendicularX *
                lateralOffset;

            const centerY =
                y +
                directionY *
                distance +
                perpendicularY *
                lateralOffset;

            const taper =
                1 -
                normalizedDistance *
                0.34;

            const outerRadius =
                Math.max(
                    3,
                    definition.halfWidth *
                    tuning.visualOuterWidthMultiplier *
                    taper *
                    (
                        1 +
                        flicker
                    ),
                );

            const coreRadius =
                Math.max(
                    2,
                    definition.halfWidth *
                    tuning.visualCoreWidthMultiplier *
                    taper *
                    (
                        1 -
                        flicker *
                        0.35
                    ),
                );

            this.graphics
                .circle(
                    centerX,
                    centerY,
                    outerRadius,
                )
                .fill({
                    color: 0xf47b45,
                    alpha:
                        0.38 *
                        heatFalloff,
                })
                .circle(
                    centerX +
                    directionX *
                    outerRadius *
                    0.12,
                    centerY +
                    directionY *
                    outerRadius *
                    0.12,
                    coreRadius,
                )
                .fill({
                    color: 0xffd84a,
                    alpha:
                        0.58 *
                        heatFalloff,
                });
        }

        /*
         * Subtle development centerline retained for exact range and
         * direction validation when debug visualization is enabled.
         */
        this.graphics
            .moveTo(
                x,
                y,
            )
            .lineTo(
                endX,
                endY,
            )
            .stroke({
                width: 1.5,
                color: 0xffd84a,
                alpha: 0.28,
            })
            .circle(
                x,
                y,
                13,
            )
            .fill({
                color: 0x29243a,
                alpha: 0.94,
            })
            .circle(
                x,
                y,
                6,
            )
            .fill({
                color: 0xf47b45,
                alpha: 1,
            });
    }
}
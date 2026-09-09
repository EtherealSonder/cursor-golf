import { Graphics } from "pixi.js";

import {
    DEFAULT_AIRBORNE_WATER_DEBUG_DEFINITION,
} from "../config/AirborneWaterDebugDefinition";

import type {
    AirborneWaterDebugDefinition,
} from "../config/AirborneWaterDebugDefinition";

import type {
    AirborneWaterSystem,
} from "../environment/AirborneWaterSystem";

import type {
    AirborneWaterPacket,
} from "../environment/AirborneWaterPacket";

/**
 * Phase 8B-4 presentation-only view of authoritative airborne Water packets.
 *
 * It never creates, moves, removes, or deposits Water. It reads the bounded
 * active packet set and draws a compact velocity-aligned streak for each
 * visible packet. Unlike WaterFieldVisualizer, it never traverses standing
 * Water cells, so cost is bounded by maximumVisiblePackets.
 */
export class AirborneWaterVisualizer {
    private readonly graphics = new Graphics();

    public constructor(
        private readonly airborneWaterSystem: AirborneWaterSystem,
        private readonly definition:
            AirborneWaterDebugDefinition =
            DEFAULT_AIRBORNE_WATER_DEBUG_DEFINITION,
    ) {
        this.graphics.zIndex = 7;
        this.graphics.visible =
            this.definition.enabled;
    }

    public getGraphics(): Graphics {
        return this.graphics;
    }

    public update(): void {
        if (!this.definition.enabled) {
            if (this.graphics.visible) {
                this.graphics.clear();
                this.graphics.visible = false;
            }

            return;
        }

        this.graphics.visible = true;
        this.graphics.clear();

        let visibleCount = 0;

        this.airborneWaterSystem
            .forEachActivePacket(
                (
                    packet:
                        Readonly<AirborneWaterPacket>,
                ): void => {
                    if (
                        visibleCount >=
                        this.definition
                            .maximumVisiblePackets
                    ) {
                        return;
                    }

                    this.drawPacket(packet);
                    visibleCount += 1;
                },
            );
    }

    public destroy(): void {
        this.graphics.destroy();
    }

    private drawPacket(
        packet:
            Readonly<AirborneWaterPacket>,
    ): void {
        const x = packet.getPositionX();
        const y = packet.getPositionY();

        const velocityX =
            packet.getVelocityX();
        const velocityY =
            packet.getVelocityY();

        const speed =
            Math.hypot(
                velocityX,
                velocityY,
            );

        const directionX =
            speed > 1e-6
                ? velocityX / speed
                : 1;

        const directionY =
            speed > 1e-6
                ? velocityY / speed
                : 0;

        const normalizedHeight =
            Math.max(
                0,
                Math.min(
                    1,
                    packet.getHeight() /
                    this.definition
                        .heightForMaximumPresentation,
                ),
            );

        const alpha =
            this.definition.minimumAlpha +
            (
                this.definition.maximumAlpha -
                this.definition.minimumAlpha
            ) *
            normalizedHeight;

        const radius =
            this.definition.minimumRadius +
            (
                this.definition.maximumRadius -
                this.definition.minimumRadius
            ) *
            normalizedHeight;

        /*
         * Draw the streak backwards from the authoritative ground-plane
         * position. Height affects only size/alpha, never packet position.
         */
        const tailX =
            x -
            directionX *
            this.definition.streakLength;

        const tailY =
            y -
            directionY *
            this.definition.streakLength;

        this.graphics
            .moveTo(
                tailX,
                tailY,
            );

        this.graphics
            .lineTo(
                x,
                y,
            );

        this.graphics
            .stroke({
                width:
                    this.definition
                        .streakWidth,
                color:
                    this.definition
                        .waterColor,
                alpha,
            });

        this.graphics
            .circle(
                x,
                y,
                radius,
            );

        this.graphics
            .fill({
                color:
                    this.definition
                        .waterColor,
                alpha,
            });

        this.graphics
            .circle(
                x,
                y,
                Math.max(
                    1,
                    radius * 0.34,
                ),
            );

        this.graphics
            .fill({
                color:
                    this.definition
                        .coreColor,
                alpha:
                    this.definition
                        .coreAlpha,
            });
    }
}

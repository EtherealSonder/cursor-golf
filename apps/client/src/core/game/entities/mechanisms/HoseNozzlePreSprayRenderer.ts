import {
    Graphics,
} from "pixi.js";

import {
    DEFAULT_HOSE_NOZZLE_PRE_SPRAY_DEFINITION,
    type HoseNozzlePreSprayDefinition,
    validateHoseNozzlePreSprayDefinition,
} from "../../config/HoseNozzlePreSprayDefinition";

import {
    HydrantPressureState,
} from "../../config/HydrantPressureDefinition";

/**
 * Presentation-only warning at the live Hose nozzle immediately before the
 * Hydrant enters Active pressure.
 *
 * The pattern is deterministic. It does not create Water packets, deposit
 * Water, affect Ball physics or use Math.random() every frame.
 */
export class HoseNozzlePreSprayRenderer {
    private readonly graphics =
        new Graphics();

    public constructor(
        private readonly definition:
            HoseNozzlePreSprayDefinition =
            DEFAULT_HOSE_NOZZLE_PRE_SPRAY_DEFINITION,
    ) {
        validateHoseNozzlePreSprayDefinition(
            definition,
        );

        this.graphics.visible =
            false;
    }

    public getGraphics():
        Graphics {
        return this.graphics;
    }

    public redraw(
        nozzleX:
            number,

        nozzleY:
            number,

        directionRadians:
            number,

        pressureState:
            HydrantPressureState,

        pressureProgress:
            number,
    ): void {
        this.graphics.clear();

        if (
            pressureState !==
                HydrantPressureState
                    .PressureBuilding ||
            !Number.isFinite(
                nozzleX,
            ) ||
            !Number.isFinite(
                nozzleY,
            ) ||
            !Number.isFinite(
                directionRadians,
            ) ||
            !Number.isFinite(
                pressureProgress,
            )
        ) {
            this.graphics.visible =
                false;

            return;
        }

        const progress =
            Math.min(
                Math.max(
                    pressureProgress,
                    0,
                ),
                1,
            );

        if (
            progress <
                this.definition
                    .startProgress ||
            progress >
                this.definition
                    .endProgress
        ) {
            this.graphics.visible =
                false;

            return;
        }

        const localProgress =
            Math.min(
                Math.max(
                    (
                        progress -
                        this.definition
                            .startProgress
                    ) /
                    (
                        this.definition
                            .endProgress -
                        this.definition
                            .startProgress
                    ),
                    0,
                ),
                1,
            );

        this.graphics.visible =
            true;

        const directionX =
            Math.cos(
                directionRadians,
            );

        const directionY =
            Math.sin(
                directionRadians,
            );

        const normalX =
            -directionY;

        const normalY =
            directionX;

        /*
         * Fade in quickly, then remain readable until Active takes over.
         */
        const visibility =
            Math.min(
                1,
                localProgress /
                    0.32,
            );

        this.drawMist(
            nozzleX,
            nozzleY,
            directionX,
            directionY,
            normalX,
            normalY,
            visibility,
        );

        this.drawDroplets(
            nozzleX,
            nozzleY,
            directionRadians,
            localProgress,
            visibility,
        );
    }

    public reset():
        void {
        this.graphics.clear();

        this.graphics.visible =
            false;
    }

    public destroy():
        void {
        this.graphics.destroy();
    }

    private drawMist(
        nozzleX:
            number,

        nozzleY:
            number,

        directionX:
            number,

        directionY:
            number,

        normalX:
            number,

        normalY:
            number,

        visibility:
            number,
    ): void {
        const length =
            this.definition
                .mistLength;

        const halfStart =
            this.definition
                .mistStartWidth *
            0.5;

        const halfEnd =
            this.definition
                .mistEndWidth *
            0.5;

        const endX =
            nozzleX +
            directionX *
                length;

        const endY =
            nozzleY +
            directionY *
                length;

        this.graphics
            .moveTo(
                nozzleX +
                    normalX *
                        halfStart,
                nozzleY +
                    normalY *
                        halfStart,
            )
            .lineTo(
                endX +
                    normalX *
                        halfEnd,
                endY +
                    normalY *
                        halfEnd,
            )
            .lineTo(
                endX -
                    normalX *
                        halfEnd,
                endY -
                    normalY *
                        halfEnd,
            )
            .lineTo(
                nozzleX -
                    normalX *
                        halfStart,
                nozzleY -
                    normalY *
                        halfStart,
            )
            .closePath()
            .fill({
                color:
                    this.definition
                        .mistColor,
                alpha:
                    this.definition
                        .mistAlpha *
                    visibility,
            });
    }

    private drawDroplets(
        nozzleX:
            number,

        nozzleY:
            number,

        directionRadians:
            number,

        localProgress:
            number,

        visibility:
            number,
    ): void {
        const count =
            this.definition
                .dropletCount;

        for (
            let index = 0;
            index < count;
            index += 1
        ) {
            /*
             * Stable phase values distribute droplets without per-frame
             * randomness. localProgress moves them outward as pressure peaks.
             */
            const phase =
                count > 1
                    ? index /
                        (
                            count -
                            1
                        )
                    : 0.5;

            const signedSpread =
                (
                    phase -
                    0.5
                ) *
                2;

            const angle =
                directionRadians +
                signedSpread *
                    this.definition
                        .dropletSpreadRadians;

            const baseDistance =
                this.definition
                    .dropletMinimumDistance +
                (
                    this.definition
                        .dropletMaximumDistance -
                    this.definition
                        .dropletMinimumDistance
                ) *
                    phase;

            const animatedDistance =
                baseDistance +
                localProgress *
                    8 *
                    (
                        0.55 +
                        phase *
                            0.45
                    );

            const x =
                nozzleX +
                Math.cos(
                    angle,
                ) *
                    animatedDistance;

            const y =
                nozzleY +
                Math.sin(
                    angle,
                ) *
                    animatedDistance;

            const radius =
                this.definition
                    .dropletRadius *
                (
                    0.72 +
                    (
                        index %
                        3
                    ) *
                        0.14
                );

            this.graphics
                .circle(
                    x,
                    y,
                    radius,
                )
                .fill({
                    color:
                        this.definition
                            .dropletColor,
                    alpha:
                        this.definition
                            .dropletAlpha *
                        visibility,
                });
        }
    }
}

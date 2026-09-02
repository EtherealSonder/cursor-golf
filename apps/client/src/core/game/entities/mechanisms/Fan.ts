import {
    Container,
    Graphics,
} from "pixi.js";

import {
    DEFAULT_FAN_VISUAL_DEFINITION,
} from "../../config/LocalWindDefinition";

import type {
    FanVisualDefinition,
    LocalWindSourceDefinition,
} from "../../config/LocalWindDefinition";

import {
    Entity,
} from "../Entity";

/**
 * Presentation entity for one local airflow source.
 *
 * The Fan does not calculate environmental force.
 * LocalWindSystem remains the authoritative physics
 * owner. This entity only represents the mechanism
 * in the world.
 */
export class Fan extends Entity {

    private readonly sourceDefinition:
        LocalWindSourceDefinition;

    private readonly visualDefinition:
        FanVisualDefinition;

    private housingGraphics:
        Graphics | null =
        null;

    private bladeContainer:
        Container | null =
        null;

    private bladeGraphics:
        Graphics | null =
        null;

    constructor(
        sourceDefinition:
            LocalWindSourceDefinition,

        visualDefinition:
            FanVisualDefinition =
            DEFAULT_FAN_VISUAL_DEFINITION,
    ) {
        super();

        this.validateSourceDefinition(
            sourceDefinition,
        );

        this.sourceDefinition =
            sourceDefinition;

        this.visualDefinition =
            visualDefinition;
    }

    public getSourceDefinition():
        LocalWindSourceDefinition {

        return this.sourceDefinition;
    }

    protected onInitialize():
        void {

        this.setPosition(
            this.sourceDefinition
                .positionX,
            this.sourceDefinition
                .positionY,
        );

        /*
         * Fan art is authored pointing to the right.
         * Rotating the root aligns it with the source
         * direction.
         */
        this.container.rotation =
            this.sourceDefinition
                .directionRadians;

        this.housingGraphics =
            new Graphics();

        this.bladeContainer =
            new Container();

        this.bladeGraphics =
            new Graphics();

        this.bladeContainer
            .addChild(
                this.bladeGraphics,
            );

        this.container
            .addChild(
                this.housingGraphics,
            );

        this.container
            .addChild(
                this.bladeContainer,
            );

        this.drawHousing();
        this.drawBlades();
    }

    protected onUpdate(
        deltaTime: number,
    ): void {

        if (
            !this.bladeContainer ||
            !this.sourceDefinition
                .enabled ||
            !Number.isFinite(
                deltaTime,
            )
        ) {
            return;
        }

        this.bladeContainer.rotation +=
            this.visualDefinition
                .bladeRotationSpeed *
            Math.max(
                0,
                deltaTime,
            );
    }

    protected onDestroy():
        void {

        this.bladeGraphics
            ?.destroy();

        this.housingGraphics
            ?.destroy();

        this.bladeGraphics =
            null;

        this.housingGraphics =
            null;

        this.bladeContainer =
            null;

        this.container.destroy({
            children: true,
        });
    }

    private drawHousing():
        void {

        if (
            !this.housingGraphics
        ) {
            return;
        }

        const definition =
            this.visualDefinition;

        this.housingGraphics
            .clear();

        this.housingGraphics
            .circle(
                0,
                0,
                definition
                    .housingRadius,
            );

        this.housingGraphics
            .fill(
                definition
                    .housingFillColor,
            );

        this.housingGraphics
            .stroke({
                width:
                    definition
                        .outlineWidth,

                color:
                    definition
                        .housingOutlineColor,
            });

        /*
         * Small nozzle/direction marker on the
         * downwind side of the housing.
         */
        const markerStartX =
            definition
                .housingRadius +
            4;

        const markerEndX =
            markerStartX +
            22;

        this.housingGraphics
            .moveTo(
                markerStartX,
                0,
            );

        this.housingGraphics
            .lineTo(
                markerEndX,
                0,
            );

        this.housingGraphics
            .lineTo(
                markerEndX -
                7,
                -6,
            );

        this.housingGraphics
            .moveTo(
                markerEndX,
                0,
            );

        this.housingGraphics
            .lineTo(
                markerEndX -
                7,
                6,
            );

        this.housingGraphics
            .stroke({
                width: 3,

                color:
                    definition
                        .directionIndicatorColor,
            });
    }

    private drawBlades():
        void {

        if (
            !this.bladeGraphics
        ) {
            return;
        }

        const definition =
            this.visualDefinition;

        this.bladeGraphics
            .clear();

        for (
            let bladeIndex = 0;
            bladeIndex <
            definition
                .bladeCount;
            bladeIndex += 1
        ) {
            const bladeAngle =
                (
                    Math.PI *
                    2 *
                    bladeIndex
                ) /
                definition
                    .bladeCount;

            const cosine =
                Math.cos(
                    bladeAngle,
                );

            const sine =
                Math.sin(
                    bladeAngle,
                );

            const innerRadius =
                7;

            const outerRadius =
                definition
                    .bladeLength;

            const halfWidth =
                definition
                    .bladeWidth /
                2;

            const perpendicularX =
                -sine;

            const perpendicularY =
                cosine;

            const innerX =
                cosine *
                innerRadius;

            const innerY =
                sine *
                innerRadius;

            const outerX =
                cosine *
                outerRadius;

            const outerY =
                sine *
                outerRadius;

            this.bladeGraphics
                .moveTo(
                    innerX +
                    perpendicularX *
                    halfWidth,
                    innerY +
                    perpendicularY *
                    halfWidth,
                );

            this.bladeGraphics
                .lineTo(
                    outerX +
                    perpendicularX *
                    halfWidth *
                    0.55,
                    outerY +
                    perpendicularY *
                    halfWidth *
                    0.55,
                );

            this.bladeGraphics
                .lineTo(
                    outerX -
                    perpendicularX *
                    halfWidth *
                    0.55,
                    outerY -
                    perpendicularY *
                    halfWidth *
                    0.55,
                );

            this.bladeGraphics
                .lineTo(
                    innerX -
                    perpendicularX *
                    halfWidth,
                    innerY -
                    perpendicularY *
                    halfWidth,
                );

            this.bladeGraphics
                .closePath();

            this.bladeGraphics
                .fill(
                    definition
                        .bladeColor,
                );
        }

        this.bladeGraphics
            .circle(
                0,
                0,
                7,
            );

        this.bladeGraphics
            .fill(
                definition
                    .hubColor,
            );
    }

    private validateSourceDefinition(
        definition:
            LocalWindSourceDefinition,
    ): void {

        if (
            definition.id.trim()
                .length ===
            0
        ) {
            throw new Error(
                "Fan source id cannot be empty.",
            );
        }

        if (
            ![
                definition.positionX,
                definition.positionY,
                definition.directionRadians,
            ].every(
                Number.isFinite,
            )
        ) {
            throw new Error(
                `Fan '${definition.id}' requires finite position and direction values.`,
            );
        }
    }
}

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
 * Simple top-down procedural Fan.
 *
 * The art is authored pointing to the right. The
 * complete Entity rotates with directionRadians, so
 * the silhouette itself communicates airflow
 * direction without a separate arrow.
 *
 * Physics remains owned by LocalWindSystem.
 */
export class Fan extends Entity {

    private readonly sourceDefinition:
        LocalWindSourceDefinition;

    private readonly visualDefinition:
        FanVisualDefinition;

    private shadowGraphics:
        Graphics | null =
        null;

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

        this.container.rotation =
            this.sourceDefinition
                .directionRadians;

        this.shadowGraphics =
            new Graphics();

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

        /*
         * Shadow first, then housing, then moving
         * internal blade hint.
         */
        this.container
            .addChild(
                this.shadowGraphics,
            );

        this.container
            .addChild(
                this.housingGraphics,
            );

        this.container
            .addChild(
                this.bladeContainer,
            );

        this.drawShadow();
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

        this.shadowGraphics
            ?.destroy();

        this.bladeGraphics =
            null;

        this.housingGraphics =
            null;

        this.shadowGraphics =
            null;

        this.bladeContainer =
            null;

        this.container.destroy({
            children: true,
        });
    }

    private drawShadow():
        void {

        if (!this.shadowGraphics) {
            return;
        }

        const d = this.visualDefinition;
        const rearX = -d.bodyLength * 0.50;
        const frontX = d.bodyLength * 0.50;

        this.shadowGraphics.clear();

        this.shadowGraphics
            .roundRect(
                rearX + d.shadowOffsetX,
                -d.bodyHalfHeight + d.shadowOffsetY,
                d.bodyLength,
                d.bodyHalfHeight * 2,
                12,
            )
            .fill({
                color: d.bodyShadowColor,
                alpha: 0.24,
            });

        this.shadowGraphics
            .ellipse(
                frontX + d.shadowOffsetX,
                d.shadowOffsetY,
                12,
                d.bodyHalfHeight,
            )
            .fill({
                color: d.bodyShadowColor,
                alpha: 0.24,
            });
    }

    private drawHousing():
        void {

        if (!this.housingGraphics) {
            return;
        }

        const d = this.visualDefinition;
        const rearX = -d.bodyLength * 0.50;
        const frontX = d.bodyLength * 0.50;

        this.housingGraphics.clear();

        // One simple saturated drum body.
        this.housingGraphics
            .roundRect(
                rearX,
                -d.bodyHalfHeight,
                d.bodyLength,
                d.bodyHalfHeight * 2,
                12,
            )
            .fill(d.bodyFillColor)
            .stroke({
                width: d.outlineWidth,
                color: d.housingOutlineColor,
                join: "round",
            });

        // Minimal darker rear band for cylindrical depth.
        this.housingGraphics
            .roundRect(
                rearX + 7,
                -d.bodyHalfHeight + 5,
                10,
                d.bodyHalfHeight * 2 - 10,
                5,
            )
            .fill(d.bodyShadowColor);

        // Large oval front opening is the main directional cue.
        this.housingGraphics
            .ellipse(
                frontX,
                0,
                13,
                d.bodyHalfHeight + 2,
            )
            .fill(d.bladeColor)
            .stroke({
                width: d.outlineWidth,
                color: d.housingOutlineColor,
            });

        this.housingGraphics
            .ellipse(
                frontX,
                0,
                9,
                d.bodyHalfHeight - 4,
            )
            .fill(d.outletColor);
    }

    private drawBlades():
        void {

        if (!this.bladeGraphics || !this.bladeContainer) {
            return;
        }

        const d = this.visualDefinition;
        const frontX = d.bodyLength * 0.50;

        this.bladeContainer.position.set(
            frontX,
            0,
        );

        this.bladeGraphics.clear();

        // Only a symbolic three-spoke fan element.
        for (let i = 0; i < 3; i += 1) {
            const angle = (Math.PI * 2 * i) / 3;

            this.bladeGraphics
                .moveTo(
                    Math.cos(angle) * 5,
                    Math.sin(angle) * 5,
                )
                .lineTo(
                    Math.cos(angle) * 16,
                    Math.sin(angle) * 16,
                )
                .stroke({
                    width: 6,
                    color: d.bladeColor,
                    cap: "round",
                });
        }

        this.bladeGraphics
            .circle(0, 0, 5)
            .fill(d.hubColor);
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
